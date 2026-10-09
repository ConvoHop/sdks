package com.convohop.docs.android

import com.convohop.docs.android.Types.Companion.container
import com.convohop.docs.android.Types.Companion.dotted
import org.jetbrains.kotlin.com.intellij.psi.PsiElement
import org.jetbrains.kotlin.lexer.KtTokens
import org.jetbrains.kotlin.psi.KtAnnotationEntry
import org.jetbrains.kotlin.psi.KtClass
import org.jetbrains.kotlin.psi.KtClassOrObject
import org.jetbrains.kotlin.psi.KtConstructor
import org.jetbrains.kotlin.psi.KtDeclaration
import org.jetbrains.kotlin.psi.KtEnumEntry
import org.jetbrains.kotlin.psi.KtEscapeStringTemplateEntry
import org.jetbrains.kotlin.psi.KtFile
import org.jetbrains.kotlin.psi.KtNamedFunction
import org.jetbrains.kotlin.psi.KtObjectDeclaration
import org.jetbrains.kotlin.psi.KtProperty
import org.jetbrains.kotlin.psi.KtStringTemplateExpression
import org.jetbrains.kotlin.psi.KtTypeAlias

/**
 * Maps public Kotlin declarations onto the surface. Classes and objects are `class` symbols, interfaces (including
 * `fun` and sealed ones) `interface` and enums `enum`; data classes in [modelPackage] are `type` symbols documented
 * by their declaration, and enums there list only their cases. Top-level functions are `function` symbols and
 * top-level properties `constant`. Nested types are symbols named `Outer.Nested`. An object's and a companion's
 * members are static. An inner class is documented as the members of the public property that holds it, which takes
 * the inner class's docs when it has none. Members a type inherits from the SDK's own types follow its own, nearest
 * base first, and an override without KDoc takes the docs of the member it overrides.
 */
class Surface(private val modelPackage: String) {
    private companion object {
        val OVERLOADED = setOf("constructor", "method", "function")
    }

    private val sources = HashMap<KtFile, Source>()
    private val types = Types()
    private val signatures = Signatures(::place)
    private val ownMembers = HashMap<KtClassOrObject, List<Node>>()
    private val computing = HashSet<KtClassOrObject>()

    fun extract(packages: List<DocsPackage>): List<SurfacePackage> {
        for (source in packages.flatMap { it.sources }) {
            sources[source.file] = source
            types.index(source.file)
        }
        return packages.map { SurfacePackage(it.name, symbols(it)) }
    }

    private fun place(element: PsiElement): String = sources.getValue(element.containingFile as KtFile).place(element)

    private fun symbols(pkg: DocsPackage): List<Node> {
        val symbols = mutableListOf<Node>()
        val functions = MemberList()
        val functionPackages = HashMap<String, String>()
        for (source in pkg.sources) {
            val kotlinPackage = source.file.packageFqName.asString()
            if (kotlinPackage.isEmpty()) throw ExtractionException("${source.path}: declare the file's package")
            for (declaration in source.file.declarations) {
                if (!visible(declaration)) continue
                when (declaration) {
                    is KtClassOrObject -> classSymbols(declaration, null, symbols)
                    is KtNamedFunction -> {
                        val function = member(declaration, "function", signatures.function(declaration))
                        if (functionPackages.getOrPut(function.name) { kotlinPackage } != kotlinPackage) {
                            throw ExtractionException(
                                "${place(declaration)}: ${pkg.name} has functions named ${function.name} in two Kotlin packages",
                            )
                        }
                        functions.add(function, declaration)
                    }
                    is KtProperty -> symbols += symbol(declaration, declaration.name!!, "constant", signatures.property(declaration))
                    is KtTypeAlias -> symbols += symbol(declaration, declaration.name!!, "type", signatures.typeAlias(declaration))
                    else -> throw ExtractionException("${place(declaration)}: the docs extractor can't document this declaration")
                }
            }
        }
        for (function in functions.nodes) {
            function.docs = KDoc.join(listOf(function.docs, packageLine(functionPackages.getValue(function.name))))
        }
        symbols += functions.nodes
        symbols.groupBy { it.name }.values.firstOrNull { it.size > 1 }?.let { repeated ->
            throw ExtractionException("${pkg.name} has more than one public symbol named ${repeated.first().name}")
        }
        return symbols.sortedBy { it.name }
    }

    private fun classSymbols(declaration: KtClassOrObject, outer: String?, into: MutableList<Node>) {
        val name = listOfNotNull(outer, declaration.name).joinToString(".")
        val model = declaration.containingKtFile.packageFqName.asString() == modelPackage
        val kind = when {
            declaration !is KtClass -> "class"
            declaration.isInterface() -> "interface"
            declaration.isEnum() -> "enum"
            model && declaration.isData() -> "type"
            else -> "class"
        }
        val signature = if (kind == "type") signatures.declaration(declaration) else signatures.header(declaration)
        val node = symbol(declaration, name, kind, signature)
        when {
            kind == "type" -> {}
            kind == "enum" && model -> node.members += ownMembers(declaration).filter { it.kind == "case" }
            else -> node.members += ownMembers(declaration) + inherited(declaration)
        }
        into += node
        for (nested in declaration.declarations) {
            if (nested !is KtClassOrObject || nested is KtEnumEntry || !visible(nested)) continue
            if ((nested is KtObjectDeclaration && nested.isCompanion()) || (nested is KtClass && nested.isInner())) continue
            classSymbols(nested, name, into)
        }
    }

