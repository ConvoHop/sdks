import Foundation
import XCTest

@testable import ConvoHop

// Native admission, resume and reconnect, as packages/client/test/media-policy.test.mjs checks them for the Web client.

/// A native room that records what the SDK asks of it and reports the events a test emits.
///
/// Unlike `LiveKitMediaRoom`, it keeps its event handler after `disconnect()`, so tests can check that the SDK itself
/// ignores events once a connection closed.
final class FakeMediaRoom: ConvoHopMediaRoom, @unchecked Sendable {
    struct Opened: Equatable {
        let url: String
        let token: String
        let iceTransportPolicy: ConvoHopICETransportPolicy
    }

    let participantId: String
    private let failure: (any Error)?
    private let onConnect: (@Sendable () async -> Void)?
    private let lock = NSLock()
    private var openedCalls: [Opened] = []
    private var handler: (@Sendable (ConvoHopMediaRoomEvent) -> Void)?
    private var disconnectCount = 0
    private var microphoneCalls: [Bool] = []

    init(participantId: String, failure: (any Error)?, onConnect: (@Sendable () async -> Void)?) {
        self.participantId = participantId
        self.failure = failure
        self.onConnect = onConnect
    }

    /// Each connect call, oldest first.
    var opened: [Opened] { lock.locked { openedCalls } }
    var disconnects: Int { lock.locked { disconnectCount } }
    var microphone: [Bool] { lock.locked { microphoneCalls } }

    func connect(
        url: URL, token: String, iceTransportPolicy: ConvoHopICETransportPolicy,
        onEvent: @escaping @Sendable (ConvoHopMediaRoomEvent) -> Void
    ) async throws -> String {
        lock.locked {
            openedCalls.append(Opened(url: url.absoluteString, token: token, iceTransportPolicy: iceTransportPolicy))
            handler = onEvent
        }
        await onConnect?()
        if let failure { throw failure }
        return participantId
    }

    func setMicrophone(enabled: Bool) async throws {
        lock.locked { microphoneCalls.append(enabled) }
    }

    func setCamera(enabled: Bool) async throws {}

    func disconnect() async {
        lock.locked { disconnectCount += 1 }
    }

    /// Reports `event` as a native room does.
    func emit(_ event: ConvoHopMediaRoomEvent) {
        let handler = lock.locked { self.handler }
        handler?(event)
    }
}

/// Recovery storage that can refuse the media admission marker, and shows the request records it holds.
private actor MarkerStorage: RecoveryStorage {
    struct Unavailable: Error {}

    private var values: [String: String] = [:]
    private var refusesMarker = false

    func refuseMarker() { refusesMarker = true }

    /// The stored request records.
    var requests: [JSONObject] {
        values.first { $0.key.hasPrefix("convohop.requests:") }.map { Self.records($0.value) } ?? []
    }

    func value(forKey key: String) -> String? { values[key] }

    func setValue(_ value: String, forKey key: String) throws {
        if refusesMarker, Self.records(value).contains(where: { $0["mediaAdmissionAttempted"]?.boolValue == true }) {
            throw Unavailable()
        }
        values[key] = value
    }

    func removeValue(forKey key: String) { values[key] = nil }

    private static func records(_ text: String) -> [JSONObject] {
        ((try? JSONParser.parse(text))?.arrayValue ?? []).compactMap(\.objectValue)
    }
}

/// A call the test user joined. Stubs answer the live session, credential and resolution requests, and every media
/// connection gets a ``FakeMediaRoom``.
private final class CallFixture: @unchecked Sendable {
    let clock: TestClock
    let http: StubHTTP
    let storage: MarkerStorage
    let client: ConvoHopClient
    let liveSessionId = uuid()
    let participationId = uuid()
    /// The server's record of the participation's native connection.
    let observed = Shared<String?>(nil)
    /// The rooms the SDK created, oldest first.
    let rooms = Shared<[FakeMediaRoom]>([])
    /// The media callbacks, in order.
    let callbacks = Shared<[String]>([])
    /// The participant ID the next room connects as; `nil` for a new UUID.
    let roomParticipantId = Shared<String?>(nil)
    /// The error the next room fails to connect with.
    let roomFailure = Shared<(any Error)?>(nil)
    private let grantFields: JSONObject
    private let roomConnectHook = Shared<(@Sendable () async -> Void)?>(nil)
    private let grants = Shared(0)

