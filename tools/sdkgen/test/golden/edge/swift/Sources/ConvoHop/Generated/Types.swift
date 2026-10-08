// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.

/// A JSON value. Object scalars such as message properties and signed proofs use it.
public enum JSONValue: Hashable, Sendable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSONValue])
    case object([String: JSONValue])
}

/// A JSON object.
public typealias JSONObject = [String: JSONValue]

extension JSONValue: Codable {
    public init(from decoder: any Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            self = .object(try container.decode([String: JSONValue].self))
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .null: try container.encodeNil()
        case .bool(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .string(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .object(let value): try container.encode(value)
        }
    }
}

/// The input of an operation that takes none.
public struct NoInput: Codable, Hashable, Sendable {
    public init() {}
}

public struct Box_3dInput: Codable, Hashable, Sendable {
    public var width: Double
    public var height: Double
    public var depth: Double

    public init(
        width: Double,
        height: Double,
        depth: Double
    ) {
        self.width = width
        self.height = height
        self.depth = depth
    }
}

public struct Capabilities: Codable, Hashable, Sendable {
    public var version: String
    public var wssUrl: String?
    public var features: [String]

    public init(
        version: String,
        wssUrl: String? = nil,
        features: [String]
    ) {
        self.version = version
        self.wssUrl = wssUrl
        self.features = features
    }
}

/// Request metadata that every root field takes.
public struct ContextInput: Codable, Hashable, Sendable {
    /// Tenant that owns the request.
    public var tenant: String?
    public var requestId: String
    public var attempt: Int?
    /// Single-use permit. Only alpha.redeem accepts it.
    public var permit: String?
    public var tags: [String]?

    public init(
        tenant: String? = nil,
        requestId: String,
        attempt: Int? = nil,
        permit: String? = nil,
        tags: [String]? = nil
    ) {
        self.tenant = tenant
        self.requestId = requestId
        self.attempt = attempt
        self.permit = permit
        self.tags = tags
    }
}

public struct Event: Codable, Hashable, Sendable {
    public var sequence: String
    public var type: String
    public var subjectRef: SubjectRef
    public var payload: EventPayload

    public init(
        sequence: String,
        type: String,
        subjectRef: SubjectRef,
        payload: EventPayload
    ) {
        self.sequence = sequence
        self.type = type
        self.subjectRef = subjectRef
        self.payload = payload
    }
}

public struct EventPage: Codable, Hashable, Sendable {
    public var items: [Event]
    public var complete: Bool
    public var refreshRequired: Bool
    public var nextCursor: String?

    public init(
        items: [Event],
        complete: Bool,
        refreshRequired: Bool,
        nextCursor: String? = nil
    ) {
        self.items = items
        self.complete = complete
        self.refreshRequired = refreshRequired
        self.nextCursor = nextCursor
    }
}

public struct EventPayload: Codable, Hashable, Sendable {
    public var itemId: String?
    public var jobId: String?
    public var revision: String?
    public var note: String?

    public init(
        itemId: String? = nil,
        jobId: String? = nil,
        revision: String? = nil,
        note: String? = nil
    ) {
        self.itemId = itemId
        self.jobId = jobId
        self.revision = revision
        self.note = note
    }
}

public struct EventsInput: Codable, Hashable, Sendable {
    public var after: String?
    public var limit: Int

    public init(
        after: String? = nil,
        limit: Int
    ) {
        self.after = after
        self.limit = limit
    }
}

public struct FetchInput: Codable, Hashable, Sendable {
    public var method: HTTPMethod?

