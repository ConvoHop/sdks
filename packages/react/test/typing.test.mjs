import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ConvoHopClient } from "@convohop/client";
import { Component, StrictMode, createElement } from "react";
import { act, create } from "react-test-renderer";
import { ConvoHopProvider, useSessionRefresh, useTyping } from "../dist/index.js";
import { alice, conversationA, conversationB, flush, loggedErrors, projectId, renderHook, stubClient } from "./support.mjs";

function typingClient(fail) {
  const signals = [];
  const client = stubClient({
    typing(conversationId, isTyping) {
      signals.push([conversationId, isTyping]);
      return fail ? Promise.reject(fail) : Promise.resolve();
    },
  });
  return { client, signals };
}

describe("useTyping", () => {
  test("signals typing once per interval, keeps its controls and signals a stop on unmount", async () => {
    const { client, signals } = typingClient();
    const { result, rerender, unmount } = await renderHook(() => useTyping(conversationA), { client });
    const controls = result.current;
    // StrictMode's extra mount and unmount signal nothing, since nobody typed.
    assert.deepEqual(signals, []);
    controls.input();
    controls.input();
    assert.deepEqual(signals, [[conversationA, true]]);
    await rerender({});
    assert.equal(result.current, controls);
    controls.stop();
    assert.deepEqual(signals, [[conversationA, true], [conversationA, false]]);
    controls.input();
    await unmount();
    assert.deepEqual(signals.slice(2), [[conversationA, true], [conversationA, false]]);
    controls.input();
    assert.equal(signals.length, 4);
  });

  test("sends nothing while disabled, and disabling signals a stop", async () => {
    const { client, signals } = typingClient();
    const { result, rerender, unmount } = await renderHook(enabled => useTyping(conversationA, { enabled }),
      { client, props: false });
    result.current.input();
    assert.deepEqual(signals, []);
    await rerender({ props: true });
    result.current.input();
    await rerender({ props: false });
    assert.deepEqual(signals, [[conversationA, true], [conversationA, false]]);
    await unmount();
    assert.equal(signals.length, 2);
  });

  test("a new conversation signals a stop in the old one", async () => {
    const { client, signals } = typingClient();
    const { result, rerender, unmount } = await renderHook(id => useTyping(id), { client, props: conversationA });
    result.current.input();
    await rerender({ props: conversationB });
    result.current.input();
    await unmount();
    assert.deepEqual(signals, [[conversationA, true], [conversationA, false], [conversationB, true], [conversationB, false]]);
  });

  test("reports failed signals to the latest onError", async () => {
    const { client } = typingClient(new Error("rate limited"));
    const errors = [];
    const { result, rerender, unmount } = await renderHook(tag => useTyping(conversationA, {
      onError: error => { errors.push([tag, error.message]); },
    }), { client, props: "first" });
    await rerender({ props: "second" });
    result.current.input();
    await flush();
    assert.deepEqual(errors, [["second", "rate limited"]]);
    await unmount();
    await flush();
  });
});

describe("useSessionRefresh", () => {
  function refreshClient() {
    const schedules = [];
    const client = stubClient({
      scheduleSessionRefresh(options) {
        const schedule = { options, cancelled: false };
        schedules.push(schedule);
        return () => { schedule.cancelled = true; };
      },
    });
    const active = () => schedules.filter(schedule => !schedule.cancelled);
    return { client, schedules, active };
  }

  test("keeps one renewal scheduled while mounted and calls the latest callbacks", async () => {
    const { client, schedules, active } = refreshClient();
    const seen = [];
    const { rerender, unmount } = await renderHook(options => useSessionRefresh(options), { client, props: {
      leadMs: 30_000, onRefreshed: session => { seen.push(["first", session.expiresAt]); },
    } });
    assert.equal(active().length, 1);
    assert.equal(active()[0].options.leadMs, 30_000);

    const scheduled = schedules.length;
    await rerender({ props: { leadMs: 30_000, onRefreshed: session => { seen.push(["second", session.expiresAt]); },
      onError: error => { seen.push(["second", error.message]); } } });
    assert.equal(schedules.length, scheduled);
    active()[0].options.onRefreshed({ expiresAt: "2026-10-08T23:00:00Z" });
    active()[0].options.onError(new Error("refresh refused"));
    assert.deepEqual(seen, [["second", "2026-10-08T23:00:00Z"], ["second", "refresh refused"]]);

    await rerender({ props: { leadMs: 10_000 } });
    assert.deepEqual(active().map(schedule => schedule.options.leadMs), [10_000]);
    await rerender({ props: { enabled: false } });
    assert.deepEqual(active(), []);
    await rerender({ props: {} });
    assert.deepEqual(active().map(schedule => schedule.options.leadMs), [undefined]);
    await unmount();
    assert.deepEqual(active(), []);
  });

  test("doesn't schedule while disabled", async () => {
    const { client, schedules } = refreshClient();
    const { unmount } = await renderHook(() => useSessionRefresh({ enabled: false }), { client });
    assert.equal(schedules.length, 0);
    await unmount();
  });

  test("throws to the nearest error boundary when the client has no sessionRefresh", async () => {
    const client = new ConvoHopClient({ projectId, principalId: alice, incarnation: crypto.randomUUID(),
      sessionToken: "fixture-session", baseUrl: "http://localhost:18080" });
    const caught = [];
    class Boundary extends Component {
      constructor(props) { super(props); this.state = { failed: false }; }
      static getDerivedStateFromError() { return { failed: true }; }
      componentDidCatch(error) { caught.push(error); }
      render() { return this.state.failed ? null : this.props.children; }
    }
    function Renewing() { useSessionRefresh(); return null; }
    const tree = createElement(StrictMode, null,
      createElement(ConvoHopProvider, { client }, createElement(Boundary, null, createElement(Renewing))));
    let renderer;
    const logged = await loggedErrors(() => act(async () => { renderer = create(tree, { unstable_isConcurrent: true }); }));
    assert.notEqual(caught.length, 0);
    for (const error of caught) assert.equal(error.code, "SESSION_REFRESH_REQUIRED");
    assert.ok(logged.length > 0 && logged.every(line => line.includes("error boundary you provided, Boundary")), logged.join("\n"));
    await act(async () => { renderer.unmount(); });
  });
});
