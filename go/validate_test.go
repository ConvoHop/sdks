package convohop

import (
	"encoding/json"
	"errors"
	"reflect"
	"strings"
	"testing"
)

type rawText string

func (r rawText) MarshalJSON() ([]byte, error) { return []byte(`"` + string(r) + `"`), nil }

var errCannotMarshal = errors.New("cannot marshal")

type failingMarshaler struct{}

func (failingMarshaler) MarshalJSON() ([]byte, error) { return nil, errCannotMarshal }

type pointerMarshaler struct{ text string }

func (p *pointerMarshaler) MarshalJSON() ([]byte, error) { return []byte(`"` + p.text + `"`), nil }

type textValue struct{ text string }

func (v textValue) MarshalText() ([]byte, error) { return []byte(v.text), nil }

type pointerKey struct{ text string }

func (k *pointerKey) MarshalText() ([]byte, error) { return []byte(k.text), nil }

type letter byte

func (l *letter) MarshalText() ([]byte, error) { return []byte{byte(*l)}, nil }

type promoted struct{ Text string }

type embedding struct {
	promoted
	hidden  string
	Skipped string `json:"-"`
}

type node struct{ Next *node }

func TestProtocolValueText(t *testing.T) {
	cycle := map[string]any{}
	cycle["self"] = cycle
	list := []any{nil}
	list[0] = list
	loop := &node{}
	loop.Next = loop
	invalid := []struct {
		name  string
		value any
	}{
		{"string", map[string]any{"text": "\xff"}},
		{"truncated rune", map[string]any{"text": "\xe2\x82"}},
		{"surrogate", map[string]any{"text": "\xed\xa0\x80"}},
		{"map key", map[string]any{"\xff": true}},
		{"integer-keyed map value", map[int]string{1: "\xff"}},
		{"text marshaler key", map[textValue]int{{"\xff"}: 1}},
		{"text marshaler value", map[string]any{"value": textValue{"\xff"}}},
		{"raw message", map[string]any{"raw": json.RawMessage("\"\xff\"")}},
		{"JSON marshaler", map[string]any{"value": rawText("\xff")}},
		{"addressable pointer marshaler", &struct{ M pointerMarshaler }{pointerMarshaler{"\xff"}}},
		{"array", [2]string{"a", "\xff"}},
		{"slice element", []string{"a", "\xff"}},
		{"byte slice with marshaling elements", []letter{0xff}},
		{"interface field", struct{ V any }{"\xff"}},
		{"pointer", map[string]*string{"text": ptr("\xff")}},
		{"promoted field", embedding{promoted: promoted{Text: "\xff"}}},
	}
	for _, tc := range invalid {
		t.Run(tc.name, func(t *testing.T) {
			if value, err := protocolValue(tc.value); !errors.Is(err, errInvalidText) {
				t.Fatalf("protocolValue() = %#v, %v, want %v", value, err, errInvalidText)
			}
		})
	}
	for name, value := range map[string]any{"map": cycle, "slice": list, "pointer": loop} {
		t.Run("cyclic "+name, func(t *testing.T) {
			if _, err := protocolValue(value); err == nil {
				t.Fatal("protocolValue() accepted a cyclic value")
			}
		})
	}
	t.Run("marshaler error", func(t *testing.T) {
		if _, err := protocolValue(map[string]any{"value": failingMarshaler{}}); !errors.Is(err, errCannotMarshal) {
			t.Fatalf("protocolValue() error = %v, want %v", err, errCannotMarshal)
		}
	})
	valid := []struct {
		name  string
		value any
		want  any
	}{
		{"replacement character", map[string]any{"text": "\ufffd"}, map[string]any{"text": "\ufffd"}},
		{"byte slice", map[string]any{"bytes": []byte{0xff}}, map[string]any{"bytes": "/w=="}},
		{"raw message", map[string]any{"raw": json.RawMessage(`{"b":[1]}`)}, map[string]any{"raw": map[string]any{"b": []any{json.Number("1")}}}},
		{"text marshaler key", map[textValue]int{{"é"}: 1}, map[string]any{"é": json.Number("1")}},
		{"integer key", map[int]string{1: "a"}, map[string]any{"1": "a"}},
		{"nil pointer marshaler", map[string]any{"value": (*pointerMarshaler)(nil)}, map[string]any{"value": nil}},
		{"non-addressable pointer marshaler", struct{ M pointerMarshaler }{pointerMarshaler{"\xff"}}, map[string]any{"M": map[string]any{}}},
		{"unencoded fields", embedding{promoted{"ok"}, "\xff", "\xff"}, map[string]any{"Text": "ok"}},
		{"nil values", map[string]any{"map": map[string]string(nil), "slice": []string(nil), "pointer": (*string)(nil), "any": nil}, map[string]any{"map": nil, "slice": nil, "pointer": nil, "any": nil}},
	}
	for _, tc := range valid {
		t.Run(tc.name, func(t *testing.T) {
			value, err := protocolValue(tc.value)
			if err != nil || !reflect.DeepEqual(value, tc.want) {
				t.Fatalf("protocolValue() = %#v, %v, want %#v", value, err, tc.want)
			}
		})
	}
	t.Run("nil text marshaler key", func(t *testing.T) {
		if err := checkText(reflect.ValueOf(map[*pointerKey]int{nil: 1}), 0); err != nil {
			t.Fatalf("checkText() = %v", err)
		}
	})
}

