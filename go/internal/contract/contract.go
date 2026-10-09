// Package contract holds the value rules of the push payload contract
// (spec/push-payload in the SDK repository) that the webhooks and push
// packages share.
package contract

import (
	"regexp"
	"strconv"
	"time"
)

const nilUUID = "00000000-0000-0000-0000-000000000000"

var (
	uuidPattern       = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
	identifierPattern = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9_]{0,63}$`)
	timestampPattern  = regexp.MustCompile(`^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.[0-9]{1,9})?(?:Z|([+-])([0-9]{2}):([0-9]{2}))$`)
)

// UUID reports whether value is a lowercase, hyphenated UUID other than the
// nil UUID.
func UUID(value string) bool {
	return value != nilUUID && uuidPattern.MatchString(value)
}

// Identifier reports whether value is an open enumeration value: an ASCII
// letter followed by up to 63 ASCII letters, digits or underscores.
func Identifier(value string) bool {
	return identifierPattern.MatchString(value)
}

// EpochSeconds returns the Unix seconds of an RFC 3339 timestamp with an
// uppercase T, and Z or an offset, ignoring any fraction. The date must exist,
// and second 60 isn't accepted.
func EpochSeconds(value string) (int64, bool) {
	match := timestampPattern.FindStringSubmatch(value)
	if match == nil {
		return 0, false
	}
	number := func(index int) int {
		// The pattern allows only two or four ASCII digits, or nothing for
		// an absent offset.
		parsed, _ := strconv.Atoi(match[index])
		return parsed
	}
	year, month, day := number(1), number(2), number(3)
	hour, minute, second := number(4), number(5), number(6)
	offsetHour, offsetMinute := number(8), number(9)
	date := time.Date(year, time.Month(month), day, hour, minute, second, 0, time.UTC)
	if date.Year() != year || int(date.Month()) != month || date.Day() != day ||
		date.Hour() != hour || date.Minute() != minute || date.Second() != second ||
		offsetHour > 23 || offsetMinute > 59 {
		return 0, false
	}
	offset := int64(offsetHour*3600 + offsetMinute*60)
	if match[7] == "-" {
		offset = -offset
	}
	return date.Unix() - offset, true
}
