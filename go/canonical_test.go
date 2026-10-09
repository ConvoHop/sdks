package convohop

import (
	"encoding/json"
	"slices"
	"strings"
	"testing"
)

// The request identity vector every ConvoHop SDK reproduces.
const (
	parityInput     = `{"operation":"communication.sendMessage","projectId":"11111111-1111-4111-8111-111111111111","input":{"conversationId":"22222222-2222-4222-8222-222222222222","text":"h\u00e9llo \u2028 <b>&\"\\\n\u0001\ud83d\ude00\u007f","props":{"z":1,"\u00e9":0.1,"\ud83d\ude00":9007199254740991,"\uffff":-0,"a":[1.5,true,null,1e-7,5e-324,-9007199254740991,2.50,-1E+3,0.000001]}}}`
	parityCanonical = `{"input":{"conversationId":"22222222-2222-4222-8222-222222222222","props":{"a":[1.5,true,null,1e-7,5e-324,-9007199254740991,2.5,-1000,0.000001],"z":1,"é":0.1,"😀":9007199254740991,"` + "\uffff" + `":0},"text":"héllo ` + "\u2028" + ` <b>&\"\\\n\u0001😀` + "\u007f" + `"},"operation":"communication.sendMessage","projectId":"11111111-1111-4111-8111-111111111111"}`
)

func TestCanonicalParity(t *testing.T) {
	value, err := decodeJSON([]byte(parityInput))
	if err != nil {
		t.Fatal(err)
	}
	encoded, err := canonical(value)
	if err != nil || encoded != parityCanonical {
		t.Fatalf("canonical() = %s, %v\nwant %s", encoded, err, parityCanonical)
	}
	digest, err := fingerprint(value)
	if err != nil || digest != parityFingerprint {
		t.Fatalf("fingerprint() = %s, %v, want %s", digest, err, parityFingerprint)
	}
}

func TestCanonicalNumbers(t *testing.T) {
	cases := []struct {
		number string
		want   string
	}{
		{"0", "0"},
		{"-0", "0"},
		{"-0.0", "0"},
		{"1e-400", "0"},
		{"2.50", "2.5"},
		{"1E+3", "1000"},
		{"0.1", "0.1"},
		{"0.000001", "0.000001"},
		{"1e-7", "1e-7"},
		{"-1.5e-10", "-1.5e-10"},
		{"5e-324", "5e-324"},
		{"123456789.125", "123456789.125"},
		{"9007199254740991", "9007199254740991"},
		{"-9007199254740991", "-9007199254740991"},
		{"9007199254740991.0", "9007199254740991"},
		{"9007199254740992", ""},
		{"-9007199254740992", ""},
		{"1e21", ""},
		{"1e400", ""},
		{"-1e400", ""},
	}
	for _, tc := range cases {
		t.Run(tc.number, func(t *testing.T) {
			got, err := canonical(json.Number(tc.number))
			if tc.want == "" {
				if err == nil {
					t.Fatalf("canonical(%s) = %s, want an error", tc.number, got)
				}
				return
			}
			if err != nil || got != tc.want {
				t.Fatalf("canonical(%s) = %s, %v, want %s", tc.number, got, err, tc.want)
			}
		})
	}
}

func TestCanonicalStrings(t *testing.T) {
	text := "\"\\/\b\f\n\r\t\x00\x1f\x7f<>&\u2028\u2029é😀\ufffd"
	want := `"\"\\/\b\f\n\r\t\u0000\u001f` + "\x7f<>&\u2028\u2029é😀\ufffd" + `"`
	if got, err := canonical(text); err != nil || got != want {
		t.Fatalf("canonical() = %s, %v, want %s", got, err, want)
	}
}

func TestCanonicalKeyOrder(t *testing.T) {
	value := map[string]any{"\uffff": true, "😀": true, "é": true, "Z": true, "a": true, "": true, "aa": true}
	want := `{"":true,"Z":true,"a":true,"aa":true,"é":true,"😀":true,"` + "\uffff" + `":true}`
	if got, err := canonical(value); err != nil || got != want {
		t.Fatalf("canonical() = %s, %v, want %s", got, err, want)
	}
	if compareUTF16("😀", "\uffff") >= 0 || compareUTF16("\uffff", "😀") <= 0 || compareUTF16("a", "a") != 0 {
		t.Fatal("compareUTF16 does not order by UTF-16 code units")
	}
}

func TestCanonicalRejects(t *testing.T) {
	deep := any(nil)
	for range maxNesting + 1 {
		deep = []any{deep}
	}
	for name, value := range map[string]any{
		"Go number":       1.5,
		"Go integer":      1,
		"typed map":       map[string]string{"a": "b"},
		"typed slice":     []string{"a"},
		"unsafe number":   []any{json.Number("9007199254740993")},
		"invalid number":  json.Number("0x10"),
		"excess nesting":  deep,
		"nested Go value": map[string]any{"a": []any{struct{}{}}},
	} {
		t.Run(name, func(t *testing.T) {
			if got, err := canonical(value); err == nil {
				t.Fatalf("canonical() = %s, want an error", got)
			}
		})
	}
}

