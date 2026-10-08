import ConvoHop
import Foundation
import LiveKit

/// A ``ConvoHopMediaRoom`` on the official LiveKit Swift SDK.
///
/// Each instance connects once. LiveKit resumes a dropped connection itself while its token allows; anything else
/// needs ``MediaConnection/reconnect()``, which admits a new connection with a new room.
public final class LiveKitMediaRoom: NSObject, ConvoHopMediaRoom, @unchecked Sendable {
    /// LiveKit's room, for rendering tracks, reading participants and statistics. Don't connect or disconnect it
    /// yourself, and don't publish the microphone or camera outside ``MediaConnection``.
    public let room: Room
    private let reconnectAttempts: Int
    private let lock = NSLock()
    private var used = false
    private var connected = false
    private var onDisconnected: (@Sendable () -> Void)?

    /// - Parameters:
    ///   - roomOptions: LiveKit's room options, such as capture defaults and adaptive stream.
    ///   - reconnectAttempts: How often LiveKit tries to resume a dropped connection before it gives up.
    public init(roomOptions: RoomOptions = RoomOptions(), reconnectAttempts: Int = 3) {
        room = Room(delegate: nil, connectOptions: nil, roomOptions: roomOptions)
        self.reconnectAttempts = max(0, reconnectAttempts)
        super.init()
        room.delegates.add(delegate: self)
    }

    public func connect(
        url: URL, token: String, iceTransportPolicy: ConvoHopICETransportPolicy,
        onDisconnected: @escaping @Sendable () -> Void
    ) async throws -> String {
        guard claim(onDisconnected) else { throw LiveKitMediaRoomError.alreadyConnected }
        let options = ConnectOptions(
            reconnectAttempts: reconnectAttempts, iceTransportPolicy: iceTransportPolicy == .relay ? .relay : .all,
            enableMicrophone: false)
        try await room.connect(url: url.absoluteString, token: token, connectOptions: options)
        guard let sid = room.localParticipant.sid?.stringValue else {
            await room.disconnect()
            throw LiveKitMediaRoomError.missingParticipantId
        }
        markConnected()
        if room.connectionState == .disconnected { roomDidDisconnect() }
        return sid
    }

    public func setMicrophone(enabled: Bool) async throws {
        try await room.localParticipant.setMicrophone(enabled: enabled)
    }

    public func setCamera(enabled: Bool) async throws {
        try await room.localParticipant.setCamera(enabled: enabled)
    }

    public func disconnect() async {
        clearHandler()
        await room.disconnect()
        room.delegates.remove(delegate: self)
    }

    private func claim(_ handler: @escaping @Sendable () -> Void) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        guard !used else { return false }
        used = true
        onDisconnected = handler
        return true
    }

    private func markConnected() {
        lock.lock()
        connected = true
        lock.unlock()
    }

    private func clearHandler() {
        lock.lock()
        onDisconnected = nil
        lock.unlock()
    }

    private func roomDidDisconnect() {
        lock.lock()
        let handler = connected ? onDisconnected : nil
        if connected { onDisconnected = nil }
        lock.unlock()
        handler?()
    }
}

extension LiveKitMediaRoom: RoomDelegate {
    public func room(_ room: Room, didDisconnectWithError error: LiveKitError?) {
        roomDidDisconnect()
    }
}

/// A ``LiveKitMediaRoom`` that can't connect.
public enum LiveKitMediaRoomError: Error, Sendable, Equatable, CustomStringConvertible, LocalizedError {
    /// The room already connected once. Each connection needs a new room.
    case alreadyConnected
    /// LiveKit connected without a participant ID.
    case missingParticipantId

    public var description: String {
        switch self {
        case .alreadyConnected: "A LiveKit media room connects only once"
        case .missingParticipantId: "LiveKit connected without a local participant ID"
        }
    }

    public var errorDescription: String? { description }
}

extension ConvoHopMediaOptions {
    /// Connects native media with the official LiveKit Swift SDK.
    public static func liveKit(
        iceTransportPolicy: ConvoHopICETransportPolicy = .all, roomOptions: RoomOptions = RoomOptions(),
        reconnectAttempts: Int = 3, onDisconnected: (@Sendable () -> Void)? = nil
    ) -> ConvoHopMediaOptions {
        ConvoHopMediaOptions(iceTransportPolicy: iceTransportPolicy, onDisconnected: onDisconnected) {
            LiveKitMediaRoom(roomOptions: roomOptions, reconnectAttempts: reconnectAttempts)
        }
    }
}

extension MediaConnection {
    /// LiveKit's room, when the connection uses ``ConvoHopMediaOptions/liveKit(iceTransportPolicy:roomOptions:reconnectAttempts:onDisconnected:)``.
    public nonisolated var liveKitRoom: Room? { (room as? LiveKitMediaRoom)?.room }
}

#if os(iOS)
import AVFoundation

/// Starts LiveKit's audio only while CallKit's audio session is active, as LiveKit's CallKit guide requires.
///
/// Call ``prepare()`` at launch, before any room connects. Then call ``activate(_:mode:options:)`` and
/// ``deactivate()`` from CallKit's audio session callbacks, for example `ConvoHopCallsDelegate`'s.
public enum ConvoHopCallKitAudio {
    /// Stops LiveKit from configuring the audio session and keeps its audio engine off.
    public static func prepare() throws {
        AudioManager.shared.audioSession.isAutomaticConfigurationEnabled = false
        try AudioManager.shared.setEngineAvailability(.none)
    }

    /// Configures the session CallKit activated and starts LiveKit's audio engine.
    public static func activate(
        _ session: AVAudioSession, mode: AVAudioSession.Mode = .voiceChat,
        options: AVAudioSession.CategoryOptions = [.mixWithOthers]
    ) throws {
        try session.setCategory(.playAndRecord, mode: mode, options: options)
        try AudioManager.shared.setEngineAvailability(.default)
    }

    /// Stops LiveKit's audio engine after CallKit deactivated the session.
    public static func deactivate() throws {
        try AudioManager.shared.setEngineAvailability(.none)
    }
}
#endif
