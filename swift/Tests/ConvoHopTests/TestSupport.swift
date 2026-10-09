import Foundation
import XCTest

@testable import ConvoHop

// Fakes and fixtures shared by the tests. Replies mirror test/graphql-fixtures.mjs: every field of the generated
// output shape is present, and the transport validates them as it does live replies.

enum TestIDs {
    static let project = "0b6f2a4e-6c1d-4b8e-9f3a-1d2c3b4a5e60"
    static let principal = "1c7e3b5f-7d2e-4c9f-8a4b-2e3d4c5b6f71"
    static let incarnation = "2d8f4c6a-8e3f-4dab-9b5c-3f4e5d6c7a82"
    static let device = "3e9a5d7b-9f4a-4ebc-8c6d-4a5f6e7d8b93"
    static let session = "4fab6e8c-a05b-4fcd-9d7e-5b6a7f8e9ca4"
    static let conversation = "5abc7f9d-b16c-4ade-8e8f-6c7b8a9fadb5"
    static let otherProject = "6bcd8a0e-c27d-4bef-9f9a-7d8c9bab0ec6"
    static let otherPrincipal = "7cde9b1f-d38e-4cfa-8aab-8e9dacbc1fd7"
}

extension NSLock {
    func locked<T>(_ body: () throws -> T) rethrows -> T {
        lock()
        defer { unlock() }
        return try body()
    }
}

/// A value tests share with `@Sendable` handlers.
final class Shared<Value>: @unchecked Sendable {
    private let lock = NSLock()
    private var stored: Value

    init(_ value: Value) {
        stored = value
    }

    var value: Value { lock.locked { stored } }

    @discardableResult
    func update<T>(_ body: (inout Value) throws -> T) rethrows -> T {
        try lock.locked { try body(&stored) }
    }
}

/// A new canonical lowercase UUID.
func uuid() -> String { UUID().uuidString.lowercased() }

/// The protocol's UTC millisecond timestamp, `YYYY-MM-DDTHH:MM:SS.sssZ`.
func timestamp(_ milliseconds: Int) -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    formatter.timeZone = TimeZone(identifier: "UTC")
    return formatter.string(from: Date(timeIntervalSince1970: Double(milliseconds) / 1000))
}

// MARK: HTTP

/// One request the stub received, with its parsed GraphQL body.
struct RecordedRequest: Sendable {
    let request: ConvoHopHTTPRequest
    let body: JSONObject

    var operationName: String { body["operationName"]?.stringValue ?? "" }
    var variables: JSONObject { body["variables"]?.objectValue ?? [:] }
    var context: JSONObject { variables["context"]?.objectValue ?? [:] }
    var input: JSONObject? { variables["input"]?.objectValue }
    var requestId: String { context["requestId"]?.stringValue ?? "" }
    var authorization: String? { request.headers["authorization"] }
    var text: String { String(decoding: request.body, as: UTF8.self) }
    /// The catalog key, such as `communication.sendMessage`.
    var key: String { Catalog.descriptor(named: operationName)?.key ?? "" }
}

enum Catalog {
    static func descriptor(_ key: String) -> GraphQLOperationDescriptor {
        guard let descriptor = GraphQLCatalog.operations[key] else { fatalError("Unknown operation \(key)") }
        return descriptor
    }

    static func descriptor(named operationName: String) -> GraphQLOperationDescriptor? {
        GraphQLCatalog.operations.values.first { $0.operationName == operationName }
    }
}

struct UnhandledRequest: Error, CustomStringConvertible {
    let key: String
    var description: String { "No stub handles \(key)" }
}