func TestCheckScalar(t *testing.T) {
	bounded := compiledScalar{representation: "string", maximumDecimal: "10"}
	// sized is a Properties value whose canonical JSON is n bytes.
	sized := func(n int) map[string]any { return map[string]any{"k": strings.Repeat("a", n-len(`{"k":""}`))} }
	cases := []struct {
		name   string
		scalar string
		value  any
		want   any
	}{
		{"boolean", "Boolean", true, true},
		{"boolean string", "Boolean", "true", nil},
		{"integer", "Int", json.Number("7"), json.Number("7")},
		{"integral number", "Int", json.Number("7.0"), json.Number("7")},
		{"exponent integer", "Int", json.Number("1e2"), json.Number("100")},
		{"negative zero", "Int", json.Number("-0"), json.Number("0")},
		{"fraction", "Int", json.Number("7.5"), nil},
		{"unsafe integer", "Int", json.Number("9007199254740992"), nil},
		{"integer string", "Int", "7", nil},
		{"smallest page size", "PageSize", json.Number("1"), json.Number("1")},
		{"largest page size", "PageSize", json.Number("1e2"), json.Number("100")},
		{"page size below its range", "PageSize", json.Number("0"), nil},
		{"page size above its range", "PageSize", json.Number("101"), nil},
		{"object", "Properties", map[string]any{}, map[string]any{}},
		{"object list", "Properties", []any{}, nil},
		{"largest properties", "Properties", sized(8192), sized(8192)},
		{"properties over their bound", "Properties", sized(8193), nil},
		{"properties with an unsafe number", "Properties", map[string]any{"n": json.Number("9007199254740992")}, nil},
		{"signed proof", "SignedProof", map[string]any{"signature": "c2ln"}, map[string]any{"signature": "c2ln"}},
		{"signed proof without a signature", "SignedProof", map[string]any{"payload": "c2ln"}, nil},
		{"signed proof with a non-string signature", "SignedProof", map[string]any{"signature": json.Number("1")}, nil},
		{"string", "String", "x", "x"},
		{"string number", "String", json.Number("1"), nil},
		{"UUID", "UUID", testUUID, testUUID},
		{"uppercase UUID", "UUID", upperUUID, nil},
		{"zero UUID", "UUID", zeroUUID, nil},
		{"largest decimal", "Decimal", "9223372036854775807", "9223372036854775807"},
		{"decimal overflow", "Decimal", "9223372036854775808", nil},
		{"decimal leading zero", "Decimal", "01", nil},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := checkScalar(tc.value, tc.scalar, catalog.scalars[tc.scalar])
			if tc.want == nil {
				if err == nil {
					t.Fatalf("checkScalar() = %#v, want an error", got)
				}
				return
			}
			if err != nil || !reflect.DeepEqual(got, tc.want) {
				t.Fatalf("checkScalar() = %#v, %v, want %#v", got, err, tc.want)
			}
		})
	}
	for _, tc := range []struct {
		scalar compiledScalar
		value  any
		ok     bool
	}{
		{compiledScalar{representation: "number"}, json.Number("1.5"), true},
		{compiledScalar{representation: "number"}, json.Number("1e400"), false},
		{compiledScalar{representation: "number"}, "1", false},
		{bounded, "10", true},
		{bounded, "11", false},
		{bounded, "-1", false},
		{bounded, "", false},
		{compiledScalar{representation: "bigint"}, "1", false},
		{compiledScalar{representation: "number", minimum: new(float64(0)), maximum: new(0.5)}, json.Number("0.5"), true},
		{compiledScalar{representation: "number", minimum: new(float64(0)), maximum: new(0.5)}, json.Number("0.75"), false},
		{compiledScalar{representation: "number", minimum: new(float64(0))}, json.Number("-1e-9"), false},
		{compiledScalar{representation: "integer", maximum: new(float64(5))}, json.Number("5"), true},
		{compiledScalar{representation: "integer", maximum: new(float64(5))}, json.Number("6"), false},
		{compiledScalar{representation: "object", requiredStringProperties: []string{"kind"}}, map[string]any{"kind": ""}, true},
		{compiledScalar{representation: "object", requiredStringProperties: []string{"kind"}}, map[string]any{"kind": nil}, false},
	} {
		if _, err := checkScalar(tc.value, "Test", tc.scalar); (err == nil) != tc.ok {
			t.Errorf("checkScalar(%#v, %+v) error = %v, want ok %v", tc.value, tc.scalar, err, tc.ok)
		}
	}
	for _, tc := range []struct {
		scalar string
		value  any
		want   string
	}{
		{"PageSize", json.Number("0"), "PageSize must be from 1 to 100"},
		{"Properties", sized(8193), "Properties exceeds 8192 bytes of canonical JSON"},
		{"Properties", map[string]any{"n": json.Number("1e300")}, "invalid Properties object: unsafe protocol number"},
		{"SignedProof", map[string]any{}, "SignedProof requires a string signature property"},
	} {
		if _, err := checkScalar(tc.value, tc.scalar, catalog.scalars[tc.scalar]); err == nil || err.Error() != tc.want {
			t.Errorf("checkScalar(%#v, %s) error = %v, want %q", tc.value, tc.scalar, err, tc.want)
		}
	}
	for _, tc := range []struct {
		scalar compiledScalar
		value  float64
		want   string
	}{
		{compiledScalar{}, 2e9, ""},
		{compiledScalar{minimum: new(float64(1))}, 1, ""},
		{compiledScalar{minimum: new(float64(1))}, 0, "Test must be at least 1"},
		{compiledScalar{maximum: new(-0.5)}, -0.5, ""},
		{compiledScalar{maximum: new(-0.5)}, 0, "Test must be at most -0.5"},
	} {
		err := checkBounds(tc.value, "Test", tc.scalar)
		if (tc.want == "" && err != nil) || (tc.want != "" && (err == nil || err.Error() != tc.want)) {
			t.Errorf("checkBounds(%v, %+v) = %v, want %q", tc.value, tc.scalar, err, tc.want)
		}
	}
}

