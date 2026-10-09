package com.convohop.docs.surface;

import com.sun.source.tree.AnnotationTree;
import com.sun.source.tree.ClassTree;
import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.tree.MethodTree;
import com.sun.source.tree.ModifiersTree;
import com.sun.source.tree.Tree;
import com.sun.source.tree.TypeParameterTree;
import com.sun.source.tree.VariableTree;
import com.sun.source.util.DocTrees;
import com.sun.source.util.JavacTask;
import com.sun.source.util.TreePath;
import java.io.IOException;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Target;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Deque;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.StringJoiner;
import javax.lang.model.element.Element;
import javax.lang.model.element.ElementKind;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.Modifier;
import javax.lang.model.element.TypeElement;
import javax.lang.model.element.TypeParameterElement;
import javax.lang.model.element.VariableElement;
import javax.lang.model.type.ArrayType;
import javax.lang.model.type.DeclaredType;
import javax.lang.model.type.IntersectionType;
import javax.lang.model.type.TypeMirror;
import javax.lang.model.type.TypeVariable;
import javax.lang.model.type.UnionType;
import javax.lang.model.type.WildcardType;
import javax.lang.model.util.Elements;
import javax.lang.model.util.Types;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;
import org.jspecify.annotations.Nullable;

/**
 * Reads the public API of Java sources with javac. Public types become symbols, nested static types dotted symbols,
 * and public inner classes fold into the accessor that returns them, so {@code client.principals().create(...)} is
 * documented as {@code ProjectServerClient.principals.create}. Members that mention types of the internal package are
 * left out; types of the model package, which mirror the GraphQL schema, are listed by signature, and enums there
 * by their cases.
 */
final class JavaSurface {
  /** Modifiers that describe the implementation, not the API, and javadoc leaves out too. */
  private static final Set<Modifier> HIDDEN_MODIFIERS = EnumSet.of(Modifier.SYNCHRONIZED, Modifier.NATIVE, Modifier.STRICTFP);

  private final String internalPackage;
  private final String modelPackage;
  private final String classpath;
  private DocTrees trees;
  private Elements elements;
  private Types types;

  /**
   * @param internalPackage the package, with its subpackages, whose types aren't API
   * @param modelPackage the package, with its subpackages, whose types are listed without members
   * @param classpath the compile classpath of the sources
   */
  JavaSurface(String internalPackage, String modelPackage, String classpath) {
    this.internalPackage = internalPackage;
    this.modelPackage = modelPackage;
    this.classpath = classpath;
  }

  /** The classpath of the SDK sources: their only dependency, JSpecify. */
  static String sdkClasspath() {
    try {
      return Path.of(Nullable.class.getProtectionDomain().getCodeSource().getLocation().toURI()).toString();
    } catch (URISyntaxException e) {
      throw new IllegalStateException("can't locate JSpecify", e);
    }
  }

  /** The symbols that {@code sources} declare. */
  List<Node> extract(List<Path> sources) throws IOException {
    JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
    if (compiler == null) throw new ExtractionException("javac isn't available; run the extractor on a JDK");
    DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
    try (StandardJavaFileManager fileManager = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
      List<String> options = List.of(
          "-proc:none", "--release", "11", "-implicit:none", "-encoding", "UTF-8", "-Xlint:none", "-classpath", classpath);
      JavacTask task = (JavacTask) compiler.getTask(
          null, fileManager, diagnostics, options, null, fileManager.getJavaFileObjectsFromPaths(sources));
      List<CompilationUnitTree> units = new ArrayList<>();
      for (CompilationUnitTree unit : task.parse()) units.add(unit);
      task.analyze();
      for (Diagnostic<? extends JavaFileObject> diagnostic : diagnostics.getDiagnostics()) {
        if (diagnostic.getKind() == Diagnostic.Kind.ERROR) {
          throw new ExtractionException(location(diagnostic) + diagnostic.getMessage(Locale.ROOT));
        }
      }
      trees = DocTrees.instance(task);
      elements = task.getElements();
      types = task.getTypes();
      units.sort(Comparator.comparing(unit -> Sources.display(Path.of(unit.getSourceFile().toUri()))));
      List<Node> symbols = new ArrayList<>();
      for (CompilationUnitTree unit : units) {
        TreePath unitPath = new TreePath(unit);
        for (Tree declaration : unit.getTypeDecls()) {
          if (!(declaration instanceof ClassTree)) continue;
          TreePath path = new TreePath(unitPath, declaration);
          TypeElement type = (TypeElement) trees.getElement(path);
          if (type.getModifiers().contains(Modifier.PUBLIC) && !inPackage(type, internalPackage)) {
            addType(path, type, type.getSimpleName().toString(), symbols);
          }
        }
      }
      return symbols;
    }
  }