    /** Own public members in declaration order: cases, constructors, constructor properties, then the body's. */
    private fun ownMembers(declaration: KtClassOrObject): List<Node> {
        ownMembers[declaration]?.let { return it }
        if (!computing.add(declaration)) throw ExtractionException("${place(declaration)}: ${declaration.name} extends itself")
        val members = MemberList()
        val static = declaration is KtObjectDeclaration
        if (declaration is KtClass && declaration.isEnum()) {
            for (entry in declaration.declarations.filterIsInstance<KtEnumEntry>()) {
                if (visible(entry)) members.add(member(entry, "case", entry.name!!), entry)
            }
        }
        for ((constructor, at) in constructors(declaration)) members.add(constructor, at)
        for (parameter in declaration.primaryConstructorParameters) {
            if (!parameter.hasValOrVar() || !visible(parameter)) continue
            members.add(member(parameter, "property", signatures.constructorProperty(parameter), static, declaration), parameter)
        }
        val inners = declaration.declarations.filterIsInstance<KtClass>().filter { it.isInner() && visible(it) }
        val held = HashSet<KtClass>()
        for (body in declaration.declarations) {
            if (!visible(body)) continue
            when (body) {
                is KtNamedFunction -> members.add(member(body, "method", signatures.function(body), static, declaration), body)
                is KtProperty -> {
                    val property = member(body, "property", signatures.property(body), static, declaration)
                    val inner = inners.firstOrNull { holds(body, it) }
                    if (inner != null) {
                        if (!held.add(inner)) {
                            throw ExtractionException("${place(body)}: inner class ${inner.name} is already documented under another property")
                        }
                        property.members += ownMembers(inner) + inherited(inner)
                        if (property.docs.isEmpty()) property.docs = docs(inner)
                    }
                    members.add(property, body)
                }
                is KtObjectDeclaration -> if (body.isCompanion()) companion(body, members)
                else -> {}
            }
        }
        inners.firstOrNull { it !in held }?.let {
            throw ExtractionException("${place(it)}: give inner class ${it.name} one public property of its type to document it under")
        }
        computing.remove(declaration)
        ownMembers[declaration] = members.nodes
        return members.nodes
    }

    private fun companion(companion: KtObjectDeclaration, members: MemberList) {
        for (declaration in companion.declarations) {
            if (!visible(declaration)) continue
            when (declaration) {
                is KtNamedFunction ->
                    members.add(member(declaration, "method", signatures.function(declaration), true, companion), declaration)
                is KtProperty ->
                    members.add(member(declaration, "property", signatures.property(declaration), true, companion), declaration)
                is KtClassOrObject ->
                    throw ExtractionException("${place(declaration)}: move ${declaration.name} out of the companion object")
                else -> {}
            }
        }
    }

    /**
     * The public constructors, or the implicit one when a class that can have one declares none. Inner classes are
     * reached through their property, and sealed classes and enums can't be constructed, so they have none.
     */
    private fun constructors(declaration: KtClassOrObject): List<Pair<Node, PsiElement>> {
        if (declaration !is KtClass || declaration.isInterface() || declaration.isEnum() || declaration.isInner()) return emptyList()
        if (declaration.hasModifier(KtTokens.SEALED_KEYWORD) || declaration.isAnnotation()) return emptyList()
        val declared = listOfNotNull<KtConstructor<*>>(declaration.primaryConstructor) + declaration.secondaryConstructors
        if (declared.isEmpty()) {
            return listOf(Node("constructor", "constructor", mutableListOf(signatures.constructor(null)), "") to declaration)
        }
        return declared.filter(::visible).map { member(it, "constructor", signatures.constructor(it)) to it }
    }

    /** Members [declaration] inherits from the SDK's types and doesn't override, nearest base first. */
    private fun inherited(declaration: KtClassOrObject): List<Node> {
        val static = declaration is KtObjectDeclaration
        val names = ownMembers(declaration).filter { it.static == static }.mapTo(HashSet()) { it.name }
        val inherited = mutableListOf<Node>()
        for (base in ancestors(declaration)) {
            if (!visible(base)) {
                throw ExtractionException("${place(declaration)}: ${declaration.name} extends ${base.name}, which isn't public")
            }
            for (member in ownMembers(base)) {
                if (member.static || member.kind == "constructor" || member.kind == "case" || !names.add(member.name)) continue
                inherited += member.inheritedFrom(dotted(base), static)
            }
        }
        return inherited
    }

