package com.convohop.docs.android

import org.jetbrains.kotlin.K1Deprecation
import org.jetbrains.kotlin.cli.common.messages.MessageCollector
import org.jetbrains.kotlin.cli.jvm.compiler.EnvironmentConfigFiles
import org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment
import org.jetbrains.kotlin.com.intellij.openapi.util.Disposer
import org.jetbrains.kotlin.com.intellij.psi.PsiElement
import org.jetbrains.kotlin.com.intellij.psi.PsiErrorElement
import org.jetbrains.kotlin.com.intellij.psi.util.PsiTreeUtil
import org.jetbrains.kotlin.config.CommonConfigurationKeys
import org.jetbrains.kotlin.config.CompilerConfiguration
import org.jetbrains.kotlin.psi.KtFile
import org.jetbrains.kotlin.psi.KtPsiFactory
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.extension
import kotlin.io.path.isDirectory
import kotlin.io.path.isRegularFile
import kotlin.io.path.readText

/** A parsed Kotlin file and its repository-relative path. */
class Source(val path: String, val file: KtFile) {
    private val lineStarts: IntArray = buildList {
        add(0)
        file.text.forEachIndexed { index, char -> if (char == '\n') add(index + 1) }
    }.toIntArray()

    /** The 1-based line [offset] is on. */
    fun line(offset: Int): Int {
        val found = lineStarts.binarySearch(offset)
        return if (found >= 0) found + 1 else -found - 1
    }

    /** `path:line` of [element], for errors. */
    fun place(element: PsiElement): String = "$path:${line(element.textRange.startOffset)}"
}

/** A documented package, such as `com.convohop:convohop-android-core`, and its parsed sources. */
class DocsPackage(val name: String, val sources: List<Source>)

/**
 * Parses Kotlin with the compiler's parser alone: nothing is resolved or compiled. The parser needs a K1 core
 * environment, which is still the embeddable compiler's way to get a project for PSI.
 */
@OptIn(K1Deprecation::class)
class Parser : AutoCloseable {
    private val disposable = Disposer.newDisposable("docs-surface")
    private val factory: KtPsiFactory

    init {
        val configuration = CompilerConfiguration()
        configuration.put(CommonConfigurationKeys.MESSAGE_COLLECTOR_KEY, MessageCollector.NONE)
        configuration.put(CommonConfigurationKeys.MODULE_NAME, "docs-surface")
        val environment =
            KotlinCoreEnvironment.createForProduction(disposable, configuration, EnvironmentConfigFiles.JVM_CONFIG_FILES)
        factory = KtPsiFactory(environment.project, false)
    }

    /** Parses [text], failing at the first syntax error. [path] names the file in errors. */
    fun parse(path: String, text: String): Source {
        val source = Source(path, factory.createFile(path.substringAfterLast('/'), text.replace("\r\n", "\n")))
        PsiTreeUtil.findChildOfType(source.file, PsiErrorElement::class.java)?.let { error ->
            throw ExtractionException("${source.place(error)}: ${error.errorDescription}")
        }
        return source
    }

    /**
     * Parses the Kotlin sources of the Gradle module in [module], which is relative to [root]: every `.kt` file under
     * src/main/kotlin, in path order. Sources elsewhere under src/main fail, since they wouldn't be documented.
     */
    fun module(root: Path, module: String): List<Source> {
        val main = root.resolve(module).resolve("src/main")
        val kotlin = main.resolve("kotlin")
        if (!kotlin.isDirectory()) throw ExtractionException("$module/src/main/kotlin isn't a directory")
        val files = Files.walk(main).use { paths -> paths.filter { it.isRegularFile() }.toList() }
        val sources = mutableListOf<Path>()
        for (file in files) {
            val path = relative(root, file)
            when {
                file.extension == "java" ->
                    throw ExtractionException("$path: the docs extractor reads only Kotlin; write the SDK in Kotlin")
                file.extension != "kt" -> continue
                !file.startsWith(kotlin) -> throw ExtractionException("$path: put Kotlin sources under src/main/kotlin")
                else -> sources.add(file)
            }
        }
        return sources.map { relative(root, it) to it }.sortedBy { it.first }.map { (path, file) -> parse(path, file.readText()) }
    }

    override fun close() {
        Disposer.dispose(disposable)
    }

    private fun relative(root: Path, file: Path): String = root.relativize(file).toString().replace(File.separatorChar, '/')
}
