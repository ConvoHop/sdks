package com.convohop.android.core

import com.convohop.android.generated.OperationSpec
import com.convohop.android.generated.Operations
import com.convohop.android.generated.ResolveRequestReply
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

internal class GraphqlPlan(val spec: OperationSpec<*, *>, val body: JsonObject)

internal fun operationSpec(key: String): OperationSpec<*, *> =
    Operations.byId[key] ?: protocolError("Unknown generated GraphQL operation")

/** Builds one authority POST body. Every failure here is the caller's INVALID_REQUEST. */
internal fun buildGraphqlRequest(key: String, input: JsonObject, context: JsonObject): GraphqlPlan {
    val spec = operationSpec(key)
    val operation = spec.descriptor
    if (operation.kind == "subscription") protocolError("Use graphql-transport-ws for subscriptions")
    val projectId = context["projectId"]
    if (operation.plane == "communication") {
        if (projectId == null) protocolError("Communication operations require an explicit project")
        parseId(projectId)
    } else if (projectId != null) {
        protocolError("Management project selection belongs in the generated operation input")
    }
    if (input.keys.any { it !in operation.inputFields }) protocolError("Unknown GraphQL input field")
    val variables = if (operation.inputFields.isEmpty()) {
        jsonObjectOf("context" to context)
    } else {
        jsonObjectOf("context" to context, "input" to input)
    }
    return GraphqlPlan(
        spec,
        jsonObjectOf(
            "query" to operation.document.json(),
            "operationName" to operation.operationName.json(),
            "variables" to variables,
        ),
    )
}

/** Decodes a result, enforcing the schema rules the generated decoder cannot express. */
internal fun decodeChecked(spec: OperationSpec<*, *>, value: JsonObject): Any? {
    val decoded = spec.decodeResult(value)
    val retained = (decoded as? ResolveRequestReply)?.result?.receipt?.result
    if (retained != null && retained.toJson().values.count { it != JsonNull } != 1) {
        protocolError("Retained receipt requires exactly one typed result")
    }
    return decoded
}

private val RETRY_DIGITS = Regex("[0-9]{1,10}")

/** Whole seconds from `extensions.retryAfter`; anything but a non-negative integer is ignored. */
internal fun retryDelay(value: JsonElement?): Long? =
    if (value.isJsonString()) retryDelay((value as JsonPrimitive).content) else value.safeNonNegativeLong()

/** Whole seconds from an HTTP `Retry-After` delta; dates and other forms are ignored. */
internal fun retryDelay(value: String?): Long? =
    if (value != null && RETRY_DIGITS.matches(value)) value.toLong() else null