  private static String location(Diagnostic<? extends JavaFileObject> diagnostic) {
    if (diagnostic.getSource() == null) return "";
    String file = Sources.display(Path.of(diagnostic.getSource().toUri()));
    return diagnostic.getLineNumber() == Diagnostic.NOPOS ? file + ": " : file + ":" + diagnostic.getLineNumber() + ": ";
  }

  private void addType(TreePath path, TypeElement type, String name, List<Node> symbols) {
    boolean model = inPackage(type, modelPackage);
    String kind = switch (type.getKind()) {
      case CLASS -> model ? "type" : "class";
      case INTERFACE -> model ? "type" : "interface";
      case ENUM -> "enum";
      default -> throw fail(path, "unsupported " + describe(type.getKind()) + " " + name);
    };
    Node symbol = new Node(name, kind);
    symbol.signatures.add(typeSignature(path, type));
    Doc doc = doc(path);
    String packageName = elements.getPackageOf(type).getQualifiedName().toString();
    symbol.docs = join(doc.text(), "Package: " + Markdown.codeSpan(packageName) + ".");
    symbol.deprecated = elements.isDeprecated(type) ? orEmpty(doc.deprecated()) : null;
    symbols.add(symbol);
    if (model) {
      if (type.getKind() == ElementKind.ENUM) symbol.members.addAll(cases(path));
      return;
    }
    symbol.members.addAll(members(path, type));
    for (Tree member : ((ClassTree) path.getLeaf()).getMembers()) {
      if (!(member instanceof ClassTree)) continue;
      TreePath memberPath = new TreePath(path, member);
      TypeElement nested = (TypeElement) trees.getElement(memberPath);
      Set<Modifier> modifiers = nested.getModifiers();
      if (modifiers.contains(Modifier.PUBLIC) && modifiers.contains(Modifier.STATIC)) {
        addType(memberPath, nested, name + "." + nested.getSimpleName(), symbols);
      }
    }
  }

  private List<Node> cases(TreePath typePath) {
    List<Node> cases = new ArrayList<>();
    for (Tree member : ((ClassTree) typePath.getLeaf()).getMembers()) {
      TreePath path = new TreePath(typePath, member);
      Element element = trees.getElement(path);
      if (element == null || element.getKind() != ElementKind.ENUM_CONSTANT) continue;
      Group group = new Group(element.getSimpleName().toString(), "case", false, null);
      group.add(element, group.name, doc(path), 0);
      cases.add(group.toNode());
    }
    return cases;
  }

  /** The members of a type: its own in source order, then those it inherits from SDK classes and interfaces. */
  private List<Node> members(TreePath typePath, TypeElement type) {
    Map<String, Group> groups = new LinkedHashMap<>();
    List<TreePath> inner = new ArrayList<>();
    for (Tree member : ((ClassTree) typePath.getLeaf()).getMembers()) {
      TreePath path = new TreePath(typePath, member);
      Element element = trees.getElement(path);
      if (element == null) continue;
      String name = element.getSimpleName().toString();
      boolean isStatic = element.getModifiers().contains(Modifier.STATIC);
      switch (element.getKind()) {
        case ENUM_CONSTANT -> group(groups, path, "case", name, false, null).add(element, name, doc(path), 0);
        case FIELD -> {
          if (isApi(element)) {
            String signature = fieldSignature(path, (VariableTree) member, (VariableElement) element);
            group(groups, path, "property", name, isStatic, null).add(element, signature, doc(path), 0);
          }
        }
        case CONSTRUCTOR -> {
          if (isApi(element) && type.getKind() != ElementKind.ENUM) {
            ExecutableElement constructor = (ExecutableElement) element;
            String signature = methodSignature(path, (MethodTree) member, constructor, type);
            group(groups, path, "constructor", "constructor", false, null)
                .add(constructor, signature, doc(path), constructor.getParameters().size());
          }
        }
        case METHOD -> {
          ExecutableElement method = (ExecutableElement) element;
          if (!isApi(method)) continue;
          Doc doc = doc(path);
          if (doc.text().isEmpty()) {
            if (overridesObject(method, type)) continue;
            doc = new Doc(overriddenDoc(method, type).text(), doc.deprecated());
          }
          String signature = methodSignature(path, (MethodTree) member, method, type);
          group(groups, path, "method", name, isStatic, null).add(method, signature, doc, method.getParameters().size());
        }
        case CLASS -> {
          if (element.getModifiers().contains(Modifier.PUBLIC) && !isStatic) inner.add(path);
        }
        default -> {}
      }
    }
    inherit(type, groups);
    for (TreePath path : inner) fold(path, groups);
    List<Node> nodes = new ArrayList<>();
    for (Group group : groups.values()) nodes.add(group.toNode());
    return nodes;
  }

