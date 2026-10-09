package com.convohop.docs.android

import org.jetbrains.kotlin.com.intellij.psi.PsiElement
import org.jetbrains.kotlin.lexer.KtModifierKeywordToken
import org.jetbrains.kotlin.lexer.KtTokens
import org.jetbrains.kotlin.psi.KtClass
import org.jetbrains.kotlin.psi.KtClassOrObject
import org.jetbrains.kotlin.psi.KtConstructor
import org.jetbrains.kotlin.psi.KtExpression
import org.jetbrains.kotlin.psi.KtModifierListOwner
import org.jetbrains.kotlin.psi.KtNamedFunction
import org.jetbrains.kotlin.psi.KtParameter
import org.jetbrains.kotlin.psi.KtProperty
import org.jetbrains.kotlin.psi.KtTypeAlias
import org.jetbrains.kotlin.psi.KtTypeReference

/**
 * Declarations as written, without annotations, comments, bodies or initializers (except a constant's), and with
 * `public` spelled out where the visibility is left to the default. A parameter list goes on one line when it fits
 * in [WIDTH] characters, otherwise one parameter per line. [place] names an element's file and line for errors.
 */
class Signatures(private val place: (PsiElement) -> String) {
    private companion object {
        const val WIDTH = 100
        val VISIBILITY = setOf("public", "protected", "internal", "private")
        val PARAMETER_MODIFIERS = setOf("vararg", "noinline", "crossinline")
        val WHITESPACE = Regex("""\s+""")
    }

    /** The modifier keywords of [owner] in source order, with `public` first when [spellOutPublic] and none is written. */
    fun modifiers(owner: KtModifierListOwner, spellOutPublic: Boolean = true): List<String> {
        val keywords = owner.modifierList?.node?.getChildren(null).orEmpty()
            .filter { it.elementType is KtModifierKeywordToken }
            .map { it.text }
        return if (spellOutPublic && keywords.none { it in VISIBILITY }) listOf("public") + keywords else keywords
    }

    /** A class, interface or object without its constructor or body. */
    fun header(declaration: KtClassOrObject): String = head(declaration) + supertypes(declaration)

    /** A class with its primary constructor's parameters, for types documented by their declaration alone. */
    fun declaration(declaration: KtClassOrObject): String {
        val constructor = declaration.primaryConstructor ?: return header(declaration)
        val keyword = if (constructor.modifierList == null) "" else " " + spaced(modifiers(constructor, false) + "constructor")
        return call(head(declaration) + keyword, constructor.valueParameters.map { parameter(it, true) }, supertypes(declaration))
    }

    /** A constructor, or the implicit one when [constructor] is null. */
    fun constructor(constructor: KtConstructor<*>?): String {
        if (constructor == null) return "public constructor()"
        return call(spaced(modifiers(constructor) + "constructor"), constructor.valueParameters.map { parameter(it, false) }, "")
    }

    fun function(function: KtNamedFunction): String {
        val head = StringBuilder(spaced(modifiers(function) + "fun"))
        function.typeParameterList?.let { head.append(' ').append(collapse(it.text)) }
        head.append(' ')
        function.receiverTypeReference?.let { head.append(type(it)).append('.') }
        head.append(function.name)
        val returns = when {
            function.typeReference != null -> ": " + type(function.typeReference!!)
            function.hasBody() && !function.hasBlockBody() ->
                throw ExtractionException("${place(function)}: give public function ${function.name} an explicit return type")
            else -> ""
        }
        val constraints = function.typeConstraintList?.let { " where " + collapse(it.text) }.orEmpty()
        return call(head.toString(), function.valueParameters.map { parameter(it, false) }, returns + constraints)
    }

