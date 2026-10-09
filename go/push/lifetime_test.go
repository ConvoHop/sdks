package push_test

import (
	"fmt"
	"regexp"
	"strconv"
	"testing"
	"time"

	"github.com/ConvoHop/sdks/go/push"
	"github.com/ConvoHop/sdks/go/webhooks"
)

const (
	day         = 86_400
	maxLifetime = 28 * day
)

// checkLifetime fails unless every applicable builder returns a request with
// ttl seconds left, or none when ttl isn't positive.
func checkLifetime(t *testing.T, name string, event *webhooks.Notification, clock, ttl int64) {
	t.Helper()
	for _, builder := range builders {
		got := builder.build(event, bundleID, at(clock))
		if got.err != nil {
			t.Errorf("%s %s: error = %v", name, builder.name, got.err)
			continue
		}
		applies := builder.name == "fcm" || builder.name == "webPush" ||
			(builder.name == "apnsVoip" && event.EventType == webhooks.EventNotificationCall) ||
			(builder.name == "apnsAlert" && (event.EventType != webhooks.EventNotificationCallCancelled ||
				event.Reason == webhooks.ReasonEnded || event.Reason == webhooks.ReasonExpired))
		if !applies || ttl <= 0 {
			if got.request != nil {
				t.Errorf("%s %s = %+v; want none", name, builder.name, got.request)
			}
			continue
		}
		var gotTTL string
		want := strconv.FormatInt(ttl, 10)
		switch request := got.request.(type) {
		case *push.APNSRequest:
			gotTTL, want = request.Headers.Expiration, strconv.FormatInt(clock+ttl, 10)
		case *push.FCMRequest:
			gotTTL, want = request.Message.Android.TTL, want+"s"
		case *push.WebPushRequest:
			gotTTL = request.Headers.TTL
		default:
			t.Errorf("%s %s = none; want a request", name, builder.name)
			continue
		}
		if gotTTL != want {
			t.Errorf("%s %s lifetime = %s; want %s", name, builder.name, gotTTL, want)
		}
	}
}

func TestLifetime(t *testing.T) {
	// The fixtures' occurredAt and expiresAt.
	const messageAt, callAt, expires = now - 5, now - 2, now + 45
	farCall := validCall()
	farCall.ExpiresAt = "2026-12-01T00:00:00Z"
	farExpires := time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC).Unix()
	for _, test := range []struct {
		name  string
		event *webhooks.Notification
		clock int64
		ttl   int64
	}{
		{"message", validMessage(), now, messageAt + day - now},
		{"message at its occurrence", validMessage(), messageAt, day},
		{"message before its occurrence", validMessage(), messageAt - 10, day + 10},
		{"message in its last second", validMessage(), messageAt + day - 1, 1},
		{"stale message", validMessage(), messageAt + day, 0},
		{"call", validCall(), now, 45},
		{"call in its last second", validCall(), expires - 1, 1},
		{"stale call", validCall(), expires, 0},
		{"call long after it ended", validCall(), expires + 400*day, 0},
		{"call lasting 28 days", farCall, farExpires - maxLifetime, maxLifetime},
		{"call lasting longer", farCall, farExpires - maxLifetime - 1, maxLifetime},
		{"call lasting a second less", farCall, farExpires - maxLifetime + 1, maxLifetime - 1},
		// Missed calls stay relevant for a day after the cancellation;
		// other cancellations until the ring's end.
		{"missed call", validCancel(webhooks.ReasonEnded), expires + 10, callAt + day - expires - 10},
		{"expired call", validCancel(webhooks.ReasonExpired), callAt + day - 1, 1},
		{"stale missed call", validCancel(webhooks.ReasonExpired), callAt + day, 0},
		{"answered call", validCancel(webhooks.ReasonAnswered), now, 45},
		{"declined call", validCancel(webhooks.ReasonDeclined), expires - 1, 1},
		{"stale declined call", validCancel(webhooks.ReasonDeclined), expires, 0},
		{"call cancelled for an unknown reason", validCancel("transferred"), now, 45},
	} {
		checkLifetime(t, test.name, test.event, test.clock, test.ttl)
	}
}

// The contract's timestamp: RFC 3339 with an uppercase T and Z, at most nine
// fraction digits and an offset of at most 23:59.
var timestampPattern = regexp.MustCompile(`^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})` +
	`(?:\.[0-9]{1,9})?(?:Z|([+-])([0-9]{2}):([0-9]{2}))$`)

func floorDiv(a, b int64) int64 {
	quotient := a / b
	if a%b != 0 && (a < 0) != (b < 0) {
		quotient--
	}
	return quotient
}

// civilDays is the days from 1970-01-01 to a proleptic Gregorian date
// (Howard Hinnant's days_from_civil), without the time package.
func civilDays(year, month, day int64) int64 {
	if month <= 2 {
		year--
	}
	era := floorDiv(year, 400)
	yearOfEra := year - era*400
	shiftedMonth := month - 3
	if month <= 2 {
		shiftedMonth = month + 9
	}
	dayOfYear := (153*shiftedMonth+2)/5 + day - 1
	return era*146_097 + yearOfEra*365 + yearOfEra/4 - yearOfEra/100 + dayOfYear - 719_468
}