  private Group group(Map<String, Group> groups, TreePath path, String kind, String name, boolean isStatic, @Nullable String inherited) {
    String key = (isStatic ? "static " : "") + name;
    Group group = groups.get(key);
    if (group == null) {
      group = new Group(name, kind, isStatic, inherited);
      groups.put(key, group);
    } else if (!group.kind.equals(kind)) {
      throw fail(path, "a " + kind + " and a " + group.kind + " share the name " + name + "; rename one");
    }
    return group;
  }

  /** Adds the public instance members inherited from SDK supertypes, the nearest first. */
  private void inherit(TypeElement type, Map<String, Group> groups) {
    for (TypeElement base : supertypes(type)) {
      TreePath basePath = trees.getPath(base);
      if (basePath == null || isHidden(base) || inPackage(base, modelPackage)) continue;
      String baseName = symbolName(base);
      for (Tree member : ((ClassTree) basePath.getLeaf()).getMembers()) {
        TreePath path = new TreePath(basePath, member);
        Element element = trees.getElement(path);
        if (element == null || element.getModifiers().contains(Modifier.STATIC) || !isApi(element)) continue;
        if (element.getKind() != ElementKind.METHOD && element.getKind() != ElementKind.FIELD) continue;
        String name = element.getSimpleName().toString();
        Group existing = groups.get(name);
        if (existing != null && !baseName.equals(existing.inherited)) {
          if (element instanceof ExecutableElement method && overridden(existing, method, type)) continue;
          throw fail(path, symbolName(type) + " inherits " + name + " from " + baseName + " but declares or inherits another "
              + name + "; override every overload of " + name + " or none");
        }
        if (element instanceof ExecutableElement method) {
          Doc doc = doc(path);
          if (doc.text().isEmpty() && overridesObject(method, base)) continue;
          String signature = methodSignature(path, (MethodTree) member, method, base);
          group(groups, path, "method", name, false, baseName).add(method, signature, doc, method.getParameters().size());
        } else {
          String signature = fieldSignature(path, (VariableTree) member, (VariableElement) element);
          group(groups, path, "property", name, false, baseName).add(element, signature, doc(path), 0);
        }
      }
    }
  }

  private boolean overridden(Group group, ExecutableElement method, TypeElement type) {
    for (Element declaration : group.declarations) {
      if (declaration instanceof ExecutableElement candidate && elements.overrides(candidate, method, type)) return true;
    }
    return false;
  }

  /** Documents a public inner class under the no-argument accessor that returns it. */
  private void fold(TreePath innerPath, Map<String, Group> groups) {
    TypeElement inner = (TypeElement) trees.getElement(innerPath);
    Group accessor = null;
    for (Group group : groups.values()) {
      if (group.inherited != null || group.isStatic || !group.kind.equals("method")) continue;
      for (Element declaration : group.declarations) {
        ExecutableElement method = (ExecutableElement) declaration;
        if (method.getParameters().isEmpty() && types.isSameType(types.erasure(method.getReturnType()), types.erasure(inner.asType()))) {
          accessor = group;
          break;
        }
      }
      if (accessor != null) break;
    }
    String name = symbolName(inner);
    if (accessor == null) {
      throw fail(innerPath, "public inner class " + name + " needs a public no-argument accessor, which documents its members");
    }
    if (!accessor.nested.isEmpty()) throw fail(innerPath, "two inner classes fold into " + accessor.name + "()");
    for (Node member : members(innerPath, inner)) {
      if (member.kind.equals("constructor")) {
        throw fail(innerPath, "public inner class " + name + " has a public constructor; make it private, since "
            + accessor.name + "() is how callers reach it");
      }
      accessor.nested.add(member);
    }
    if (accessor.doc.text().isEmpty()) accessor.doc = new Doc(doc(innerPath).text(), accessor.doc.deprecated());
  }

