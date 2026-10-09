package main

import (
	"cmp"
	"errors"
	"fmt"
	"go/ast"
	"go/build"
	"go/build/constraint"
	"go/doc"
	"go/doc/comment"
	"go/parser"
	"go/token"
	"go/types"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"unicode/utf16"
)

// platforms are targets that every documented file must build for. The
// reference shows one view of a package, so no file may depend on the
// operating system or architecture, or use cgo.
var platforms = []struct{ goos, goarch string }{{"linux", "amd64"}, {"windows", "arm64"}, {"darwin", "arm64"}}

type extractor struct {
	fset      *token.FileSet
	parser    *comment.Parser
	types     map[string]*doc.Type
	generated map[*token.File]bool
}

// extractPackage returns the symbols of the package in the directory source,
// relative to root, sorted by name in UTF-16 code-unit order.
func extractPackage(root, source, importPath string) ([]symbol, error) {
	dir := filepath.Join(root, filepath.FromSlash(source))
	entries, err := os.ReadDir(dir)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, fmt.Errorf("%s: no such directory", source)
	}
	if err != nil {
		return nil, err
	}
	x := &extractor{
		fset:      token.NewFileSet(),
		types:     map[string]*doc.Type{},
		generated: map[*token.File]bool{},
	}
	var files []*ast.File
	for _, entry := range entries {
		name := entry.Name()
		// The go command ignores files whose names start with _ or ., and
		// tests aren't part of the API.
		if entry.IsDir() || !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") ||
			strings.HasPrefix(name, "_") || strings.HasPrefix(name, ".") {
			continue
		}
		display := path.Join(source, name)
		src, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			return nil, err
		}
		if err := checkPortable(dir, name, display, src); err != nil {
			return nil, err
		}
		file, err := parser.ParseFile(x.fset, display, src, parser.ParseComments)
		if err != nil {
			return nil, err
		}
		if len(files) > 0 && file.Name.Name != files[0].Name.Name {
			return nil, fmt.Errorf("%s: package %s isn't package %s, like %s", display, file.Name.Name, files[0].Name.Name, x.fset.File(files[0].Pos()).Name())
		}
		for _, spec := range file.Imports {
			if importPath, _ := strconv.Unquote(spec.Path.Value); importPath == "C" {
				return nil, fmt.Errorf("%s: imports C; the reference documents files that build everywhere, without cgo", x.position(spec.Pos()))
			}
		}
		if err := x.checkEmbedding(file); err != nil {
			return nil, err
		}
		x.generated[x.fset.File(file.Pos())] = ast.IsGenerated(file)
		files = append(files, file)
	}
	if len(files) == 0 {
		return nil, fmt.Errorf("%s: no Go files", source)
	}
	// go/doc drops unexported declarations, fields and methods from the
	// files and marks where it removed fields or methods.
	pkg, err := doc.NewFromFiles(x.fset, files, importPath, doc.PreserveAST)
	if err != nil {
		return nil, err
	}
	x.parser = pkg.Parser()
	for _, t := range pkg.Types {
		x.types[t.Name] = t
	}

	symbols := []symbol{}
	for _, value := range slices.Concat(pkg.Consts, pkg.Vars) {
		constants, err := x.constants(value)
		if err != nil {
			return nil, err
		}
		symbols = append(symbols, constants...)
	}
	for _, fn := range pkg.Funcs {
		function, err := x.function(fn)
		if err != nil {
			return nil, err
		}
		symbols = append(symbols, function)
	}
	for _, t := range pkg.Types {
		typ, err := x.typeSymbol(t)
		if err != nil {
			return nil, err
		}
		symbols = append(symbols, typ)
		values := t.Vars
		if typ.Kind != "enum" {
			values = slices.Concat(t.Consts, t.Vars)
		}
		for _, value := range values {
			constants, err := x.constants(value)
			if err != nil {
				return nil, err
			}
			symbols = append(symbols, constants...)
		}
		// go/doc lists constructors with the type they return; the surface
		// lists every function at the top level.
		for _, fn := range t.Funcs {
			function, err := x.function(fn)
			if err != nil {
				return nil, err
			}
			symbols = append(symbols, function)
		}
	}
	slices.SortFunc(symbols, func(a, b symbol) int {
		return slices.Compare(utf16.Encode([]rune(a.Name)), utf16.Encode([]rune(b.Name)))
	})
	return symbols, nil
}

// checkPortable rejects files that only some builds include.
func checkPortable(dir, name, display string, src []byte) error {
	for i, line := range strings.Split(string(src), "\n") {
		line = strings.TrimSpace(line)
		if constraint.IsGoBuild(line) || constraint.IsPlusBuild(line) {
			return fmt.Errorf("%s:%d: build constraints aren't supported; the reference documents one build of the package", display, i+1)
		}
	}
	for _, platform := range platforms {
		context := build.Default
		context.GOOS, context.GOARCH = platform.goos, platform.goarch
		ok, err := context.MatchFile(dir, name)
		if err != nil {
			return err
		}
		if !ok {
			return fmt.Errorf("%s: doesn't build for %s/%s; the reference documents files that build everywhere", display, platform.goos, platform.goarch)
		}
	}
	return nil
}

