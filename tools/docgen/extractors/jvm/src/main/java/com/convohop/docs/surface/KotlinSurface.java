package com.convohop.docs.surface;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.StringJoiner;
import org.jetbrains.kotlin.cli.FrontendConfigurationKeys;
import org.jetbrains.kotlin.cli.common.messages.MessageCollector;
import org.jetbrains.kotlin.cli.jvm.compiler.EnvironmentConfigFiles;
import org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment;
import org.jetbrains.kotlin.com.intellij.openapi.Disposable;
import org.jetbrains.kotlin.com.intellij.openapi.util.Disposer;
import org.jetbrains.kotlin.com.intellij.psi.PsiElement;
import org.jetbrains.kotlin.com.intellij.psi.PsiErrorElement;
import org.jetbrains.kotlin.com.intellij.psi.util.PsiTreeUtil;
import org.jetbrains.kotlin.compiler.plugin.CompilerPluginRegistrar;
import org.jetbrains.kotlin.config.CommonConfigurationKeys;
import org.jetbrains.kotlin.config.CompilerConfiguration;
import org.jetbrains.kotlin.kdoc.psi.api.KDoc;
import org.jetbrains.kotlin.lexer.KtModifierKeywordToken;
import org.jetbrains.kotlin.lexer.KtTokens;
import org.jetbrains.kotlin.name.Name;
import org.jetbrains.kotlin.psi.KtAnnotationEntry;
import org.jetbrains.kotlin.psi.KtAnonymousInitializer;
import org.jetbrains.kotlin.psi.KtClass;
import org.jetbrains.kotlin.psi.KtConstructor;
import org.jetbrains.kotlin.psi.KtDeclaration;
import org.jetbrains.kotlin.psi.KtEscapeStringTemplateEntry;
import org.jetbrains.kotlin.psi.KtExpression;
import org.jetbrains.kotlin.psi.KtFile;
import org.jetbrains.kotlin.psi.KtModifierList;
import org.jetbrains.kotlin.psi.KtModifierListOwner;
import org.jetbrains.kotlin.psi.KtNamedFunction;
import org.jetbrains.kotlin.psi.KtObjectDeclaration;
import org.jetbrains.kotlin.psi.KtParameter;
import org.jetbrains.kotlin.psi.KtPrimaryConstructor;
import org.jetbrains.kotlin.psi.KtProperty;
import org.jetbrains.kotlin.psi.KtPsiFactory;
import org.jetbrains.kotlin.psi.KtSecondaryConstructor;
import org.jetbrains.kotlin.psi.KtStringTemplateEntry;
import org.jetbrains.kotlin.psi.KtStringTemplateExpression;
import org.jetbrains.kotlin.psi.KtTypeAlias;
import org.jetbrains.kotlin.psi.KtTypeConstraintList;
import org.jetbrains.kotlin.psi.KtTypeReference;
import org.jetbrains.kotlin.psi.ValueArgument;
import org.jetbrains.kotlin.psi.ValueArgumentName;
import org.jspecify.annotations.Nullable;

/**
 * Reads the public API of Kotlin sources from their syntax trees: top-level functions, merged by name, and classes
 * with their constructors, functions and properties. It doesn't resolve types, so declarations it can't describe
 * from syntax alone, such as supertypes, nested classes and objects, fail rather than going missing. Signatures are
 * the declarations as written, without annotations and bodies, and with {@code public} when the visibility is left
 * to Kotlin's default.
 */
final class KotlinSurface implements AutoCloseable {
  private static final Set<KtModifierKeywordToken> NOT_PUBLIC =
      Set.of(KtTokens.PRIVATE_KEYWORD, KtTokens.INTERNAL_KEYWORD, KtTokens.PROTECTED_KEYWORD);
  /** The modifiers of a parameter itself; the others belong to the property a constructor parameter declares. */
  private static final Set<KtModifierKeywordToken> PARAMETER_MODIFIERS =
      Set.of(KtTokens.VARARG_KEYWORD, KtTokens.NOINLINE_KEYWORD, KtTokens.CROSSINLINE_KEYWORD);

  private final Disposable disposable = Disposer.newDisposable("docs-surface");
  private final KtPsiFactory factory;