    private init(grant fields: JSONObject) throws {
        let clock = TestClock(), http = StubHTTP(), storage = MarkerStorage()
        let configuration = ConvoHopConfiguration(
            baseURL: URL(string: Fixture.baseURL)!, projectId: TestIDs.project, principalId: TestIDs.principal,
            incarnation: TestIDs.incarnation, sessionToken: "user-token", recoveryStorage: storage, httpClient: http,
            webSocketFactory: FakeWebSocketFactory())
        self.clock = clock
        self.http = http
        self.storage = storage
        client = try ConvoHopClient(configuration: configuration, environment: clock.environment)
        grantFields = fields
    }

    /// A call whose credential grants take `fields` over valid values.
    static func make(grant fields: JSONObject = [:]) async throws -> CallFixture {
        let fixture = try CallFixture(grant: fields)
        let clock = fixture.clock
        await fixture.http.on("communication.route") { request in
            Reply.ok(request, ["result": Fixture.route(now: clock.now)], now: clock.now)
        }
        await fixture.http.on("communication.liveSession") { request in
            Reply.ok(request, ["result": fixture.session()], now: clock.now)
        }
        await fixture.http.on("communication.liveSessionCredentials") { request in
            let index = fixture.grants.update { (count: inout Int) -> Int in
                count += 1
                return count - 1
            }
            return Reply.ok(request, ["result": fixture.grant(index)], now: clock.now)
        }
        await fixture.http.on("communication.resolveRequest") { request in
            let requestId = request.input?["requestId"]?.stringValue ?? ""
            let resolution = Fixture.resolution(
                requestId, "committed", retained: ["liveCredentialIssuance": fixture.issuance()])
            return Reply.ok(request, ["result": resolution], now: clock.now)
        }
        return fixture
    }

    /// Runs `hook` inside each room's connect, before it returns.
    func onRoomConnect(_ hook: @escaping @Sendable () async -> Void) {
        roomConnectHook.update { $0 = hook }
    }

    /// The test user's participation in the call.
    func participation() async throws -> LiveParticipationHandle {
        let live = try await client.liveSession(liveSessionId)
        let participation = try await live.participation()
        return try XCTUnwrap(participation)
    }

    func options(iceTransportPolicy: ConvoHopICETransportPolicy = .all) -> ConvoHopMediaOptions {
        let callbacks = callbacks
        return ConvoHopMediaOptions(
            iceTransportPolicy: iceTransportPolicy,
            onDisconnected: { callbacks.update { $0.append("disconnected") } },
            onResuming: { callbacks.update { $0.append("resuming") } },
            onResumed: { callbacks.update { $0.append("resumed") } }
        ) { [self] in
            let room = FakeMediaRoom(
                participantId: roomParticipantId.value ?? uuid(), failure: roomFailure.value,
                onConnect: roomConnectHook.value)
            rooms.update { $0.append(room) }
            return room
        }
    }

    /// The credential requests, oldest first.
    var credentialRequests: [RecordedRequest] {
        get async { await http.requests("communication.liveSessionCredentials") }
    }

    /// Checks that a failed connect admitted nothing: no room exists, and the credential carries no marker.
    func assertNoAdmission(_ description: String, file: StaticString = #filePath, line: UInt = #line) async throws {
        XCTAssertTrue(rooms.value.isEmpty, "no room exists: \(description)", file: file, line: line)
        let states = try await client.recoveryStates()
        XCTAssertEqual(states.map(\.mediaAdmissionAttempted), [false], description, file: file, line: line)
        let stored = await storage.requests
        XCTAssertEqual(stored.count, 1, description, file: file, line: line)
        XCTAssertNil(stored.first?["mediaAdmissionAttempted"], description, file: file, line: line)
    }