    /** The docs of the nearest documented member named [name] that [owner] inherits, or "". */
    private fun overridden(owner: KtClassOrObject, name: String): String =
        ancestors(owner).firstNotNullOfOrNull { base ->
            ownMembers(base).firstOrNull { !it.static && it.name == name && it.docs.isNotEmpty() }?.docs
        }.orEmpty()

    /** The SDK types [declaration] extends, directly or not, breadth first and each once. */
    private fun ancestors(declaration: KtClassOrObject): List<KtClassOrObject> {
        val seen = LinkedHashSet<KtClassOrObject>()
        val queue = ArrayDeque(bases(declaration))
        while (queue.isNotEmpty()) {
            val base = queue.removeFirst()
            if (base != declaration && seen.add(base)) queue.addAll(bases(base))
        }
        return seen.toList()
    }

    private fun bases(declaration: KtClassOrObject): List<KtClassOrObject> =
        declaration.superTypeListEntries.mapNotNull { entry ->
            entry.typeReference?.let { types.resolve(it.text, container(declaration), declaration.containingKtFile) }
        }

    /** Whether [property] has the type of [inner], an inner class of the same class. */
    private fun holds(property: KtProperty, inner: KtClass): Boolean {
        val type = property.typeReference ?: return false
        return types.resolve(type.text, container(property), property.containingKtFile) == inner
    }

    private fun symbol(declaration: KtDeclaration, name: String, kind: String, signature: String): Node {
        val docs = KDoc.join(listOf(docs(declaration), packageLine(declaration.containingKtFile.packageFqName.asString())))
        return Node(name, kind, mutableListOf(signature), docs, deprecated(declaration))
    }

    private fun member(
        declaration: KtDeclaration,
        kind: String,
        signature: String,
        static: Boolean = false,
        owner: KtClassOrObject? = null,
    ): Node {
        val name = if (declaration is KtConstructor<*>) "constructor" else declaration.name!!
        var docs = docs(declaration)
        if (docs.isEmpty() && owner != null && declaration.hasModifier(KtTokens.OVERRIDE_KEYWORD)) docs = overridden(owner, name)
        return Node(name, kind, mutableListOf(signature), docs, deprecated(declaration), static)
    }

    private fun packageLine(kotlinPackage: String): String = "Package: ${KDoc.codeSpan(kotlinPackage)}."

    private fun docs(declaration: KtDeclaration): String {
        val comment = declaration.docComment ?: return ""
        val source = sources.getValue(declaration.containingKtFile)
        return KDoc.convert(comment.text, source.path, source.line(comment.textRange.startOffset))
    }

    /** Not private or internal, and not hidden with `@Deprecated(level = DeprecationLevel.HIDDEN)`. */
    private fun visible(declaration: KtDeclaration): Boolean {
        if (declaration.hasModifier(KtTokens.PRIVATE_KEYWORD) || declaration.hasModifier(KtTokens.INTERNAL_KEYWORD)) return false
        val arguments = deprecation(declaration)?.valueArguments.orEmpty()
        return arguments.none { it.getArgumentExpression()?.text?.substringAfterLast('.') == "HIDDEN" }
    }

    private fun deprecation(declaration: KtDeclaration): KtAnnotationEntry? =
        declaration.annotationEntries.firstOrNull { it.shortName?.asString() == "Deprecated" }

    /** The `@Deprecated` message as Markdown, or null when [declaration] isn't deprecated. */
    private fun deprecated(declaration: KtDeclaration): String? {
        val entry = deprecation(declaration) ?: return null
        val arguments = entry.valueArguments
        val message = arguments.firstOrNull { it.getArgumentName()?.asName?.asString() == "message" }
            ?: arguments.firstOrNull { !it.isNamed() }
            ?: return ""
        val literal = message.getArgumentExpression() as? KtStringTemplateExpression
        if (literal == null || literal.hasInterpolation()) {
            throw ExtractionException("${place(entry)}: write the @Deprecated message as a string literal without templates")
        }
        return KDoc.markdown(literal.entries.joinToString("") { (it as? KtEscapeStringTemplateEntry)?.unescapedValue ?: it.text })
    }

    /** Members in order, each name once: overloads of a constructor, method or function merge into one member. */
    private inner class MemberList {
        val nodes = mutableListOf<Node>()
        private val named = HashMap<Pair<String, Boolean>, Node>()

        fun add(node: Node, at: PsiElement) {
            val existing = named.putIfAbsent(node.name to node.static, node)
            if (existing == null) {
                nodes += node
                return
            }
            if (existing.kind != node.kind || node.kind !in OVERLOADED) {
                throw ExtractionException("${place(at)}: another ${existing.kind} is named ${node.name}; rename one of them")
            }
            existing.signatures += node.signatures
            if (node.docs.isNotEmpty() && node.docs != existing.docs) existing.docs = KDoc.join(listOf(existing.docs, node.docs))
            if (node.deprecated == null) existing.deprecated = null
        }
    }
}
