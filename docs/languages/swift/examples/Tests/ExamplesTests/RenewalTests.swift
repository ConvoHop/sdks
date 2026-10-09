// Runs renewal(from:) against a stand-in for your backend's renewal endpoint.
import ConvoHop
import Foundation
import XCTest

@testable import Examples

final class RenewalTests: XCTestCase {
    private let current = Session(
        sessionId: "5d7f9b1c-3e5a-4c7e-9a1b-2c3d4e5f6a7b", principalId: "b7e2c9d4-3a1f-4e8b-a6c5-0d9f8e7a6b5c",
        deviceId: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d", incarnation: "1", sessionRevision: "3",
        expiresAt: "2030-01-01T00:15:00Z", status: "active")

    func testRenewalAsksYourBackendToRenewTheSession() async throws {
        var session = current
        session.sessionRevision = "4"
        session.expiresAt = "2030-01-01T00:30:00Z"
        let renewed = SessionBootstrap(
            session: session, tokenExpiresAt: "2030-01-01T00:30:00Z", sessionToken: "renewed-token")
        let backend = StubBackend(status: 200, body: try JSONEncoder().encode(renewed))

        let result = try await renewal(from: backend.url, session: backend.session)(current)
        XCTAssertEqual(result, renewed)
        let requests = backend.requests
        XCTAssertEqual(requests.count, 1)
        let request = try XCTUnwrap(requests.first)
        XCTAssertEqual(request.method, "POST")
        XCTAssertEqual(request.contentType, "application/json")
        XCTAssertEqual(request.timeout, 10)
        // The session's metadata, never its token.
        XCTAssertEqual(
            try JSONDecoder().decode([String: String].self, from: request.body),
            ["sessionId": current.sessionId, "expectedRevision": "3"])
    }

    func testRenewalFailsWhenYourBackendRefuses() async throws {
        let backend = StubBackend(status: 401, body: Data("{}".utf8))
        do {
            _ = try await renewal(from: backend.url, session: backend.session)(current)
            XCTFail("The renewal succeeded")
        } catch let error as URLError {
            XCTAssertEqual(error.code, .badServerResponse)
        }
    }
}

// Answers every request to url with one response, and records the requests.
final class StubBackend: Sendable {
    struct Request: Sendable {
        let method: String?
        let contentType: String?
        let timeout: TimeInterval
        let body: Data
    }

    let url: URL
    let session: URLSession
    private let recorded = Locked<[Request]>([])

    init(status: Int, body: Data) {
        let host = "\(newRequestId()).backend.invalid"
        url = URL(string: "https://\(host)/convohop/session")!
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubProtocol.self]
        session = URLSession(configuration: configuration)
        StubProtocol.stubs.withLock { $0[host] = StubProtocol.Stub(status: status, body: body, requests: recorded) }
    }

    var requests: [Request] { recorded.withLock { $0 } }
}

private final class StubProtocol: URLProtocol {
    struct Stub {
        let status: Int
        let body: Data
        let requests: Locked<[StubBackend.Request]>
    }

    static let stubs = Locked<[String: Stub]>([:])

    override class func canInit(with request: URLRequest) -> Bool { true }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let url = request.url, let host = url.host, let stub = Self.stubs.withLock({ $0[host] }),
            let response = HTTPURLResponse(
                url: url, statusCode: stub.status, httpVersion: "HTTP/1.1",
                headerFields: ["Content-Type": "application/json"])
        else { return client?.urlProtocol(self, didFailWithError: URLError(.cannotFindHost)) ?? () }
        stub.requests.withLock {
            $0.append(
                StubBackend.Request(
                    method: request.httpMethod, contentType: request.value(forHTTPHeaderField: "Content-Type"),
                    timeout: request.timeoutInterval, body: Self.body(of: request)))
        }
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: stub.body)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}

    // URLSession hands a protocol the body as a stream.
    private static func body(of request: URLRequest) -> Data {
        if let body = request.httpBody { return body }
        guard let stream = request.httpBodyStream else { return Data() }
        stream.open()
        defer { stream.close() }
        var data = Data()
        var buffer = [UInt8](repeating: 0, count: 4096)
        while stream.hasBytesAvailable {
            let count = stream.read(&buffer, maxLength: buffer.count)
            guard count > 0 else { break }
            data.append(buffer, count: count)
        }
        return data
    }
}
