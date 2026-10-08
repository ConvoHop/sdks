import Foundation

/// A mutation's recovery record. The transport changes it in place, as the reference runtime does.
final class RecoveryRecord {
    let requestId: String
    let incarnation: String
    let payloadFingerprint: String
    let operation: String
    let projectId: String?
    let input: JSONObject
    let firstSubmittedAt: Int
    let retryDeadline: Int
    var attemptCount: Int
    var lastAttemptAt: Int
    var lastAttemptClassification: String
    var resolutionState: RecoveryState.Resolution
    var mediaAdmissionAttempted: Bool

    init(
        requestId: String, incarnation: String, payloadFingerprint: String, operation: String, projectId: String?,
        input: JSONObject, firstSubmittedAt: Int, retryDeadline: Int, attemptCount: Int, lastAttemptAt: Int,
        lastAttemptClassification: String, resolutionState: RecoveryState.Resolution, mediaAdmissionAttempted: Bool
    ) {
        self.requestId = requestId
        self.incarnation = incarnation
        self.payloadFingerprint = payloadFingerprint
        self.operation = operation
        self.projectId = projectId
        self.input = input
        self.firstSubmittedAt = firstSubmittedAt
        self.retryDeadline = retryDeadline
        self.attemptCount = attemptCount
        self.lastAttemptAt = lastAttemptAt
        self.lastAttemptClassification = lastAttemptClassification
        self.resolutionState = resolutionState
        self.mediaAdmissionAttempted = mediaAdmissionAttempted
    }

    var settled: Bool { resolutionState == .committed || resolutionState == .accepted }

    /// The outcome a failure reports for this record: a pending record may already have been sent.
    var failureOutcome: ConvoHopOutcome {
        resolutionState == .pending ? .unknown : ConvoHopOutcome(rawValue: resolutionState.rawValue)
    }

    var json: JSONValue {
        var members: JSONObject = [
            "requestId": .string(requestId), "incarnation": .string(incarnation),
            "payloadFingerprint": .string(payloadFingerprint), "operation": .string(operation), "input": .object(input),
            "firstSubmittedAt": .number(Double(firstSubmittedAt)), "retryDeadline": .number(Double(retryDeadline)),
            "attemptCount": .number(Double(attemptCount)), "lastAttemptAt": .number(Double(lastAttemptAt)),
            "lastAttemptClassification": .string(lastAttemptClassification),
            "resolutionState": .string(resolutionState.rawValue),
        ]
        if let projectId { members["projectId"] = .string(projectId) }
        if mediaAdmissionAttempted { members["mediaAdmissionAttempted"] = .bool(true) }
        return .object(members)
    }

    var snapshot: RecoveryState {
        RecoveryState(
            requestId: requestId, incarnation: incarnation, payloadFingerprint: payloadFingerprint, operation: operation,
            projectId: projectId, input: input, firstSubmittedAt: firstSubmittedAt, retryDeadline: retryDeadline,
            attemptCount: attemptCount, lastAttemptAt: lastAttemptAt, lastAttemptClassification: lastAttemptClassification,
            resolutionState: resolutionState, mediaAdmissionAttempted: mediaAdmissionAttempted)
    }
}

