import test from "node:test";
import assert from "node:assert/strict";
import { buildSchema, lexicographicSortSchema } from "graphql";
import {
  camelCase, capitalize, codegenTypeName, codeUnitCompare, kebabCase, naturalCompare, pascalCase, screamingSnakeCase, snakeCase,
  words,
} from "../lib/naming.mjs";

// Captured from @graphql-codegen/visitor-plugin-common 7.2.5 `convertFactory({})`
// (the default naming used by typescript-operations 6.1.7) before graphql-codegen
// was removed. Every row matched codegenTypeName at capture time.
const CODEGEN_NAMES = [
  ["AlphaFetchHTTPStatusQuery", "AlphaFetchHttpStatusQuery"],
  ["AlphaFetchHTTPStatusQueryVariables", "AlphaFetchHttpStatusQueryVariables"],
  ["Box_3dInput", "Box_3dInput"],
  ["HTTPMethod", "HttpMethod"],
  ["ItemsInput", "ItemsInput"],
  ["V1Thing", "V1Thing"],
  ["ABCDef", "AbcDef"],
  ["already_snake_case", "Already_Snake_Case"],
  ["__Leading", "__Leading"],
  ["Trailing_", "Trailing_"],
  ["a1B2", "A1B2"],
  ["HTTP2Server", "Http2Server"],
  ["IOStream", "IoStream"],
  ["Item10Value", "Item10Value"],
  ["x_1y", "X_1y"],
  ["foo__bar", "Foo__Bar"],
  ["LiveSessionIssue", "LiveSessionIssue"],
  ["SESSION_ISSUE", "Session_Issue"],
  ["ManagementWebhookDeliveriesQuery", "ManagementWebhookDeliveriesQuery"],
  ["DataPlaneConversationMessagesQueryVariables", "DataPlaneConversationMessagesQueryVariables"],
  ["JSONValue", "JsonValue"],
  ["Version2", "Version2"],
  ["version2Beta", "Version2Beta"],
  ["OAuth2Token", "OAuth2Token"],
  ["XMLHttpRequest", "XmlHttpRequest"],
  ["ID", "Id"],
  ["Id", "Id"],
  ["url_v2_Input", "Url_V2_Input"],
  ["A", "A"],
  ["aB", "AB"],
  ["Ab_Cd_EF", "Ab_Cd_Ef"],
  ["UUID", "Uuid"],
  ["Mutation3D", "Mutation3D"],
  ["e2eTest", "E2eTest"],
];

test("codegenTypeName reproduces graphql-codegen's default type naming", () => {
  for (const [input, expected] of CODEGEN_NAMES) assert.equal(codegenTypeName(input), expected, input);
});

test("naturalCompare orders names exactly like graphql-js lexicographicSortSchema", () => {
  const names = [
    "apple10", "apple9", "APPLE", "BANANA", "cherry", "DATE", "a0", "a00", "a01", "a1", "a001", "item2", "item10", "item02",
    "_x", "Z9", "z10", "x1y2", "x1y10", "x01y", "A", "a", "b2B", "B2b", "v1Thing", "v10", "v9_9",
  ];
  const schema = buildSchema(`enum Sorted { ${names.join(" ")} }\ntype Query { sorted: Sorted }`);
  const expected = lexicographicSortSchema(schema).getType("Sorted").getValues().map(value => value.name);
  assert.deepEqual([...names].sort(naturalCompare), expected);
  assert.equal(naturalCompare("item2", "item2"), 0);
  assert.ok(naturalCompare("item2", "item10") < 0);
  assert.ok(naturalCompare("item10", "item2") > 0);
});

test("codeUnitCompare is plain UTF-16 code-unit order", () => {
  assert.deepEqual(["b", "a9", "B", "a10", "_", "a", "Z"].sort(codeUnitCompare), ["B", "Z", "_", "a", "a10", "a9", "b"]);
  assert.equal(codeUnitCompare("x", "x"), 0);
});

test("case helpers split camel, Pascal, acronym and snake names into words", () => {
  assert.deepEqual(words("liveSessionParticipants"), ["live", "session", "participants"]);
  assert.deepEqual(words("LiveSessionPage"), ["live", "session", "page"]);
  assert.deepEqual(words("SESSION_ISSUE"), ["session", "issue"]);
  assert.deepEqual(words("fetchHTTPStatus"), ["fetch", "http", "status"]);
  assert.deepEqual(words("item10Value"), ["item10", "value"]);
  assert.deepEqual(words("__typename"), ["typename"]);
  assert.deepEqual(words(""), []);

  assert.equal(capitalize("alpha"), "Alpha");
  assert.equal(capitalize(""), "");
  assert.equal(pascalCase("fetchHTTPStatus"), "FetchHttpStatus");
  assert.equal(camelCase("FetchHTTPStatus"), "fetchHttpStatus");
  assert.equal(camelCase(""), "");
  assert.equal(snakeCase("fetchHTTPStatus"), "fetch_http_status");
  assert.equal(screamingSnakeCase("liveSessionIssue"), "LIVE_SESSION_ISSUE");
  assert.equal(kebabCase("dataPlane"), "data-plane");
});
