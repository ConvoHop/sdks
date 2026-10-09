import Foundation

#if canImport(FoundationNetworking)
    import FoundationNetworking
#endif

/// An HTTP request the SDK sends to the authority.
public struct ConvoHopHTTPRequest: Sendable {
    public var url: URL
    public var method: String
    /// Header names are lowercase.
    public var headers: [String: String]
    public var body: Data

    public init(url: URL, method: String, headers: [String: String], body: Data) {
        self.url = url
        self.method = method
        self.headers = headers
        self.body = body
    }
}

/// An HTTP response from the authority.
public struct ConvoHopHTTPResponse: Sendable {
    public var status: Int
    /// Header names are lowercase.
    public var headers: [String: String]
    public var body: Data

    public init(status: Int, headers: [String: String] = [:], body: Data) {
        self.status = status
        self.headers = Dictionary(headers.map { ($0.key.lowercased(), $0.value) }, uniquingKeysWith: { $1 })
        self.body = body
    }
}

/// Sends HTTP requests. Throw when no complete response arrived; the SDK reports that as `TRANSPORT_UNKNOWN`.
///
/// Implementations must not follow redirects, send cookies or use caches. Return a redirect response as it is: the
/// SDK reports it as `TRANSPORT_UNKNOWN`, because another location's answer isn't the authority's.
public protocol ConvoHopHTTPClient: Sendable {
    func send(_ request: ConvoHopHTTPRequest) async throws -> ConvoHopHTTPResponse
}

/// The default HTTP client: an ephemeral `URLSession` without cookies, caches or redirects, with a 12 second budget.
public final class URLSessionHTTPClient: ConvoHopHTTPClient, @unchecked Sendable {
    private let session: URLSession
    private let timeout: TimeInterval

    public init(timeout: TimeInterval = 12) {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.httpCookieAcceptPolicy = .never
        configuration.urlCache = nil
        configuration.urlCredentialStorage = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        configuration.timeoutIntervalForRequest = timeout
        configuration.timeoutIntervalForResource = timeout
        session = URLSession(configuration: configuration)
        self.timeout = timeout
    }

    deinit {
        session.finishTasksAndInvalidate()
    }

    public func send(_ request: ConvoHopHTTPRequest) async throws -> ConvoHopHTTPResponse {
        var urlRequest = URLRequest(
            url: request.url, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData, timeoutInterval: timeout)
        urlRequest.httpMethod = request.method
        urlRequest.httpShouldHandleCookies = false
        for (name, value) in request.headers { urlRequest.setValue(value, forHTTPHeaderField: name) }
        urlRequest.httpBody = request.body
        let (data, response) = try await session.data(for: urlRequest, delegate: RedirectRefusal())
        guard let http = response as? HTTPURLResponse else { throw URLError(.badServerResponse) }
        var headers: [String: String] = [:]
        for (name, value) in http.allHeaderFields {
            if let name = name as? String, let value = value as? String { headers[name.lowercased()] = value }
        }
        return ConvoHopHTTPResponse(status: http.statusCode, headers: headers, body: data)
    }
}

/// Refuses every redirect so that credentials never follow a response to another location.
private final class RedirectRefusal: NSObject, URLSessionTaskDelegate, Sendable {
    func urlSession(
        _ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
        newRequest request: URLRequest
    ) async -> URLRequest? {
        nil
    }
}
