package convohop

import (
	"encoding"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"slices"
	"strconv"
	"strings"
	"unicode/utf8"
)

const (
	// maxNesting bounds the JSON nesting the runtime encodes. encoding/json's
	// decoder applies the same bound to every value the runtime decodes.
	maxNesting = 10000
	// maxTypeDepth bounds the GraphQL type nesting of requests and responses.
	maxTypeDepth = 16
	// maxListItems bounds every list in a response.
	maxListItems = 100
	// retainedResult is the receipt type with exactly one non-null field.
	retainedResult = "RetainedResult"
)

var errInvalidText = errors.New("text must be valid UTF-8")

// isNil reports whether value is absent: nil, or a nil pointer, map, slice or
// interface.
func isNil(value any) bool {
	if value == nil {
		return true
	}
	v := reflect.ValueOf(value)
	switch v.Kind() {
	case reflect.Pointer, reflect.Map, reflect.Slice, reflect.Interface:
		return v.IsNil()
	}
	return false
}

// protocolValue converts a Go value to decoded JSON with json.Number numbers.
// It rejects text that is not valid UTF-8: encoding/json would replace it with
// U+FFFD and so silently change the request.
func protocolValue(value any) (any, error) {
	if err := checkText(reflect.ValueOf(value), 0); err != nil {
		return nil, err
	}
	encoded, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	if !utf8.Valid(encoded) {
		return nil, errInvalidText
	}
	return decodeJSON(encoded)
}

var (
	jsonMarshalerType = reflect.TypeFor[json.Marshaler]()
	textMarshalerType = reflect.TypeFor[encoding.TextMarshaler]()
)

// checkText reports text that encoding/json would encode from invalid UTF-8.
// It checks the value before encoding because encoding/json replaces such text
// with U+FFFD, and how it writes the replacement depends on the Go release.
func checkText(v reflect.Value, depth int) error {
	if depth > maxNesting {
		return errors.New("input exceeds its nesting bound")
	}
	switch v.Kind() {
	case reflect.Invalid:
		return nil
	case reflect.Interface:
		if v.IsNil() {
			return nil
		}
		return checkText(v.Elem(), depth+1)
	case reflect.Pointer, reflect.Map, reflect.Slice:
		if v.IsNil() {
			return nil
		}
	}
	if done, err := checkMarshaled(v, true); done {
		return err
	}
	switch v.Kind() {
	case reflect.String:
		if !utf8.ValidString(v.String()) {
			return errInvalidText
		}
	case reflect.Pointer:
		return checkText(v.Elem(), depth+1)
	case reflect.Map:
		for iter := v.MapRange(); iter.Next(); {
			if err := checkKey(iter.Key()); err != nil {
				return err
			}
			if err := checkText(iter.Value(), depth+1); err != nil {
				return err
			}
		}
	case reflect.Slice, reflect.Array:
		if v.Kind() == reflect.Slice && v.Type().Elem().Kind() == reflect.Uint8 {
			pointer := reflect.PointerTo(v.Type().Elem())
			if !pointer.Implements(jsonMarshalerType) && !pointer.Implements(textMarshalerType) {
				return nil
			}
		}
		for i := range v.Len() {
			if err := checkText(v.Index(i), depth+1); err != nil {
				return err
			}
		}
	case reflect.Struct:
		t := v.Type()
		for i := range t.NumField() {
			if !encodedField(t.Field(i)) {
				continue
			}
			if err := checkText(v.Field(i), depth+1); err != nil {
				return err
			}
		}
	}
	return nil
}

// checkKey checks a map key as encoding/json encodes it: string keys as they
// are, other keys through encoding.TextMarshaler. A nil key encodes as "".
func checkKey(k reflect.Value) error {
	switch k.Kind() {
	case reflect.String:
		if !utf8.ValidString(k.String()) {
			return errInvalidText
		}
		return nil
	case reflect.Pointer, reflect.Interface:
		if k.IsNil() {
			return nil
		}
	}
	_, err := checkMarshaled(k, false)
	return err
}

// encodedField reports whether encoding/json encodes a struct field or the
// fields an embedded struct promotes.
func encodedField(field reflect.StructField) bool {
	if field.Tag.Get("json") == "-" {
		return false
	}
	if field.Anonymous {
		t := field.Type
		if t.Kind() == reflect.Pointer {
			t = t.Elem()
		}
		return field.IsExported() || t.Kind() == reflect.Struct
	}
	return field.IsExported()
}

