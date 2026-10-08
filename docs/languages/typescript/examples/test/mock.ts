// Starts the conformance mock that the SDK's own tests use: a real HTTP and WebSocket server in this process.

export interface MockTarget {
  descriptor: {
    communicationUrl: string;
    projectId: string;
    incarnation: string;
    credentials: { backend: string };
    control: string;
  };
  close(): Promise<void>;
}

// Not a literal specifier, so the compiler doesn't look for types the plain JavaScript mock doesn't have.
const mockModule = new URL("../../../../../conformance/mock/server.mjs", import.meta.url).href;

export async function startMock(): Promise<MockTarget> {
  const { startMockTarget } = (await import(mockModule)) as { startMockTarget(): Promise<MockTarget> };
  return startMockTarget();
}

// Makes the mock fail the next request to a GraphQL field: it closes the socket before or after committing.
export async function injectFault(
  target: MockTarget,
  field: string,
  action: "dropBeforeCommit" | "dropAfterCommit",
): Promise<void> {
  const response = await fetch(`${target.descriptor.control}/fault`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ field, action }),
  });
  if (!response.ok) throw new Error(`The mock rejected the fault: ${response.status}`);
}

// Whether each request the mock received for a field and request ID was dropped, oldest first.
export async function attempts(target: MockTarget, field: string, requestId: string): Promise<boolean[]> {
  const response = await fetch(`${target.descriptor.control}/log`);
  const { entries } = (await response.json()) as {
    entries: Array<{ kind: string; field: string | null; requestId: string | null; dropped: boolean }>;
  };
  return entries
    .filter(entry => entry.kind === "request" && entry.field === field && entry.requestId === requestId)
    .map(entry => entry.dropped);
}