  KotlinSurface() {
    try {
      CompilerConfiguration configuration = new CompilerConfiguration();
      configuration.put(CommonConfigurationKeys.MESSAGE_COLLECTOR_KEY, MessageCollector.Companion.getNONE());
      configuration.put(CommonConfigurationKeys.MODULE_NAME, "docs-surface");
      // No compiler plugins: the extractor only parses.
      configuration.put(FrontendConfigurationKeys.EXTENSIONS_STORAGE, new CompilerPluginRegistrar.ExtensionStorage());
      KotlinCoreEnvironment environment =
          KotlinCoreEnvironment.createForProduction(disposable, configuration, EnvironmentConfigFiles.JVM_CONFIG_FILES);
      factory = new KtPsiFactory(environment.getProject(), false);
    } catch (RuntimeException | Error e) {
      Disposer.dispose(disposable);
      throw e;
    }
  }

  @Override
  public void close() {
    Disposer.dispose(disposable);
  }

  /** A source file, for errors. */
  private record Source(String file, String text) {
    int line(int offset) {
      int line = 1;
      for (int i = 0; i < Math.min(offset, text.length()); i++) {
        if (text.charAt(i) == '\n') line++;
      }
      return line;
    }

    ExtractionException fail(PsiElement element, String message) {
      return new ExtractionException(file + ":" + line(element.getTextOffset()) + ": " + message);
    }
  }

  /** The symbols that {@code sources} declare. */
  List<Node> extract(List<Path> sources) throws IOException {
    List<Node> symbols = new ArrayList<>();
    Map<String, Overloads> functions = new LinkedHashMap<>();
    Map<String, String> functionPackages = new LinkedHashMap<>();
    for (Path path : sources) {
      Source source = new Source(Sources.display(path), Files.readString(path, StandardCharsets.UTF_8).replace("\r\n", "\n"));
      KtFile file = factory.createFile(path.getFileName().toString(), source.text());
      PsiErrorElement error = PsiTreeUtil.findChildOfType(file, PsiErrorElement.class);
      if (error != null) throw source.fail(error, "can't parse the Kotlin: " + error.getErrorDescription());
      String packageName = file.getPackageFqName().asString();
      for (KtDeclaration declaration : file.getDeclarations()) {
        if (!isPublic(declaration)) continue;
        if (declaration instanceof KtNamedFunction function) {
          String name = function.getName();
          String other = functionPackages.putIfAbsent(name, packageName);
          if (other != null && !other.equals(packageName)) {
            throw source.fail(function, "functions named " + name + " in " + other + " and " + packageName + " would share a docs page; rename one");
          }
          functions.computeIfAbsent(name, key -> new Overloads(key, "function", false, null))
              .add(functionSignature(source, function), doc(source, function), isDeprecated(source, function), function.getValueParameters().size());
        } else if (declaration instanceof KtClass type) {
          symbols.add(type(source, type, packageName));
        } else {
          throw source.fail(declaration, "unsupported public top-level " + label(declaration)
              + "; the docs extractor documents functions and classes");
        }
      }
    }
    for (Overloads function : functions.values()) {
      Node node = function.toNode();
      node.docs = JavaSurface.join(node.docs, packageLine(functionPackages.get(function.name)));
      symbols.add(node);
    }
    return symbols;
  }

