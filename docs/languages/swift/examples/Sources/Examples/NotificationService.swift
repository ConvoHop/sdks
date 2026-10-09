// Push quickstart snippets for a Notification Service Extension. Tests/ExamplesTests/PushTests.swift runs them against
// the conformance mock, with and without a message preview.

// #region notification-service-imports
import ConvoHop
import ConvoHopNotificationService
import Foundation
import UserNotifications
// #endregion notification-service-imports

// #region notification-service
final class NotificationService: UNNotificationServiceExtension {
    private let service = ConvoHopNotificationService(
        ledger: ConvoHopNotificationLedger(suiteName: "group.com.example.chat")
    ) { notification in
        // A client for notification.recipientId with its own short-lived session, kept in memory
        // (for example, fetched from your backend), or nil.
        try await ExtensionSession.client(for: notification)
    }

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        service.didReceive(request, withContentHandler: contentHandler)
    }

    override func serviceExtensionTimeWillExpire() {
        service.serviceExtensionTimeWillExpire()
    }
}
// #endregion notification-service

// #region extension-client
// The extension runs apart from your app and can't use its client. Fetch a short-lived session for the push's
// recipient from your backend, and keep it in memory only.
func extensionClient(_ signIn: SignIn) throws -> ConvoHopClient {
    try ConvoHopClient(
        configuration: ConvoHopConfiguration(
            baseURL: signIn.baseUrl,
            projectId: signIn.projectId,
            principalId: signIn.session.principalId,
            incarnation: signIn.session.incarnation,
            sessionToken: signIn.sessionToken,
            recoveryStorage: InMemoryRecoveryStorage() // Stores nothing on disk.
        ))
}
// #endregion extension-client

// Stands in for your backend call. The tests set provider.
enum ExtensionSession {
    typealias Provider = @Sendable (ConvoHopNotification) async throws -> ConvoHopClient?

    static var provider: Provider? {
        get { box.withLock { $0 } }
        set { box.withLock { $0 = newValue } }
    }

    static func client(for notification: ConvoHopNotification) async throws -> ConvoHopClient? {
        guard let provider else { return nil }
        return try await provider(notification)
    }

    private static let box = Locked<Provider?>(nil)
}

final class Locked<Value>: @unchecked Sendable {
    private let lock = NSLock()
    private var value: Value

    init(_ value: Value) { self.value = value }

    func withLock<Result>(_ body: (inout Value) throws -> Result) rethrows -> Result {
        lock.lock()
        defer { lock.unlock() }
        return try body(&value)
    }
}
