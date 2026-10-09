#if canImport(UserNotifications)
import ConvoHop
import Foundation
import UserNotifications

/// Shows message text in a Notification Service Extension when a push carries only metadata, and hides the text of
/// pushes for anyone but the signed-in user.
///
/// ConvoHop's message pushes carry no message text unless the project opts in to previews; the alert then shows the
/// `CONVOHOP_MESSAGE` string from your app's `Localizable.strings`. This helper fetches the message with the user's
/// session and replaces the body with its text. It delivers the push unchanged when:
///
/// - the push isn't a ConvoHop message, for example a call or a missed call;
/// - the push already has a body, because the project opted in to previews or your backend sent text;
/// - your factory returns no client, or a client for another project or user;
/// - the message was deleted or has no text;
/// - anything fails, or the time runs out.
///
/// With a ledger, a push for anyone but the ledger's ``ConvoHopNotificationLedger/recipient``, such as one that
/// reaches the device after sign-out, is delivered without its text: no title, and the `CONVOHOP_MESSAGE`,
/// `CONVOHOP_CALL` or `CONVOHOP_MISSED_CALL` string as the body. So is a ConvoHop push this version can't read,
/// unless the recipient is ``ConvoHopPushRecipient/any``. Without Apple's notification filtering entitlement, iOS
/// shows every alert push, so the helper hides the text instead of dropping the push.
///
/// ```swift
/// final class NotificationService: UNNotificationServiceExtension {
///     private let service = ConvoHopNotificationService(
///         ledger: ConvoHopNotificationLedger(suiteName: "group.com.example.chat")
///     ) { notification in
///         // A client for notification.recipientId with its own short-lived session, kept in memory
///         // (for example, fetched from your backend), or nil.
///         try await ExtensionSession.client(for: notification)
///     }
///
///     override func didReceive(
///         _ request: UNNotificationRequest,
///         withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
///     ) {
///         service.didReceive(request, withContentHandler: contentHandler)
///     }
///
///     override func serviceExtensionTimeWillExpire() {
///         service.serviceExtensionTimeWillExpire()
///     }
/// }
/// ```
///
/// Create the client with in-memory recovery storage, and don't persist its session token.
///
/// A missed-call push reaches the extension, not your app. Pass a ledger on the App Group suite that
/// `ConvoHopCallsConfiguration.ledgerSuiteName` names, so `ConvoHopCalls` doesn't ring for a VoIP push of that ring that
/// arrives later, and so the extension sees the recipient your app sets.
public final class ConvoHopNotificationService: @unchecked Sendable {
    /// Returns a client for the push's project and recipient, or `nil` to deliver the push unchanged.
    public typealias ClientFactory = @Sendable (ConvoHopNotification) async throws -> ConvoHopClient?

    /// The most characters of message text the body shows.
    public static let maximumBodyLength = 1024

    private let timeout: TimeInterval
    private let ledger: ConvoHopNotificationLedger?
    private let makeClient: ClientFactory
    private let lock = NSLock()
    private var deliveries: [Delivery] = []

    /// - Parameters:
    ///   - timeout: How long to wait for the message, in seconds. iOS gives an extension about 30.
    ///   - ledger: Shared with your app through an App Group: where to record rings that stopped, and whose pushes to
    ///     show.
    ///   - client: Creates a client for the push.
    public init(
        timeout: TimeInterval = 20, ledger: ConvoHopNotificationLedger? = nil, client: @escaping ClientFactory
    ) {
        self.timeout = max(0, timeout)
        self.ledger = ledger
        makeClient = client
    }

    /// Call it from `UNNotificationServiceExtension.didReceive(_:withContentHandler:)`. It calls `contentHandler`
    /// exactly once.
    public func didReceive(
        _ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        let delivery = Delivery(original: request.content, handler: contentHandler)
        let notification = try? ConvoHopNotification.parse(userInfo: request.content.userInfo)
        if let notification, case .callCancelled(let alert, let reason) = notification.kind {
            ledger?.markStopped(alert, reason: reason)
        }
        if let recipient = ledger?.recipient, !Self.shows(request.content.userInfo, notification, to: recipient) {
            return delivery.finish(replacingWith: Self.redacted(request.content, kind: notification?.kind))
        }
        guard let notification, case .message(let messageId) = notification.kind, notification.body == nil
        else { return delivery.finish(text: nil) }
        lock.lock()
        deliveries.removeAll { $0.isFinished }
        deliveries.append(delivery)
        lock.unlock()
        let makeClient = makeClient
        let nanoseconds = UInt64((timeout * 1_000_000_000).rounded(.up))
        delivery.run([
            Task { delivery.finish(text: await Self.text(of: messageId, for: notification, makeClient: makeClient)) },
            Task {
                try? await Task.sleep(nanoseconds: nanoseconds)
                delivery.finish(text: nil)
            },
        ])
    }