    private func session() -> JSONValue {
        let now = clock.now
        let participation = Fixture.full("LiveParticipation", [
            "participationId": .string(participationId), "principalId": .string(TestIDs.principal),
            "membershipEpoch": "1", "role": "PUBLISHER", "state": "JOINED",
            "permissions": ["microphone": true, "camera": false, "subscribe": true],
            "nativeConnectionId": observed.value.map(JSONValue.string) ?? .null,
        ])
        return Fixture.full("LiveSession", [
            "liveSessionId": .string(liveSessionId), "conversationId": .string(TestIDs.conversation),
            "creatorId": .string(TestIDs.principal), "kind": "INTERACTIVE", "mediaProfile": "AUDIO_ONLY",
            "state": "ACTIVE", "generation": "1", "revision": "1", "createdAt": .string(timestamp(now - 60_000)),
            "expiresAt": .string(timestamp(now + 3_600_000)), "myParticipation": participation,
        ])
    }

    /// The `index`th grant. Each has its own connect token, so the room that receives it identifies the grant.
    private func grant(_ index: Int) -> JSONValue {
        let expires = JSONValue.string(timestamp(clock.now + 60_000))
        let proof: JSONValue = ["participationId": .string(participationId)]
        var fields: JSONObject = [
            "liveSessionId": .string(liveSessionId), "participationId": .string(participationId), "generation": "1",
            "roomName": "fixture", "participantIdentity": "fixture", "livekitUrl": "wss://media.example.test",
            "transportToken": "fixture-private-grant", "admissionTicket": proof, "forwardingLease": proof,
            "transportExpiresAt": expires, "admissionExpiresAt": expires, "leaseExpiresAt": expires,
            "leasePolicyId": "fixture", "connectToken": .string("fixture-private-connect-token-\(index)"),
        ]
        fields.merge(grantFields) { $1 }
        return Fixture.full("LiveConnectionGrant", fields)
    }

    private func issuance() -> JSONValue {
        let expires = JSONValue.string(timestamp(clock.now + 60_000))
        return Fixture.full("LiveCredentialIssuance", [
            "liveSessionId": .string(liveSessionId), "participationId": .string(participationId), "generation": "1",
            "leaseId": .string(uuid()), "grantOrdinal": "1", "admissionExpiresAt": expires, "leaseExpiresAt": expires,
        ])
    }
}

final class MediaTests: XCTestCase {
    private let firstToken = "fixture-private-connect-token-0"

    func testNativeCredentialsAreCheckedBeforeTheAttemptMarker() async throws {
        let origin = "Invalid media origin"
        let invalid: [(JSONObject, String)] = [
            (["livekitUrl": "https://media.example.test"], origin),
            (["livekitUrl": "ws://media.example.test"], origin),
            (["livekitUrl": "wss://media.example.test/?access_token=x"], origin),
            (["livekitUrl": "wss://media.example.test/#x"], origin),
            (["livekitUrl": "wss://user:secret@media.example.test"], origin),
            (["livekitUrl": "wss://user@media.example.test"], origin),
            (["livekitUrl": "media.example.test"], origin),
            (["connectToken": ""], "Missing media connect token"),
            (["admissionTicket": ["participationId": .string(uuid())]], "Native proof is not participation-bound"),
            (["forwardingLease": [:]], "Native proof is not participation-bound"),
        ]
        for (fields, message) in invalid {
            let fixture = try await CallFixture.make(grant: fields)
            let participation = try await fixture.participation()
            let error = await convoHopError { try await participation.connect(fixture.options()) }
            XCTAssertEqual(error?.code, .invalidResponse, "\(fields)")
            XCTAssertEqual(error?.message, message, "\(fields)")
            try await fixture.assertNoAdmission("\(fields)")
        }

        let malformed = try await CallFixture.make(grant: ["leaseExpiresAt": "not-a-time"])
        let participation = try await malformed.participation()
        let error = await convoHopError { try await participation.connect(malformed.options()) }
        XCTAssertEqual(error?.code, .invalidResponse)
        try await malformed.assertNoAdmission("malformed lease expiry")

        let now = TestClock().now
        for expiry in [now - 1, now] {
            let fixture = try await CallFixture.make(grant: ["leaseExpiresAt": .string(timestamp(expiry))])
            let participation = try await fixture.participation()
            let error = await thrownError { try await participation.connect(fixture.options()) }
            XCTAssertEqual(error as? ConvoHopLiveError, .freshCredentialsRequired, "lease expiring at \(expiry)")
            try await fixture.assertNoAdmission("lease expiring at \(expiry)")
        }
    }