  private Node type(Source source, KtClass type, String packageName) {
    String name = type.getName();
    if (type.isInterface() || type.isEnum() || type.isData() || type.isSealed() || type.isInner() || type.isValue() || type.isAnnotation()) {
      throw source.fail(type, "unsupported kind of class " + name + "; the docs extractor documents plain classes");
    }
    if (type.getSuperTypeList() != null) {
      throw source.fail(type, name + " has supertypes, and the docs extractor reads Kotlin without resolving types, so it"
          + " can't list what " + name + " inherits");
    }
    Node symbol = new Node(name, "class");
    symbol.signatures.add(words(declared(type.getModifierList()), "class", name + text(type.getTypeParameterList()))
        + where(type.getTypeConstraintList()));
    Doc doc = doc(source, type);
    symbol.docs = JavaSurface.join(doc.text(), packageLine(packageName));
    symbol.deprecated = isDeprecated(source, type) ? JavaSurface.orEmpty(doc.deprecated()) : null;

    Map<String, Overloads> members = new LinkedHashMap<>();
    Overloads constructors = new Overloads("constructor", "constructor", false, null);
    members.put("constructor", constructors);
    KtPrimaryConstructor primary = type.getPrimaryConstructor();
    if (primary == null) {
      if (type.getSecondaryConstructors().isEmpty()) constructors.add("public constructor()", Doc.EMPTY, false, 0);
    } else {
      if (isPublic(primary)) addConstructor(source, primary, Doc.EMPTY, constructors);
      for (KtParameter parameter : primary.getValueParameters()) {
        if (!parameter.hasValOrVar() || !isPublic(parameter)) continue;
        member(source, members, parameter, "property").add(
            words(declared(parameter.getModifierList()), parameter.getValOrVarKeyword().getText(), typed(source, parameter)),
            doc(source, parameter), isDeprecated(source, parameter), 0);
      }
    }
    for (KtDeclaration declaration : type.getDeclarations()) {
      if (declaration instanceof KtAnonymousInitializer || !isPublic(declaration)) continue;
      if (declaration instanceof KtSecondaryConstructor constructor) {
        addConstructor(source, constructor, doc(source, constructor), constructors);
      } else if (declaration instanceof KtNamedFunction function) {
        member(source, members, function, "method").add(
            functionSignature(source, function), doc(source, function), isDeprecated(source, function), function.getValueParameters().size());
      } else if (declaration instanceof KtProperty property) {
        member(source, members, property, "property").add(
            propertySignature(source, property), doc(source, property), isDeprecated(source, property), 0);
      } else {
        throw source.fail(declaration, "unsupported public " + label(declaration) + " in " + name
            + "; the docs extractor documents constructors, functions and properties of classes");
      }
    }
    for (Overloads member : members.values()) {
      if (!member.signatures.isEmpty()) symbol.members.add(member.toNode());
    }
    return symbol;
  }

  private void addConstructor(Source source, KtConstructor<?> constructor, Doc doc, Overloads constructors) {
    String signature = words(declared(constructor.getModifierList()), "constructor")
        + "(" + parameters(source, constructor.getValueParameters()) + ")";
    constructors.add(signature, doc, isDeprecated(source, constructor), constructor.getValueParameters().size());
  }

  private static Overloads member(Source source, Map<String, Overloads> members, KtDeclaration declaration, String kind) {
    String name = declaration.getName();
    Overloads member = members.computeIfAbsent(name, key -> new Overloads(key, kind, false, null));
    if (!member.kind.equals(kind)) {
      throw source.fail(declaration, "a " + kind + " and a " + member.kind + " share the name " + name + "; rename one");
    }
    return member;
  }

  private String functionSignature(Source source, KtNamedFunction function) {
    StringBuilder signature = new StringBuilder(words(declared(function.getModifierList()), "fun"));
    if (function.getTypeParameterList() != null) signature.append(' ').append(text(function.getTypeParameterList()));
    signature.append(' ');
    if (function.getReceiverTypeReference() != null) signature.append(text(function.getReceiverTypeReference())).append('.');
    signature.append(function.getName()).append('(').append(parameters(source, function.getValueParameters())).append(')');
    KtTypeReference returnType = function.getTypeReference();
    if (returnType != null) {
      signature.append(": ").append(text(returnType));
    } else if (!function.hasBlockBody()) {
      throw source.fail(function, "declare the return type of public function " + function.getName());
    }
    return signature.append(where(function.getTypeConstraintList())).toString();
  }

  private String propertySignature(Source source, KtProperty property) {
    StringBuilder signature = new StringBuilder(words(declared(property.getModifierList()), property.isVar() ? "var" : "val"));
    if (property.getTypeParameterList() != null) signature.append(' ').append(text(property.getTypeParameterList()));
    signature.append(' ');
    if (property.getReceiverTypeReference() != null) signature.append(text(property.getReceiverTypeReference())).append('.');
    if (property.getTypeReference() == null) {
      throw source.fail(property, "declare the type of public property " + property.getName());
    }
    return signature.append(property.getName()).append(": ").append(text(property.getTypeReference()))
        .append(where(property.getTypeConstraintList())).toString();
  }

  private String parameters(Source source, List<KtParameter> parameters) {
    StringJoiner joined = new StringJoiner(", ");
    for (KtParameter parameter : parameters) {
      String text = words(modifiers(parameter.getModifierList(), PARAMETER_MODIFIERS), typed(source, parameter));
      KtExpression defaultValue = parameter.getDefaultValue();
      joined.add(defaultValue == null ? text : text + " = " + text(defaultValue));
    }
    return joined.toString();
  }

  private static String typed(Source source, KtParameter parameter) {
    if (parameter.getTypeReference() == null) throw source.fail(parameter, "declare the type of parameter " + parameter.getName());
    return parameter.getName() + ": " + text(parameter.getTypeReference());
  }