// checkMarshaled checks the text a value that marshals itself produces. It
// reports whether the value marshals itself.
func checkMarshaled(v reflect.Value, allowJSON bool) (bool, error) {
	if !v.CanInterface() {
		return false, nil
	}
	candidates := []reflect.Value{v}
	if v.Kind() != reflect.Pointer && v.CanAddr() {
		candidates = append(candidates, v.Addr())
	}
	for _, candidate := range candidates {
		var out []byte
		var err error
		if m, ok := candidate.Interface().(json.Marshaler); ok && allowJSON {
			out, err = m.MarshalJSON()
		} else if m, ok := candidate.Interface().(encoding.TextMarshaler); ok {
			out, err = m.MarshalText()
		} else {
			continue
		}
		if err != nil {
			return true, err
		}
		if !utf8.Valid(out) {
			return true, errInvalidText
		}
		return true, nil
	}
	return false, nil
}

// prepareInput converts an operation input to the object the request sends.
// It returns nil when the request sends no input.
func prepareInput(op *operation, input any) (map[string]any, error) {
	if op.input == "" {
		if !isNil(input) {
			return nil, errors.New("the operation takes no input")
		}
		return nil, nil
	}
	var value any = map[string]any{}
	if isNil(input) {
		if op.inputRequired {
			return nil, errors.New("the operation requires an input")
		}
		// A mutation records an input object so its identity is stable.
		if op.kind != "mutation" {
			return nil, nil
		}
	} else {
		converted, err := protocolValue(input)
		if err != nil {
			return nil, err
		}
		value = converted
	}
	checked, err := checkInput(value, op.input+"!", 0)
	if err != nil {
		return nil, err
	}
	record, ok := checked.(map[string]any)
	if !ok {
		return nil, errors.New("the input must be an object")
	}
	return record, nil
}

// checkInput checks a decoded input value against a GraphQL input type
// reference. Required lists and object scalars left nil are sent empty.
func checkInput(value any, typ string, depth int) (any, error) {
	if depth > maxTypeDepth {
		return nil, errors.New("input exceeds its depth bound")
	}
	inner, required := unwrapType(typ)
	if value == nil {
		if !required {
			return nil, nil
		}
		if _, ok := listItem(inner); ok {
			return []any{}, nil
		}
		if scalar, ok := catalog.scalars[inner]; ok && scalar.representation == "object" {
			return checkScalar(map[string]any{}, inner, scalar)
		}
		return nil, fmt.Errorf("missing required %s input", inner)
	}
	if item, ok := listItem(inner); ok {
		items, ok := value.([]any)
		if !ok {
			return nil, fmt.Errorf("expected a list of %s", item)
		}
		for i, child := range items {
			checked, err := checkInput(child, item, depth+1)
			if err != nil {
				return nil, err
			}
			items[i] = checked
		}
		return items, nil
	}
	if fields, ok := catalog.inputs[inner]; ok {
		record, ok := value.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("expected a %s object", inner)
		}
		for name := range record {
			if !slices.ContainsFunc(fields, func(field inputField) bool { return field.name == name }) {
				return nil, fmt.Errorf("unknown %s field %q", inner, name)
			}
		}
		for _, field := range fields {
			child, present := record[field.name]
			if !present {
				continue
			}
			checked, err := checkInput(child, field.typ, depth+1)
			if err != nil {
				return nil, fmt.Errorf("%s.%s: %w", inner, field.name, err)
			}
			record[field.name] = checked
		}
		return record, nil
	}
	if values, ok := catalog.enums[inner]; ok {
		if s, ok := value.(string); !ok || !values[s] {
			return nil, fmt.Errorf("unknown %s value", inner)
		}
		return value, nil
	}
	scalar, ok := catalog.scalars[inner]
	if !ok {
		return nil, fmt.Errorf("unknown generated input type %s", inner)
	}
	return checkScalar(value, inner, scalar)
}

// validateOutput checks a decoded response value against a GraphQL output
// type reference, as every ConvoHop SDK does. A field the selection names must
// be present, even when it is nullable. It returns the value with integers in
// canonical form, updating decoded maps and slices in place.
func validateOutput(value any, typ string, depth int) (any, error) {
	if depth > maxTypeDepth {
		return nil, errors.New("GraphQL response exceeds its depth bound")
	}
	inner, required := unwrapType(typ)
	if value == nil {
		if required {
			return nil, fmt.Errorf("missing GraphQL response value of type %s", inner)
		}
		return nil, nil
	}
	if item, ok := listItem(inner); ok {
		items, ok := value.([]any)
		if !ok || len(items) > maxListItems {
			return nil, errors.New("invalid bounded GraphQL list")
		}
		for i, child := range items {
			checked, err := validateOutput(child, item, depth+1)
			if err != nil {
				return nil, err
			}
			items[i] = checked
		}
		return items, nil
	}
	if fields, ok := catalog.objects[inner]; ok {
		record, ok := value.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("expected a GraphQL %s object", inner)
		}
		if inner == retainedResult {
			present := 0
			for _, child := range record {
				if child != nil {
					present++
				}
			}
			if present != 1 {
				return nil, errors.New("retained receipt requires exactly one typed result")
			}
		}
		// encoding/json matches struct fields case-insensitively, so an
		// undeclared key could replace a checked field when decoded.
		for key := range record {
			if slices.ContainsFunc(fields, func(field typeField) bool { return field.name == key }) {
				continue
			}
			if slices.ContainsFunc(fields, func(field typeField) bool { return strings.EqualFold(field.name, key) }) {
				return nil, fmt.Errorf("ambiguous GraphQL response field %s.%s", inner, key)
			}
		}
		for _, field := range fields {
			child, present := record[field.name]
			if !present {
				return nil, fmt.Errorf("missing GraphQL response field %s.%s", inner, field.name)
			}
			checked, err := validateOutput(child, field.typ, depth+1)
			if err != nil {
				return nil, err
			}
			record[field.name] = checked
		}
		return record, nil
	}
	if values, ok := catalog.enums[inner]; ok {
		if s, ok := value.(string); !ok || !values[s] {
			return nil, fmt.Errorf("unknown %s value", inner)
		}
		return value, nil
	}
	scalar, ok := catalog.scalars[inner]
	if !ok {
		return nil, fmt.Errorf("unknown generated output type %s", inner)
	}
	return checkScalar(value, inner, scalar)
}