    func testTokenIsSentOnlyToTheMediaOriginOnce() async throws {
        let targets: [(String, ConvoHopICETransportPolicy)] = [
            ("ws://127.0.0.1:7880", .all), ("ws://localhost:7880", .relay), ("ws://[::1]:7880", .all),
            ("wss://media.example.test/rtc-edge", .relay),
        ]
        for (url, policy) in targets {
            let fixture = try await CallFixture.make(grant: ["livekitUrl": .string(url)])
            let participation = try await fixture.participation()
            let connection = try await participation.connect(fixture.options(iceTransportPolicy: policy))
            XCTAssertEqual(fixture.rooms.value.count, 1, url)
            let room = try XCTUnwrap(fixture.rooms.value.first)
            XCTAssertEqual(room.opened, [.init(url: url, token: firstToken, iceTransportPolicy: policy)])
            let states = try await fixture.client.recoveryStates()
            XCTAssertEqual(states.map(\.mediaAdmissionAttempted), [true], url)
            let id = await connection.nativeConnectionId
            var connected = await connection.connected
            XCTAssertEqual(id, room.participantId, url)
            XCTAssertTrue(connected, url)

            await connection.disconnect()
            connected = await connection.connected
            XCTAssertFalse(connected, url)
            XCTAssertEqual(room.disconnects, 1, url)
        }
    }

    func testAdmissionMarkerIsDurableBeforeTheRoomConnects() async throws {
        let fixture = try await CallFixture.make()
        let storage = fixture.storage
        let markers = Shared<[Bool]>([])
        fixture.onRoomConnect {
            let stored = await storage.requests.map { $0["mediaAdmissionAttempted"]?.boolValue == true }
            markers.update { $0 = stored }
        }
        let participation = try await fixture.participation()
        let connection = try await participation.connect(fixture.options())
        XCTAssertEqual(markers.value, [true], "the room connects only after the marker was stored")
        let stored = await storage.requests
        XCTAssertFalse(stored.contains { $0.description.contains("fixture-private") }, "tokens are never stored")
        await connection.disconnect()
    }

    func testRoomIsNeverCreatedWhenTheMarkerIsNotStored() async throws {
        let fixture = try await CallFixture.make()
        await fixture.storage.refuseMarker()
        let participation = try await fixture.participation()
        let error = await convoHopError { try await participation.connect(fixture.options()) }
        let credentials = await fixture.credentialRequests
        XCTAssertEqual(error?.code, .recoveryStorageFailure)
        XCTAssertEqual(error?.requestId, credentials.first?.requestId)
        XCTAssertTrue(fixture.rooms.value.isEmpty)
        let stored = await fixture.storage.requests
        XCTAssertEqual(stored.count, 1)
        XCTAssertNil(stored.first?["mediaAdmissionAttempted"])
    }

    func testNativeConnectFailureIsUncertainAndNeverCarriesTheNativeError() async throws {
        struct NativeFailure: Error, CustomStringConvertible {
            let description: String
        }
        let fixture = try await CallFixture.make()
        // Native SDK errors can carry the token-bearing signaling URL.
        fixture.roomFailure.update {
            $0 = NativeFailure(
                description: "could not establish signal connection to wss://media.example.test/rtc?access_token="
                    + firstToken)
        }
        let participation = try await fixture.participation()
        let failure = await convoHopError { try await participation.connect(fixture.options()) }
        let credentials = await fixture.credentialRequests
        let error = try XCTUnwrap(failure)
        XCTAssertEqual(error.code, .mediaConnectFailed)
        XCTAssertEqual(error.outcome, .unknown)
        XCTAssertEqual(error.requestId, credentials.first?.requestId)
        XCTAssertNil(error.underlyingError, "native errors are not attached")
        for text in [error.message, "\(error)", String(reflecting: error), error.localizedDescription] {
            XCTAssertFalse(text.contains("fixture-private"), text)
        }
        XCTAssertEqual(fixture.rooms.value.map(\.disconnects), [1])
        XCTAssertEqual(fixture.rooms.value.map { $0.opened.map(\.token) }, [[firstToken]])
        let states = try await fixture.client.recoveryStates()
        XCTAssertEqual(states.map(\.mediaAdmissionAttempted), [true], "the used credential is resolved, never reused")
    }

