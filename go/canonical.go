package convohop

import (
	"bytes"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"slices"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

const maxSafeInteger = 1<<53 - 1

var errUnsafeNumber = errors.New("unsafe protocol number")

// canonical encodes a decoded JSON value the way every ConvoHop SDK does for
// request identity: object keys sorted by UTF-16 code units, JSON.stringify
// string escaping and ECMAScript number formatting. Values are nil, bool,
// string, json.Number, []any and map[string]any.
func canonical(value any) (string, error) {
	var b strings.Builder
	if err := writeCanonical(&b, value, 0); err != nil {
		return "", err
	}
	return b.String(), nil
}

func writeCanonical(b *strings.Builder, value any, depth int) error {
	if depth > maxNesting {
		return errors.New("protocol value nests too deeply")
	}
	switch v := value.(type) {
	case nil:
		b.WriteString("null")
	case bool:
		b.WriteString(strconv.FormatBool(v))
	case string:
		writeJSString(b, v)
	case json.Number:
		number, err := canonicalNumber(v)
		if err != nil {
			return err
		}
		b.WriteString(number)
	case []any:
		b.WriteByte('[')
		for i, item := range v {
			if i > 0 {
				b.WriteByte(',')
			}
			if err := writeCanonical(b, item, depth+1); err != nil {
				return err
			}
		}
		b.WriteByte(']')
	case map[string]any:
		keys := make([]string, 0, len(v))
		for key := range v {
			keys = append(keys, key)
		}
		slices.SortFunc(keys, compareUTF16)
		b.WriteByte('{')
		for i, key := range keys {
			if i > 0 {
				b.WriteByte(',')
			}
			writeJSString(b, key)
			b.WriteByte(':')
			if err := writeCanonical(b, v[key], depth+1); err != nil {
				return err
			}
		}
		b.WriteByte('}')
	default:
		return fmt.Errorf("unsupported protocol value %T", value)
	}
	return nil
}

// canonicalNumber formats a JSON number as JSON.stringify does after
// JSON.parse, rejecting values outside the safe integer magnitude.
func canonicalNumber(n json.Number) (string, error) {
	f, ok := parseNumber(n)
	if !ok || math.Abs(f) > maxSafeInteger {
		return "", errUnsafeNumber
	}
	return formatNumber(f), nil
}

// parseNumber parses a JSON number as JSON.parse does. Overflow is not finite.
func parseNumber(n json.Number) (float64, bool) {
	f, err := strconv.ParseFloat(string(n), 64)
	if err != nil && !(errors.Is(err, strconv.ErrRange) && f == 0) {
		return 0, false
	}
	return f, !math.IsInf(f, 0) && !math.IsNaN(f)
}

// formatNumber is Number.prototype.toString for finite values.
func formatNumber(f float64) string {
	if f == 0 {
		return "0"
	}
	encoded, _ := json.Marshal(f)
	return string(encoded)
}

// safeInteger reports whether n is an integer JSON.parse represents exactly.
func safeInteger(n json.Number) (int64, bool) {
	f, ok := parseNumber(n)
	if !ok || f != math.Trunc(f) || math.Abs(f) > maxSafeInteger {
		return 0, false
	}
	return int64(f), true
}

// writeJSString writes s as JSON.stringify does: only quotes, backslashes and
// control characters are escaped.
func writeJSString(b *strings.Builder, s string) {
	b.WriteByte('"')
	for _, r := range s {
		switch r {
		case '"':
			b.WriteString(`\"`)
		case '\\':
			b.WriteString(`\\`)
		case '\b':
			b.WriteString(`\b`)
		case '\f':
			b.WriteString(`\f`)
		case '\n':
			b.WriteString(`\n`)
		case '\r':
			b.WriteString(`\r`)
		case '\t':
			b.WriteString(`\t`)
		default:
			if r < 0x20 {
				fmt.Fprintf(b, `\u%04x`, r)
			} else {
				b.WriteRune(r)
			}
		}
	}
	b.WriteByte('"')
}

// compareUTF16 orders strings by UTF-16 code units, as Array.prototype.sort does.
func compareUTF16(a, b string) int {
	for a != "" && b != "" {
		ra, na := utf8.DecodeRuneInString(a)
		rb, nb := utf8.DecodeRuneInString(b)
		if ra != rb {
			ha, la := utf16Units(ra)
			hb, lb := utf16Units(rb)
			if ha != hb {
				return int(ha) - int(hb)
			}
			return int(la) - int(lb)
		}
		a, b = a[na:], b[nb:]
	}
	return len(a) - len(b)
}

func utf16Units(r rune) (uint16, uint16) {
	if r < 0x10000 {
		return uint16(r), 0
	}
	r -= 0x10000
	return uint16(0xd800 + r>>10), uint16(0xdc00 + r&0x3ff)
}

// utf16Length is the JavaScript string length of UTF-8 text.
func utf16Length(text []byte) int {
	length := 0
	for len(text) > 0 {
		r, size := utf8.DecodeRune(text)
		if r >= 0x10000 {
			length += 2
		} else {
			length++
		}
		text = text[size:]
	}
	return length
}

// fingerprint is the SHA-256 digest of the canonical encoding of value.
func fingerprint(value any) (string, error) {
	encoded, err := canonical(value)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256([]byte(encoded))
	return "sha256:" + hex.EncodeToString(sum[:]), nil
}

// NewRequestID returns a random version 4 UUID in canonical lowercase form.
func NewRequestID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	b[6] = b[6]&0x0f | 0x40
	b[8] = b[8]&0x3f | 0x80
	var s [36]byte
	hex.Encode(s[0:8], b[0:4])
	s[8] = '-'
	hex.Encode(s[9:13], b[4:6])
	s[13] = '-'
	hex.Encode(s[14:18], b[6:8])
	s[18] = '-'
	hex.Encode(s[19:23], b[8:10])
	s[23] = '-'
	hex.Encode(s[24:], b[10:])
	return string(s[:])
}