/// Sends GraphQL requests and keeps the recovery records that make mutation retries safe.
///
/// A port of the reference `ConvoHopTransport`. Mutations keep their request ID, payload, incarnation and retry
/// budget across retries. A transport failure leaves the outcome unknown, never rejected or committed.
actor ConvoHopTransport {
    static let maximumRecords = 128
    static let maximumResponseLength = 1_048_576
    static let retryWindow = 60_000
    static let maximumAttempts = 3

    let baseUrl: String
    let incarnation: String
    let durableRecovery: Bool
    private let endpoint: URL
    private let http: any ConvoHopHTTPClient
    private let storage: (any RecoveryStorage)?
    private let storageKey: String
    private let clock: @Sendable () -> Int

    private var records: [RecoveryRecord] = []
    private var active: [String: (identity: String, token: UUID, work: Task<JSONObject, Error>)] = [:]
    private var recoveryInitialized: Bool
    private var initialization: Task<Void, Error>?
    private var writes: Task<Void, Error>?
    private(set) var servingEpoch: String?

    // The authentication gate a session refresh closes while it swaps credentials.
    private(set) var credential: String?
    private(set) var blocked = false
    private var barrierRaised = false
    private var barrierWaiters: [CheckedContinuation<Void, Never>] = []
    private var activeCount = 0
    private var drainWaiters: [CheckedContinuation<Void, Never>] = []

    init(
        baseUrl: String, credential: String?, namespace: String, incarnation: String, http: any ConvoHopHTTPClient,
        storage: (any RecoveryStorage)?, clock: @escaping @Sendable () -> Int
    ) throws {
        self.baseUrl = try ProtocolChecks.origin(baseUrl)
        guard let endpoint = URL(string: self.baseUrl + GraphQLTransport.path) else {
            throw ProtocolViolation("Invalid authority origin")
        }
        self.endpoint = endpoint
        self.credential = credential
        self.incarnation = incarnation
        self.http = http
        self.storage = storage
        self.durableRecovery = storage != nil
        self.storageKey = "convohop.requests:" + namespace
        self.clock = clock
        self.recoveryInitialized = storage == nil
    }

    func setServingEpoch(_ value: String) {
        servingEpoch = value
    }

    // MARK: Recovery records

    func initializeRecovery() async throws {
        if recoveryInitialized { return }
        let task: Task<Void, Error>
        if let initialization {
            task = initialization
        } else {
            task = Task { try await self.loadRecovery() }
            initialization = task
        }
        try await task.value
    }

    private func loadRecovery() async throws {
        guard let storage else { return }
        let saved: String?
        do {
            saved = try await storage.value(forKey: storageKey)
        } catch {
            throw ConvoHopError(
                code: .recoveryStorageFailure, requestId: newRequestId(), outcome: .rejected, status: nil,
                message: "Recovery storage could not be read; no request was sent", underlyingError: error)
        }
        try restore(saved)
        recoveryInitialized = true
    }

    private func restore(_ saved: String?) throws {
        guard let saved else { return }
        do {
            guard !saved.isEmpty, case .array(let values) = try JSONParser.parse(saved),
                values.count <= Self.maximumRecords
            else { throw ProtocolViolation("Invalid mutation recovery storage") }
            var restored: [RecoveryRecord] = []
            for item in values {
                let value = try ProtocolChecks.object(item)
                let operation = try ProtocolChecks.string(value["operation"])
                guard let descriptor = GraphQLCatalog.operations[operation], descriptor.kind == .mutation,
                    let resolution = RecoveryState.Resolution(rawValue: try ProtocolChecks.string(value["resolutionState"]))
                else { throw ProtocolViolation("Invalid recovery record") }
                let projectId = value["projectId"] == nil ? nil : try ProtocolChecks.id(value["projectId"])
                if (descriptor.plane == "communication") != (projectId != nil) {
                    throw ProtocolViolation("Invalid recovery project scope")
                }
                func clock(_ key: String) throws -> Int {
                    guard case .number(let number)? = value[key], ProtocolChecks.isSafeInteger(number), number >= 0 else {
                        throw ProtocolViolation("Invalid recovery clock or count")
                    }
                    return Int(number)
                }
                let marker = value["mediaAdmissionAttempted"]
                if marker != nil, marker != .bool(true) { throw ProtocolViolation("Invalid native admission marker") }
                let record = RecoveryRecord(
                    requestId: try ProtocolChecks.id(value["requestId"]),
                    incarnation: try ProtocolChecks.string(value["incarnation"]),
                    payloadFingerprint: try ProtocolChecks.string(value["payloadFingerprint"]), operation: operation,
                    projectId: projectId, input: try ProtocolChecks.object(value["input"]),
                    firstSubmittedAt: try clock("firstSubmittedAt"), retryDeadline: try clock("retryDeadline"),
                    attemptCount: try clock("attemptCount"), lastAttemptAt: try clock("lastAttemptAt"),
                    lastAttemptClassification: try ProtocolChecks.string(value["lastAttemptClassification"]),
                    resolutionState: resolution, mediaAdmissionAttempted: marker == .bool(true))
                if restored.contains(where: { $0.requestId == record.requestId }) {
                    throw ProtocolViolation("Duplicate mutation recovery identity")
                }
                restored.append(record)
            }
            for record in restored {
                if let index = records.firstIndex(where: { $0.requestId == record.requestId }) {
                    records[index] = record
                } else {
                    records.append(record)
                }
            }
        } catch {
            throw ConvoHopError(
                code: .recoveryStorageFailure, requestId: newRequestId(), outcome: .rejected, status: nil,
                message: "Recovery storage holds invalid records; no request was sent", underlyingError: error)
        }
    }

    /// Copies of the recovery records, oldest first.
    func recoveryStates() async throws -> [RecoveryState] {
        try await initializeRecovery()
        return records.map(\.snapshot)
    }

    private func record(_ requestId: String) -> RecoveryRecord? {
        records.first { $0.requestId == requestId }
    }

    /// Persists the boundary of a native media attempt without keeping the grant.
    func markMediaAdmissionAttempted(_ requestId: String) async throws {
        guard ProtocolChecks.isCanonicalUUID(requestId) else { throw ConvoHopUsageError("Invalid request ID") }
        try await initializeRecovery()
        guard let record = record(requestId), record.operation == "communication.liveSessionCredentials",
            record.resolutionState == .committed
        else { throw ConvoHopUsageError("Native admission requires a committed credential issuance") }
        record.lastAttemptClassification = "nativeAdmissionAttempted"
        record.mediaAdmissionAttempted = true
        try await persist(record)
    }

    private func persist(_ record: RecoveryRecord) async throws {
        guard let storage else { return }
        let snapshot = JSONValue.array(records.map(\.json)).jsonText()
        let previous = writes, key = storageKey
        // Writes run in order. A failed snapshot fails its caller; a later complete snapshot can repair it.
        let write = Task<Void, Error> {
            _ = await previous?.result
            try await storage.setValue(snapshot, forKey: key)
        }
        writes = write
        do {
            try await write.value
        } catch {
            throw ConvoHopError(
                code: .recoveryStorageFailure, requestId: record.requestId, outcome: record.failureOutcome, status: nil,
                message: "Recovery storage did not confirm durability; retain the original request and its outcome",
                underlyingError: error)
        }
    }

    // MARK: Authentication gate

    func replaceCredential(_ value: String) {
        credential = value
    }

    func setBlocked(_ value: Bool) {
        blocked = value
    }

    /// Holds new requests until ``releaseBarrier()``.
    func raiseBarrier() {
        barrierRaised = true
    }

    func releaseBarrier() {
        barrierRaised = false
        let waiters = barrierWaiters
        barrierWaiters = []
        for waiter in waiters { waiter.resume() }
    }

    /// Waits until the requests that passed the gate have settled. Their callers still receive their own results.
    func drainActive() async {
        while activeCount > 0 {
            await withCheckedContinuation { drainWaiters.append($0) }
        }
    }

    private func authorized<T: Sendable>(_ requestId: String, _ work: (String?) async throws -> T) async throws -> T {
        while true {
            if blocked {
                throw ConvoHopError(
                    code: .sessionRefreshRequired, requestId: requestId,
                    outcome: record(requestId)?.failureOutcome ?? .rejected, status: 409,
                    message: "Session authority is unverified; recover the original renewal or explicitly retire this client")
            }
            guard barrierRaised else { break }
            await withCheckedContinuation { barrierWaiters.append($0) }
        }
        activeCount += 1
        defer {
            activeCount -= 1
            if activeCount == 0 {
                let waiters = drainWaiters
                drainWaiters = []
                for waiter in waiters { waiter.resume() }
            }
        }
        return try await work(credential)
    }

    // MARK: Requests

    /// Sends an operation and returns its validated reply object.
    func execute(
        _ key: String, projectId: String?, input: JSONObject, requestId: String? = nil, permit: JSONObject? = nil
    ) async throws -> JSONObject {
        let requestId = requestId ?? newRequestId()
        let incarnation = self.incarnation
        _ = try plan(key, projectId: projectId, input: input, requestId: requestId, permit: permit)
        return try await authorized(requestId) { credential in
            try await self.executeAuthorized(
                key, projectId: projectId, body: input, requestId: requestId, permit: permit, incarnation: incarnation,
                credential: credential, observedServingEpoch: nil)
        }
    }

    /// Sends an ephemeral signal, such as typing. It keeps no recovery record and is never resent.
    func signal(_ key: String, projectId: String, input: JSONObject) async throws -> JSONObject {
        let requestId = newRequestId()
        guard let operation = GraphQLCatalog.operations[key], operation.idempotency.name == "ephemeral" else {
            throw ConvoHopUsageError("Only ephemeral operations are sent as signals")
        }
        _ = try plan(key, projectId: projectId, input: input, requestId: requestId, permit: nil)
        return try await authorized(requestId) { credential in
            try await self.request(
                key, projectId: projectId, input: input, requestId: requestId, credential: credential, permit: nil,
                observedServingEpoch: nil, signal: true)
        }
    }

    /// Sends a session probe with an explicit credential, bypassing the gate that a refresh holds.
    func probe(
        _ key: String, projectId: String, credential: String, observedServingEpoch: String? = nil
    ) async throws -> JSONObject {
        try await executeAuthorized(
            key, projectId: projectId, body: [:], requestId: newRequestId(), permit: nil, incarnation: incarnation,
            credential: credential, observedServingEpoch: observedServingEpoch)
    }

    private func executeAuthorized(
        _ key: String, projectId: String?, body: JSONObject, requestId: String, permit: JSONObject?,
        incarnation: String, credential: String?, observedServingEpoch: String?
    ) async throws -> JSONObject {
        let operation = try plan(key, projectId: projectId, input: body, requestId: requestId, permit: permit).operation
        try await initializeRecovery()
        if self.incarnation != incarnation { throw incarnationMismatch(requestId) }
        let result =
            operation.kind == .mutation
            ? try await mutate(
                key, projectId: projectId, input: body, requestId: requestId, credential: credential, permit: permit)
            : try await request(
                key, projectId: projectId, input: body, requestId: requestId, credential: credential, permit: permit,
                observedServingEpoch: observedServingEpoch)
        if key == "communication.resolveRequest" {
            let target = body["requestId"]
            guard case .object(let resolution)? = result["result"] else {
                throw ConvoHopError(
                    code: .invalidResponse, requestId: requestId, outcome: .unknown, status: 503,
                    message: "Missing current request resolution")
            }
            let receipt = resolution["receipt"]
            if resolution["requestId"] != target
                || (receipt != nil && receipt != .null && receipt?.objectValue?["requestId"] != target)
            {
                throw ConvoHopError(
                    code: .invalidResponse, requestId: requestId, outcome: .unknown, status: 503,
                    message: "Request resolution identity changed")
            }
            if let state = target?.stringValue.flatMap({ record($0) }) {
                if state.projectId != projectId || state.incarnation != self.incarnation {
                    throw ConvoHopError(
                        code: .resolutionRequired, requestId: requestId, outcome: .unknown, status: 409,
                        message: "Resolve within the original project and incarnation")
                }
                if let observed = resolution["state"]?.stringValue, observed == "committed" || observed == "accepted" {
                    if state.resolutionState != .committed {
                        state.resolutionState = observed == "committed" ? .committed : .accepted
                    }
                    state.lastAttemptClassification = "authorityReceipt"
                    try await persist(state)
                }
            }
        }
        return result
    }

    private func mutate(
        _ operation: String, projectId: String?, input: JSONObject, requestId: String, credential: String?,
        permit: JSONObject?, retry: Bool = false
    ) async throws -> JSONObject {
        let incarnation = self.incarnation
        let identity = try Self.canonical([
            "operation": .string(operation), "projectId": projectId.map(JSONValue.string) ?? .null,
            "input": .object(input), "incarnation": .string(incarnation),
        ])
        if let entry = active[requestId] {
            if entry.identity != identity { throw idempotencyConflict(requestId) }
            return try await entry.work.value
        }
        let token = UUID()
        let work = Task<JSONObject, Error> {
            try await self.mutation(
                operation, projectId: projectId, input: input, requestId: requestId, credential: credential,
                permit: permit, retry: retry, incarnation: incarnation)
        }
        active[requestId] = (identity, token, work)
        defer { if active[requestId]?.token == token { active[requestId] = nil } }
        return try await work.value
    }

    private func mutation(
        _ operation: String, projectId: String?, input: JSONObject, requestId: String, credential: String?,
        permit: JSONObject?, retry: Bool, incarnation: String
    ) async throws -> JSONObject {
        let hash = try Self.fingerprint(operation: operation, projectId: projectId, input: input)
        if self.incarnation != incarnation { throw incarnationMismatch(requestId) }
        var state = record(requestId)
        if let existing = state {
            let sameInput = try Self.canonical(.object(existing.input)) == Self.canonical(.object(input))
            if existing.payloadFingerprint != hash || existing.incarnation != incarnation
                || existing.operation != operation || existing.projectId != projectId || !sameInput
            {
                throw idempotencyConflict(requestId)
            }
        }
        if retry, state == nil || state!.settled || state!.mediaAdmissionAttempted {
            throw resolutionRequired(requestId, "The original request is no longer eligible for resend")
        }
        if state == nil {
            if records.count >= Self.maximumRecords {
                guard let index = records.firstIndex(where: { $0.settled && active[$0.requestId] == nil }) else {
                    throw ConvoHopError(
                        code: .resolutionRequired, requestId: requestId, outcome: .rejected, status: 409,
                        message: "Resolve outstanding mutations before creating more")
                }
                records.remove(at: index)
            }
            let now = clock()
            let created = RecoveryRecord(
                requestId: requestId, incarnation: incarnation, payloadFingerprint: hash, operation: operation,
                projectId: projectId, input: input, firstSubmittedAt: now, retryDeadline: now + Self.retryWindow,
                attemptCount: 0, lastAttemptAt: now, lastAttemptClassification: "notSubmitted", resolutionState: .pending,
                mediaAdmissionAttempted: false)
            records.append(created)
            state = created
            try await persist(created)
        }
        return try await submit(state!, credential: credential, permit: permit, retry: retry)
    }

    private func submit(
        _ state: RecoveryRecord, credential: String?, permit: JSONObject?, retry: Bool
    ) async throws -> JSONObject {
        if state.incarnation != incarnation { throw incarnationMismatch(state.requestId) }
        let now = clock()
        if state.attemptCount >= Self.maximumAttempts || now > state.retryDeadline || now < state.firstSubmittedAt
            || now < state.lastAttemptAt
        {
            throw resolutionRequired(
                state.requestId, "Retry budget expired or clock changed; resolve this request read-only")
        }
        state.attemptCount += 1
        state.lastAttemptAt = now
        if state.resolutionState == .pending { state.resolutionState = .unknown }
        state.lastAttemptClassification = "submitted"
        try await persist(state)
        if state.incarnation != incarnation { throw incarnationMismatch(state.requestId) }
        let submittingAt = clock()
        if submittingAt > state.retryDeadline || submittingAt < state.firstSubmittedAt
            || submittingAt < state.lastAttemptAt || (retry && (state.settled || state.mediaAdmissionAttempted))
        {
            throw resolutionRequired(state.requestId, "The original request is no longer eligible for resend")
        }
        let result: JSONObject
        let outcome: RecoveryState.Resolution
        do {
            result = try await request(
                state.operation, projectId: state.projectId, input: state.input, requestId: state.requestId,
                credential: credential, permit: permit, observedServingEpoch: nil)
            switch result["status"] {
            case .string("committed"): outcome = .committed
            case .string("accepted"): outcome = .accepted
            default:
                throw ConvoHopError(
                    code: .invalidResponse, requestId: state.requestId, outcome: .unknown, status: nil,
                    message: "A mutation requires authority receipt evidence")
            }
        } catch {
            state.lastAttemptClassification = (error as? ConvoHopError)?.code.rawValue ?? "opaqueTransportFailure"
            try await persist(state)
            throw error
        }
        if state.resolutionState != .committed { state.resolutionState = outcome }
        state.lastAttemptClassification = "authorityReceipt"
        try await persist(state)
        return result
    }

    /// Resends a recorded mutation after the authority confirms it never observed it, then returns the current
    /// resolution.
    func retry(_ requestId: String) async throws -> JSONObject {
        guard ProtocolChecks.isCanonicalUUID(requestId) else { throw ConvoHopUsageError("Invalid request ID") }
        return try await authorized(requestId) { credential in
            try await self.retryAuthorized(requestId, credential: credential)
        }
    }

    private func retryAuthorized(_ requestId: String, credential: String?) async throws -> JSONObject {
        try await initializeRecovery()
        guard let state = record(requestId) else {
            throw ConvoHopUsageError("No recovery record exists; do not invent a replacement identity")
        }
        if state.incarnation != incarnation { throw incarnationMismatch(requestId) }
        if GraphQLCatalog.operations[state.operation]?.idempotency.name == "permitBound" {
            throw ConvoHopError(
                code: .credentialRequired, requestId: requestId, outcome: .unknown, status: 409,
                message: "Delivery permits cannot authorize request lookup; obtain a current permit and submit the "
                    + "same delivery identity explicitly")
        }
        let current = try await resolution(of: state, credential: credential)
        let observed = current["state"]?.stringValue
        if observed == "committed" || observed == "accepted" { return current }
        guard observed == "notObservedYet" else {
            throw ConvoHopError(
                code: .invalidResponse, requestId: requestId, outcome: .unknown, status: nil,
                message: "Unknown request resolution state")
        }
        if state.settled || state.mediaAdmissionAttempted {
            throw resolutionRequired(
                requestId, "Previously observed commit or native admission cannot be retried from absent evidence")
        }
        if try Self.fingerprint(operation: state.operation, projectId: state.projectId, input: state.input)
            != state.payloadFingerprint
        {
            throw ConvoHopError(
                code: .recoveryStorageFailure, requestId: requestId, outcome: .unknown, status: nil,
                message: "Recovery input fingerprint changed")
        }
        _ = try await mutate(
            state.operation, projectId: state.projectId, input: state.input, requestId: state.requestId,
            credential: credential, permit: nil, retry: true)
        return try await resolution(of: state, credential: credential)
    }

    private func resolution(of state: RecoveryRecord, credential: String?) async throws -> JSONObject {
        let lookup = newRequestId()
        let reply = try await executeAuthorized(
            "communication.resolveRequest", projectId: state.projectId, body: ["requestId": .string(state.requestId)],
            requestId: lookup, permit: nil, incarnation: incarnation, credential: credential,
            observedServingEpoch: nil)
        guard case .object(let resolution)? = reply["result"] else {
            throw ConvoHopError(
                code: .invalidResponse, requestId: lookup, outcome: .unknown, status: nil,
                message: "Missing current request resolution")
        }
        return resolution
    }

    /// Builds a request body. A nil `observedServingEpoch` means the current serving epoch.
    private func plan(
        _ key: String, projectId: String?, input: JSONObject, requestId: String, permit: JSONObject?,
        observedServingEpoch: String? = nil
    ) throws -> GraphQLRequestPlan {
        let epoch = observedServingEpoch ?? servingEpoch
        do {
            var context: JSONObject = ["requestId": .string(try ProtocolChecks.id(requestId))]
            if let projectId { context["projectId"] = .string(try ProtocolChecks.id(projectId)) }
            if let permit { context["credentialDeliveryPermit"] = .object(permit) }
            context["incarnation"] = .string(incarnation)
            if let epoch { context["observedServingEpoch"] = .string(epoch) }
            let plan = try GraphQLRequestBuilder.build(key: key, input: input, context: context)
            _ = try plan.body.canonicalText()
            return plan
        } catch let violation as ProtocolViolation {
            throw ConvoHopError(
                code: .invalidRequest, requestId: requestId, outcome: .rejected, status: 400, message: violation.message)
        } catch {
            throw ConvoHopError(
                code: .invalidRequest, requestId: requestId, outcome: .rejected, status: 400,
                message: "Request numbers must be finite and within the safe-integer range")
        }
    }

    private func request(
        _ key: String, projectId: String?, input: JSONObject, requestId: String, credential: String?,
        permit: JSONObject?, observedServingEpoch: String?, signal: Bool = false
    ) async throws -> JSONObject {
        let plan = try plan(
            key, projectId: projectId, input: input, requestId: requestId, permit: permit,
            observedServingEpoch: observedServingEpoch)
        var headers = ["accept": "application/json", "content-type": "application/json"]
        if let credential { headers["authorization"] = "Bearer " + credential }
        let body = try plan.body.canonicalText()
        let response: ConvoHopHTTPResponse
        do {
            response = try await http.send(
                ConvoHopHTTPRequest(url: endpoint, method: "POST", headers: headers, body: Data(body.utf8)))
        } catch {
            throw ConvoHopError(
                code: .transportUnknown, requestId: requestId, outcome: .unknown, status: nil,
                message: "Authority response unavailable; resolve the original request")
        }
        let status = response.status
        let text = String(decoding: response.body, as: UTF8.self)
        if response.body.count > 4 * Self.maximumResponseLength || text.utf16.count > Self.maximumResponseLength {
            throw ConvoHopError(
                code: .invalidResponse, requestId: requestId, outcome: .unknown, status: status,
                message: "Authority response exceeds the bound")
        }
        let decoded: JSONValue
        do {
            decoded = try JSONParser.parse(text)
        } catch {
            throw ConvoHopError(
                code: .invalidResponse, requestId: requestId, outcome: .unknown, status: status,
                message: "Unrecognized authority response")
        }
        do {
            let graphql = try ProtocolChecks.object(decoded)
            if case .array(let errors)? = graphql["errors"], let first = errors.first {
                let error = try ProtocolChecks.object(first)
                let extensions =
                    (error["extensions"] == nil || error["extensions"]!.isNull)
                    ? [:] : try ProtocolChecks.object(error["extensions"])
                throw ConvoHopError(
                    code: ConvoHopErrorCode(rawValue: extensions["code"]?.stringValue ?? "GRAPHQL_ERROR"),
                    requestId: requestId, outcome: ConvoHopOutcome(rawValue: extensions["outcome"]?.stringValue ?? "unknown"),
                    status: Self.status(extensions["status"]) ?? 503,
                    message: error["message"]?.stringValue ?? "GraphQL rejected the request",
                    retryAfter: Self.retryDelay(extensions["retryAfter"])
                        ?? Self.retryDelay(response.headers["retry-after"].map(JSONValue.string)))
            }
            guard (200..<300).contains(status) else {
                throw ConvoHopError(
                    code: ConvoHopErrorCode(rawValue: graphql["code"]?.stringValue ?? "HTTP_FAILURE"), requestId: requestId,
                    outcome: ConvoHopOutcome(rawValue: graphql["outcome"]?.stringValue ?? "unknown"), status: status,
                    message: graphql["message"]?.stringValue ?? "Authority rejected the request",
                    retryAfter: Self.retryDelay(graphql["retryAfter"])
                        ?? Self.retryDelay(response.headers["retry-after"].map(JSONValue.string)))
            }
            let value = try ProtocolChecks.object(try ProtocolChecks.object(graphql["data"])[plan.operation.field])
            try ProtocolChecks.validateOutput(.object(value), plan.operation.resultType)
            let envelope = try ProtocolChecks.string(value["status"])
            guard ["ok", "committed", "accepted"].contains(envelope) else {
                throw ProtocolViolation("Unrecognized authority envelope")
            }
            if try ProtocolChecks.id(value["requestId"]) != requestId {
                throw ConvoHopError(
                    code: .invalidResponse, requestId: requestId, outcome: .unknown, status: status,
                    message: "Mismatched authority request identity")
            }
            if plan.operation.kind == .mutation {
                switch envelope {
                case "committed":
                    _ = try ProtocolChecks.id(value["receiptId"])
                    _ = try ProtocolChecks.timestamp(value["committedAt"])
                    _ = try ProtocolChecks.boolean(value["replayed"])
                case "accepted":
                    _ = try ProtocolChecks.id(try ProtocolChecks.object(value["operation"])["operationId"])
                default:
                    if !signal { throw ProtocolViolation("A mutation requires authority receipt evidence") }
                }
            }
            return value
        } catch let violation as ProtocolViolation {
            _ = violation
            throw ConvoHopError(
                code: .invalidResponse, requestId: requestId, outcome: .unknown, status: status,
                message: "Malformed authority response; resolve the original request")
        }
    }

    // MARK: Helpers

    /// Whole seconds from `extensions.retryAfter` or an HTTP `Retry-After` delay. Anything else is ignored.
    static func retryDelay(_ value: JSONValue?) -> Int? {
        switch value {
        case .string(let text)?:
            let scalars = text.unicodeScalars
            guard (1...10).contains(scalars.count), scalars.allSatisfy(\.isASCIIDigit), let number = Int(text) else {
                return nil
            }
            return number
        case .number(let number)?:
            return ProtocolChecks.isSafeInteger(number) && number >= 0 ? Int(number) : nil
        default:
            return nil
        }
    }

    private static func status(_ value: JSONValue?) -> Int? {
        guard case .number(let number)? = value, ProtocolChecks.isSafeInteger(number) else { return nil }
        return Int(number)
    }

    static func canonical(_ value: JSONValue) throws -> String {
        do {
            return try value.canonicalText()
        } catch {
            throw ConvoHopError(
                code: .invalidRequest, requestId: newRequestId(), outcome: .rejected, status: 400,
                message: "Request numbers must be finite and within the safe-integer range")
        }
    }

    static func fingerprint(operation: String, projectId: String?, input: JSONObject) throws -> String {
        let payload: JSONValue = [
            "operation": .string(operation), "projectId": projectId.map(JSONValue.string) ?? .null,
            "input": .object(input),
        ]
        _ = try canonical(payload)
        return try payload.fingerprint()
    }

    private func incarnationMismatch(_ requestId: String) -> ConvoHopError {
        ConvoHopError(
            code: .incarnationMismatch, requestId: requestId, outcome: .unknown, status: 409,
            message: "Explicit recovery is required for this incarnation")
    }

    private func idempotencyConflict(_ requestId: String) -> ConvoHopError {
        ConvoHopError(
            code: .idempotencyConflict, requestId: requestId, outcome: .unknown, status: 409,
            message: "Preserve the original request and payload")
    }

    private func resolutionRequired(_ requestId: String, _ message: String) -> ConvoHopError {
        ConvoHopError(code: .resolutionRequired, requestId: requestId, outcome: .unknown, status: 409, message: message)
    }
}