func TestPrepareInput(t *testing.T) {
	member := map[string]any{"conversationId": testConversation, "principalId": testUUID, "role": "member", "expectedRevision": "1"}
	cases := []struct {
		name  string
		op    *operation
		input any
		want  map[string]any
		err   string
	}{
		{"no input", catalog.operations["communication.capabilities"], nil, nil, ""},
		{"unexpected input", catalog.operations["communication.capabilities"], member, nil, "the operation takes no input"},
		{"missing required input", catalog.operations["communication.addMember"], (*AddMemberRequestInput)(nil), nil, "the operation requires an input"},
		{"optional query input", &operation{kind: "query", input: "AddMemberRequestInput"}, nil, nil, ""},
		{"optional mutation input", &operation{kind: "mutation", input: "AddMemberRequestInput"}, nil, map[string]any{}, ""},
		{"input", catalog.operations["communication.addMember"], member, member, ""},
		{"scalar input", catalog.operations["communication.addMember"], "member", nil, "expected a AddMemberRequestInput object"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := prepareInput(tc.op, tc.input)
			if tc.err != "" {
				if err == nil || err.Error() != tc.err {
					t.Fatalf("prepareInput() = %#v, %v, want error %q", got, err, tc.err)
				}
				return
			}
			if err != nil || !reflect.DeepEqual(got, tc.want) {
				t.Fatalf("prepareInput() = %#v, %v, want %#v", got, err, tc.want)
			}
		})
	}
}

