package main

import (
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	"slices"
	"strconv"
)

// object is a decoded JSON object. Its numbers are json.Number values.
type object = map[string]any

// paramsError is a parameter the driver cannot convert to the SDK's types. The
// driver answers it with INVALID_PARAMS, never as an SDK result.
type paramsError struct{ message string }

func (e *paramsError) Error() string { return e.message }

func invalid(format string, args ...any) error {
	return &paramsError{message: fmt.Sprintf(format, args...)}
}

// maxSafeInteger is the largest integer that every JSON implementation, including
// JavaScript's, represents exactly.
const maxSafeInteger = 1<<53 - 1

var handlePattern = regexp.MustCompile(`^[A-Za-z0-9._:-]{1,64}$`)

// safeInteger returns value as an integer when it is a JSON number with an
// integral value in the safe-integer range, as JavaScript's Number.isSafeInteger
// would accept it.
func safeInteger(value any) (int64, bool) {
	number, ok := value.(json.Number)
	if !ok {
		return 0, false
	}
	f, err := strconv.ParseFloat(string(number), 64)
	if err != nil || f != math.Trunc(f) || math.Abs(f) > maxSafeInteger {
		return 0, false
	}
	return int64(f), true
}

// params decodes the parameters of one request strictly. It keeps the first
// failure, which Err reports, and every later read returns a zero value.
// Nested params share their parent's failure.
type params struct {
	values object
	err    *error
}

func newParams(values object) params { return params{values: values, err: new(error)} }

// Err is the first failure, or nil.
func (p params) Err() error { return *p.err }

func (p params) fail(err error) {
	if *p.err == nil {
		*p.err = err
	}
}

func (p params) has(name string) bool {
	_, ok := p.values[name]
	return ok
}

// text reads a required string. Absent and null are both failures.
func (p params) text(name string) string {
	if p.Err() != nil {
		return ""
	}
	value, ok := p.values[name].(string)
	if !ok {
		p.fail(invalid("%s must be a string", name))
	}
	return value
}

// optionalText reads a string that may be absent, which is nil. A present
// null is not a string.
func (p params) optionalText(name string) *string {
	if p.Err() != nil || !p.has(name) {
		return nil
	}
	value := p.text(name)
	if p.Err() != nil {
		return nil
	}
	return &value
}

// handle reads a client or store handle.
func (p params) handle(name string) string {
	value := p.text(name)
	if p.Err() == nil && !handlePattern.MatchString(value) {
		p.fail(invalid("%s must match [A-Za-z0-9._:-]{1,64}", name))
	}
	return value
}

// integer reads an optional integer in min..max. ok is false when it is
// absent or invalid.
func (p params) integer(name string, min, max int64) (value int64, ok bool) {
	if p.Err() != nil || !p.has(name) {
		return 0, false
	}
	value, ok = safeInteger(p.values[name])
	if !ok || value < min || value > max {
		p.fail(invalid("%s must be an integer in %d..%d", name, min, max))
		return 0, false
	}
	return value, true
}

// strings reads an array of strings.
func (p params) strings(name string) []string {
	if p.Err() != nil {
		return nil
	}
	list, ok := p.values[name].([]any)
	values := make([]string, 0, len(list))
	for _, item := range list {
		text, isText := item.(string)
		ok = ok && isText
		values = append(values, text)
	}
	if !ok {
		p.fail(invalid("%s must be an array of strings", name))
		return nil
	}
	return values
}

// record reads an object; label names it in the failure.
func (p params) record(name, label string) object {
	if p.Err() != nil {
		return nil
	}
	value, ok := p.values[name].(map[string]any)
	if !ok {
		p.fail(invalid("%s must be an object", label))
	}
	return value
}

// nested reads an object whose fields are themselves parameters.
func (p params) nested(name, label string) params {
	return params{values: p.record(name, label), err: p.err}
}

// entries reads an array of objects whose fields are parameters.
func (p params) entries(name string) []params {
	if p.Err() != nil {
		return nil
	}
	list, ok := p.values[name].([]any)
	if !ok {
		p.fail(invalid("%s must be an array", name))
		return nil
	}
	entries := make([]params, 0, len(list))
	for index, item := range list {
		value, ok := item.(map[string]any)
		if !ok {
			p.fail(invalid("%s[%d] must be an object", name, index))
			return nil
		}
		entries = append(entries, params{values: value, err: p.err})
	}
	return entries
}

// textRecord reads an object whose values are strings, such as headers. It
// checks the names in sorted order, so a failure is deterministic.
func (p params) textRecord(name string) map[string]string {
	values := p.record(name, name)
	if p.Err() != nil {
		return nil
	}
	names := make([]string, 0, len(values))
	for key := range values {
		names = append(names, key)
	}
	slices.Sort(names)
	texts := make(map[string]string, len(values))
	for _, key := range names {
		text, ok := values[key].(string)
		if !ok {
			p.fail(invalid("%s.%s must be a string", name, key))
			return nil
		}
		texts[key] = text
	}
	return texts
}
