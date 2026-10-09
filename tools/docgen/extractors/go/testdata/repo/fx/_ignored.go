// The go command ignores files whose names start with _, so the extractor
// does too. Were it read, its package would fail the extraction.
package ignored

// Ignored isn't part of the reference.
const Ignored = true