// checkEmbedding rejects exported types that embed an unexported type, and
// interfaces with type-set elements. go/doc drops an unexported embedded
// type from the declaration, and members lists promotions only from the
// package's exported types, so the reference would silently miss the members
// that the type promotes.
func (x *extractor) checkEmbedding(file *ast.File) error {
	for _, decl := range file.Decls {
		gen, ok := decl.(*ast.GenDecl)
		if !ok || gen.Tok != token.TYPE {
			continue
		}
		for _, spec := range gen.Specs {
			typeSpec := spec.(*ast.TypeSpec)
			if !typeSpec.Name.IsExported() {
				continue
			}
			var fields *ast.FieldList
			_, isInterface := typeSpec.Type.(*ast.InterfaceType)
			switch typ := typeSpec.Type.(type) {
			case *ast.StructType:
				fields = typ.Fields
			case *ast.InterfaceType:
				fields = typ.Methods
			default:
				continue
			}
			for _, field := range fields.List {
				if len(field.Names) > 0 {
					continue
				}
				name := baseName(field.Type)
				interfaceType := isInterface && (name == "error" || name == "any")
				switch {
				case name == "" || isInterface && !interfaceType && types.Universe.Lookup(name) != nil:
					return fmt.Errorf("%s: %s has a type-set element; the reference documents interfaces of methods only", x.position(field.Pos()), typeSpec.Name.Name)
				case token.IsExported(name), interfaceType:
				default:
					return fmt.Errorf("%s: %s embeds %s, which isn't exported, so the reference can't list the members it promotes; embed an exported type or declare the members", x.position(field.Pos()), typeSpec.Name.Name, name)
				}
			}
		}
	}
	return nil
}

// baseName is the name of the type that an embedded field or interface
// element denotes, without its package, pointer or type arguments, or "" for
// a type-set element.
func baseName(expr ast.Expr) string {
	switch typ := expr.(type) {
	case *ast.Ident:
		return typ.Name
	case *ast.SelectorExpr:
		return typ.Sel.Name
	case *ast.StarExpr:
		return baseName(typ.X)
	case *ast.IndexExpr:
		return baseName(typ.X)
	case *ast.IndexListExpr:
		return baseName(typ.X)
	}
	return ""
}

// localName is the name of the package's own type that an embedded field
// denotes, or "" when the type comes from another package.
func localName(expr ast.Expr) string {
	switch typ := expr.(type) {
	case *ast.Ident:
		return typ.Name
	case *ast.StarExpr:
		return localName(typ.X)
	case *ast.IndexExpr:
		return localName(typ.X)
	case *ast.IndexListExpr:
		return localName(typ.X)
	}
	return ""
}

func (x *extractor) position(pos token.Pos) string {
	position := x.fset.Position(pos)
	return fmt.Sprintf("%s:%d", position.Filename, position.Line)
}

func (x *extractor) isGenerated(node ast.Node) bool {
	return x.generated[x.fset.File(node.Pos())]
}

func typeKind(t *doc.Type) string {
	spec := t.Decl.Specs[0].(*ast.TypeSpec)
	if spec.Assign.IsValid() {
		return "type"
	}
	switch spec.Type.(type) {
	case *ast.StructType:
		return "struct"
	case *ast.InterfaceType:
		return "interface"
	}
	if len(t.Consts) > 0 {
		return "enum"
	}
	return "type"
}

// typeSymbol documents a type. Its signature is the whole declaration. A
// type with constants of its own is an enum, whose constants are its cases.
// A generated type is listed by its declaration, including an enum's
// constant blocks, with its methods but without field or case members.
func (x *extractor) typeSymbol(t *doc.Type) (symbol, error) {
	kind := typeKind(t)
	decl := *t.Decl
	decl.Doc = nil
	signature, err := x.declaration(&decl)
	if err != nil {
		return symbol{}, err
	}
	docs := t.Doc
	if kind == "enum" {
		for _, value := range t.Consts {
			if x.isGenerated(t.Decl) {
				block := *value.Decl
				block.Doc = nil
				text, err := x.declaration(&block)
				if err != nil {
					return symbol{}, err
				}
				signature += "\n\n" + text
			}
			docs = joinParagraphs(docs, value.Doc)
		}
	}
	out := symbol{Name: t.Name, Kind: kind, Signatures: []string{signature}}
	if out.Docs, out.Deprecated, err = x.docs(docs, t.Decl.Pos()); err != nil {
		return symbol{}, err
	}
	if out.Members, err = x.members(t); err != nil {
		return symbol{}, err
	}
	return out, nil
}

