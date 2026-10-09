package main

import (
	"fmt"
	"go/doc/comment"
	"go/token"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

var (
	// esmLine matches lines that MDX reads as JavaScript imports or exports.
	esmLine = regexp.MustCompile(`^(?:import|export)\b`)
	// linkScheme matches the URLs that the docs site links to.
	linkScheme = regexp.MustCompile(`(?i)^(?:https|mailto):`)
	// orderedMarker matches text that would start an ordered list item.
	orderedMarker = regexp.MustCompile(`^\d{1,9}[.)]`)
)

// docs converts doc comment text to the surface's Markdown, which keeps to
// docgen's subset: paragraphs on one line, headings and lists. Doc links and
// bare URLs become code spans, as in the other languages' surfaces. Code
// blocks fail, as in the other extractors: nothing would compile or run
// them, so example code goes in a tested quickstart snippet instead.
// Paragraphs that start with "Deprecated:" are the deprecation notice, as
// go/doc and pkg.go.dev read them: deprecated holds them without the prefix,
// possibly empty, and is nil when there are none. pos locates errors.
func (x *extractor) docs(text string, pos token.Pos) (string, *string, error) {
	if strings.TrimSpace(text) == "" {
		return "", nil, nil
	}
	parsed := x.parser.Parse(text)
	w := &markdownWriter{where: x.position(pos)}
	for _, def := range parsed.Links {
		if !def.Used {
			return "", nil, w.fail("the link definition [%s] isn't used; the reference drops link definitions, so link to it or remove it", def.Text)
		}
	}
	var blocks, notices []string
	var deprecated *string
	for _, block := range parsed.Content {
		if text, ok := deprecation(block); ok {
			notice, err := w.paragraph(text)
			if err != nil {
				return "", nil, err
			}
			if notice != "" {
				notices = append(notices, notice)
			}
			joined := strings.Join(notices, "\n\n")
			deprecated = &joined
			continue
		}
		markdown, err := w.block(block)
		if err != nil {
			return "", nil, err
		}
		blocks = append(blocks, markdown)
	}
	return strings.Join(blocks, "\n\n"), deprecated, nil
}

// deprecation returns the text of a paragraph that starts with "Deprecated:",
// without the prefix.
func deprecation(block comment.Block) ([]comment.Text, bool) {
	paragraph, ok := block.(*comment.Paragraph)
	if !ok || len(paragraph.Text) == 0 {
		return nil, false
	}
	first, ok := paragraph.Text[0].(comment.Plain)
	if !ok {
		return nil, false
	}
	rest, found := strings.CutPrefix(string(first), "Deprecated:")
	if r, _ := utf8.DecodeRuneInString(rest); !found || rest != "" && !unicode.IsSpace(r) {
		return nil, false
	}
	return append([]comment.Text{comment.Plain(strings.TrimLeftFunc(rest, unicode.IsSpace))}, paragraph.Text[1:]...), true
}

type markdownWriter struct {
	where string
}

func (w *markdownWriter) fail(format string, args ...any) error {
	return fmt.Errorf("%s: doc comment: %s", w.where, fmt.Sprintf(format, args...))
}

func (w *markdownWriter) block(block comment.Block) (string, error) {
	switch block := block.(type) {
	case *comment.Paragraph:
		return w.paragraph(block.Text)
	case *comment.Heading:
		text, err := w.inline(block.Text)
		if err != nil {
			return "", err
		}
		text = strings.TrimSpace(text)
		// A final # would close the heading.
		if strings.HasSuffix(text, "#") {
			text = text[:len(text)-1] + `\#`
		}
		return "## " + text, nil
	case *comment.Code:
		return "", w.fail("code blocks aren't tested; put example code in a tested quickstart snippet")
	case *comment.List:
		return w.list(block)
	}
	return "", w.fail("unsupported block %T", block)
}

// paragraph writes a paragraph on one line.
func (w *markdownWriter) paragraph(text []comment.Text) (string, error) {
	inline, err := w.inline(text)
	if err != nil {
		return "", err
	}
	line := escapeLineStart(strings.TrimSpace(inline))
	if esmLine.MatchString(line) {
		return "", w.fail("a paragraph starts with %q, which MDX reads as JavaScript; reword it", strings.Fields(line)[0])
	}
	return line, nil
}

func (w *markdownWriter) list(list *comment.List) (string, error) {
	items := make([]string, 0, len(list.Items))
	for _, item := range list.Items {
		marker := "-"
		if item.Number != "" {
			marker = item.Number + "."
		}
		lines := []string{marker}
		for i, block := range item.Content {
			paragraph, ok := block.(*comment.Paragraph)
			if !ok {
				return "", w.fail("list items hold only paragraphs, not %T", block)
			}
			text, err := w.paragraph(paragraph.Text)
			if err != nil {
				return "", err
			}
			if i == 0 {
				lines[0] += " " + text
			} else {
				// Continuation paragraphs line up with the item's text.
				lines = append(lines, "", strings.Repeat(" ", len(marker)+1)+text)
			}
		}
		items = append(items, strings.Join(lines, "\n"))
	}
	separator := "\n"
	if list.BlankBetween() {
		separator = "\n\n"
	}
	return strings.Join(items, separator), nil
}

func (w *markdownWriter) inline(texts []comment.Text) (string, error) {
	var b strings.Builder
	for _, text := range texts {
		switch text := text.(type) {
		case comment.Plain:
			b.WriteString(escapeText(string(text)))
		case comment.Italic:
			b.WriteString("*" + escapeText(string(text)) + "*")
		case *comment.DocLink:
			b.WriteString(codeSpan(plainText(text.Text)))
		case *comment.Link:
			if text.Auto {
				b.WriteString(codeSpan(text.URL))
				continue
			}
			if !linkScheme.MatchString(text.URL) {
				return "", w.fail("the link to %s isn't https: or mailto:, the only links the docs site allows", text.URL)
			}
			label, err := w.inline(text.Text)
			if err != nil {
				return "", err
			}
			b.WriteString("[" + strings.TrimSpace(label) + "](" + escapeURL(text.URL) + ")")
		default:
			return "", w.fail("unsupported text %T", text)
		}
	}
	return b.String(), nil
}

// plainText is the text of a doc link, on one line.
func plainText(texts []comment.Text) string {
	var b strings.Builder
	for _, text := range texts {
		switch text := text.(type) {
		case comment.Plain:
			b.WriteString(string(text))
		case comment.Italic:
			b.WriteString(string(text))
		}
	}
	return strings.Join(strings.Fields(b.String()), " ")
}

// escapeText escapes text so that Markdown reads it literally, on one line.
// It escapes underscores except between letters or digits, where they can't
// start or end emphasis, and ampersands that could start character
// references. Line starts are escapeLineStart's job; renderers escape { and }.
func escapeText(text string) string {
	var b strings.Builder
	runes := []rune(text)
	for i, r := range runes {
		var previous, next rune
		if i > 0 {
			previous = runes[i-1]
		}
		if i+1 < len(runes) {
			next = runes[i+1]
		}
		switch r {
		case '\n':
			b.WriteByte(' ')
			continue
		case '\\', '`', '*', '[', ']', '<', '~':
			b.WriteByte('\\')
		case '_':
			if !isWord(previous) || !isWord(next) {
				b.WriteByte('\\')
			}
		case '&':
			if next == '#' || next < utf8.RuneSelf && unicode.IsLetter(next) {
				b.WriteByte('\\')
			}
		}
		b.WriteRune(r)
	}
	return b.String()
}

func isWord(r rune) bool {
	return unicode.IsLetter(r) || unicode.IsDigit(r)
}

// escapeLineStart escapes text at the start of a line that Markdown would
// read as a heading, block quote, list item, thematic break or setext
// underline.
func escapeLineStart(line string) string {
	if line == "" {
		return line
	}
	switch line[0] {
	case '#', '>', '-', '+', '=':
		return `\` + line
	}
	if marker := orderedMarker.FindString(line); marker != "" {
		return marker[:len(marker)-1] + `\` + line[len(marker)-1:]
	}
	return line
}

// escapeURL percent-encodes the bytes that can't appear in a Markdown link
// destination or that docgen would escape.
func escapeURL(url string) string {
	var b strings.Builder
	for i := 0; i < len(url); i++ {
		if c := url[i]; c <= ' ' || c == 0x7f || strings.IndexByte("\"()<>\\`{}", c) >= 0 {
			fmt.Fprintf(&b, "%%%02X", c)
		} else {
			b.WriteByte(c)
		}
	}
	return b.String()
}

// codeSpan is a code span holding text, which may contain backticks, as
// docgen writes them.
func codeSpan(text string) string {
	ticks := strings.Repeat("`", longestRun(text, '`')+1)
	pad := ""
	if strings.HasPrefix(text, "`") || strings.HasSuffix(text, "`") {
		pad = " "
	}
	return ticks + pad + text + pad + ticks
}

func longestRun(text string, c byte) int {
	longest, run := 0, 0
	for i := 0; i < len(text); i++ {
		if text[i] == c {
			run++
			longest = max(longest, run)
		} else {
			run = 0
		}
	}
	return longest
}