const zeroUUID = "00000000-0000-0000-0000-000000000000"

// isUUID reports whether s is a canonical lowercase nonzero UUID.
func isUUID(s string) bool {
	if len(s) != 36 || s == zeroUUID {
		return false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch i {
		case 8, 13, 18, 23:
			if c != '-' {
				return false
			}
		default:
			if (c < '0' || c > '9') && (c < 'a' || c > 'f') {
				return false
			}
		}
	}
	return true
}

func isUUIDValue(v any) bool {
	s, ok := v.(string)
	return ok && isUUID(s)
}

// isCounter reports whether v is a canonical decimal string from 0 to the
// largest signed 64-bit integer.
func isCounter(v any) bool {
	s, ok := v.(string)
	if !ok || s == "" || len(s) > 19 || (s[0] == '0' && len(s) > 1) {
		return false
	}
	for i := 0; i < len(s); i++ {
		if s[i] < '0' || s[i] > '9' {
			return false
		}
	}
	return compareDecimal(s, "9223372036854775807") <= 0
}

// compareDecimal compares canonical decimal strings.
func compareDecimal(a, b string) int {
	if len(a) != len(b) {
		return len(a) - len(b)
	}
	return strings.Compare(a, b)
}

// isTimestamp reports whether v is a UTC timestamp with milliseconds, such as
// 2026-01-02T03:04:05.678Z, that names a real instant.
func isTimestamp(v any) bool {
	s, ok := v.(string)
	if !ok || len(s) != 24 {
		return false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch i {
		case 4, 7:
			ok = c == '-'
		case 10:
			ok = c == 'T'
		case 13, 16:
			ok = c == ':'
		case 19:
			ok = c == '.'
		case 23:
			ok = c == 'Z'
		default:
			ok = c >= '0' && c <= '9'
		}
		if !ok {
			return false
		}
	}
	_, err := time.Parse(time.RFC3339Nano, s)
	return err == nil
}

// decodeJSON decodes exactly one JSON value, keeping numbers as json.Number.
func decodeJSON(data []byte) (any, error) {
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.UseNumber()
	var value any
	if err := decoder.Decode(&value); err != nil {
		return nil, err
	}
	if _, err := decoder.Token(); err != io.EOF {
		return nil, errors.New("unexpected data after the JSON value")
	}
	return value, nil
}

// decodeInto converts a decoded JSON value to the generated type behind out.
func decodeInto(value any, out any) error {
	encoded, err := json.Marshal(value)
	if err != nil {
		return err
	}
	decoder := json.NewDecoder(bytes.NewReader(encoded))
	decoder.UseNumber()
	return decoder.Decode(out)
}

// deepCopy copies a decoded JSON value.
func deepCopy(value any) any {
	switch v := value.(type) {
	case map[string]any:
		copied := make(map[string]any, len(v))
		for key, item := range v {
			copied[key] = deepCopy(item)
		}
		return copied
	case []any:
		copied := make([]any, len(v))
		for i, item := range v {
			copied[i] = deepCopy(item)
		}
		return copied
	default:
		return v
	}
}