func TestUTF16Length(t *testing.T) {
	for text, want := range map[string]int{"": 0, "abc": 3, "é": 1, "😀": 2, "a😀\uffff": 4} {
		if got := utf16Length([]byte(text)); got != want {
			t.Errorf("utf16Length(%q) = %d, want %d", text, got, want)
		}
	}
}

func TestIsUUID(t *testing.T) {
	for value, want := range map[string]bool{
		testUUID:                                true,
		"0123abcd-ef01-2345-6789-abcdef012345":  true,
		upperUUID:                               false,
		zeroUUID:                                false,
		"0123abcd-ef01-2345-6789-abcdef01234":   false,
		"0123abcd-ef01-2345-6789-abcdef0123456": false,
		"0123abcdeef01-2345-6789-abcdef012345":  false,
		"0123abcd-ef01-2345-6789-abcdef01234g":  false,
		"{0123abcd-ef01-2345-6789-abcdef0123}":  false,
	} {
		if got := isUUID(value); got != want {
			t.Errorf("isUUID(%q) = %v, want %v", value, got, want)
		}
	}
	if isUUIDValue(nil) || isUUIDValue(json.Number("1")) || !isUUIDValue(testUUID) {
		t.Error("isUUIDValue does not require a UUID string")
	}
}

func TestIsCounter(t *testing.T) {
	for value, want := range map[any]bool{
		"0":                    true,
		"7":                    true,
		"9223372036854775807":  true,
		"9223372036854775808":  false,
		"10000000000000000000": false,
		"":                     false,
		"01":                   false,
		"-1":                   false,
		"+1":                   false,
		"1.0":                  false,
		"1e3":                  false,
		json.Number("1"):       false,
		nil:                    false,
	} {
		if got := isCounter(value); got != want {
			t.Errorf("isCounter(%#v) = %v, want %v", value, got, want)
		}
	}
}

func TestIsTimestamp(t *testing.T) {
	for value, want := range map[any]bool{
		testTime:                        true,
		"2024-02-29T23:59:59.999Z":      true,
		"2026-02-29T00:00:00.000Z":      false,
		"2026-02-30T00:00:00.000Z":      false,
		"2026-13-01T00:00:00.000Z":      false,
		"2026-01-01T24:00:00.000Z":      false,
		"2026-01-02T03:04:05Z":          false,
		"2026-01-02T03:04:05.6789Z":     false,
		"2026-01-02T03:04:05.678+00:00": false,
		"2026-01-02 03:04:05.678Z":      false,
		"2026-01-02t03:04:05.678z":      false,
		nil:                             false,
	} {
		if got := isTimestamp(value); got != want {
			t.Errorf("isTimestamp(%#v) = %v, want %v", value, got, want)
		}
	}
}

func TestNewRequestID(t *testing.T) {
	seen := map[string]bool{}
	for range 64 {
		id := NewRequestID()
		if !isUUID(id) || id[14] != '4' || !strings.ContainsRune("89ab", rune(id[19])) {
			t.Fatalf("NewRequestID() = %q, want a version 4 UUID", id)
		}
		if seen[id] {
			t.Fatalf("NewRequestID() repeated %q", id)
		}
		seen[id] = true
	}
}

func TestDecodeJSON(t *testing.T) {
	value, err := decodeJSON([]byte(` {"a":[1,2.50,true,null,"x"]} `))
	if err != nil {
		t.Fatal(err)
	}
	items := value.(map[string]any)["a"].([]any)
	if !slices.Equal(items[:2], []any{json.Number("1"), json.Number("2.50")}) {
		t.Fatalf("numbers = %#v, want json.Number values", items[:2])
	}
	for _, text := range []string{``, `{}{}`, `{} x`, `{"a":1`, `[1,]`, `NaN`} {
		if _, err := decodeJSON([]byte(text)); err == nil {
			t.Errorf("decodeJSON(%q) succeeded", text)
		}
	}
}

func TestDeepCopy(t *testing.T) {
	original := map[string]any{"a": []any{map[string]any{"b": "c"}}, "d": json.Number("1")}
	copied := deepCopy(original).(map[string]any)
	copied["a"].([]any)[0].(map[string]any)["b"] = "changed"
	copied["d"] = nil
	if original["a"].([]any)[0].(map[string]any)["b"] != "c" || original["d"] != json.Number("1") {
		t.Fatalf("deepCopy shares state: %v", original)
	}
}