/// An HTTP client that answers from per-operation handlers and records every request.
actor StubHTTP: ConvoHopHTTPClient {
    typealias Handler = @Sendable (RecordedRequest) async throws -> ConvoHopHTTPResponse

    private var handlers: [String: Handler] = [:]
    private(set) var requests: [RecordedRequest] = []

    init() {}

    /// Answers the operation with catalog key `key`, such as `communication.sendMessage`.
    func on(_ key: String, _ handler: @escaping Handler) {
        handlers[Catalog.descriptor(key).operationName] = handler
    }

    func send(_ request: ConvoHopHTTPRequest) async throws -> ConvoHopHTTPResponse {
        let body = try JSONParser.parse(request.body).objectValue ?? [:]
        let recorded = RecordedRequest(request: request, body: body)
        requests.append(recorded)
        guard let handler = handlers[recorded.operationName] else { throw UnhandledRequest(key: recorded.key) }
        return try await handler(recorded)
    }

    func requests(_ key: String) -> [RecordedRequest] {
        let name = Catalog.descriptor(key).operationName
        return requests.filter { $0.operationName == name }
    }

    func count(_ key: String) -> Int { requests(key).count }
}

/// Replies the transport accepts or rejects as it would live ones.
enum Reply {
    /// A successful reply to `request`, like the TypeScript fixture's `reply()`. `fields` override the envelope.
    static func ok(_ request: RecordedRequest, _ fields: JSONObject = [:], now: Int? = nil) -> ConvoHopHTTPResponse {
        guard let operation = Catalog.descriptor(named: request.operationName) else {
            fatalError("Unknown operation \(request.operationName)")
        }
        let time = JSONValue.string(timestamp(now ?? Int(Date().timeIntervalSince1970 * 1000)))
        var envelope: JSONObject = [
            "status": .string(operation.kind == .mutation ? "committed" : "ok"),
            "requestId": .string(request.requestId), "serverTime": time, "receiptId": .string(uuid()),
            "committedAt": time, "replayed": false,
        ]
        envelope.merge(fields) { $1 }
        let type = operation.resultType.hasSuffix("!") ? String(operation.resultType.dropLast()) : operation.resultType
        return json(["data": .object([operation.field: Fixture.full(type, envelope)])])
    }

    /// A GraphQL error, as the authority reports a rejected request.
    static func graphQLError(
        code: String, outcome: String = "rejected", status: Int = 409, message: String = "Rejected",
        retryAfter: Int? = nil
    ) -> ConvoHopHTTPResponse {
        var extensions: JSONObject = [
            "code": .string(code), "outcome": .string(outcome), "status": .number(Double(status)),
        ]
        if let retryAfter { extensions["retryAfter"] = .number(Double(retryAfter)) }
        return json(["errors": [["message": .string(message), "extensions": .object(extensions)]]])
    }

    /// A non-2xx response with a top-level error body.
    static func failure(status: Int, code: String, outcome: String = "rejected") -> ConvoHopHTTPResponse {
        json(["code": .string(code), "outcome": .string(outcome), "message": "Failed"], status: status)
    }

    static func json(_ value: JSONValue, status: Int = 200) -> ConvoHopHTTPResponse {
        ConvoHopHTTPResponse(
            status: status, headers: ["Content-Type": "application/json"], body: Data(value.jsonText().utf8))
    }
}

/// Generated-shape fixtures, like the TypeScript `full()`, `resolution()` and `event()`.
enum Fixture {
    /// An object with every field of the generated output type: `fields`, then `null`.
    static func full(_ type: String, _ fields: JSONObject) -> JSONValue {
        guard case .object(let shape)? = GraphQLCatalog.outputShapes[type] else { fatalError("Unknown object \(type)") }
        var members: JSONObject = [:]
        for field in shape { members[field.name] = fields[field.name] ?? .null }
        return .object(members)
    }

    static let baseURL = "https://api.convohop.test"

    /// A signed project route for the test project, valid for an hour after `now`.
    static func route(
        now: Int, servingEpoch: String = "1", incarnation: String = TestIDs.incarnation,
        communicationBase: String = baseURL, wssUrl: String = "wss://api.convohop.test/graphql"
    ) -> JSONValue {
        [
            "projectId": .string(TestIDs.project), "incarnation": .string(incarnation),
            "servingEpoch": .string(servingEpoch), "communicationBase": .string(communicationBase),
            "wssUrl": .string(wssUrl), "expiresAt": .string(timestamp(now + 3_600_000)), "signature": "signature",
        ]
    }