    func testMalformedNativeConnectionIdIsAFailedConnection() async throws {
        let fixture = try await CallFixture.make()
        fixture.roomParticipantId.update { $0 = "PA_not_admitted" }
        let participation = try await fixture.participation()
        let error = await convoHopError { try await participation.connect(fixture.options()) }
        let credentials = await fixture.credentialRequests
        XCTAssertEqual(error?.code, .mediaConnectFailed)
        XCTAssertEqual(error?.outcome, .unknown)
        XCTAssertEqual(error?.requestId, credentials.first?.requestId)
        XCTAssertEqual(fixture.rooms.value.map(\.disconnects), [1])
    }

    func testConnectingNeverStartsCaptureAndCaptureFollowsPermissions() async throws {
        let fixture = try await CallFixture.make()
        let participation = try await fixture.participation()
        let connection = try await participation.connect(fixture.options())
        let room = try XCTUnwrap(fixture.rooms.value.first)
        XCTAssertEqual(room.microphone, [])

        try await connection.microphone(true)
        XCTAssertEqual(room.microphone, [true])
        let camera = await thrownError { try await connection.camera(true) }
        XCTAssertEqual(camera as? ConvoHopLiveError, .cameraNotAuthorized)

        await connection.disconnect()
        let microphone = await thrownError { try await connection.microphone(false) }
        XCTAssertEqual(microphone as? ConvoHopLiveError, .microphoneNotAuthorized)
        XCTAssertEqual(room.microphone, [true])
    }

    func testConcurrentConnectsShareOneAdmission() async throws {
        let fixture = try await CallFixture.make()
        let participation = try await fixture.participation()
        let options = fixture.options()
        async let first = participation.connect(options)
        async let second = participation.connect(options)
        let (a, b) = try await (first, second)
        XCTAssertTrue(a === b)
        let again = try await participation.connect(options)
        XCTAssertTrue(again === a, "a connected connection is returned as is")
        XCTAssertEqual(fixture.rooms.value.count, 1)
        let credentials = await fixture.credentialRequests
        XCTAssertEqual(credentials.count, 1)
        await a.disconnect()
    }

    func testResumesKeepOnlyTheAdmittedConnection() async throws {
        let fixture = try await CallFixture.make()
        let participation = try await fixture.participation()
        let connection = try await participation.connect(fixture.options())
        let room = try XCTUnwrap(fixture.rooms.value.first)

        room.emit(.resuming)
        try await eventually("resuming") { await connection.resuming }
        room.emit(.resumed(participantId: room.participantId))
        try await eventually("resumed") { fixture.callbacks.value == ["resuming", "resumed"] }
        var resuming = await connection.resuming
        var connected = await connection.connected
        XCTAssertFalse(resuming)
        XCTAssertTrue(connected)
        XCTAssertEqual(room.disconnects, 0)

        // A resume as another participant wasn't admitted with this participation's grant.
        room.emit(.resuming)
        room.emit(.resumed(participantId: uuid()))
        try await eventually("closed") { fixture.callbacks.value.count == 4 }
        XCTAssertEqual(fixture.callbacks.value, ["resuming", "resumed", "resuming", "disconnected"])
        resuming = await connection.resuming
        connected = await connection.connected
        XCTAssertFalse(resuming)
        XCTAssertFalse(connected)
        XCTAssertEqual(room.disconnects, 1)

        // Nothing follows the close.
        room.emit(.disconnected)
        room.emit(.resuming)
        try await Task.sleep(nanoseconds: 50_000_000)
        XCTAssertEqual(fixture.callbacks.value, ["resuming", "resumed", "resuming", "disconnected"])
        resuming = await connection.resuming
        XCTAssertFalse(resuming)
        XCTAssertEqual(room.disconnects, 1)
    }