  private List<TypeElement> supertypes(TypeElement type) {
    List<TypeElement> found = new ArrayList<>();
    Set<TypeElement> seen = new HashSet<>();
    Deque<TypeMirror> queue = new ArrayDeque<>(types.directSupertypes(type.asType()));
    while (!queue.isEmpty()) {
      TypeMirror next = queue.removeFirst();
      if (!(next instanceof DeclaredType declared)) continue;
      TypeElement element = (TypeElement) declared.asElement();
      if (!seen.add(element)) continue;
      found.add(element);
      queue.addAll(types.directSupertypes(next));
    }
    return found;
  }

  private boolean overridesObject(ExecutableElement method, TypeElement type) {
    TypeElement object = elements.getTypeElement("java.lang.Object");
    for (Element candidate : object.getEnclosedElements()) {
      if (candidate.getKind() == ElementKind.METHOD && elements.overrides(method, (ExecutableElement) candidate, type)) return true;
    }
    return false;
  }

  /** The docs of the nearest documented SDK method that {@code method} overrides, like javadoc's inherited comments. */
  private Doc overriddenDoc(ExecutableElement method, TypeElement type) {
    for (TypeElement base : supertypes(type)) {
      for (Element candidate : base.getEnclosedElements()) {
        if (candidate.getKind() != ElementKind.METHOD || !elements.overrides(method, (ExecutableElement) candidate, type)) continue;
        TreePath path = trees.getPath(candidate);
        if (path == null) continue;
        Doc doc = doc(path);
        if (!doc.text().isEmpty()) return doc;
      }
    }
    return Doc.EMPTY;
  }

  private String typeSignature(TreePath path, TypeElement type) {
    ClassTree tree = (ClassTree) path.getLeaf();
    Annotations annotations = annotations(path, tree.getModifiers());
    List<String> parts = new ArrayList<>(annotations.declaration());
    parts.addAll(annotations.typeUse());
    parts.addAll(keywords(tree.getModifiers()));
    parts.add(type.getKind() == ElementKind.INTERFACE ? "interface" : type.getKind() == ElementKind.ENUM ? "enum" : "class");
    parts.add(tree.getSimpleName() + typeParameters(tree.getTypeParameters()));
    StringBuilder signature = new StringBuilder(String.join(" ", parts));
    // javac lists an interface's superinterfaces in its implements clause.
    List<? extends Tree> clause = tree.getImplementsClause();
    List<? extends TypeMirror> interfaces = type.getInterfaces();
    if (clause.size() != interfaces.size()) throw fail(path, "can't match the supertypes of " + symbolName(type));
    List<String> shown = new ArrayList<>();
    for (int i = 0; i < clause.size(); i++) {
      if (!mentionsHidden(interfaces.get(i))) shown.add(clause.get(i).toString());
    }
    if (type.getKind() == ElementKind.INTERFACE) {
      if (!shown.isEmpty()) signature.append(" extends ").append(String.join(", ", shown));
    } else {
      Tree superclass = tree.getExtendsClause();
      if (superclass != null && !mentionsHidden(type.getSuperclass())) signature.append(" extends ").append(superclass);
      if (!shown.isEmpty()) signature.append(" implements ").append(String.join(", ", shown));
    }
    return signature.toString();
  }

  private String fieldSignature(TreePath path, VariableTree tree, VariableElement field) {
    Annotations annotations = annotations(path, tree.getModifiers());
    List<String> parts = new ArrayList<>(annotations.declaration());
    parts.addAll(keywords(tree.getModifiers()));
    parts.addAll(annotations.typeUse());
    parts.add(tree.getType().toString());
    parts.add(tree.getName().toString());
    String signature = String.join(" ", parts);
    Object constant = field.getConstantValue();
    return constant == null ? signature : signature + " = " + elements.getConstantExpression(constant);
  }

