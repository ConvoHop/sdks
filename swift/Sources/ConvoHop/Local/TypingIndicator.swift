import Foundation

/// Tells other members, without flooding ConvoHop, whether this user is typing in one conversation.
///
/// Call ``textChanged()`` on every edit of the composer. The indicator reports typing at most every 3 seconds and
/// reports that typing stopped after 5 seconds without edits. Call ``stop()`` when the user sends or leaves the screen.
///
/// Typing is a best-effort signal: ConvoHop never stores or resends it, and the indicator drops failures. When the
/// authority's capabilities turn typing off, the indicator sends nothing. ConvoHop's client API doesn't deliver other
/// members' typing state yet, so this type only sends.
public actor ConvoHopTypingIndicator {
    public nonisolated let conversationId: String
    private let client: ConvoHopClient
    private let environment: ConvoHopEnvironment
    private var typing = false
    private var lastReported = 0
    private var idle: (id: UUID, task: Task<Void, Never>)?
    private var sending: Task<Void, Never>?
    private var supported: Bool?

    static let refreshInterval = 3_000
    static let idleTimeout = 5_000

    public init(client: ConvoHopClient, conversationId: String) throws {
        self.conversationId = try ConvoHopClient.requireId(conversationId, "conversation")
        self.client = client
        environment = client.environment
    }

    deinit {
        idle?.task.cancel()
    }

    /// Whether the indicator reported that this user is typing and hasn't reported stopping yet.
    public var isTyping: Bool { typing }

    /// Notes an edit of the composer.
    public func textChanged() {
        let now = environment.now()
        armIdleTimer()
        if typing, now - lastReported < Self.refreshInterval { return }
        typing = true
        lastReported = now
        report(true)
    }

    /// Reports that this user stopped typing, if the indicator reported typing.
    public func stop() {
        idle?.task.cancel()
        idle = nil
        guard typing else { return }
        typing = false
        report(false)
    }

    private func armIdleTimer() {
        idle?.task.cancel()
        let token = UUID()
        let sleep = environment.sleep
        idle = (
            token,
            Task { [weak self] in
                do { try await sleep(Self.idleTimeout) } catch { return }
                await self?.idleTimerFired(token)
            }
        )
    }

    private func idleTimerFired(_ token: UUID) {
        guard idle?.id == token else { return }
        idle = nil
        stop()
    }

    /// Sends reports one at a time, in order, so a late "typing" can't overtake "stopped".
    private func report(_ isTyping: Bool) {
        let previous = sending
        sending = Task { [weak self] in
            await previous?.value
            await self?.deliver(isTyping)
        }
    }

    private func deliver(_ isTyping: Bool) async {
        if supported == nil {
            if let capabilities = try? await client.capabilities() {
                supported = capabilities.features?.typing ?? true
            }
        }
        guard supported != false else { return }
        _ = try? await client.setTyping(isTyping, in: conversationId)
    }
}
