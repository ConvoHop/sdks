import Foundation

/// An event from a realtime socket. A connection reports `closed` last.
public enum ConvoHopWebSocketEvent: Sendable, Equatable {
    /// The handshake finished with the negotiated subprotocol.
    case open(protocol: String?)
    case text(String)
    case binary(Data)
    /// The transport failed. A `closed` event follows.
    case failed
    case closed(code: Int)
}

/// One realtime connection. Implementations deliver events in order and finish `events` after `closed`.
public protocol ConvoHopWebSocket: AnyObject, Sendable {
    var events: AsyncStream<ConvoHopWebSocketEvent> { get }
    func send(_ text: String)
    /// Closes the connection. It reports `closed` with `code` and sends no later events.
    func close(code: Int)
}

/// Opens realtime connections. Tests and apps with their own networking stack can supply one.
public protocol ConvoHopWebSocketFactory: Sendable {
    func connect(to url: URL, subprotocol: String) -> any ConvoHopWebSocket
}

/// Opens connections with `URLSessionWebSocketTask`. It keeps no cookies or cache and refuses redirects.
public struct URLSessionWebSocketFactory: ConvoHopWebSocketFactory {
    public let maximumMessageSize: Int

    public init(maximumMessageSize: Int = 262_144) {
        self.maximumMessageSize = maximumMessageSize
    }

    public func connect(to url: URL, subprotocol: String) -> any ConvoHopWebSocket {
        URLSessionWebSocketConnection(url: url, subprotocol: subprotocol, maximumMessageSize: maximumMessageSize)
    }
}

final class URLSessionWebSocketConnection: NSObject, ConvoHopWebSocket, URLSessionWebSocketDelegate,
    @unchecked Sendable
{
    let events: AsyncStream<ConvoHopWebSocketEvent>
    private let continuation: AsyncStream<ConvoHopWebSocketEvent>.Continuation
    private let lock = NSLock()
    private var session: URLSession?
    private var task: URLSessionWebSocketTask?
    private var finished = false

    init(url: URL, subprotocol: String, maximumMessageSize: Int) {
        (events, continuation) = AsyncStream.makeStream(of: ConvoHopWebSocketEvent.self)
        super.init()
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.httpCookieAcceptPolicy = .never
        configuration.urlCache = nil
        configuration.urlCredentialStorage = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        let session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
        let task = session.webSocketTask(with: url, protocols: [subprotocol])
        task.maximumMessageSize = maximumMessageSize
        lock.lock()
        self.session = session
        self.task = task
        lock.unlock()
        task.resume()
        receive(task)
    }

    func send(_ text: String) {
        lock.lock()
        let task = finished ? nil : task
        lock.unlock()
        task?.send(.string(text)) { [weak self] error in
            if error != nil { self?.fail() }
        }
    }

    func close(code: Int) {
        lock.lock()
        let task = finished ? nil : task
        lock.unlock()
        task?.cancel(with: URLSessionWebSocketTask.CloseCode(rawValue: code) ?? .normalClosure, reason: nil)
        finish(.closed(code: code))
    }

    private func receive(_ task: URLSessionWebSocketTask) {
        task.receive { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(.string(let text)):
                self.emit(.text(text))
                self.receive(task)
            case .success(.data(let data)):
                self.emit(.binary(data))
                self.receive(task)
            case .success:
                self.receive(task)
            case .failure:
                if task.closeCode != .invalid {
                    self.finish(.closed(code: task.closeCode.rawValue))
                } else {
                    // The delegate normally reports why the connection ended; this covers stacks that never do.
                    DispatchQueue.global().asyncAfter(deadline: .now() + 1) { [weak self] in self?.fail() }
                }
            }
        }
    }

    private func emit(_ event: ConvoHopWebSocketEvent) {
        lock.lock()
        defer { lock.unlock() }
        if !finished { continuation.yield(event) }
    }

    private func fail() {
        lock.lock()
        let task = finished ? nil : task
        if !finished { continuation.yield(.failed) }
        lock.unlock()
        task?.cancel(with: .abnormalClosure, reason: nil)
        finish(.closed(code: 1006))
    }

    private func finish(_ event: ConvoHopWebSocketEvent) {
        lock.lock()
        if finished {
            lock.unlock()
            return
        }
        finished = true
        continuation.yield(event)
        let session = session
        self.session = nil
        task = nil
        lock.unlock()
        continuation.finish()
        session?.invalidateAndCancel()
    }

    func urlSession(
        _ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?
    ) {
        emit(.open(protocol: `protocol`))
    }

    func urlSession(
        _ session: URLSession, webSocketTask: URLSessionWebSocketTask,
        didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?
    ) {
        finish(.closed(code: closeCode.rawValue))
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: (any Error)?) {
        if error != nil { fail() } else { finish(.closed(code: 1006)) }
    }

    func urlSession(
        _ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
        newRequest request: URLRequest
    ) async -> URLRequest? {
        nil
    }
}
