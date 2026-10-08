// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.android.generated

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

public data class Capabilities(
    public val version: String,
    public val wssUrl: String? = null,
    public val features: List<String>,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "version" to JsonPrimitive(this.version),
                "wssUrl" to (this.wssUrl?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "features" to JsonArray(this.features.map { v0 -> JsonPrimitive(v0) }),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match Capabilities. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "Capabilities"): Capabilities {
            val obj = element.asObject(path)
            return Capabilities(
                version = obj.field("version", path).asString("${path}.version"),
                wssUrl = obj.field("wssUrl", path).decodeNullable("${path}.wssUrl") { v0, p0 -> v0.asString(p0) },
                features = obj.field("features", path).decodeList("${path}.features") { v0, p0 -> v0.asString(p0) },
            )
        }
    }
}

public data class Receipt(
    public val requestId: String,
    public val committed: Boolean,
    public val sequence: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "requestId" to JsonPrimitive(this.requestId),
                "committed" to JsonPrimitive(this.committed),
                "sequence" to (this.sequence?.let { v0 -> Scalars.encodeCounter(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match Receipt. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "Receipt"): Receipt {
            val obj = element.asObject(path)
            return Receipt(
                requestId = obj.field("requestId", path).asString("${path}.requestId"),
                committed = obj.field("committed", path).asBoolean("${path}.committed"),
                sequence = obj.field("sequence", path).decodeNullable("${path}.sequence") { v0, p0 -> Scalars.decodeCounter(v0, p0) },
            )
        }
    }
}

public data class Item(
    public val id: String,
    public val name: String,
    public val fruit: Fruit? = null,
    public val weight: Double? = null,
    public val ripe: Boolean,
    /** Deprecated: No longer supported */
    public val oldName: String? = null,
    /**
     * Legacy numeric code.
     * Deprecated: Use id.
     */
    public val legacyCode: Int? = null,
    /** Nested and nullable lists. */
    public val grid: List<List<Int>?>,
    public val aliases: List<String?>? = null,
    public val history: List<List<Fruit?>>? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "id" to JsonPrimitive(this.id),
                "name" to JsonPrimitive(this.name),
                "fruit" to (this.fruit?.let { v0 -> v0.toJson() } ?: JsonNull),
                "weight" to (this.weight?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "ripe" to JsonPrimitive(this.ripe),
                "oldName" to (this.oldName?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "legacyCode" to (this.legacyCode?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "grid" to JsonArray(this.grid.map { v0 -> (v0?.let { v1 -> JsonArray(v1.map { v2 -> JsonPrimitive(v2) }) } ?: JsonNull) }),
                "aliases" to (this.aliases?.let { v0 -> JsonArray(v0.map { v1 -> (v1?.let { v2 -> JsonPrimitive(v2) } ?: JsonNull) }) } ?: JsonNull),
                "history" to (this.history?.let { v0 -> JsonArray(v0.map { v1 -> JsonArray(v1.map { v2 -> (v2?.let { v3 -> v3.toJson() } ?: JsonNull) }) }) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match Item. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "Item"): Item {
            val obj = element.asObject(path)
            return Item(
                id = obj.field("id", path).asString("${path}.id"),
                name = obj.field("name", path).asString("${path}.name"),
                fruit = obj.field("fruit", path).decodeNullable("${path}.fruit") { v0, p0 -> Fruit.fromJson(v0, p0) },
                weight = obj.field("weight", path).decodeNullable("${path}.weight") { v0, p0 -> v0.asDouble(p0) },
                ripe = obj.field("ripe", path).asBoolean("${path}.ripe"),
                oldName = obj.field("oldName", path).decodeNullable("${path}.oldName") { v0, p0 -> v0.asString(p0) },
                legacyCode = obj.field("legacyCode", path).decodeNullable("${path}.legacyCode") { v0, p0 -> v0.asInt(p0) },
                grid = obj.field("grid", path).decodeList("${path}.grid") { v0, p0 -> v0.decodeNullable(p0) { v1, p1 -> v1.decodeList(p1) { v2, p2 -> v2.asInt(p2) } } },
                aliases = obj.field("aliases", path).decodeNullable("${path}.aliases") { v0, p0 -> v0.decodeList(p0) { v1, p1 -> v1.decodeNullable(p1) { v2, p2 -> v2.asString(p2) } } },
                history = obj.field("history", path).decodeNullable("${path}.history") { v0, p0 -> v0.decodeList(p0) { v1, p1 -> v1.decodeList(p1) { v2, p2 -> v2.decodeNullable(p2) { v3, p3 -> Fruit.fromJson(v3, p3) } } } },
            )
        }
    }
}

public data class ItemPage(
    public val items: List<Item>,
    public val complete: Boolean,
    public val refreshRequired: Boolean,
    public val nextCursor: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "items" to JsonArray(this.items.map { v0 -> v0.toJson() }),
                "complete" to JsonPrimitive(this.complete),
                "refreshRequired" to JsonPrimitive(this.refreshRequired),
                "nextCursor" to (this.nextCursor?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match ItemPage. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "ItemPage"): ItemPage {
            val obj = element.asObject(path)
            return ItemPage(
                items = obj.field("items", path).decodeList("${path}.items") { v0, p0 -> Item.fromJson(v0, p0) },
                complete = obj.field("complete", path).asBoolean("${path}.complete"),
                refreshRequired = obj.field("refreshRequired", path).asBoolean("${path}.refreshRequired"),
                nextCursor = obj.field("nextCursor", path).decodeNullable("${path}.nextCursor") { v0, p0 -> v0.asString(p0) },
            )
        }
    }
}

public data class SubjectRef(
    public val kind: String,
    public val id: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "kind" to JsonPrimitive(this.kind),
                "id" to JsonPrimitive(this.id),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match SubjectRef. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "SubjectRef"): SubjectRef {
            val obj = element.asObject(path)
            return SubjectRef(
                kind = obj.field("kind", path).asString("${path}.kind"),
                id = obj.field("id", path).asString("${path}.id"),
            )
        }
    }
}

public data class EventPayload(
    public val itemId: String? = null,
    public val jobId: String? = null,
    public val revision: String? = null,
    public val note: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "itemId" to (this.itemId?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "jobId" to (this.jobId?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "revision" to (this.revision?.let { v0 -> Scalars.encodeCounter(v0) } ?: JsonNull),
                "note" to (this.note?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match EventPayload. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "EventPayload"): EventPayload {
            val obj = element.asObject(path)
            return EventPayload(
                itemId = obj.field("itemId", path).decodeNullable("${path}.itemId") { v0, p0 -> v0.asString(p0) },
                jobId = obj.field("jobId", path).decodeNullable("${path}.jobId") { v0, p0 -> v0.asString(p0) },
                revision = obj.field("revision", path).decodeNullable("${path}.revision") { v0, p0 -> Scalars.decodeCounter(v0, p0) },
                note = obj.field("note", path).decodeNullable("${path}.note") { v0, p0 -> v0.asString(p0) },
            )
        }
    }
}

public data class Event(
    public val sequence: String,
    public val type: String,
    public val subjectRef: SubjectRef,
    public val payload: EventPayload,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "sequence" to Scalars.encodeCounter(this.sequence),
                "type" to JsonPrimitive(this.type),
                "subjectRef" to this.subjectRef.toJson(),
                "payload" to this.payload.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match Event. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "Event"): Event {
            val obj = element.asObject(path)
            return Event(
                sequence = Scalars.decodeCounter(obj.field("sequence", path), "${path}.sequence"),
                type = obj.field("type", path).asString("${path}.type"),
                subjectRef = SubjectRef.fromJson(obj.field("subjectRef", path), "${path}.subjectRef"),
                payload = EventPayload.fromJson(obj.field("payload", path), "${path}.payload"),
            )
        }
    }
}

public data class EventPage(
    public val items: List<Event>,
    public val complete: Boolean,
    public val refreshRequired: Boolean,
    public val nextCursor: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "items" to JsonArray(this.items.map { v0 -> v0.toJson() }),
                "complete" to JsonPrimitive(this.complete),
                "refreshRequired" to JsonPrimitive(this.refreshRequired),
                "nextCursor" to (this.nextCursor?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match EventPage. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "EventPage"): EventPage {
            val obj = element.asObject(path)
            return EventPage(
                items = obj.field("items", path).decodeList("${path}.items") { v0, p0 -> Event.fromJson(v0, p0) },
                complete = obj.field("complete", path).asBoolean("${path}.complete"),
                refreshRequired = obj.field("refreshRequired", path).asBoolean("${path}.refreshRequired"),
                nextCursor = obj.field("nextCursor", path).decodeNullable("${path}.nextCursor") { v0, p0 -> v0.asString(p0) },
            )
        }
    }
}
