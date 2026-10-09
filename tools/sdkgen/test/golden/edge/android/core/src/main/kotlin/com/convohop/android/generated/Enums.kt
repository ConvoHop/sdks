// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.android.generated

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive

/**
 * Kinds of fruit.
 * The values are deliberately unsorted.
 */
public enum class Fruit {
    /** Curved and yellow. */
    BANANA,
    APPLE,
    cherry,
    apple10,
    apple9,
    /** Deprecated: No longer supported */
    DATE,
    /**
     * Elderberries.
     * Deprecated: Use APPLE.
     */
    ELDER,
    ;

    /** The GraphQL value. */
    public fun toJson(): JsonPrimitive = JsonPrimitive(name)

    public companion object {
        /** Decodes [element], throwing [ShapeException] for values this SDK does not know. */
        public fun fromJson(element: JsonElement, path: String = "Fruit"): Fruit {
            val raw = element.asString(path)
            return entries.firstOrNull { it.name == raw } ?: throw ShapeException(path, "is not a known Fruit value")
        }
    }
}

public enum class HTTPMethod {
    POST,
    GET,
    ;

    /** The GraphQL value. */
    public fun toJson(): JsonPrimitive = JsonPrimitive(name)

    public companion object {
        /** Decodes [element], throwing [ShapeException] for values this SDK does not know. */
        public fun fromJson(element: JsonElement, path: String = "HTTPMethod"): HTTPMethod {
            val raw = element.asString(path)
            return entries.firstOrNull { it.name == raw } ?: throw ShapeException(path, "is not a known HTTPMethod value")
        }
    }
}
