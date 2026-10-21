import Foundation

/// React Native plumbing, not app API: the generated `RelayCalls` module, which emits its events to JavaScript.
@objc(RelayCallsEmitter)
public protocol RelayCallsEmitter: NSObjectProtocol {
    @objc(emitOnCallEvent:) func emitOnCallEvent(_ value: [String: Any])
    @objc(emitOnVoipToken:) func emitOnVoipToken(_ value: [String: Any])
    @objc(emitOnAudioSession:) func emitOnAudioSession(_ value: [String: Any])
}

/// React Native plumbing, not app API: the generated `RelayPush` module, which emits its events to JavaScript.
@objc(RelayPushEmitter)
public protocol RelayPushEmitter: NSObjectProtocol {
    @objc(emitOnPushRegistration:) func emitOnPushRegistration(_ value: [String: Any])
    @objc(emitOnPushRegistrationError:) func emitOnPushRegistrationError(_ value: [String: Any])
    @objc(emitOnNotification:) func emitOnNotification(_ value: [String: Any])
}
