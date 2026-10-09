// The only driver file that imports the SDK: it maps catalog operations to SDK calls and SDK values to protocol JSON.
import ConvoHop
import Foundation

/// Every role in the protocol. The Swift SDK is a user-session client, so it declares only `user`.
let knownRoles = ["user", "backend", "management"]
let declaredRole = "user"

// webhooks.verify belongs to server SDKs. Off Apple platforms, URLSession's WebSocket client needs a libcurl built with
// WebSocket support, and Ubuntu 24.04's libcurl 8.5, which the Linux jobs use, has none. So the driver claims realtime
// only on Apple platforms.
#if canImport(Darwin)
    let features: [JSON] = ["realtime", "recovery.storage", "retryAfter"]
#else
    let features: [JSON] = ["recovery.storage", "retryAfter"]
#endif

typealias UserOperation = @Sendable (ConvoHopClient, Args) async throws -> JSON

/// The user role's catalog operations, in declaration order. Arguments are read in the reference driver's order, so
/// the first invalid one is the one reported.
let userOperations: [(name: String, run: UserOperation)] = [
    ("route.initialize", { client, _ in project(try await client.initialize()) }),
    ("conversations.get", { client, args in
        project(try await client.getConversation(try text(args, "conversationId")))
    }),
    ("messages.list", { client, args in
        let conversationId = try text(try own(args), "conversationId")
        let before = try optionalText(args, "beforeSequence")
        return project(try await client.messages(in: conversationId, before: before))
    }),
    ("messages.send", { client, args in
        let conversationId = try text(try own(args), "conversationId")
        let body = try text(args, "text")
        let requestId = try optionalText(args, "requestId")
        return project(try await client.send(body, to: conversationId, requestId: requestId))
    }),
    ("messages.edit", { client, args in
        let current = try message(args)
        let body = try text(args, "text")
        let requestId = try optionalText(args, "requestId")
        return project(try await client.edit(current, text: body, requestId: requestId))
    }),
    ("messages.delete", { client, args in
        let current = try message(args)
        let requestId = try optionalText(args, "requestId")
        return project(try await client.delete(current, requestId: requestId))
    }),
    ("events.list", { client, args in
        let conversationId = try text(args, "conversationId")
        let batch = try await client.events(in: conversationId, after: try cursor(args))
        return [
            "items": project(batch.events), "complete": .bool(batch.complete),
            "refreshRequired": .bool(batch.refreshRequired), "nextCursor": project(batch.nextCursor),
        ]
    }),
    ("requests.resolve", { client, args in project(try await client.resolveRequest(try text(args, "requestId"))) }),
    ("requests.retry", { client, args in project(try await client.retryRequest(try text(args, "requestId"))) }),
]

/// The client options a `client.create` request carries.
struct ClientSpec {
    var baseUrl: String
    var credential: String
    var projectId: String?
    var incarnation: String?
    var principalId: String?
    /// Read for validation only: management clients use it.
    var actorId: String?
    var storage: InMemoryRecoveryStorage?
}

/// Constructs a user client without network I/O. Constructor validation failures are INVALID_PARAMS.
func createClient(_ spec: ClientSpec) throws -> ConvoHopClient {
    let projectId = try required(spec.projectId, "projectId")
    let incarnation = try required(spec.incarnation, "incarnation")
    let principalId = try required(spec.principalId, "principalId")
    guard let baseURL = URL(string: spec.baseUrl) else { throw ParamsError("baseUrl must be a URL") }
    do {
        return try ConvoHopClient(
            configuration: ConvoHopConfiguration(
                baseURL: baseURL, projectId: projectId, principalId: principalId, incarnation: incarnation,
                sessionToken: spec.credential, recoveryStorage: spec.storage))
    } catch {
        throw ParamsError(errorMessage(error))
    }
}

private func required(_ value: String?, _ name: String) throws -> String {
    guard let value else { throw ParamsError("\(name) is required for this role") }
    return value
}

// A user session always acts as its own principal; silently ignoring actAs would hide a scenario error.
private func own(_ args: Args) throws -> Args {
    if args["actAs"] != nil { throw ParamsError("actAs is only available to backend clients") }
    return args
}

private func message(_ args: Args) throws -> Message {
    try decode(Message.self, args["message"], "message")
}

private func cursor(_ args: Args) throws -> Cursor? {
    args["after"] == nil ? nil : try decode(Cursor.self, args["after"], "after")
}