    func testResumeWithoutAParticipantIdClosesTheConnection() async throws {
        let fixture = try await CallFixture.make()
        let participation = try await fixture.participation()
        let connection = try await participation.connect(fixture.options())
        let room = try XCTUnwrap(fixture.rooms.value.first)
        room.emit(.resuming)
        room.emit(.resumed(participantId: nil))
        try await eventually("closed") { fixture.callbacks.value == ["resuming", "disconnected"] }
        let connected = await connection.connected
        XCTAssertFalse(connected)
        XCTAssertEqual(room.disconnects, 1)
    }

    func testUnexpectedDisconnectReleasesTheRoomAndReportsOnce() async throws {
        let fixture = try await CallFixture.make()
        let participation = try await fixture.participation()
        let connection = try await participation.connect(fixture.options())
        let room = try XCTUnwrap(fixture.rooms.value.first)
        room.emit(.resuming)
        room.emit(.disconnected)
        try await eventually("disconnected") { fixture.callbacks.value == ["resuming", "disconnected"] }
        let resuming = await connection.resuming
        let connected = await connection.connected
        XCTAssertFalse(resuming)
        XCTAssertFalse(connected)
        XCTAssertEqual(room.disconnects, 1, "the SDK releases the room's tracks and delegates")

        room.emit(.disconnected)
        try await Task.sleep(nanoseconds: 50_000_000)
        XCTAssertEqual(fixture.callbacks.value, ["resuming", "disconnected"])
        let microphone = await thrownError { try await connection.microphone(true) }
        XCTAssertEqual(microphone as? ConvoHopLiveError, .microphoneNotAuthorized)
        XCTAssertEqual(room.microphone, [])
    }

    func testDeliberateDisconnectReportsNothingAndCannotReconnect() async throws {
        let fixture = try await CallFixture.make()
        let participation = try await fixture.participation()
        let connection = try await participation.connect(fixture.options())
        let room = try XCTUnwrap(fixture.rooms.value.first)
        await connection.disconnect()
        room.emit(.disconnected)
        try await Task.sleep(nanoseconds: 50_000_000)
        XCTAssertEqual(fixture.callbacks.value, [])
        XCTAssertEqual(room.disconnects, 1)

        let error = await thrownError { try await connection.reconnect() }
        XCTAssertEqual(error as? ConvoHopLiveError, .connectionClosed)
        let credentials = await fixture.credentialRequests
        XCTAssertEqual(credentials.count, 1)
        XCTAssertEqual(fixture.rooms.value.count, 1)
    }

    func testReconnectResolvesTheUsedCredentialAndAdmitsANewConnection() async throws {
        let fixture = try await CallFixture.make()
        let participation = try await fixture.participation()
        let first = try await participation.connect(fixture.options())
        let firstRoom = try XCTUnwrap(fixture.rooms.value.first)
        fixture.observed.update { $0 = firstRoom.participantId }
        firstRoom.emit(.disconnected)
        try await eventually("disconnected") { fixture.callbacks.value == ["disconnected"] }

        let second = try await first.reconnect()

        let credentials = await fixture.credentialRequests
        guard credentials.count == 2 else { return XCTFail("Expected two credential requests, got \(credentials.count)") }
        XCTAssertNotEqual(credentials[1].requestId, credentials[0].requestId)
        XCTAssertEqual(credentials[0].input?["mode"]?.stringValue, "INITIAL")
        XCTAssertEqual(credentials[1].input?["mode"]?.stringValue, "RECONNECT")
        XCTAssertEqual(credentials[1].input?["replacementOfConnectionId"]?.stringValue, firstRoom.participantId)
        let resolutions = await fixture.http.requests("communication.resolveRequest")
        XCTAssertEqual(
            resolutions.map { $0.input?["requestId"]?.stringValue }, [credentials[0].requestId],
            "the used credential is resolved before another is issued")
        let rooms = fixture.rooms.value
        XCTAssertEqual(
            rooms.map { $0.opened.map(\.token) }, [[firstToken], ["fixture-private-connect-token-1"]],
            "each connect token is sent once, to its own room")
        let id = await second.nativeConnectionId
        XCTAssertEqual(id, rooms.last?.participantId)
        let states = try await fixture.client.recoveryStates()
        XCTAssertEqual(states.map(\.mediaAdmissionAttempted), [true, true])
        await second.disconnect()
    }
}
