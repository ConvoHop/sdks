import Foundation

/// React Native plumbing, not app API: the generated `ConvoHopCalls` module, which emits its events to JavaScript.
@objc(ConvoHopCallsEmitter)
public protocol ConvoHopCallsEmitter: NSObjectProtocol {
    @objc(emitOnCallEvent:) func emitOnCallEvent(_ value: [String: Any])
    @objc(emitOnVoipToken:) func emitOnVoipToken(_ value: [String: Any])
    @objc(emitOnAudioSession:) func emitOnAudioSession(_ value: [String: Any])
}

/// React Native plumbing, not app API: the generated `ConvoHopPush` module, which emits its events to JavaScript.
@objc(ConvoHopPushEmitter)
public protocol ConvoHopPushEmitter: NSObjectProtocol {
    @objc(emitOnPushRegistration:) func emitOnPushRegistration(_ value: [String: Any])
    @objc(emitOnPushRegistrationError:) func emitOnPushRegistrationError(_ value: [String: Any])
    @objc(emitOnNotification:) func emitOnNotification(_ value: [String: Any])
}