    /// Call it from `UNNotificationServiceExtension.serviceExtensionTimeWillExpire()`. It delivers pending pushes
    /// unchanged.
    public func serviceExtensionTimeWillExpire() {
        lock.lock()
        let pending = deliveries
        deliveries = []
        lock.unlock()
        for delivery in pending { delivery.finish(text: nil) }
    }

    /// The text to show, or `nil` to deliver the push unchanged.
    package static func text(
        of messageId: String, for notification: ConvoHopNotification, makeClient: ClientFactory
    ) async -> String? {
        guard let client = try? await makeClient(notification), client.projectId == notification.projectId,
            client.principalId == notification.recipientId,
            let message = try? await client.getMessage(messageId, in: notification.conversationId),
            !Task.isCancelled, !message.deleted, let text = message.text, !text.isEmpty
        else { return nil }
        return truncated(text)
    }

    package static func truncated(_ text: String) -> String {
        text.count > maximumBodyLength ? String(text.prefix(maximumBodyLength - 1)) + "…" : text
    }

    /// Whether a push may show its text: it isn't ConvoHop's, or it's for `recipient`. Only
    /// ``ConvoHopPushRecipient/any`` shows a ConvoHop push this version can't read.
    package static func shows(
        _ userInfo: [AnyHashable: Any], _ notification: ConvoHopNotification?, to recipient: ConvoHopPushRecipient
    ) -> Bool {
        guard userInfo["convohop"] != nil else { return true }
        guard let notification else { return recipient == .any }
        return recipient.accepts(notification)
    }

    /// The push without its text: no title or subtitle, the generic string of its kind as the body, and no text in
    /// `userInfo`.
    package static func redacted(
        _ content: UNNotificationContent, kind: ConvoHopNotification.Kind?,
        localize: (String) -> String = ConvoHopNotificationService.localizedString
    ) -> UNNotificationContent {
        let key =
            switch kind {
            case .call?: "CONVOHOP_CALL"
            case .callCancelled?: "CONVOHOP_MISSED_CALL"
            case .message?, nil: "CONVOHOP_MESSAGE"
            }
        let redacted = (content.mutableCopy() as? UNMutableNotificationContent) ?? UNMutableNotificationContent()
        redacted.title = ""
        redacted.subtitle = ""
        redacted.body = localize(key)
        var userInfo = redacted.userInfo
        if var aps = userInfo["aps"] as? [AnyHashable: Any] {
            aps["alert"] = ["loc-key": key]
            userInfo["aps"] = aps
        }
        if var payload = userInfo["convohop"] as? [AnyHashable: Any] {
            payload.removeValue(forKey: "title")
            payload.removeValue(forKey: "body")
            userInfo["convohop"] = payload
        }
        redacted.userInfo = userInfo
        return redacted
    }

    /// Looks `key` up in the extension's `Localizable.strings`, then in the containing app's. Returns `key` when
    /// neither defines it, as iOS shows an undefined `loc-key`.
    package static func localizedString(_ key: String) -> String {
        for bundle in [Bundle.main, containingAppBundle()].compactMap({ $0 }) {
            let text = bundle.localizedString(forKey: key, value: nil, table: nil)
            if text != key { return text }
        }
        return key
    }

    /// The app that contains this extension: `MyApp.app/PlugIns` on iOS, `MyApp.app/Contents/PlugIns` on macOS.
    private static func containingAppBundle() -> Bundle? {
        var url = Bundle.main.bundleURL
        guard url.pathExtension == "appex" else { return nil }
        while url.pathComponents.count > 1 {
            url.deleteLastPathComponent()
            if url.pathExtension == "app" { return Bundle(url: url) }
        }
        return nil
    }
}

/// One push and its content handler, which runs once.
private final class Delivery: @unchecked Sendable {
    private let original: UNNotificationContent
    private let lock = NSLock()
    private var handler: ((UNNotificationContent) -> Void)?
    private var tasks: [Task<Void, Never>] = []

    init(original: UNNotificationContent, handler: @escaping (UNNotificationContent) -> Void) {
        self.original = original
        self.handler = handler
    }

    var isFinished: Bool {
        lock.lock()
        defer { lock.unlock() }
        return handler == nil
    }

    func run(_ tasks: [Task<Void, Never>]) {
        lock.lock()
        guard handler != nil else {
            lock.unlock()
            for task in tasks { task.cancel() }
            return
        }
        self.tasks += tasks
        lock.unlock()
    }

    /// Delivers the push with `text` as its body, or unchanged.
    func finish(text: String?) {
        finish { original in
            guard let text, let content = original.mutableCopy() as? UNMutableNotificationContent else {
                return original
            }
            content.body = text
            return content
        }
    }

    /// Delivers `content` in place of the push.
    func finish(replacingWith content: UNNotificationContent) {
        finish { _ in content }
    }

    private func finish(_ content: (UNNotificationContent) -> UNNotificationContent) {
        lock.lock()
        guard let handler else { return lock.unlock() }
        self.handler = nil
        let tasks = tasks
        self.tasks = []
        lock.unlock()
        for task in tasks { task.cancel() }
        handler(content(original))
    }
}
#endif
