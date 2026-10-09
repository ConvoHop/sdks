// Starts the conformance mock in a Node.js process: the same HTTP and WebSocket server that the SDK's conformance
// tests run against, with a backend key and controls for injecting faults.
import ConvoHop
import Foundation
import XCTest

@testable import Examples

// docs/languages/swift/examples/Tests/ExamplesTests/Mock.swift
let repositoryRoot: URL = {
    var url = URL(fileURLWithPath: #filePath)
    for _ in 0..<7 { url.deleteLastPathComponent() }
    return url
}()

struct MockError: Error, CustomStringConvertible {
    let description: String
    init(_ description: String) { self.description = description }
}

// How the mock drops the next request to a field: before or after it commits the request.
enum Fault: String {
    case dropBeforeCommit
    case dropAfterCommit
}

final class MockTarget: @unchecked Sendable {
    private struct Descriptor: Decodable {
        struct Credentials: Decodable { let backend: String }
        let communicationUrl: URL
        let projectId: String
        let incarnation: String
        let credentials: Credentials
        let control: URL
    }

    struct LoggedRequest: Decodable {
        let kind: String?
        let field: String?
        let requestId: String?
        let code: String?
        let dropped: Bool?
    }

    let communicationUrl: URL
    let projectId: String
    let incarnation: String
    let backendKey: String
    private let control: URL
    private let process: Process

    private init(process: Process, descriptor: Descriptor) {
        self.process = process
        communicationUrl = descriptor.communicationUrl
        projectId = descriptor.projectId
        incarnation = descriptor.incarnation
        backendKey = descriptor.credentials.backend
        control = descriptor.control
    }

    // Runs node from PATH, or CONVOHOP_NODE.
    static func start() async throws -> MockTarget {
        let process = Process()
        let node = ProcessInfo.processInfo.environment["CONVOHOP_NODE"]
        process.executableURL = URL(fileURLWithPath: node ?? "/usr/bin/env")
        process.arguments =
            (node == nil ? ["node"] : []) + [repositoryRoot.appendingPathComponent("conformance/mock/cli.mjs").path]
        let output = Pipe()
        process.standardOutput = output
        try process.run()
        do {
            let line = try await firstLine(of: output.fileHandleForReading)
            return MockTarget(process: process, descriptor: try JSONDecoder().decode(Descriptor.self, from: line))
        } catch {
            process.terminate()
            process.waitUntilExit()
            throw error
        }
    }

    // The mock prints its descriptor on one line. Reads it, then drains the pipe until the mock exits.
    private static func firstLine(of handle: FileHandle) async throws -> Data {
        try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global().async {
                var data = Data()
                var waiting = true
                while true {
                    let chunk = handle.availableData
                    if chunk.isEmpty {
                        if waiting { continuation.resume(throwing: MockError("The mock exited before it started")) }
                        return
                    }
                    guard waiting else { continue }
                    data.append(chunk)
                    if let newline = data.firstIndex(of: 0x0A) {
                        waiting = false
                        continuation.resume(returning: Data(data[..<newline]))
                    }
                }
            }
        }
    }

    func stop() {
        process.terminate()
        process.waitUntilExit()
    }

    func injectFault(_ field: String, _ fault: Fault) async throws {
        var request = URLRequest(url: control.appendingPathComponent("fault"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["field": field, "action": fault.rawValue])
        let (_, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw MockError("The mock refused the fault") }
    }

    // The GraphQL requests that the mock received, oldest first.
    func requests() async throws -> [LoggedRequest] {
        struct Log: Decodable { let entries: [LoggedRequest] }
        let (data, _) = try await URLSession.shared.data(from: control.appendingPathComponent("log"))
        return try JSONDecoder().decode(Log.self, from: data).entries.filter { $0.kind == "request" }
    }

    // For each request to field with requestId, oldest first: whether the mock dropped it.
    func attempts(_ field: String, _ requestId: String) async throws -> [Bool] {
        try await requests().filter { $0.field == field && $0.requestId == requestId }.map { $0.dropped ?? false }
    }
}

extension XCTestCase {
    // A mock for this test alone, so its faults affect no other test.
    @MainActor
    func startMock() async throws -> MockTarget {
        let mock = try await MockTarget.start()
        addTeardownBlock { mock.stop() }
        return mock
    }

    // A directory that the test deletes when it ends. Storage in it outlives a client, as the app's support directory
    // outlives a run of the app.
    func temporaryDirectory() -> URL {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(
            "convohop-docs-\(newRequestId())", isDirectory: true)
        addTeardownBlock { try? FileManager.default.removeItem(at: directory) }
        return directory
    }

    // The app's client for a user, with storage in directory.
    @MainActor
    func connect(_ signIn: SignIn, in directory: URL? = nil) async throws -> ConvoHopClient {
        try await connectUser(signIn, storage: FileRecoveryStorage(directory: directory ?? temporaryDirectory()))
    }

    // The app's Chat for a user. The test stops its outbox when it ends.
    @MainActor
    func openChat(_ signIn: SignIn) async throws -> Chat {
        let storage = try FileRecoveryStorage(directory: temporaryDirectory())
        let chat = try await Chat(client: connectUser(signIn, storage: storage), storage: storage)
        addTeardownBlock { await chat.outbox.stop() }
        return chat
    }

    // A started model of a conversation. The test stops it when it ends.
    @MainActor
    func startModel(of conversationId: String, in chat: Chat) async throws -> ConvoHopConversationModel {
        let conversation = try model(of: conversationId, in: chat)
        await conversation.start()
        addTeardownBlock { await conversation.stop() }
        return conversation
    }
}

// Waits until condition holds.
@MainActor
func eventually(
    _ description: String, timeout: TimeInterval = 15, file: StaticString = #filePath, line: UInt = #line,
    _ condition: @MainActor () async throws -> Bool
) async throws {
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
        if try await condition() { return }
        try await Task.sleep(nanoseconds: 20_000_000)
    }
    if try await condition() { return }
    XCTFail("Timed out waiting for \(description)", file: file, line: line)
    throw MockError("Timed out waiting for \(description)")
}

func newRequestId() -> String { UUID().uuidString.lowercased() }