func TestCheckInput(t *testing.T) {
	member := func(fields map[string]any) map[string]any {
		value := map[string]any{"conversationId": testConversation, "principalId": testUUID, "role": "member", "expectedRevision": "1"}
		for key, field := range fields {
			value[key] = field
		}
		return value
	}
	cases := []struct {
		name  string
		value any
		typ   string
		want  any
		err   string
	}{
		{"object", member(nil), "AddMemberRequestInput!", member(nil), ""},
		{"unknown field", member(map[string]any{"extra": true}), "AddMemberRequestInput!", nil, `unknown AddMemberRequestInput field "extra"`},
		{"null required field", member(map[string]any{"principalId": nil}), "AddMemberRequestInput!", nil, "AddMemberRequestInput.principalId: missing required UUID input"},
		{"invalid field", member(map[string]any{"expectedRevision": "01"}), "AddMemberRequestInput!", nil, "AddMemberRequestInput.expectedRevision: invalid Decimal value"},
		{"not an object", []any{}, "AddMemberRequestInput!", nil, "expected a AddMemberRequestInput object"},
		{"optional null", nil, "UUID", nil, ""},
		{"required list null", nil, "[UUID!]!", []any{}, ""},
		{"required object scalar null", nil, "Properties!", map[string]any{}, ""},
		{"required signed proof null", nil, "SignedProof!", nil, "SignedProof requires a string signature property"},
		{"page size field", map[string]any{"conversationId": testConversation, "limit": json.Number("101")}, "MembersRequestInput!", nil, "MembersRequestInput.limit: PageSize must be from 1 to 100"},
		{"required scalar null", nil, "UUID!", nil, "missing required UUID input"},
		{"list", []any{testUUID}, "[UUID!]!", []any{testUUID}, ""},
		{"not a list", testUUID, "[UUID!]!", nil, "expected a list of UUID!"},
		{"invalid list item", []any{upperUUID}, "[UUID!]!", nil, "invalid UUID value"},
		{"enum", "PUBLISHER", "LiveRole!", "PUBLISHER", ""},
		{"unknown enum value", "publisher", "LiveRole!", nil, "unknown LiveRole value"},
		{"non-string enum", json.Number("1"), "LiveRole!", nil, "unknown LiveRole value"},
		{"unknown type", "x", "Unknown!", nil, "unknown generated input type Unknown"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := checkInput(tc.value, tc.typ, 0)
			if tc.err != "" {
				if err == nil || err.Error() != tc.err {
					t.Fatalf("checkInput() = %#v, %v, want error %q", got, err, tc.err)
				}
				return
			}
			if err != nil || !reflect.DeepEqual(got, tc.want) {
				t.Fatalf("checkInput() = %#v, %v, want %#v", got, err, tc.want)
			}
		})
	}
	if _, err := checkInput("x", "String!", maxTypeDepth+1); err == nil {
		t.Error("checkInput() accepted input past its depth bound")
	}
}

