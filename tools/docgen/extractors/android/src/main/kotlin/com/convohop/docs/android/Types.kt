package com.convohop.docs.android

import org.jetbrains.kotlin.com.intellij.psi.PsiElement
import org.jetbrains.kotlin.com.intellij.psi.util.PsiTreeUtil
import org.jetbrains.kotlin.psi.KtClassOrObject
import org.jetbrains.kotlin.psi.KtEnumEntry
import org.jetbrains.kotlin.psi.KtFile

/**
 * The SDK's classes and objects by fully qualified name, and the lookup of a written type name the way the compiler
 * does it for the cases the SDK uses: enclosing classes, explicit imports, the file's package, star imports, then
 * the name as fully qualified. Platform and library types aren't indexed, so they resolve to null.
 */
class Types {
    private val classes = HashMap<String, KtClassOrObject>()

    fun index(file: KtFile) {
        val queue = ArrayDeque(file.declarations.filterIsInstance<KtClassOrObject>())
        while (queue.isNotEmpty()) {
            val declaration = queue.removeFirst()
            if (declaration is KtEnumEntry) continue
            declaration.fqName?.let { classes[it.asString()] = declaration }
            queue.addAll(declaration.declarations.filterIsInstance<KtClassOrObject>())
        }
    }

    /** The SDK type that [text] names when written in [file] inside [scope], or null. Type arguments are ignored. */
    fun resolve(text: String, scope: KtClassOrObject?, file: KtFile): KtClassOrObject? {
        val name = text.filterNot { it.isWhitespace() }.substringBefore('<').removeSuffix("?")
        if (name.isEmpty() || name.any { !it.isJavaIdentifierPart() && it != '.' }) return null
        val first = name.substringBefore('.')
        val rest = name.substring(first.length)
        var outer = scope
        while (outer != null) {
            outer.fqName?.let { classes["${it.asString()}.$name"] }?.let { return it }
            outer = container(outer)
        }
        val imports = file.importDirectives
        val imported = imports.firstOrNull { !it.isAllUnder && (it.aliasName ?: it.importedFqName?.shortName()?.asString()) == first }
        if (imported != null) return imported.importedFqName?.let { classes[it.asString() + rest] }
        val pkg = file.packageFqName.asString()
        classes[if (pkg.isEmpty()) name else "$pkg.$name"]?.let { return it }
        for (directive in imports) {
            if (directive.isAllUnder) directive.importedFqName?.let { classes["${it.asString()}.$name"] }?.let { return it }
        }
        return classes[name]
    }

    companion object {
        /** The class or object [element] is declared in, if any. */
        fun container(element: PsiElement): KtClassOrObject? =
            PsiTreeUtil.getParentOfType(element, KtClassOrObject::class.java, true)

        /** The name of [declaration] relative to its package, such as `Outer.Nested`. */
        fun dotted(declaration: KtClassOrObject): String =
            generateSequence(declaration, ::container).toList().asReversed().joinToString(".") { it.name.orEmpty() }
    }
}
