import Foundation

/// Durable storage for mutation recovery records and realtime replay cursors.
///
/// The SDK stores JSON text that never contains credentials. A write must be durable when it returns. The SDK
/// reports a failed write as `RECOVERY_STORAGE_FAILURE` and keeps the original request identity, so the app can
/// resolve the request later.
public protocol RecoveryStorage: Sendable {
    func value(forKey key: String) async throws -> String?
    func setValue(_ value: String, forKey key: String) async throws
    func removeValue(forKey key: String) async throws
}

/// Recovery storage that lasts as long as the process. Share one instance between clients of the same user to
/// recover requests after replacing a client.
public actor InMemoryRecoveryStorage: RecoveryStorage {
    private var values: [String: String] = [:]

    public init() {}

    public func value(forKey key: String) -> String? {
        values[key]
    }

    public func setValue(_ value: String, forKey key: String) {
        values[key] = value
    }

    public func removeValue(forKey key: String) {
        values[key] = nil
    }
}

/// Recovery storage in files, one file per key, written atomically.
///
/// On Apple platforms, the directory is excluded from backups because recovery records belong to one device's session.
/// On iOS, files stay readable after the first unlock following a restart, so background work and call handling can
/// resume requests while the device is locked.
public actor FileRecoveryStorage: RecoveryStorage {
    public nonisolated let directory: URL

    /// Uses `directory`, creating it when needed.
    public init(directory: URL) throws {
        self.directory = directory
        try FileManager.default.createDirectory(
            at: directory, withIntermediateDirectories: true, attributes: Self.protection)
        #if canImport(Darwin)
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            var excluded = directory
            try excluded.setResourceValues(values)
        #endif
    }

    /// Storage in `Application Support/<subdirectory>` of the app's container.
    public static func applicationSupport(subdirectory: String = "ConvoHop") throws -> FileRecoveryStorage {
        let base = try FileManager.default.url(
            for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        return try FileRecoveryStorage(directory: base.appendingPathComponent(subdirectory, isDirectory: true))
    }

    #if canImport(Darwin)
        /// Storage in an App Group container, shared with your app extensions.
        public static func appGroup(_ identifier: String, subdirectory: String = "ConvoHop") throws -> FileRecoveryStorage {
            guard let base = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: identifier) else {
                throw ConvoHopUsageError("The App Group container \(identifier) is unavailable to this target")
            }
            return try FileRecoveryStorage(
                directory: base.appendingPathComponent("Library/Application Support", isDirectory: true)
                    .appendingPathComponent(subdirectory, isDirectory: true))
        }
    #endif

    public func value(forKey key: String) throws -> String? {
        let file = location(of: key)
        guard FileManager.default.fileExists(atPath: file.path) else { return nil }
        let data = try Data(contentsOf: file)
        guard let text = String(data: data, encoding: .utf8) else {
            throw ConvoHopUsageError("Recovery storage holds a value that is not UTF-8 text")
        }
        return text
    }

    public func setValue(_ value: String, forKey key: String) throws {
        try Data(value.utf8).write(to: location(of: key), options: Self.writing)
    }

    public func removeValue(forKey key: String) throws {
        let file = location(of: key)
        if FileManager.default.fileExists(atPath: file.path) { try FileManager.default.removeItem(at: file) }
    }

    private func location(of key: String) -> URL {
        directory.appendingPathComponent(sha256Hex(key) + ".json", isDirectory: false)
    }

    #if os(iOS) || os(tvOS) || os(watchOS) || os(visionOS)
        private static var writing: Data.WritingOptions { [.atomic, .completeFileProtectionUntilFirstUserAuthentication] }
        private static var protection: [FileAttributeKey: Any]? {
            [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication]
        }
    #else
        private static var writing: Data.WritingOptions { [.atomic] }
        private static var protection: [FileAttributeKey: Any]? { nil }
    #endif
}