// members returns t's own members, then the fields and methods it promotes
// from the package's types that it embeds, shallowest first. As in Go, a
// shallower name hides deeper ones, and a name that two types at the same
// depth declare is promoted from neither.
func (x *extractor) members(t *doc.Type) ([]member, error) {
	members, embedded, err := x.ownMembers(t)
	if err != nil {
		return nil, err
	}
	hidden := map[string]bool{}
	for _, m := range members {
		hidden[m.Name] = true
	}
	visited := map[string]bool{t.Name: true}
	for len(embedded) > 0 {
		var promoted []member
		declarations := map[string]int{}
		var deeper []string
		for _, name := range embedded {
			base := x.types[name]
			if base == nil || visited[name] {
				continue
			}
			own, next, err := x.ownMembers(base)
			if err != nil {
				return nil, err
			}
			for _, m := range own {
				if m.Kind == "case" {
					continue
				}
				m.Inherited = name
				promoted = append(promoted, m)
				declarations[m.Name]++
			}
			deeper = append(deeper, next...)
		}
		for _, name := range embedded {
			visited[name] = true
		}
		for _, m := range promoted {
			if !hidden[m.Name] && declarations[m.Name] == 1 {
				members = append(members, m)
			}
		}
		for _, m := range promoted {
			hidden[m.Name] = true
		}
		embedded = deeper
	}
	return members, nil
}

// ownMembers returns the members that t declares, fields or interface
// methods, then cases, then methods, each in declaration order, and the
// names of the package's types that t embeds.
func (x *extractor) ownMembers(t *doc.Type) ([]member, []string, error) {
	spec := t.Decl.Specs[0].(*ast.TypeSpec)
	generated := x.isGenerated(t.Decl)
	var members []member
	var embedded []string
	if !spec.Assign.IsValid() {
		switch typ := spec.Type.(type) {
		case *ast.StructType:
			for _, field := range typ.Fields.List {
				names := make([]string, 0, len(field.Names))
				for _, name := range field.Names {
					names = append(names, name.Name)
				}
				if len(field.Names) == 0 {
					names = append(names, baseName(field.Type))
					if name := localName(field.Type); name != "" {
						embedded = append(embedded, name)
					}
				}
				if generated {
					continue
				}
				for _, name := range names {
					m, err := x.field(name, field)
					if err != nil {
						return nil, nil, err
					}
					members = append(members, m)
				}
			}
		case *ast.InterfaceType:
			for _, field := range typ.Methods.List {
				if len(field.Names) == 0 {
					if name := localName(field.Type); name != "" {
						embedded = append(embedded, name)
					}
					continue
				}
				if generated {
					continue
				}
				m, err := x.interfaceMethod(field)
				if err != nil {
					return nil, nil, err
				}
				members = append(members, m)
			}
		}
	}
	if typeKind(t) == "enum" && !generated {
		for _, value := range t.Consts {
			cases, err := x.cases(t.Name, value)
			if err != nil {
				return nil, nil, err
			}
			members = append(members, cases...)
		}
	}
	var methods []*doc.Func
	for _, fn := range t.Methods {
		// Level 0 methods are t's own; go/doc adds others promoted from
		// embedded types, which members lists as inherited.
		if fn.Level == 0 {
			methods = append(methods, fn)
		}
	}
	slices.SortFunc(methods, func(a, b *doc.Func) int { return cmp.Compare(a.Decl.Pos(), b.Decl.Pos()) })
	for _, fn := range methods {
		signature, err := x.funcSignature(fn.Decl)
		if err != nil {
			return nil, nil, err
		}
		m := member{Name: fn.Name, Kind: "method", Signatures: []string{signature}}
		if m.Docs, m.Deprecated, err = x.docs(fn.Doc, fn.Decl.Pos()); err != nil {
			return nil, nil, err
		}
		members = append(members, m)
	}
	return members, embedded, nil
}

// field documents a struct field. An embedded field's signature is its type.
func (x *extractor) field(name string, field *ast.Field) (member, error) {
	signature, err := x.expression(field.Type)
	if err != nil {
		return member{}, err
	}
	if len(field.Names) > 0 {
		signature = name + " " + signature
	}
	if field.Tag != nil {
		signature += " " + field.Tag.Value
	}
	m := member{Name: name, Kind: "property", Signatures: []string{signature}}
	m.Docs, m.Deprecated, err = x.docs(commentText(field.Doc, field.Comment), field.Pos())
	return m, err
}