// unixSeconds returns the whole Unix seconds of a contract timestamp, and
// false when value isn't one.
func unixSeconds(value string) (int64, bool) {
	match := timestampPattern.FindStringSubmatch(value)
	if match == nil {
		return 0, false
	}
	number := func(index int) int64 {
		parsed, _ := strconv.ParseInt(match[index], 10, 64)
		return parsed
	}
	year, month, date, hour, minute, second := number(1), number(2), number(3), number(4), number(5), number(6)
	var offsetHour, offsetMinute int64
	if match[7] != "" {
		offsetHour, offsetMinute = number(8), number(9)
	}
	leap := year%4 == 0 && (year%100 != 0 || year%400 == 0)
	monthDays := []int64{31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31}
	if leap {
		monthDays[1] = 29
	}
	if month < 1 || month > 12 || date < 1 || date > monthDays[month-1] || hour > 23 || minute > 59 ||
		second > 59 || offsetHour > 23 || offsetMinute > 59 {
		return 0, false
	}
	offset := offsetHour*3600 + offsetMinute*60
	if match[7] == "-" {
		offset = -offset
	}
	return civilDays(year, month, date)*day + hour*3600 + minute*60 + second - offset, true
}

// Each leap-year rule: every 4th year, but not every 100th, but every 400th.
var years = []int{0, 4, 96, 100, 104, 400, 1600, 1700, 1896, 1900, 1904, 1970, 2000, 2024, 2026, 2100, 2104, 2400,
	9996, 9999}

var times = []string{
	"2026-10-10T00:00:00Z", "2026-10-10T23:59:59Z", "2026-10-10T24:00:00Z", "2026-10-10T23:60:00Z",
	"2026-10-10T23:59:60Z", "2026-10-10T23:59:59.5Z", "2026-10-10T23:59:59.123456789Z", "2026-10-10T23:59:59.1234567890Z",
	"2026-10-10T23:59:59.Z", "2026-10-10t23:59:59Z", "2026-10-10T23:59:59z", "2026-10-10 23:59:59Z", "2026-10-10T23:59:59",
	"2026-10-10T23:59:59+23:59", "2026-10-10T23:59:59-00:00", "2026-10-10T23:59:59+24:00", "2026-10-10T23:59:59+05:60",
	"2026-10-10T23:59:59+0530", "2026-10-10T23:59:59.999999999-12:45", "0000-01-01T00:00:00.9+00:01", "+2026-10-10T12:00:00Z",
	"20260-10-10T12:00:00Z", "2026-10-1\u0661T12:00:00Z", "2026-10-10T12:00:00Z\n", " 2026-10-10T12:00:00Z",
}

// dates returns noon on each month 0 to 13 and day 0 to 32 of year.
func dates(year int) []string {
	var values []string
	for month := 0; month < 14; month++ {
		for date := 0; date < 33; date++ {
			values = append(values, fmt.Sprintf("%04d-%02d-%02dT12:00:00Z", year, month, date))
		}
	}
	return values
}

func TestTimestampOracle(t *testing.T) {
	for _, year := range years {
		valid := 0
		for _, value := range dates(year) {
			seconds, ok := unixSeconds(value)
			if !ok {
				continue
			}
			valid++
			month, _ := strconv.Atoi(value[5:7])
			date, _ := strconv.Atoi(value[8:10])
			if want := time.Date(year, time.Month(month), date, 12, 0, 0, 0, time.UTC).Unix(); seconds != want {
				t.Errorf("unixSeconds(%q) = %d; want %d", value, seconds, want)
			}
		}
		start := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
		if want := int(start.AddDate(1, 0, 0).Sub(start).Hours() / 24); valid != want {
			t.Errorf("%04d has %d valid dates; want %d", year, valid, want)
		}
	}
	if seconds, ok := unixSeconds("2026-10-10T23:59:59.999999999-12:45"); !ok ||
		seconds != time.Date(2026, 10, 11, 12, 44, 59, 0, time.UTC).Unix() {
		t.Errorf("unixSeconds() with an offset = %d, %t", seconds, ok)
	}
}

func TestTimestamps(t *testing.T) {
	values := append([]string(nil), times...)
	for _, year := range years {
		values = append(values, dates(year)...)
	}
	for _, value := range values {
		event := validCall()
		event.OccurredAt, event.ExpiresAt = value, value
		seconds, ok := unixSeconds(value)
		if !ok {
			got := builders[2].build(event, "", at(now))
			checkError(t, strconv.Quote(value), got, push.CodeInvalidEvent,
				"Invalid notification event: occurredAt must be an RFC 3339 timestamp")
			continue
		}
		request, err := push.FCM(event, at(seconds-60))
		if err != nil || request == nil || request.Message.Android.TTL != "60s" {
			t.Errorf("FCM(%q) = %+v, %v; want a 60s lifetime", value, request, err)
		}
	}
}
