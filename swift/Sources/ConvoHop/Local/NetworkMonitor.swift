import Foundation

#if canImport(Network)
    import Network
#endif

/// Reports whether the device has a usable network path.
///
/// ``ConvoHopOutbox`` holds queued messages while the device is offline. Pass your own monitor when your app already
/// tracks connectivity, or in tests.
public protocol ConvoHopNetworkMonitor: Sendable {
    /// Reachability now and after each change. Each call returns a new sequence.
    func reachability() -> AsyncStream<Bool>
}

#if canImport(Network)
    /// Reachability from `NWPathMonitor`.
    public struct SystemNetworkMonitor: ConvoHopNetworkMonitor {
        public init() {}

        public func reachability() -> AsyncStream<Bool> {
            let (changes, continuation) = AsyncStream.makeStream(of: Bool.self, bufferingPolicy: .bufferingNewest(1))
            let monitor = PathMonitor()
            monitor.value.pathUpdateHandler = { path in
                continuation.yield(path.status == .satisfied)
            }
            continuation.onTermination = { _ in monitor.value.cancel() }
            monitor.value.start(queue: DispatchQueue(label: "com.convohop.network"))
            return changes
        }
    }

    /// `NWPathMonitor` is thread-safe; this box lets the termination handler cancel it.
    private final class PathMonitor: @unchecked Sendable {
        let value = NWPathMonitor()
    }
#endif

/// A monitor that always reports a usable network. Requests fail and back off on their own when it's wrong.
public struct AlwaysReachableNetworkMonitor: ConvoHopNetworkMonitor {
    public init() {}

    public func reachability() -> AsyncStream<Bool> {
        let (changes, continuation) = AsyncStream.makeStream(of: Bool.self)
        continuation.yield(true)
        continuation.finish()
        return changes
    }
}
