import Foundation
import XCTest

@testable import ConvoHop

final class RecoveryStorageTests: XCTestCase {
    private static let abcDigest = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"

    private func temporaryDirectory() -> URL {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("convohop-recovery-storage-" + uuid(), isDirectory: true)
        addTeardownBlock { try? FileManager.default.removeItem(at: directory) }
        return directory
    }

    private func files(in directory: URL) throws -> [String] {
        try FileManager.default.contentsOfDirectory(atPath: directory.path).sorted()
    }

    func testFileStorageKeepsOneFileNamedForTheKeysDigest() async throws {
        let directory = temporaryDirectory()
        let storage = try FileRecoveryStorage(directory: directory)
        XCTAssertEqual(try files(in: directory), [])
        let missing = try await storage.value(forKey: "abc")
        XCTAssertNil(missing)

        try await storage.setValue("{\"a\":1}", forKey: "abc")
        XCTAssertEqual(try files(in: directory), [Self.abcDigest + ".json"])
        let stored = try await storage.value(forKey: "abc")
        XCTAssertEqual(stored, "{\"a\":1}")

        try await storage.setValue("{\"a\":2,\"text\":\"é\"}", forKey: "abc")
        try await storage.setValue("other", forKey: "convohop/requests/\(TestIDs.project)")
        XCTAssertEqual(
            try files(in: directory),
            [Self.abcDigest + ".json", sha256Hex("convohop/requests/\(TestIDs.project)") + ".json"].sorted())
        let replaced = try await storage.value(forKey: "abc")
        XCTAssertEqual(replaced, "{\"a\":2,\"text\":\"é\"}")

        try await storage.removeValue(forKey: "abc")
        try await storage.removeValue(forKey: "abc")
        let removed = try await storage.value(forKey: "abc")
        XCTAssertNil(removed)
        XCTAssertEqual(try files(in: directory), [sha256Hex("convohop/requests/\(TestIDs.project)") + ".json"])
    }

    func testFileStorageValuesOutliveTheInstanceAndCreateNestedDirectories() async throws {
        let directory = temporaryDirectory().appendingPathComponent("nested/ConvoHop", isDirectory: true)
        try await FileRecoveryStorage(directory: directory).setValue("kept", forKey: "abc")
        let reopened = try await FileRecoveryStorage(directory: directory).value(forKey: "abc")
        XCTAssertEqual(reopened, "kept")
    }

    func testFileStorageRejectsAValueThatIsNotUTF8() async throws {
        let directory = temporaryDirectory()
        let storage = try FileRecoveryStorage(directory: directory)
        try Data([0x7B, 0xFF, 0x7D]).write(to: directory.appendingPathComponent(Self.abcDigest + ".json"))
        let error = await thrownError { try await storage.value(forKey: "abc") }
        XCTAssertEqual((error as? ConvoHopUsageError)?.message, "Recovery storage holds a value that is not UTF-8 text")
    }

    #if canImport(Darwin)
        func testFileStorageExcludesItsDirectoryFromBackups() throws {
            let directory = temporaryDirectory()
            _ = try FileRecoveryStorage(directory: directory)
            let values = try URL(fileURLWithPath: directory.path).resourceValues(forKeys: [.isExcludedFromBackupKey])
            XCTAssertEqual(values.isExcludedFromBackup, true)
        }
    #endif
}