    /// The test user's active session.
    static func session(
        revision: String = "1", expiresAt: Int, status: String = "active", principalId: String = TestIDs.principal
    ) -> JSONValue {
        full("Session", [
            "sessionId": .string(TestIDs.session), "principalId": .string(principalId),
            "deviceId": .string(TestIDs.device), "incarnation": .string(TestIDs.incarnation),
            "sessionRevision": .string(revision), "expiresAt": .string(timestamp(expiresAt)),
            "status": .string(status),
        ])
    }

    static func resolution(_ requestId: String, _ state: String, retained: JSONObject? = nil) -> JSONValue {
        let now = JSONValue.string(timestamp(Int(Date().timeIntervalSince1970 * 1000)))
        let receipt: JSONValue =
            state == "notObservedYet"
            ? .null
            : full("ResolvedReceipt", [
                "status": .string(state), "requestId": .string(requestId), "receiptId": .string(uuid()),
                "committedAt": now, "replayed": false,
                "result": retained.map { full("RetainedResult", $0) } ?? .null,
            ])
        return full("RequestResolution", [
            "state": .string(state), "requestId": .string(requestId), "checkedAt": now, "resultWithheld": false,
            "receipt": receipt,
        ])
    }

    static func event(_ conversationId: String, _ sequence: String, type: String = "messageCreated") -> JSONValue {
        full("Event", [
            "eventId": .string(uuid()), "conversationId": .string(conversationId), "sequence": .string(sequence),
            "type": .string(type), "occurredAt": .string(timestamp(Int(Date().timeIntervalSince1970 * 1000))),
        ])
    }

    /// The acknowledgement of a sent message.
    static func messageAck(
        _ conversationId: String, messageId: String = uuid(), sequence: String = "1", status: String = "sent"
    ) -> JSONValue {
        full("MessageAck", [
            "messageId": .string(messageId), "conversationId": .string(conversationId),
            "sequence": .string(sequence), "revision": "1", "status": .string(status),
            "cursor": full("Cursor", [
                "incarnation": .string(TestIDs.incarnation), "conversationId": .string(conversationId),
                "sequence": .string(sequence),
            ]),
        ])
    }
}

// MARK: WebSockets

/// A scripted WebSocket. Events arrive in order, `failed` is followed by `closed`, and nothing follows `closed`.
final class FakeWebSocket: ConvoHopWebSocket, @unchecked Sendable {
    let url: URL
    let subprotocol: String
    let events: AsyncStream<ConvoHopWebSocketEvent>
    private let continuation: AsyncStream<ConvoHopWebSocketEvent>.Continuation
    private let lock = NSLock()
    private var sentTexts: [String] = []
    private var closeCode: Int?
    private var finished = false
    private var handler: (@Sendable (FakeWebSocket, String) -> Void)?

    init(url: URL, subprotocol: String) {
        self.url = url
        self.subprotocol = subprotocol
        (events, continuation) = AsyncStream.makeStream(of: ConvoHopWebSocketEvent.self)
    }

    /// Texts the client sent, oldest first.
    var sent: [String] { lock.locked { sentTexts } }
    /// The parsed JSON messages the client sent.
    var sentMessages: [JSONObject] { sent.compactMap { try? JSONParser.parse($0).objectValue } }
    /// The code the client closed with, if it closed the socket.
    var closedByClient: Int? { lock.locked { closeCode } }
    var isFinished: Bool { lock.locked { finished } }

    /// Calls `handler` for each text the client sends from now on.
    func onSend(_ handler: @escaping @Sendable (FakeWebSocket, String) -> Void) {
        lock.locked { self.handler = handler }
    }

    func send(_ text: String) {
        let handler: (@Sendable (FakeWebSocket, String) -> Void)? = lock.locked {
            guard !finished else { return nil }
            sentTexts.append(text)
            return self.handler
        }
        handler?(self, text)
    }

    func close(code: Int) {
        lock.locked { if !finished { closeCode = code } }
        deliver(.closed(code: code))
    }

    /// Delivers an event to the client, unless the socket closed.
    func deliver(_ event: ConvoHopWebSocketEvent) {
        let delivered: Bool = lock.locked {
            guard !finished else { return false }
            if case .closed = event { finished = true }
            return true
        }
        guard delivered else { return }
        continuation.yield(event)
        if case .closed = event { continuation.finish() }
    }

