package com.convohop.docs.android

import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.writeText
import kotlin.system.exitProcess

/** The package the GraphQL generator writes models to; its data classes are documented by their declarations. */
const val MODEL_PACKAGE: String = "com.convohop.android.generated"

private const val USAGE = "usage: extract --language <id> --output <surface.json> --package <name>=<module> ..."

/**
 * Writes the surface (spec/docs/surface.schema.json) of the Gradle modules named by `--package name=module`, in
 * argument order. Paths are relative to the working directory, the repository root.
 */
fun main(args: Array<String>) {
    exitProcess(extract(args, Path.of("").toAbsolutePath()) { System.err.println(it) })
}

/** Extracts as [main] does with paths relative to [root]. Returns 0, 1 when the sources are wrong or 2 for bad usage. */
fun extract(args: Array<String>, root: Path, error: (String) -> Unit): Int {
    val options = try {
        Options.parse(args)
    } catch (e: IllegalArgumentException) {
        error("android extractor: ${e.message}\n$USAGE")
        return 2
    }
    return try {
        Parser().use { parser ->
            val packages = options.packages.map { (name, module) -> DocsPackage(name, parser.module(root, module)) }
            val surface = Surface(MODEL_PACKAGE).extract(packages)
            val output = root.resolve(options.output)
            output.parent?.createDirectories()
            output.writeText(Json.write(linkedMapOf("language" to options.language, "packages" to surface.map { it.toJson() })))
        }
        0
    } catch (e: ExtractionException) {
        error("android extractor: ${e.message}")
        1
    }
}

private class Options(val language: String, val output: String, val packages: List<Pair<String, String>>) {
    companion object {
        fun parse(args: Array<String>): Options {
            var language: String? = null
            var output: String? = null
            val packages = mutableListOf<Pair<String, String>>()
            var i = 0
            while (i < args.size) {
                val flag = args[i]
                val value = args.getOrNull(i + 1) ?: throw IllegalArgumentException("$flag needs a value")
                when (flag) {
                    "--language" -> language = value
                    "--output" -> output = value
                    "--package" -> {
                        val name = value.substringBefore('=', "")
                        val module = value.substringAfter('=', "")
                        require(name.isNotEmpty() && module.isNotEmpty()) { "--package takes <name>=<module>, not $value" }
                        require(packages.none { it.first == name }) { "package $name is given twice" }
                        packages += name to module
                    }
                    else -> throw IllegalArgumentException("unknown argument $flag")
                }
                i += 2
            }
            requireNotNull(language) { "--language is required" }
            requireNotNull(output) { "--output is required" }
            require(packages.isNotEmpty()) { "give at least one --package" }
            return Options(language, output, packages)
        }
    }
}
