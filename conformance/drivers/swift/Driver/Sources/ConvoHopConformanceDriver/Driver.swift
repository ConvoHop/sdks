// ConvoHop conformance driver for the Swift SDK: NDJSON over stdio (spec/conformance/driver-protocol.md).
import ConvoHop
import Foundation

#if canImport(Glibc)
    import Glibc
#endif

let driverInfo: JSON = ["name": "convohop-swift", "version": "0.1.0", "language": "swift"]

enum ProtocolCode: String {
    case invalidRequest = "INVALID_REQUEST"
    case unknownMethod = "UNKNOWN_METHOD"
    case unknownHandle = "UNKNOWN_HANDLE"
    case unsupported = "UNSUPPORTED"
}

struct ProtocolError: Error {
    let code: ProtocolCode
    let message: String

    init(_ code: ProtocolCode, _ message: String) {
        self.code = code
        self.message = message
    }
}

struct Subscription {
    let client: String
    let stream: ConversationStream
    let recorder: Recorder
}

/// One response line, and whether the driver exits after writing it.
struct Reply {
    let line: String
    let exits: Bool
}

/// Driver state. Requests run one at a time, in arrival order.
actor Driver {
    private var negotiated = false
    private var clients: [String: ConvoHopClient] = [:]
    private var subscriptions: [(name: String, entry: Subscription)] = []
    private var storages: [String: InMemoryRecoveryStorage] = [:]

    func process(_ line: String) async -> Reply? {
        if line.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return nil }
        guard let request = try? JSON.parse(Data(line.utf8)) else {
            return reply(["id": nil, "error": ["code": "INVALID_REQUEST", "message": "Request is not valid JSON"]])
        }
        var id: JSON = .null
        if case .object(let fields) = request, case .number(let number)? = fields["id"],
            number.rounded(.towardZero) == number, number >= 1, number <= 9_007_199_254_740_991
        {
            id = .number(number)
        }
        do {
            guard case .object(let fields) = request, id != .null else {
                throw ProtocolError(.invalidRequest, "id must be a positive integer")
            }
            guard case .string(let method)? = fields["method"] else {
                throw ProtocolError(.invalidRequest, "method must be a string")
            }
            let params: JSON = fields["params"] == nil || fields["params"] == .null ? [:] : fields["params"]!
            guard case .object(let args) = params else { throw ProtocolError(.invalidRequest, "params must be an object") }
            let result = try await dispatch(method, args)
            if method == "shutdown" {
                await reset()
                return reply(["id": id, "result": result], exits: true)
            }
            return reply(["id": id, "result": result])
        } catch {
            return reply(["id": id, "error": failure(error)])
        }
    }

    private func reply(_ message: JSON, exits: Bool = false) -> Reply {
        Reply(line: message.rendered, exits: exits)
    }

    private func failure(_ error: any Error) -> JSON {
        switch error {
        case let error as ProtocolError: return ["code": .string(error.code.rawValue), "message": .string(error.message)]
        case let error as ParamsError: return ["code": "INVALID_PARAMS", "message": .string(error.message)]
        default: return ["code": "DRIVER_FAILURE", "message": .string(String(describing: error))]
        }
    }

    private func dispatch(_ method: String, _ args: Args) async throws -> JSON {
        if !negotiated && method != "hello" {
            throw ProtocolError(.invalidRequest, "hello must be the first request")
        }
        switch method {
        case "hello": return try hello()
        case "client.create": return try createHandle(args)
        case "client.close": return try await closeHandle(args)
        case "invoke": return try await invoke(args)
        case "realtime.subscribe": return try await subscribe(args)
        case "realtime.collect": return try await collect(args)
        case "realtime.close": return try await closeSubscription(args)
        case "webhooks.verify":
            throw ProtocolError(.unsupported, "This driver does not declare the webhooks.verify feature")
        case "reset":
            await reset()
            return [:]
        case "shutdown": return [:]
        default: throw ProtocolError(.unknownMethod, "Unknown method \(method)")
        }
    }

    private func hello() throws -> JSON {
        if negotiated { throw ProtocolError(.invalidRequest, "hello was already negotiated") }
        negotiated = true
        let operations = JSON.array(userOperations.map { .string($0.name) })
        return ["driver": driverInfo, "roles": [declaredRole: ["operations": operations]], "features": .array(features)]
    }

    private func client(_ args: Args) throws -> (name: String, client: ConvoHopClient) {
        let name = try text(args, "client")
        guard let found = clients[name] else { throw ProtocolError(.unknownHandle, "Unknown client handle \(name)") }
        return (name, found)
    }

    private func subscription(_ args: Args) throws -> (name: String, entry: Subscription) {
        let name = try text(args, "subscription")
        guard let found = subscriptions.first(where: { $0.name == name }) else {
            throw ProtocolError(.unknownHandle, "Unknown subscription handle \(name)")
        }
        return found
    }

    private func createHandle(_ args: Args) throws -> JSON {
        let name = try handle(args, "client")
        if clients[name] != nil { throw ParamsError("Client handle \(name) already exists") }
        let role = try text(args, "role")
        guard knownRoles.contains(role) else {
            throw ParamsError("role must be one of \(knownRoles.joined(separator: ", "))")
        }
        guard role == declaredRole else {
            throw ProtocolError(.unsupported, "This driver does not declare the \(role) role")
        }
        let storageName = args["storage"] == nil ? nil : try handle(args, "storage")
        let storage = storageName.map { storages[$0] ?? InMemoryRecoveryStorage() }
        clients[name] = try createClient(
            ClientSpec(
                baseUrl: try text(args, "baseUrl"), credential: try text(args, "credential"),
                projectId: try optionalText(args, "projectId"), incarnation: try optionalText(args, "incarnation"),
                principalId: try optionalText(args, "principalId"), actorId: try optionalText(args, "actorId"),
                storage: storage))
        if let storageName, let storage { storages[storageName] = storage }
        return [:]
    }

    private func closeHandle(_ args: Args) async throws -> JSON {
        let (name, _) = try client(args)
        clients[name] = nil
        let owned = subscriptions.filter { $0.entry.client == name }
        subscriptions.removeAll { $0.entry.client == name }
        for (_, entry) in owned { await stop(entry) }
        return [:]
    }

    private func invoke(_ args: Args) async throws -> JSON {
        let (_, target) = try client(args)
        let name = try text(args, "operation")
        let input = args["args"] == nil ? [:] : try record(args["args"], "args")
        guard let operation = userOperations.first(where: { $0.name == name }) else {
            throw ProtocolError(.unsupported, "The \(declaredRole) role does not implement \(name)")
        }
        do {
            return ["ok": true, "value": try await operation.run(target, input)]
        } catch let error as ParamsError {
            throw error
        } catch {
            return ["ok": false, "error": driverError(error)]
        }
    }

    private func subscribe(_ args: Args) async throws -> JSON {
        let (owner, target) = try client(args)
        let name = try handle(args, "subscription")
        if subscriptions.contains(where: { $0.name == name }) {
            throw ParamsError("Subscription handle \(name) already exists")
        }
        let conversationId = try text(args, "conversationId")
        let recorder = Recorder()
        let stream: ConversationStream
        do {
            stream = try await watch(target, conversationId, into: recorder)
        } catch {
            return ["ok": false, "error": driverError(error)]
        }
        subscriptions.append((name, Subscription(client: owner, stream: stream, recorder: recorder)))
        return ["ok": true]
    }

    private func collect(_ args: Args) async throws -> JSON {
        let (_, entry) = try subscription(args)
        let until = args["until"] == nil ? [:] : try record(args["until"], "until")
        let count = try integer(until, "count", 0, 100_000)
        let sequence = try counter(until, "sequence")
        if let closed = until["closed"], closed != .bool(true) {
            throw ParamsError("until.closed must be true when present")
        }
        let untilClosed = until["closed"] != nil
        let timeoutMs = try integer(args, "timeoutMs", 0, 60_000)
        let settleMs = try integer(args, "settleMs", 0, 10_000) ?? 0
        guard let timeoutMs else { throw ParamsError("timeoutMs is required") }

        func reached(_ closed: Bool, _ events: Int, _ highest: String?) -> Bool {
            let counted = count.map { events >= $0 } ?? true
            let sequenced = sequence.map { target in highest.map { !Counter.less($0, target) } ?? false } ?? true
            return counted && sequenced && (!untilClosed || closed)
        }
        // A failing stream closes and reports its error in one actor turn, so read `isClosed` before the recorder:
        // a closed stream's final error is then always in the snapshot.
        let deadline = DispatchTime.now().uptimeNanoseconds + UInt64(timeoutMs) * 1_000_000
        while true {
            let closed = await entry.stream.isClosed
            let snapshot = entry.recorder.snapshot()
            if closed || reached(closed, snapshot.events.count, snapshot.highest) { break }
            if DispatchTime.now().uptimeNanoseconds >= deadline { break }
            try? await Task.sleep(nanoseconds: 5_000_000)
        }
        if settleMs > 0 { try? await Task.sleep(nanoseconds: UInt64(settleMs) * 1_000_000) }
        let closed = await entry.stream.isClosed
        let snapshot = entry.recorder.snapshot()
        let satisfied = reached(closed, snapshot.events.count, snapshot.highest)
        return [
            "events": .array(snapshot.events), "errors": .array(snapshot.errors), "closed": .bool(closed),
            "timedOut": .bool(!satisfied && !closed),
        ]
    }

    private func closeSubscription(_ args: Args) async throws -> JSON {
        let (name, entry) = try subscription(args)
        subscriptions.removeAll { $0.name == name }
        await stop(entry)
        return [:]
    }

    func reset() async {
        let entries = subscriptions.map(\.entry)
        subscriptions.removeAll()
        clients.removeAll()
        storages.removeAll()
        for entry in entries { await stop(entry) }
    }

    /// Stops recording, then closes the stream once it has stored the cursor for everything recorded.
    ///
    /// The stream stores its cursor after `apply` returns, on its own task. In the reference driver, JavaScript runs
    /// that continuation before it reads the next request; here it runs concurrently, and closing first would drop the
    /// cursor of a batch the driver already reported. The stream sets `cursor` before it awaits the storage write, so
    /// the write is already queued on the storage actor when the cursor is visible.
    private func stop(_ entry: Subscription) async {
        if let delivered = entry.recorder.stop() {
            let deadline = DispatchTime.now().uptimeNanoseconds + 1_000_000_000
            while DispatchTime.now().uptimeNanoseconds < deadline {
                if await entry.stream.isClosed { break }
                if let cursor = await entry.stream.cursor, !Counter.less(cursor.sequence, delivered) { break }
                try? await Task.sleep(nanoseconds: 2_000_000)
            }
        }
        await entry.stream.close()
    }
}

@main
struct ConformanceDriver {
    static func main() async {
        signal(SIGPIPE, SIG_IGN)
        let driver = Driver()
        for await line in standardInputLines() {
            await respond(to: line, with: driver)
        }
        await driver.reset()
        exit(0)
    }

    /// Standard input's lines without their line breaks, read on a thread of their own. `FileHandle.AsyncBytes`
    /// exists only on Apple platforms.
    private static func standardInputLines() -> AsyncStream<String> {
        let (lines, continuation) = AsyncStream.makeStream(of: String.self)
        Thread {
            while let line = readLine(strippingNewline: true) { continuation.yield(line) }
            continuation.finish()
        }.start()
        return lines
    }

    private static func respond(to text: String, with driver: Driver) async {
        guard let reply = await driver.process(text) else { return }
        do {
            try FileHandle.standardOutput.write(contentsOf: Data((reply.line + "\n").utf8))
        } catch {
            exit(0)
        }
        if reply.exits { exit(0) }
    }
}