    func open() { deliver(.open(protocol: subprotocol)) }

    /// Delivers a JSON text frame.
    func receive(_ message: JSONValue) { deliver(.text(message.jsonText())) }

    /// Fails the connection, as a network loss does.
    func fail(code: Int = 1006) {
        deliver(.failed)
        deliver(.closed(code: code))
    }
}

/// Creates ``FakeWebSocket``s and remembers them in connection order.
final class FakeWebSocketFactory: ConvoHopWebSocketFactory, @unchecked Sendable {
    private let lock = NSLock()
    private var sockets: [FakeWebSocket] = []
    private let onConnect: (@Sendable (FakeWebSocket) -> Void)?

    /// `onConnect` runs for each new socket before the client reads its events.
    init(onConnect: (@Sendable (FakeWebSocket) -> Void)? = nil) {
        self.onConnect = onConnect
    }

    var connections: [FakeWebSocket] { lock.locked { sockets } }

    func connect(to url: URL, subprotocol: String) -> any ConvoHopWebSocket {
        let socket = FakeWebSocket(url: url, subprotocol: subprotocol)
        lock.locked { sockets.append(socket) }
        onConnect?(socket)
        return socket
    }

    /// The `index`th connection, once the client opened it.
    func connection(_ index: Int, timeout: TimeInterval = 5) async throws -> FakeWebSocket {
        try await eventually("connection \(index)", timeout: timeout) { self.connections.count > index }
        return connections[index]
    }
}

// MARK: Network

/// A network monitor tests switch on and off.
final class FakeNetworkMonitor: ConvoHopNetworkMonitor, @unchecked Sendable {
    private let lock = NSLock()
    private var reachable: Bool
    private var observers: [UUID: AsyncStream<Bool>.Continuation] = [:]

    init(reachable: Bool = true) {
        self.reachable = reachable
    }

    var observerCount: Int { lock.locked { observers.count } }

    func reachability() -> AsyncStream<Bool> {
        let (changes, continuation) = AsyncStream.makeStream(of: Bool.self, bufferingPolicy: .bufferingNewest(1))
        let id = UUID()
        let current: Bool = lock.locked {
            observers[id] = continuation
            return reachable
        }
        continuation.onTermination = { [weak self] _ in
            guard let self else { return }
            self.lock.locked { _ = self.observers.removeValue(forKey: id) }
        }
        continuation.yield(current)
        return changes
    }

    func set(_ reachable: Bool) {
        let observers: [AsyncStream<Bool>.Continuation] = lock.locked {
            self.reachable = reachable
            return Array(self.observers.values)
        }
        for observer in observers { observer.yield(reachable) }
    }
}

// MARK: Time

/// A manual clock. Sleeps finish only when a test advances past their deadline, or when their task is cancelled.
final class TestClock: @unchecked Sendable {
    private struct Sleeper {
        let id: UUID
        let deadline: Int
        let continuation: CheckedContinuation<Void, any Error>
    }

    private let lock = NSLock()
    private var current: Int
    private var sleepers: [Sleeper] = []
    private var cancelled: Set<UUID> = []

    init(now: Int = 1_800_000_000_000) {
        current = now
    }

    var now: Int { lock.locked { current } }
    /// Sleeps that haven't finished.
    var pendingSleeps: Int { lock.locked { sleepers.count } }
    /// The deadlines of unfinished sleeps, soonest first.
    var deadlines: [Int] { lock.locked { sleepers.map(\.deadline).sorted() } }