  private String methodSignature(TreePath path, MethodTree tree, ExecutableElement method, TypeElement owner) {
    Annotations annotations = annotations(path, tree.getModifiers());
    List<String> parts = new ArrayList<>(annotations.declaration());
    parts.addAll(keywords(tree.getModifiers()));
    if (!tree.getTypeParameters().isEmpty()) parts.add(typeParameters(tree.getTypeParameters()));
    parts.addAll(annotations.typeUse());
    boolean constructor = method.getKind() == ElementKind.CONSTRUCTOR;
    if (!constructor) parts.add(tree.getReturnType().toString());
    String name = constructor ? owner.getSimpleName().toString() : tree.getName().toString();
    parts.add(name + "(" + parameters(path, tree, method) + ")");
    StringBuilder signature = new StringBuilder(String.join(" ", parts));
    if (!tree.getThrows().isEmpty()) {
      StringJoiner thrown = new StringJoiner(", ", " throws ", "");
      for (Tree type : tree.getThrows()) thrown.add(type.toString());
      signature.append(thrown);
    }
    return signature.toString();
  }

  private String parameters(TreePath methodPath, MethodTree tree, ExecutableElement method) {
    List<? extends VariableTree> parameters = tree.getParameters();
    StringJoiner joined = new StringJoiner(", ");
    for (int i = 0; i < parameters.size(); i++) {
      VariableTree parameter = parameters.get(i);
      Annotations annotations = annotations(new TreePath(methodPath, parameter), parameter.getModifiers());
      List<String> parts = new ArrayList<>(annotations.declaration());
      parts.addAll(annotations.typeUse());
      String type = parameter.getType().toString();
      if (method.isVarArgs() && i == parameters.size() - 1) {
        if (!type.endsWith("[]")) throw fail(methodPath, "can't read the varargs parameter " + parameter.getName());
        type = type.substring(0, type.length() - 2) + "...";
      }
      parts.add(type);
      parts.add(parameter.getName().toString());
      joined.add(String.join(" ", parts));
    }
    return joined.toString();
  }

  /** A declaration's annotations as written: documented declaration annotations, and type-use annotations. */
  private record Annotations(List<String> declaration, List<String> typeUse) {}

  private Annotations annotations(TreePath ownerPath, ModifiersTree modifiers) {
    List<String> declaration = new ArrayList<>();
    List<String> typeUse = new ArrayList<>();
    TreePath modifiersPath = new TreePath(ownerPath, modifiers);
    for (AnnotationTree annotation : modifiers.getAnnotations()) {
      TreePath annotationPath = new TreePath(modifiersPath, annotation);
      Element element = trees.getElement(new TreePath(annotationPath, annotation.getAnnotationType()));
      if (!(element instanceof TypeElement type)) throw fail(annotationPath, "can't resolve " + annotation);
      Target target = type.getAnnotation(Target.class);
      if (target != null && Arrays.asList(target.value()).contains(ElementType.TYPE_USE)) typeUse.add(annotation.toString());
      else if (type.getAnnotation(Documented.class) != null) declaration.add(annotation.toString());
    }
    return new Annotations(declaration, typeUse);
  }

  private static List<String> keywords(ModifiersTree modifiers) {
    List<String> keywords = new ArrayList<>();
    for (Modifier modifier : Modifier.values()) {
      if (modifiers.getFlags().contains(modifier) && !HIDDEN_MODIFIERS.contains(modifier)) keywords.add(modifier.toString());
    }
    return keywords;
  }

  private static String typeParameters(List<? extends TypeParameterTree> parameters) {
    if (parameters.isEmpty()) return "";
    StringJoiner joined = new StringJoiner(", ", "<", ">");
    for (TypeParameterTree parameter : parameters) joined.add(parameter.toString());
    return joined.toString();
  }

  private boolean isApi(Element element) {
    return element.getModifiers().contains(Modifier.PUBLIC) && !mentionsHidden(element);
  }

  /** Whether the type is in the internal package, or isn't public: callers can't name it. */
  private boolean isHidden(Element type) {
    if (inPackage(type, internalPackage)) return true;
    for (Element element = type; element instanceof TypeElement; element = element.getEnclosingElement()) {
      if (!element.getModifiers().contains(Modifier.PUBLIC)) return true;
    }
    return false;
  }