// interfaceMethod documents an interface's method by its line in the
// interface, such as Load(ctx context.Context) error.
func (x *extractor) interfaceMethod(field *ast.Field) (member, error) {
	name := field.Names[0]
	signature, err := x.declaration(&ast.FuncDecl{Name: name, Type: field.Type.(*ast.FuncType)})
	if err != nil {
		return member{}, err
	}
	m := member{Name: name.Name, Kind: "method", Signatures: []string{strings.TrimPrefix(signature, "func ")}}
	m.Docs, m.Deprecated, err = x.docs(commentText(field.Doc, field.Comment), field.Pos())
	return m, err
}

func (x *extractor) function(fn *doc.Func) (symbol, error) {
	signature, err := x.funcSignature(fn.Decl)
	if err != nil {
		return symbol{}, err
	}
	out := symbol{Name: fn.Name, Kind: "function", Signatures: []string{signature}}
	out.Docs, out.Deprecated, err = x.docs(fn.Doc, fn.Decl.Pos())
	return out, err
}

func (x *extractor) funcSignature(decl *ast.FuncDecl) (string, error) {
	return x.declaration(&ast.FuncDecl{Recv: decl.Recv, Name: decl.Name, Type: decl.Type})
}

// constants documents each exported name of a const or var block as a
// constant. Its docs are its own comment, then the block's.
func (x *extractor) constants(value *doc.Value) ([]symbol, error) {
	var out []symbol
	for _, spec := range value.Decl.Specs {
		spec := spec.(*ast.ValueSpec)
		values, err := x.splitSpec(value.Decl.Tok, spec)
		if err != nil {
			return nil, err
		}
		for _, v := range values {
			c := symbol{Name: v.name, Kind: "constant", Signatures: []string{v.signature}}
			if c.Docs, c.Deprecated, err = x.docs(joinParagraphs(commentText(spec.Doc, spec.Comment), value.Doc), spec.Pos()); err != nil {
				return nil, err
			}
			out = append(out, c)
		}
	}
	return out, nil
}

// cases documents an enum's constant block. Its doc comment belongs to the
// enum's docs.
func (x *extractor) cases(enum string, value *doc.Value) ([]member, error) {
	var out []member
	for _, spec := range value.Decl.Specs {
		spec := spec.(*ast.ValueSpec)
		values, err := x.splitSpec(value.Decl.Tok, spec)
		if err != nil {
			return nil, err
		}
		if typ, ok := spec.Type.(*ast.Ident); !ok || typ.Name != enum {
			return nil, fmt.Errorf("%s: %s is in a constant block of %s but isn't declared as a %s; declare it with the type or move it out of the block", x.position(spec.Pos()), spec.Names[0].Name, enum, enum)
		}
		for _, v := range values {
			c := member{Name: v.name, Kind: "case", Signatures: []string{v.signature}}
			if c.Docs, c.Deprecated, err = x.docs(commentText(spec.Doc, spec.Comment), spec.Pos()); err != nil {
				return nil, err
			}
			out = append(out, c)
		}
	}
	return out, nil
}

type namedValue struct{ name, signature string }

// splitSpec returns a single-name declaration for each exported name of a
// const or var spec, such as const A T = "a" for A of const A, B T = "a", "b".
func (x *extractor) splitSpec(tok token.Token, spec *ast.ValueSpec) ([]namedValue, error) {
	if tok == token.CONST && len(spec.Values) == 0 {
		return nil, fmt.Errorf("%s: %s repeats the previous constant's expression, as iota blocks do; give each exported constant its own value", x.position(spec.Pos()), spec.Names[0].Name)
	}
	if len(spec.Values) > 0 && len(spec.Values) != len(spec.Names) {
		return nil, fmt.Errorf("%s: %s takes one of the values of a single expression; declare each exported value on its own", x.position(spec.Pos()), spec.Names[0].Name)
	}
	var out []namedValue
	for i, name := range spec.Names {
		// go/doc renames unexported names that have values to _.
		if !name.IsExported() {
			continue
		}
		single := &ast.ValueSpec{Names: []*ast.Ident{name}, Type: spec.Type}
		if len(spec.Values) > 0 {
			single.Values = []ast.Expr{spec.Values[i]}
		}
		signature, err := x.declaration(&ast.GenDecl{TokPos: name.Pos(), Tok: tok, Specs: []ast.Spec{single}})
		if err != nil {
			return nil, err
		}
		out = append(out, namedValue{name.Name, signature})
	}
	return out, nil
}

// commentText is a doc comment's text, or else a trailing comment's.
func commentText(doc, trailing *ast.CommentGroup) string {
	if text := doc.Text(); text != "" {
		return text
	}
	return trailing.Text()
}

// joinParagraphs joins doc comment texts as separate paragraphs. It trims
// only newlines, since a text may start with an indented code block.
func joinParagraphs(texts ...string) string {
	var parts []string
	for _, text := range texts {
		if text = strings.Trim(text, "\n"); text != "" {
			parts = append(parts, text)
		}
	}
	return strings.Join(parts, "\n\n")
}
