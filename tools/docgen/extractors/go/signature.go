package main

import (
	"bytes"
	"fmt"
	"go/ast"
	"go/format"
	"go/printer"
	"go/scanner"
	"go/token"
	"strings"
)

var printConfig = printer.Config{Mode: printer.UseSpaces | printer.TabIndent, Tabwidth: 8}

// filteredMarkers are the comments go/printer writes where go/doc removed
// unexported fields or methods. Signatures keep them, as pkg.go.dev does.
var filteredMarkers = map[string]bool{
	"// contains filtered or unexported fields":  true,
	"// contains filtered or unexported methods": true,
}

// declaration prints a declaration as gofmt formats it, without comments or
// blank lines.
func (x *extractor) declaration(decl ast.Decl) (string, error) {
	text, err := x.print(decl)
	if err != nil {
		return "", err
	}
	formatted, err := format.Source([]byte(text))
	if err != nil {
		return "", fmt.Errorf("%s: can't format the declaration: %v", x.position(decl.Pos()), err)
	}
	return string(bytes.TrimSpace(formatted)), nil
}

// expression prints a type as gofmt formats it, without comments or blank
// lines.
func (x *extractor) expression(expr ast.Expr) (string, error) {
	text, err := x.print(expr)
	if err != nil {
		return "", err
	}
	const prefix = "var _ "
	formatted, err := format.Source([]byte(prefix + text))
	if err != nil {
		return "", fmt.Errorf("%s: can't format the type: %v", x.position(expr.Pos()), err)
	}
	return strings.TrimPrefix(string(bytes.TrimSpace(formatted)), prefix), nil
}

// print prints node with the comments attached to its nodes, then removes
// the comments and the lines left without code. It prints node alone, since
// go/printer writes filteredMarkers only when it isn't given a file's
// comments.
func (x *extractor) print(node ast.Node) (string, error) {
	var buf bytes.Buffer
	if err := printConfig.Fprint(&buf, x.fset, node); err != nil {
		return "", fmt.Errorf("%s: %v", x.position(node.Pos()), err)
	}
	return stripComments(buf.Bytes())
}

// stripComments removes the comments from Go source, except filteredMarkers,
// and drops the lines left without code. It scans tokens, so comment-like
// text and blank lines in raw strings stay.
func stripComments(src []byte) (string, error) {
	fset := token.NewFileSet()
	file := fset.AddFile("", fset.Base(), len(src))
	var errs scanner.ErrorList
	var s scanner.Scanner
	s.Init(file, src, errs.Add, scanner.ScanComments)
	code := map[int]bool{}
	var cuts [][2]int
	for {
		pos, tok, lit := s.Scan()
		if tok == token.EOF {
			break
		}
		if tok == token.SEMICOLON && lit == "\n" {
			continue
		}
		start := file.Offset(pos)
		end := start + len(lit)
		if lit == "" {
			end = start + len(tok.String())
		}
		if tok == token.COMMENT && !filteredMarkers[lit] {
			cuts = append(cuts, [2]int{start, end})
			continue
		}
		first := file.Line(pos)
		for line := first; line <= first+bytes.Count(src[start:end], []byte{'\n'}); line++ {
			code[line] = true
		}
	}
	if err := errs.Err(); err != nil {
		return "", err
	}
	var b strings.Builder
	last := 0
	for _, cut := range cuts {
		b.Write(src[last:cut[0]])
		// Keep a block comment's line breaks so line numbers still match.
		b.WriteString(strings.Repeat("\n", bytes.Count(src[cut[0]:cut[1]], []byte{'\n'})))
		last = cut[1]
	}
	b.Write(src[last:])
	var kept []string
	for i, line := range strings.Split(b.String(), "\n") {
		if code[i+1] {
			kept = append(kept, line)
		}
	}
	return strings.Join(kept, "\n"), nil
}
