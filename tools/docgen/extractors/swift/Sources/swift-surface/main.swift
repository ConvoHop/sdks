import Foundation
import SwiftSurface

// swift-surface <repository root> <language.json>
//
// Prints the surface JSON of the modules the language file lists, or every problem as `path:line: message` on
// stderr and exits 1.
let arguments = Array(CommandLine.arguments.dropFirst())
guard arguments.count == 2 else {
    FileHandle.standardError.write(Data("usage: swift-surface <repository root> <language.json>\n".utf8))
    exit(2)
}
do {
    let surface = try extract(root: arguments[0], languagePath: arguments[1])
    FileHandle.standardOutput.write(Data((surface.json() + "\n").utf8))
} catch let error as ExtractionError {
    FileHandle.standardError.write(Data((error.description + "\n").utf8))
    exit(1)
} catch {
    FileHandle.standardError.write(Data("\(error)\n".utf8))
    exit(1)
}
