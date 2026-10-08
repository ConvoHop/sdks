#if canImport(UserNotifications)
import ConvoHop
import Foundation
import UserNotifications

/// Shows message text in a Notification Service Extension when a push carries only metadata.
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
/// ```swift
/// final class NotificationService: UNNotificationServiceExtension {
///     private let service = ConvoHopNotificationService { notification in
///         // A client for notification.recipientId with a short-lived session from your App Group, or nil.
///         try await SharedSession.client(for: notification)
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
public final class ConvoHopNotificationService: @unchecked Sendable {
    /// Returns a client for the push's project and recipient, or `nil` to deliver the push unchanged.
    public typealias ClientFactory = @Sendable (ConvoHopNotification) async throws -> ConvoHopClient?

    /// The most characters of message text the body shows.
    public static let maximumBodyLength = 1024

    private let timeout: TimeInterval
    private let makeClient: ClientFactory
    private let lock = NSLock()
    private var deliveries: [Delivery] = []

    /// - Parameters:
    ///   - timeout: How long to wait for the message, in seconds. iOS gives an extension about 30.
    ///   - client: Creates a client for the push.
    public init(timeout: TimeInterval = 20, client: @escaping ClientFactory) {
        self.timeout = max(0, timeout)
        makeClient = client
    }

    /// Call it from `UNNotificationServiceExtension.didReceive(_:withContentHandler:)`. It calls `contentHandler`
    /// exactly once.
    public func didReceive(
        _ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        let delivery = Delivery(original: request.content, handler: contentHandler)
        guard let notification = try? ConvoHopNotification.parse(userInfo: request.content.userInfo),
            case .message(let messageId) = notification.kind, notification.body == nil
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

    func finish(text: String?) {
        lock.lock()
        guard let handler else { return lock.unlock() }
        self.handler = nil
        let tasks = tasks
        self.tasks = []
        lock.unlock()
        for task in tasks { task.cancel() }
        guard let text, let content = original.mutableCopy() as? UNMutableNotificationContent else {
            return handler(original)
        }
        content.body = text
        handler(content)
    }
}
#endif