    func sleep(_ milliseconds: Int) async throws {
        let id = UUID()
        try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, any Error>) in
                let outcome: Result<Void, any Error>? = lock.locked {
                    if cancelled.remove(id) != nil { return .failure(CancellationError()) }
                    if milliseconds <= 0 { return .success(()) }
                    sleepers.append(Sleeper(id: id, deadline: current + milliseconds, continuation: continuation))
                    return nil
                }
                if let outcome { continuation.resume(with: outcome) }
            }
        } onCancel: {
            let sleeper: Sleeper? = lock.locked {
                guard let index = sleepers.firstIndex(where: { $0.id == id }) else {
                    cancelled.insert(id)
                    return nil
                }
                return sleepers.remove(at: index)
            }
            sleeper?.continuation.resume(throwing: CancellationError())
        }
        lock.locked { _ = cancelled.remove(id) }
    }

    /// Moves time forward and wakes the sleeps that are due.
    func advance(by milliseconds: Int) {
        let due: [Sleeper] = lock.locked {
            current += milliseconds
            let due = sleepers.filter { $0.deadline <= current }
            sleepers.removeAll { $0.deadline <= current }
            return due
        }
        for sleeper in due.sorted(by: { $0.deadline < $1.deadline }) { sleeper.continuation.resume() }
    }

    /// Advances to the soonest pending deadline, if any.
    func advanceToNextDeadline() {
        guard let next = deadlines.first else { return }
        advance(by: max(0, next - now))
    }

    var environment: ConvoHopEnvironment {
        ConvoHopEnvironment(
            now: { self.now }, sleep: { milliseconds in try await self.sleep(milliseconds) }, random: { _ in 0 })
    }
}

/// Waits until `condition` holds, polling with real time.
func eventually(
    _ description: @autoclosure () -> String = "condition", timeout: TimeInterval = 5,
    isolation: isolated (any Actor)? = #isolation, file: StaticString = #filePath, line: UInt = #line,
    _ condition: () async throws -> Bool
) async throws {
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
        if try await condition() { return }
        try await Task.sleep(nanoseconds: 5_000_000)
    }
    if try await condition() { return }
    XCTFail("Timed out waiting for \(description())", file: file, line: line)
    throw EventuallyTimeout()
}

struct EventuallyTimeout: Error {}

// MARK: Clients

/// A client wired to fakes, and the fakes.
struct Harness {
    let client: ConvoHopClient
    let http: StubHTTP
    let sockets: FakeWebSocketFactory
    let clock: TestClock
    let storage: InMemoryRecoveryStorage

    /// Creates a client for the test user. `route` answers `communication.route` with a valid route.
    static func make(
        token: String = "user-token", refresh: ConvoHopSessionRefresh? = nil, route: Bool = true,
        sockets: FakeWebSocketFactory = FakeWebSocketFactory(), clock: TestClock = TestClock(),
        storage: InMemoryRecoveryStorage = InMemoryRecoveryStorage()
    ) async throws -> Harness {
        let http = StubHTTP()
        if route {
            await http.on("communication.route") { request in
                Reply.ok(request, ["result": Fixture.route(now: clock.now)], now: clock.now)
            }
        }
        let configuration = ConvoHopConfiguration(
            baseURL: URL(string: Fixture.baseURL)!, projectId: TestIDs.project, principalId: TestIDs.principal,
            incarnation: TestIDs.incarnation, sessionToken: token, recoveryStorage: storage,
            refreshSession: refresh, httpClient: http, webSocketFactory: sockets)
        let client = try ConvoHopClient(configuration: configuration, environment: clock.environment)
        return Harness(client: client, http: http, sockets: sockets, clock: clock, storage: storage)
    }
}

/// The error `work` throws, or a failure when it doesn't throw.
func thrownError<T>(
    isolation: isolated (any Actor)? = #isolation, file: StaticString = #filePath, line: UInt = #line,
    _ work: () async throws -> T
) async -> (any Error)? {
    do {
        _ = try await work()
        XCTFail("Expected an error", file: file, line: line)
        return nil
    } catch {
        return error
    }
}

/// The ``ConvoHopError`` `work` throws.
func convoHopError<T>(
    isolation: isolated (any Actor)? = #isolation, file: StaticString = #filePath, line: UInt = #line,
    _ work: () async throws -> T
) async -> ConvoHopError? {
    let error = await thrownError(isolation: isolation, file: file, line: line, work)
    guard let error else { return nil }
    guard let convoHop = error as? ConvoHopError else {
        XCTFail("Expected a ConvoHopError, got \(error)", file: file, line: line)
        return nil
    }
    return convoHop
}
