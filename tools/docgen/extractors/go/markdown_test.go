package main

import (
	"go/doc/comment"
	"go/token"
	"testing"
)

func TestEscapeText(t *testing.T) {
	tests := []struct{ text, want string }{
		{"plain text", "plain text"},
		{"snake_case, x_1 and é_ü", "snake_case, x_1 and é_ü"},
		{"_lead, trail_ and a__b", `\_lead, trail\_ and a\_\_b`},
		{"*x* `y` [z] <a> ~b \\c", "\\*x\\* \\`y\\` \\[z\\] \\<a> \\~b \\\\c"},
		{"&amp; &#38; a & b &é &", `\&amp; \&#38; a & b &é &`},
		{"two\nlines", "two lines"},
		{"# - > 1. at the start", "# - > 1. at the start"},
	}
	for _, test := range tests {
		if got := escapeText(test.text); got != test.want {
			t.Errorf("escapeText(%q) = %q; want %q", test.text, got, test.want)
		}
	}
}

func TestEscapeLineStart(t *testing.T) {
	tests := []struct{ line, want string }{
		{"", ""},
		{"text # - 1.", "text # - 1."},
		{"# heading", `\# heading`},
		{"> quote", `\> quote`},
		{"- item", `\- item`},
		{"+ item", `\+ item`},
		{"=== underline", `\=== underline`},
		{"1. item", `1\. item`},
		{"123456789) item", `123456789\) item`},
		{"1234567890. year", "1234567890. year"},
	}
	for _, test := range tests {
		if got := escapeLineStart(test.line); got != test.want {
			t.Errorf("escapeLineStart(%q) = %q; want %q", test.line, got, test.want)
		}
	}
}

func TestCodeSpan(t *testing.T) {
	tests := []struct{ text, want string }{
		{"Client.Send", "`Client.Send`"},
		{"a`b", "``a`b``"},
		{"a``b", "```a``b```"},
		{"`a", "`` `a ``"},
		{"a`", "`` a` ``"},
	}
	for _, test := range tests {
		if got := codeSpan(test.text); got != test.want {
			t.Errorf("codeSpan(%q) = %q; want %q", test.text, got, test.want)
		}
	}
}

func TestEscapeURL(t *testing.T) {
	tests := []struct{ url, want string }{
		{"https://example.com/a_b?c=d&e=f#g", "https://example.com/a_b?c=d&e=f#g"},
		{"mailto:team@example.com", "mailto:team@example.com"},
		{"https://example.com/a b", "https://example.com/a%20b"},
		{"https://example.com/(x)<y>{z}", "https://example.com/%28x%29%3Cy%3E%7Bz%7D"},
		{"https://example.com/\"`\\\x7f", "https://example.com/%22%60%5C%7F"},
	}
	for _, test := range tests {
		if got := escapeURL(test.url); got != test.want {
			t.Errorf("escapeURL(%q) = %q; want %q", test.url, got, test.want)
		}
	}
}

// TestDocs converts doc comment text, as ast.CommentGroup.Text returns it,
// to the surface's Markdown and deprecation notice.
func TestDocs(t *testing.T) {
	notice := func(text string) *string { return &text }
	tests := []struct {
		name, text, docs string
		deprecated       *string
	}{
		{name: "none"},
		{
			name: "paragraph on several lines",
			text: "Sends text.\nIt waits.\n",
			docs: "Sends text. It waits.",
		},
		{
			name: "doc links and URLs",
			text: "Calls [Client.Send] and [Store]; see https://example.com/docs.\n",
			docs: "Calls `Client.Send` and `Store`; see `https://example.com/docs`.",
		},
		{
			name: "links",
			text: "Read [the guide] or [the *spec*].\n\n[the guide]: https://example.com/guide_(x)\n[the *spec*]: https://example.com/spec\n",
			docs: "Read [the guide](https://example.com/guide_%28x%29) or [the \\*spec\\*](https://example.com/spec).",
		},
		{
			name: "heading",
			text: "Intro.\n\n# Retries in C#\n\nText.\n",
			docs: "Intro.\n\n## Retries in C\\#\n\nText.",
		},
		{
			name: "list",
			text: "Steps:\n  - one\n  - *two*\n",
			docs: "Steps:\n\n- one\n- \\*two\\*",
		},
		{
			name: "list with blank lines",
			text: "Steps:\n\n 1. one\n\n 2. two\n",
			docs: "Steps:\n\n1. one\n\n2. two",
		},
		{
			name: "text that would start a block",
			text: "# not a heading,\nsince it goes on.\n\n- not a list\n\n1. nor this\n",
			docs: "\\# not a heading, since it goes on.\n\n\\- not a list\n\n1\\. nor this",
		},
		{
			name: "text that Markdown would read as markup",
			text: "Takes *x* & a_b, _c_ or <d>.\n",
			docs: "Takes \\*x\\* & a_b, \\_c\\_ or \\<d>.",
		},
		{
			name:       "deprecation",
			text:       "Old.\n\nDeprecated: Use [New] instead.\n",
			docs:       "Old.",
			deprecated: notice("Use `New` instead."),
		},
		{
			name:       "deprecation without a notice",
			text:       "Old.\n\nDeprecated:\n",
			docs:       "Old.",
			deprecated: notice(""),
		},
		{
			name:       "two deprecation paragraphs",
			text:       "Deprecated: A.\n\nNow B.\n\nDeprecated: C.\n",
			docs:       "Now B.",
			deprecated: notice("A.\n\nC."),
		},
		{
			name: "text that isn't a deprecation",
			text: "Deprecated:soon.\n\ndeprecated: lower.\n",
			docs: "Deprecated:soon.\n\ndeprecated: lower.",
		},
	}
	x := &extractor{
		fset:   token.NewFileSet(),
		parser: &comment.Parser{LookupSym: func(recv, name string) bool { return true }},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			docs, deprecated, err := x.docs(test.text, token.NoPos)
			if err != nil {
				t.Fatal(err)
			}
			if docs != test.docs {
				t.Errorf("docs = %q; want %q", docs, test.docs)
			}
			if (deprecated == nil) != (test.deprecated == nil) || deprecated != nil && *deprecated != *test.deprecated {
				t.Errorf("deprecated = %s; want %s", quote(deprecated), quote(test.deprecated))
			}
		})
	}
}

func quote(text *string) string {
	if text == nil {
		return "nil"
	}
	return `"` + *text + `"`
}