  /** A public declaration's modifier keywords as written, led by {@code public} when it leaves out Kotlin's default. */
  private static String declared(@Nullable KtModifierList list) {
    String written = modifiers(list, null);
    return list != null && list.hasModifier(KtTokens.PUBLIC_KEYWORD) ? written : words("public", written);
  }

  /** The modifier keywords as written, in {@code only} if it isn't null; annotations are left out. */
  private static String modifiers(@Nullable KtModifierList list, @Nullable Set<KtModifierKeywordToken> only) {
    if (list == null) return "";
    List<String> keywords = new ArrayList<>();
    for (PsiElement child = list.getFirstChild(); child != null; child = child.getNextSibling()) {
      if (child.getNode().getElementType() instanceof KtModifierKeywordToken keyword && (only == null || only.contains(keyword))) {
        keywords.add(child.getText());
      }
    }
    return String.join(" ", keywords);
  }

  private static boolean isPublic(KtModifierListOwner declaration) {
    for (KtModifierKeywordToken modifier : NOT_PUBLIC) {
      if (declaration.hasModifier(modifier)) return false;
    }
    return true;
  }

  /** Whether the declaration has a {@code @Deprecated} annotation; its message must be a plain string, or absent. */
  private static boolean isDeprecated(Source source, KtModifierListOwner declaration) {
    return deprecation(source, declaration) != null;
  }

  private static @Nullable String deprecation(Source source, KtModifierListOwner declaration) {
    KtModifierList list = declaration.getModifierList();
    if (list == null) return null;
    for (KtAnnotationEntry entry : list.getAnnotationEntries()) {
      Name shortName = entry.getShortName();
      if (shortName == null || !shortName.asString().equals("Deprecated")) continue;
      for (ValueArgument argument : entry.getValueArguments()) {
        ValueArgumentName argumentName = argument.getArgumentName();
        if (argumentName != null && !argumentName.getAsName().asString().equals("message")) continue;
        if (argument.getArgumentExpression() instanceof KtStringTemplateExpression template && !template.hasInterpolation()) {
          StringBuilder message = new StringBuilder();
          for (KtStringTemplateEntry part : template.getEntries()) {
            message.append(part instanceof KtEscapeStringTemplateEntry escape ? escape.getUnescapedValue() : part.getText());
          }
          return Markdown.escapeParagraphStart(Markdown.escape(Markdown.collapse(message.toString()).strip()));
        }
        throw source.fail(entry, "write the @Deprecated message as a plain string literal");
      }
      return "";
    }
    return null;
  }

  private static Doc doc(Source source, KtDeclaration declaration) {
    KDoc comment = declaration.getDocComment();
    Doc doc = comment == null
        ? Doc.EMPTY
        : KotlinDoc.convert(comment.getText(), source.file(), source.line(comment.getTextRange().getStartOffset()));
    String deprecation = deprecation(source, declaration);
    return deprecation == null ? doc : new Doc(doc.text(), deprecation);
  }

  private static String packageLine(String packageName) {
    return "Package: " + Markdown.codeSpan(packageName) + ".";
  }

  private static String where(@Nullable KtTypeConstraintList constraints) {
    return constraints == null ? "" : " where " + text(constraints);
  }

  /** The source text of an element on one line, or "" for null. */
  private static String text(@Nullable PsiElement element) {
    return element == null ? "" : Markdown.collapse(element.getText()).strip();
  }

  private static String words(String... words) {
    StringJoiner joined = new StringJoiner(" ");
    for (String word : words) {
      if (!word.isEmpty()) joined.add(word);
    }
    return joined.toString();
  }

  /** How errors name a declaration, such as {@code object Registry} or {@code companion object}. */
  private static String label(KtDeclaration declaration) {
    String kind;
    if (declaration instanceof KtObjectDeclaration object) kind = object.isCompanion() ? "companion object" : "object";
    else if (declaration instanceof KtClass) kind = "class";
    else if (declaration instanceof KtProperty) kind = "property";
    else if (declaration instanceof KtTypeAlias) kind = "type alias";
    else kind = "declaration";
    String name = declaration instanceof KtObjectDeclaration object && object.getNameIdentifier() == null
        ? null // getName() calls an unnamed companion object Companion.
        : declaration.getName();
    return name == null ? kind : kind + " " + name;
  }
}