  private boolean mentionsHidden(Element element) {
    if (!(element instanceof ExecutableElement method)) return mentionsHidden(element.asType(), new HashSet<>());
    Set<Element> seen = new HashSet<>();
    if (mentionsHidden(method.getReturnType(), seen)) return true;
    for (VariableElement parameter : method.getParameters()) {
      if (mentionsHidden(parameter.asType(), seen)) return true;
    }
    for (TypeMirror thrown : method.getThrownTypes()) {
      if (mentionsHidden(thrown, seen)) return true;
    }
    for (TypeParameterElement parameter : method.getTypeParameters()) {
      for (TypeMirror bound : parameter.getBounds()) {
        if (mentionsHidden(bound, seen)) return true;
      }
    }
    return false;
  }

  private boolean mentionsHidden(TypeMirror type) {
    return mentionsHidden(type, new HashSet<>());
  }

  private boolean mentionsHidden(@Nullable TypeMirror type, Set<Element> seen) {
    if (type == null) return false;
    switch (type.getKind()) {
      case DECLARED -> {
        DeclaredType declared = (DeclaredType) type;
        if (isHidden(declared.asElement())) return true;
        for (TypeMirror argument : declared.getTypeArguments()) {
          if (mentionsHidden(argument, seen)) return true;
        }
        return false;
      }
      case ARRAY -> {
        return mentionsHidden(((ArrayType) type).getComponentType(), seen);
      }
      case WILDCARD -> {
        WildcardType wildcard = (WildcardType) type;
        return mentionsHidden(wildcard.getExtendsBound(), seen) || mentionsHidden(wildcard.getSuperBound(), seen);
      }
      case TYPEVAR -> {
        TypeVariable variable = (TypeVariable) type;
        if (!seen.add(variable.asElement())) return false;
        return mentionsHidden(variable.getUpperBound(), seen) || mentionsHidden(variable.getLowerBound(), seen);
      }
      case INTERSECTION -> {
        for (TypeMirror bound : ((IntersectionType) type).getBounds()) {
          if (mentionsHidden(bound, seen)) return true;
        }
        return false;
      }
      case UNION -> {
        for (TypeMirror alternative : ((UnionType) type).getAlternatives()) {
          if (mentionsHidden(alternative, seen)) return true;
        }
        return false;
      }
      default -> {
        return false;
      }
    }
  }

  private boolean inPackage(Element element, String packageName) {
    String name = elements.getPackageOf(element).getQualifiedName().toString();
    return name.equals(packageName) || name.startsWith(packageName + ".");
  }

  /** The symbol name of a type: its simple name, after those of the types that enclose it. */
  private static String symbolName(TypeElement type) {
    Deque<String> names = new ArrayDeque<>();
    for (Element element = type; element instanceof TypeElement; element = element.getEnclosingElement()) {
      names.addFirst(element.getSimpleName().toString());
    }
    return String.join(".", names);
  }

  private Doc doc(TreePath path) {
    return Javadoc.convert(trees, path.getCompilationUnit(), trees.getDocCommentTree(path));
  }

  private ExtractionException fail(TreePath path, String message) {
    CompilationUnitTree unit = path.getCompilationUnit();
    return Javadoc.failure(unit, trees.getSourcePositions().getStartPosition(unit, path.getLeaf()), message);
  }

  private static String describe(ElementKind kind) {
    return kind.name().toLowerCase(Locale.ROOT).replace('_', ' ');
  }

  static String join(String... paragraphs) {
    StringJoiner joined = new StringJoiner("\n\n");
    for (String paragraph : paragraphs) {
      if (!paragraph.isEmpty()) joined.add(paragraph);
    }
    return joined.toString();
  }

  static String orEmpty(@Nullable String text) {
    return text == null ? "" : text;
  }

  /** Overloads with the elements that declare them. */
  private final class Group extends Overloads {
    final List<Element> declarations = new ArrayList<>();

    Group(String name, String kind, boolean isStatic, @Nullable String inherited) {
      super(name, kind, isStatic, inherited);
    }

    void add(Element declaration, String signature, Doc doc, int parameters) {
      declarations.add(declaration);
      add(signature, doc, elements.isDeprecated(declaration), parameters);
    }
  }
}