private func decode<Value: Decodable>(_ type: Value.Type, _ value: JSON?, _ name: String) throws -> Value {
    guard let value, let decoded = try? JSONDecoder().decode(type, from: Data(value.rendered.utf8)) else {
        throw ParamsError("\(name) is not a valid protocol value")
    }
    return decoded
}

/// Opens the SDK's replay-then-subscribe stream. It returns once the initial catch-up has been applied.
func watch(_ client: ConvoHopClient, _ conversationId: String, into recorder: Recorder) async throws
    -> ConversationStream
{
    try await client.watch(
        conversationId, apply: { events in recorder.append(events) },
        onError: { error in recorder.append(error: driverError(error)) })
}

/// The language-neutral projection of an SDK failure (spec/conformance/driver-protocol.md).
func driverError(_ error: any Error) -> JSON {
    if let problem = error as? ConvoHopError {
        return [
            "code": .string(problem.code.rawValue), "status": problem.status.map { .number(Double($0)) } ?? .null,
            "outcome": .string(problem.outcome.rawValue), "requestId": .string(problem.requestId),
            "retryAfterMs": problem.retryAfter.map { .number(Double($0) * 1000) } ?? .null,
            "message": .string(problem.message),
        ]
    }
    // Replay, usage and aggregate failures carry no authority status, like the reference SDK's plain errors.
    return [
        "code": "SDK_ERROR", "status": nil, "outcome": nil, "requestId": nil, "retryAfterMs": nil,
        "message": .string(errorMessage(error)),
    ]
}

private func errorMessage(_ error: any Error) -> String {
    if let usage = error as? ConvoHopUsageError { return usage.message }
    if let localized = error as? any LocalizedError, let description = localized.errorDescription { return description }
    return String(describing: error)
}

/// The events and errors one realtime subscription has delivered. SDK callbacks append from any task.
final class Recorder: @unchecked Sendable {
    private let lock = NSLock()
    private var events: [JSON] = []
    private var errors: [JSON] = []
    private var highest: String?
    private var stopped = false

    func append(_ batch: [Event]) {
        let projected = batch.map(project)
        lock.lock()
        defer { lock.unlock() }
        if stopped { return }
        events.append(contentsOf: projected)
        for event in batch where Counter.isCanonical(event.sequence) {
            if highest.map({ Counter.less($0, event.sequence) }) ?? true { highest = event.sequence }
        }
    }

    func append(error: JSON) {
        lock.lock()
        defer { lock.unlock() }
        if !stopped { errors.append(error) }
    }

    /// Ignores later deliveries and returns the highest delivered sequence.
    func stop() -> String? {
        lock.lock()
        defer { lock.unlock() }
        stopped = true
        return highest
    }

    func snapshot() -> (events: [JSON], errors: [JSON], highest: String?) {
        lock.lock()
        defer { lock.unlock() }
        return (events, errors, highest)
    }
}

/// Projects an SDK value onto protocol JSON. Absent optionals become `null`, as in the authority's responses.
func project(_ value: Any) -> JSON {
    switch value {
    case let value as JSON: return value
    case let value as JSONValue: return json(value)
    case let value as JSONObject: return .object(value.mapValues(json))
    case let value as String: return .string(value)
    case let value as Bool: return .bool(value)
    case let value as any BinaryInteger: return .number(Double(value))
    case let value as Double: return .number(value)
    case let value as URL: return .string(value.absoluteString)
    default: break
    }
    let mirror = Mirror(reflecting: value)
    switch mirror.displayStyle {
    case .optional:
        return mirror.children.first.map { project($0.value) } ?? .null
    case .collection, .set:
        return .array(mirror.children.map { project($0.value) })
    case .dictionary:
        var object: [String: JSON] = [:]
        for entry in mirror.children {
            let pair = Mirror(reflecting: entry.value).children.map(\.value)
            if pair.count == 2, let key = pair[0] as? String { object[key] = project(pair[1]) }
        }
        return .object(object)
    default:
        if let raw = value as? any RawRepresentable { return project(raw.rawValue) }
        var object: [String: JSON] = [:]
        for child in mirror.children {
            if let label = child.label { object[label] = project(child.value) }
        }
        return .object(object)
    }
}

private func json(_ value: JSONValue) -> JSON {
    switch value {
    case .null: return .null
    case .bool(let value): return .bool(value)
    case .number(let value): return .number(value)
    case .string(let value): return .string(value)
    case .array(let values): return .array(values.map(json))
    case .object(let values): return .object(values.mapValues(json))
    }
}
