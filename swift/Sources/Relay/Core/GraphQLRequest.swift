import Foundation

/// A GraphQL request body and the operation it sends.
struct GraphQLRequestPlan {
    let operation: GraphQLOperationDescriptor
    let body: JSONValue
}

enum GraphQLRequestBuilder {
    /// Builds the HTTP body of a query or mutation. `context` holds the request-context variables.
    static func build(key: String, input: JSONObject, context: JSONObject) throws -> GraphQLRequestPlan {
        guard let operation = GraphQLCatalog.operations[key] else {
            throw ProtocolViolation("Unknown generated GraphQL operation")
        }
        if operation.kind == .subscription { throw ProtocolViolation("Use graphql-transport-ws for subscriptions") }
        if operation.plane == "communication" {
            guard case .string(let projectId)? = context["projectId"], !projectId.isEmpty else {
                throw ProtocolViolation("Communication operations require an explicit project")
            }
            _ = try ProtocolChecks.id(projectId)
        } else if context["projectId"] != nil {
            throw ProtocolViolation("Management project selection belongs in the generated operation input")
        }
        if input.keys.contains(where: { !operation.inputFields.contains($0) }) {
            throw ProtocolViolation("Unknown GraphQL input field")
        }
        if context["credentialDeliveryPermit"] != nil, key != "communication.redeemCredential",
            key != "communication.acknowledgeCredential"
        {
            throw ProtocolViolation("A credential delivery permit is only valid for redemption or acknowledgement")
        }
        var variables: JSONObject = ["context": .object(context)]
        if !operation.inputFields.isEmpty { variables["input"] = .object(input) }
        return GraphQLRequestPlan(
            operation: operation,
            body: .object([
                "query": .string(operation.document), "operationName": .string(operation.operationName),
                "variables": .object(variables),
            ]))
    }
}