func TestValidateOutput(t *testing.T) {
	mute := func(fields map[string]any) map[string]any {
		value := map[string]any{"conversationId": testConversation, "principalId": testUUID, "muted": true, "until": nil}
		for key, field := range fields {
			if field == "<absent>" {
				delete(value, key)
			} else {
				value[key] = field
			}
		}
		return value
	}
	ack := object("DeliveryAck", map[string]any{"deliveryId": testUUID, "acknowledged": true})
	uuids := func(n int) []any {
		items := make([]any, n)
		for i := range items {
			items[i] = testUUID
		}
		return items
	}
	cases := []struct {
		name  string
		value any
		typ   string
		want  any
		err   string
	}{
		{"object", mute(nil), "ConversationMute!", mute(nil), ""},
		{"undeclared field", mute(map[string]any{"extra": 1}), "ConversationMute!", mute(map[string]any{"extra": 1}), ""},
		{"case-folded field", mute(map[string]any{"Muted": false}), "ConversationMute!", nil, "ambiguous GraphQL response field ConversationMute.Muted"},
		{"absent nullable field", mute(map[string]any{"until": "<absent>"}), "ConversationMute!", nil, "missing GraphQL response field ConversationMute.until"},
		{"invalid field", mute(map[string]any{"muted": "true"}), "ConversationMute!", nil, "expected a Boolean boolean"},
		{"not an object", []any{}, "ConversationMute!", nil, "expected a GraphQL ConversationMute object"},
		{"null required value", nil, "ConversationMute!", nil, "missing GraphQL response value of type ConversationMute"},
		{"null optional value", nil, "ConversationMute", nil, ""},
		{"longest list", uuids(maxListItems), "[UUID!]!", uuids(maxListItems), ""},
		{"list over its bound", uuids(maxListItems + 1), "[UUID!]!", nil, "invalid bounded GraphQL list"},
		{"not a list", testUUID, "[UUID!]!", nil, "invalid bounded GraphQL list"},
		{"null list item", []any{nil}, "[UUID!]!", nil, "missing GraphQL response value of type UUID"},
		{"canonical integers", []any{json.Number("1e1")}, "[Int!]!", []any{json.Number("10")}, ""},
		{"enum", "VIEWER", "LiveRole!", "VIEWER", ""},
		{"unknown enum value", "AUDIENCE", "LiveRole!", nil, "unknown LiveRole value"},
		{"one retained result", object("RetainedResult", map[string]any{"deliveryAck": ack}), "RetainedResult", object("RetainedResult", map[string]any{"deliveryAck": ack}), ""},
		{"no retained result", object("RetainedResult", nil), "RetainedResult", nil, "retained receipt requires exactly one typed result"},
		{"two retained results", object("RetainedResult", map[string]any{"deliveryAck": ack, "conversationMute": mute(nil)}), "RetainedResult", nil, "retained receipt requires exactly one typed result"},
		{"unknown type", "x", "Unknown!", nil, "unknown generated output type Unknown"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := validateOutput(tc.value, tc.typ, 0)
			if tc.err != "" {
				if err == nil || err.Error() != tc.err {
					t.Fatalf("validateOutput() = %#v, %v, want error %q", got, err, tc.err)
				}
				return
			}
			if err != nil || !reflect.DeepEqual(got, tc.want) {
				t.Fatalf("validateOutput() = %#v, %v, want %#v", got, err, tc.want)
			}
		})
	}
	if _, err := validateOutput("x", "String!", maxTypeDepth+1); err == nil {
		t.Error("validateOutput() accepted a response past its depth bound")
	}
}
