// A stand-in for your backend: it signs users in and creates conversations with the backend key, sending the server
// SDK's GraphQL operations from schema/ir.json. Your backend uses a server SDK instead.
import Foundation

@testable import Examples

private let documents: [String: String] = {
    struct IR: Decodable {
        struct Operation: Decodable {
            struct Document: Decodable { let text: String }
            let plane: String
            let field: String
            let document: Document
        }
        let operations: [Operation]
    }
    do {
        let data = try Data(contentsOf: repositoryRoot.appendingPathComponent("schema/ir.json"))
        let ir = try JSONDecoder().decode(IR.self, from: data)
        var documents: [String: String] = [:]
        for operation in ir.operations where operation.plane == "communication" {
            documents[operation.field] = operation.document.text
        }
        return documents
    } catch {
        fatalError("Can't read schema/ir.json: \(error)")
    }
}()

struct Backend: Sendable {
    let target: MockTarget

    private func call(_ field: String, _ input: [String: Any]) async throws -> [String: Any] {
        guard let document = documents[field] else { throw MockError("No server operation for \(field)") }
        var request = URLRequest(url: target.communicationUrl.appendingPathComponent("graphql"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(target.backendKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "query": document,
            "variables": [
                "context": [
                    "requestId": newRequestId(), "projectId": target.projectId, "incarnation": target.incarnation,
                ],
                "input": input,
            ],
        ])
        let (data, response) = try await URLSession.shared.data(for: request)
        let body = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard (response as? HTTPURLResponse)?.statusCode == 200, body?["errors"] == nil,
            let result = ((body?["data"] as? [String: Any])?[field] as? [String: Any])?["result"] as? [String: Any]
        else { throw MockError("\(field) failed: \(String(decoding: data, as: UTF8.self))") }
        return result
    }

    // What your sign-in endpoint returns to the signed-in user's app.
    func signIn(_ accountId: String) async throws -> SignIn {
        let principal = try await call("createPrincipal", ["externalUserId": accountId])
        var bootstrap = try await call(
            "issueSession",
            [
                "principalId": principal["principalId"] ?? NSNull(), "deviceId": newRequestId(),
                "requestedTtlMs": "900000",
            ])
        bootstrap["baseUrl"] = target.communicationUrl.absoluteString
        bootstrap["projectId"] = target.projectId
        return try JSONDecoder().decode(SignIn.self, from: JSONSerialization.data(withJSONObject: bootstrap))
    }

    func createConversation(_ title: String, _ principalIds: [String]) async throws -> String {
        let conversation = try await call(
            "createConversation",
            [
                "title": title, "props": [String: Any](),
                "members": principalIds.map { ["principalId": $0, "role": "member"] },
            ])
        guard let conversationId = conversation["conversationId"] as? String else {
            throw MockError("createConversation returned no conversationId")
        }
        return conversationId
    }

    // Two signed-in users who share a new conversation.
    func twoMembers(_ title: String) async throws -> (alice: SignIn, bob: SignIn, conversationId: String) {
        let alice = try await signIn("alice-\(newRequestId())")
        let bob = try await signIn("bob-\(newRequestId())")
        let conversationId = try await createConversation(
            title, [alice.session.principalId, bob.session.principalId])
        return (alice, bob, conversationId)
    }
}