    public init(
        method: HTTPMethod? = nil
    ) {
        self.method = method
    }
}

/// Kinds of fruit.
/// The values are deliberately unsorted.
public enum Fruit: String, Codable, Hashable, Sendable, CaseIterable {
    /// Curved and yellow.
    case banana = "BANANA"
    case apple = "APPLE"
    case cherry = "cherry"
    case apple10 = "apple10"
    case apple9 = "apple9"
    /// - Note: Deprecated. No longer supported.
    case date = "DATE"
    /// Elderberries.
    ///
    /// - Note: Deprecated. Use APPLE.
    case elder = "ELDER"
}

public enum HTTPMethod: String, Codable, Hashable, Sendable, CaseIterable {
    case post = "POST"
    case get = "GET"
}

public struct Item: Codable, Hashable, Sendable {
    public var id: String
    public var name: String
    public var fruit: Fruit?
    public var weight: Double?
    public var ripe: Bool
    /// - Note: Deprecated. No longer supported.
    public var oldName: String?
    /// Legacy numeric code.
    ///
    /// - Note: Deprecated. Use id.
    public var legacyCode: Int?
    /// Nested and nullable lists.
    public var grid: [[Int]?]
    public var aliases: [String?]?
    public var history: [[Fruit?]]?

    public init(
        id: String,
        name: String,
        fruit: Fruit? = nil,
        weight: Double? = nil,
        ripe: Bool,
        oldName: String? = nil,
        legacyCode: Int? = nil,
        grid: [[Int]?],
        aliases: [String?]? = nil,
        history: [[Fruit?]]? = nil
    ) {
        self.id = id
        self.name = name
        self.fruit = fruit
        self.weight = weight
        self.ripe = ripe
        self.oldName = oldName
        self.legacyCode = legacyCode
        self.grid = grid
        self.aliases = aliases
        self.history = history
    }
}

public struct ItemPage: Codable, Hashable, Sendable {
    public var items: [Item]
    public var complete: Bool
    public var refreshRequired: Bool
    public var nextCursor: String?

    public init(
        items: [Item],
        complete: Bool,
        refreshRequired: Bool,
        nextCursor: String? = nil
    ) {
        self.items = items
        self.complete = complete
        self.refreshRequired = refreshRequired
        self.nextCursor = nextCursor
    }
}

/// Filters for alpha.items.
/// A closing comment marker */ must not end a generated comment.
public struct ItemsInput: Codable, Hashable, Sendable {
    /// Page size.
    /// Defaults to 20.
    public var limit: Int?
    public var cursor: String?
    public var fruits: [Fruit]?
    public var minWeight: Double?
    public var includeDeprecated: Bool?
    public var method: HTTPMethod?
    public var box: Box_3dInput?
    /// - Note: Deprecated. Use fruits.
    public var legacyFilter: String?
    public var item2: Int?
    public var item10: Int?

    public init(
        limit: Int? = nil,
        cursor: String? = nil,
        fruits: [Fruit]? = nil,
        minWeight: Double? = nil,
        includeDeprecated: Bool? = nil,
        method: HTTPMethod? = nil,
        box: Box_3dInput? = nil,
        legacyFilter: String? = nil,
        item2: Int? = nil,
        item10: Int? = nil
    ) {
        self.limit = limit
        self.cursor = cursor
        self.fruits = fruits
        self.minWeight = minWeight
        self.includeDeprecated = includeDeprecated
        self.method = method
        self.box = box
        self.legacyFilter = legacyFilter
        self.item2 = item2
        self.item10 = item10
    }
}

public struct PingInput: Codable, Hashable, Sendable {
    public var note: String?

    public init(
        note: String? = nil
    ) {
        self.note = note
    }
}

public struct Receipt: Codable, Hashable, Sendable {
    public var requestId: String
    public var committed: Bool
    public var sequence: String?

    public init(
        requestId: String,
        committed: Bool,
        sequence: String? = nil
    ) {
        self.requestId = requestId
        self.committed = committed
        self.sequence = sequence
    }
}

public struct ResolveInput: Codable, Hashable, Sendable {
    public var requestId: String

    public init(
        requestId: String
    ) {
        self.requestId = requestId
    }
}

public struct SubjectRef: Codable, Hashable, Sendable {
    public var kind: String
    public var id: String

    public init(
        kind: String,
        id: String
    ) {
        self.kind = kind
        self.id = id
    }
}