// checkScalar checks a decoded value against a scalar's representation and
// constraints. Integers are returned in canonical form.
func checkScalar(value any, name string, scalar compiledScalar) (any, error) {
	switch scalar.representation {
	case "boolean":
		if _, ok := value.(bool); !ok {
			return nil, fmt.Errorf("expected a %s boolean", name)
		}
	case "integer":
		number, ok := value.(json.Number)
		if !ok {
			return nil, fmt.Errorf("expected a safe %s integer", name)
		}
		integer, ok := safeInteger(number)
		if !ok {
			return nil, fmt.Errorf("expected a safe %s integer", name)
		}
		if err := checkBounds(float64(integer), name, scalar); err != nil {
			return nil, err
		}
		return json.Number(strconv.FormatInt(integer, 10)), nil
	case "number":
		number, ok := value.(json.Number)
		if !ok {
			return nil, fmt.Errorf("expected a %s number", name)
		}
		parsed, ok := parseNumber(number)
		if !ok {
			return nil, fmt.Errorf("expected a finite %s number", name)
		}
		if err := checkBounds(parsed, name, scalar); err != nil {
			return nil, err
		}
	case "object":
		object, ok := value.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("expected a %s object", name)
		}
		if scalar.maxCanonicalJSONBytes > 0 {
			text, err := canonical(object)
			if err != nil {
				return nil, fmt.Errorf("invalid %s object: %w", name, err)
			}
			if len(text) > scalar.maxCanonicalJSONBytes {
				return nil, fmt.Errorf("%s exceeds %d bytes of canonical JSON", name, scalar.maxCanonicalJSONBytes)
			}
		}
		for _, property := range scalar.requiredStringProperties {
			if _, ok := object[property].(string); !ok {
				return nil, fmt.Errorf("%s requires a string %s property", name, property)
			}
		}
	case "string":
		s, ok := value.(string)
		if !ok {
			return nil, fmt.Errorf("expected a %s string", name)
		}
		if scalar.pattern != nil && !scalar.pattern.MatchString(s) {
			return nil, fmt.Errorf("invalid %s value", name)
		}
		if slices.Contains(scalar.disallowed, s) {
			return nil, fmt.Errorf("disallowed %s value", name)
		}
		if scalar.maximumDecimal != "" && (!decimalDigits(s) || compareDecimal(s, scalar.maximumDecimal) > 0) {
			return nil, fmt.Errorf("%s value exceeds its maximum", name)
		}
	default:
		return nil, fmt.Errorf("unsupported %s representation %q", name, scalar.representation)
	}
	return value, nil
}

// checkBounds checks a number against a scalar's minimum and maximum.
func checkBounds(value float64, name string, scalar compiledScalar) error {
	low, high := scalar.minimum, scalar.maximum
	if (low == nil || value >= *low) && (high == nil || value <= *high) {
		return nil
	}
	format := func(bound float64) string { return strconv.FormatFloat(bound, 'g', -1, 64) }
	switch {
	case low != nil && high != nil:
		return fmt.Errorf("%s must be from %s to %s", name, format(*low), format(*high))
	case low != nil:
		return fmt.Errorf("%s must be at least %s", name, format(*low))
	default:
		return fmt.Errorf("%s must be at most %s", name, format(*high))
	}
}

// decimalDigits reports whether s is a canonical unsigned decimal.
func decimalDigits(s string) bool {
	if s == "" || (s[0] == '0' && len(s) > 1) {
		return false
	}
	for i := 0; i < len(s); i++ {
		if s[i] < '0' || s[i] > '9' {
			return false
		}
	}
	return true
}
