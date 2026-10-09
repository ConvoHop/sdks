import CallKit
import Foundation

/// The codes the modules reject with. They match the Android modules', plus `E_CALLKIT`.
enum Code {
    static let notConfigured = "E_NOT_CONFIGURED"
    static let invalidArgument = "E_INVALID_ARGUMENT"
    static let callNotFound = "E_CALL_NOT_FOUND"
    static let callState = "E_CALL_STATE"
    static let unsupported = "E_UNSUPPORTED"
    /// CallKit refused a request for a reason JavaScript can't fix by changing the call, such as a call limit.
    static let callKit = "E_CALLKIT"

    static let notConfiguredMessage =
        "Call ConvoHopReactNative.configure in application(_:didFinishLaunchingWithOptions:)"
}

/// The JavaScript contract's ID rules, the same as the ConvoHop Swift package applies to pushes.
enum Validate {
    /// A lowercase, hyphenated, non-nil UUID.
    static func isUUID(_ text: String) -> Bool {
        let bytes = Array(text.utf8)
        guard bytes.count == 36 else { return false }
        var nonZero = false
        for (index, byte) in bytes.enumerated() {
            if index == 8 || index == 13 || index == 18 || index == 23 {
                guard byte == UInt8(ascii: "-") else { return false }
            } else {
                guard (0x30...0x39).contains(byte) || (0x61...0x66).contains(byte) else { return false }
                if byte != UInt8(ascii: "0") { nonZero = true }
            }
        }
        return nonZero
    }

    /// An ASCII letter followed by up to 63 ASCII letters, digits or underscores.
    static func isIdentifier(_ text: String) -> Bool {
        let bytes = Array(text.utf8)
        guard (1...64).contains(bytes.count) else { return false }
        func letter(_ byte: UInt8) -> Bool { (0x41...0x5A).contains(byte) || (0x61...0x7A).contains(byte) }
        guard letter(bytes[0]) else { return false }
        return bytes.dropFirst().allSatisfy { letter($0) || (0x30...0x39).contains($0) || $0 == UInt8(ascii: "_") }
    }

    /// The CallKit UUID of a JavaScript call ID.
    static func callUUID(_ id: String) -> UUID? {
        isUUID(id) ? UUID(uuidString: id) : nil
    }
}

/// A module whose promises stop reaching JavaScript once React Native invalidates it.
@MainActor
protocol PromiseOwner: AnyObject {
    var isInvalidated: Bool { get }
}

typealias Resolve = (Any?) -> Void
typealias Reject = (String, String, (any Error)?) -> Void

/// A JavaScript promise. It settles once, and not at all after its module is invalidated.
@MainActor
final class JSPromise {
    private var blocks: (resolve: Resolve, reject: Reject)?
    private weak var owner: (any PromiseOwner)?

    init(_ owner: any PromiseOwner, _ resolve: @escaping Resolve, _ reject: @escaping Reject) {
        self.owner = owner
        blocks = (resolve, reject)
    }

    /// Whether settling it still reaches JavaScript.
    var isLive: Bool { blocks != nil && owner?.isInvalidated == false }

    /// Resolves `value`: `nil` reaches JavaScript as `undefined`, `NSNull()` as `null`.
    func resolve(_ value: Any? = nil) {
        take()?.resolve(value)
    }

    func reject(_ code: String, _ message: String) {
        take()?.reject(code, message, nil)
    }

    /// Rejects with CallKit's `error` for a request about call `id`: `E_CALL_NOT_FOUND` for an unknown call,
    /// `E_CALL_STATE` with `stateMessage` for a request the call's state doesn't allow, and `E_CALLKIT` otherwise.
    func reject(callKit error: any Error, id: String, stateMessage: String) {
        switch (error as? CXErrorCodeRequestTransactionError)?.code {
        case .unknownCallUUID?: reject(Code.callNotFound, "No call \(id)")
        case .invalidAction?: reject(Code.callState, stateMessage)
        default: reject(callKit: error)
        }
    }

    func reject(callKit error: any Error) {
        let error = error as NSError
        reject(Code.callKit, "CallKit refused the request: \(error.domain) \(error.code)")
    }

    private func take() -> (resolve: Resolve, reject: Reject)? {
        defer { blocks = nil }
        guard owner?.isInvalidated == false else { return nil }
        return blocks
    }
}

/// Runs `work` on the main actor: now on the main thread, or soon from another.
func onMain(_ work: @escaping @MainActor @Sendable () -> Void) {
    if Thread.isMainThread {
        MainActor.assumeIsolated(work)
    } else {
        DispatchQueue.main.async { MainActor.assumeIsolated(work) }
    }
}

/// Carries a value the SDK only touches on one thread at a time, such as a completion handler, across threads.
struct UncheckedBox<Value>: @unchecked Sendable {
    let value: Value
    init(_ value: Value) { self.value = value }
}

struct Weak<Value: AnyObject> {
    weak var value: Value?
    init(_ value: Value) { self.value = value }
}