    fun property(property: KtProperty): String {
        val head = StringBuilder(spaced(modifiers(property) + if (property.isVar) "var" else "val"))
        property.typeParameterList?.let { head.append(' ').append(collapse(it.text)) }
        head.append(' ')
        property.receiverTypeReference?.let { head.append(type(it)).append('.') }
        head.append(property.name)
        val declared = property.typeReference
            ?: throw ExtractionException("${place(property)}: give public property ${property.name} an explicit type")
        head.append(": ").append(type(declared))
        if (property.hasModifier(KtTokens.CONST_KEYWORD)) {
            val initializer = property.initializer
                ?: throw ExtractionException("${place(property)}: constant ${property.name} needs an initializer")
            head.append(" = ").append(value(initializer, property.name))
        }
        val setter = property.setter?.let { modifiers(it, false).filter { word -> word in VISIBILITY } }.orEmpty()
        if (setter.isNotEmpty() && setter != listOf("public")) head.append("\n    ").append(spaced(setter + "set"))
        return head.toString()
    }

    /** A `val` or `var` parameter of a primary constructor, as a property. */
    fun constructorProperty(parameter: KtParameter): String {
        val keyword = parameter.valOrVarKeyword!!.text
        val declared = parameter.typeReference
            ?: throw ExtractionException("${place(parameter)}: parameter ${parameter.name} needs a type")
        val words = modifiers(parameter).filter { it !in PARAMETER_MODIFIERS }
        return spaced(words + keyword) + " ${parameter.name}: ${type(declared)}"
    }

    fun typeAlias(alias: KtTypeAlias): String {
        val declared = alias.getTypeReference()
            ?: throw ExtractionException("${place(alias)}: type alias ${alias.name} needs a type")
        val parameters = alias.typeParameterList?.let { collapse(it.text) }.orEmpty()
        return spaced(modifiers(alias) + "typealias") + " ${alias.name}$parameters = ${type(declared)}"
    }

    private fun head(declaration: KtClassOrObject): String {
        val keyword = when {
            declaration !is KtClass -> "object"
            declaration.isInterface() -> "interface"
            else -> "class"
        }
        val parameters = declaration.typeParameterList?.let { collapse(it.text) }.orEmpty()
        return spaced(modifiers(declaration) + keyword) + " ${declaration.name}$parameters"
    }

    /** The supertypes without constructor arguments or delegation, and any `where` clause. */
    private fun supertypes(declaration: KtClassOrObject): String {
        val types = declaration.superTypeListEntries.mapNotNull { entry -> entry.typeReference?.let(::type) }
        val list = if (types.isEmpty()) "" else " : " + types.joinToString(", ")
        val constraints = declaration.typeConstraintList?.let { " where " + collapse(it.text) }.orEmpty()
        return list + constraints
    }

    /** A parameter with its type and default. [declaration] keeps its modifiers and `val` or `var`. */
    private fun parameter(parameter: KtParameter, declaration: Boolean): String {
        val parts = modifiers(parameter, false).filter { declaration || it in PARAMETER_MODIFIERS }.toMutableList()
        if (declaration) parameter.valOrVarKeyword?.let { parts += it.text }
        val declared = parameter.typeReference?.let { ": " + type(it) }.orEmpty()
        val default = parameter.defaultValue?.let { " = " + value(it, parameter.name) }.orEmpty()
        return spaced(parts + "${parameter.name}$declared$default")
    }

    /** [head] and its parameter list, on one line if it fits, then [tail]. */
    private fun call(head: String, parameters: List<String>, tail: String): String {
        val line = "$head(${parameters.joinToString(", ")})$tail"
        if (parameters.isEmpty() || line.length <= WIDTH) return line
        return parameters.joinToString("", "$head(\n", ")$tail") { "    $it,\n" }
    }

    private fun type(reference: KtTypeReference): String = collapse(reference.text)

    private fun value(expression: KtExpression, owner: String?): String {
        if ('\n' in expression.text) throw ExtractionException("${place(expression)}: write the value of $owner on one line")
        return expression.text
    }

    private fun collapse(text: String): String = text.trim().replace(WHITESPACE, " ")

    private fun spaced(words: List<String>): String = words.joinToString(" ")
}
