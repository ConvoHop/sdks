package contract

import (
	"strings"
	"testing"
)

func TestEpochSeconds(t *testing.T) {
	// Expected values come from the TypeScript SDK's epochSeconds.
	valid := map[string]int64{
		"2026-10-10T11:59:55Z":                1791633595,
		"2026-10-10T11:59:55.123456789+05:30": 1791613795,
		"2026-10-10T11:59:55-08:00":           1791662395,
		"2024-02-29T00:00:00Z":                1709164800,
		"2000-02-29T23:59:59Z":                951868799,
		"0000-01-01T00:00:00Z":                -62167219200,
		"9999-12-31T23:59:59-23:59":           253402387139,
		"1969-12-31T23:59:59.5Z":              -1,
		"2026-10-10T00:00:00+23:59":           1791504060,
	}
	for value, want := range valid {
		if got, ok := EpochSeconds(value); !ok || got != want {
			t.Errorf("EpochSeconds(%q) = %d, %t; want %d, true", value, got, ok, want)
		}
	}
	for _, value := range []string{
		"", "2026-02-29T00:00:00Z", "2100-02-29T00:00:00Z", "2026-10-10T23:59:60Z", "2026-10-10T24:00:00Z",
		"2026-13-01T00:00:00Z", "2026-00-10T00:00:00Z", "2026-10-00T00:00:00Z", "2026-04-31T00:00:00Z",
		"2026-10-10t11:59:55Z", "2026-10-10T11:59:55z", "2026-10-10T11:59:55.1234567890Z",
		"2026-10-10T11:59:55+24:00", "2026-10-10T11:59:55+05:60", "2026-10-10T11:59:55",
		"2026-10-10 11:59:55Z", "2026-10-10T11:59:55.Z", "+2026-10-10T11:59:55Z", "2026-10-10T11:59:55+0530",
		"\uff12026-10-10T11:59:55Z", "2026-10-10T11:59:55Z\n", " 2026-10-10T11:59:55Z",
	} {
		if got, ok := EpochSeconds(value); ok {
			t.Errorf("EpochSeconds(%q) = %d, true; want false", value, got)
		}
	}
}

func TestUUID(t *testing.T) {
	for value, want := range map[string]bool{
		"6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c":   true,
		"ffffffff-ffff-ffff-ffff-ffffffffffff":   true,
		"00000000-0000-0000-0000-000000000001":   true,
		"00000000-0000-0000-0000-000000000000":   false,
		"6F1C2A7E-0B8D-4E5F-9A3C-2D1E0F9B8A7C":   false,
		"6f1c2a7e0b8d4e5f9a3c2d1e0f9b8a7c":       false,
		"{6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c}": false,
		"6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7":    false,
		"6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c\n": false,
		"g f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c":  false,
		"":                                       false,
	} {
		if got := UUID(value); got != want {
			t.Errorf("UUID(%q) = %t; want %t", value, got, want)
		}
	}
}

func TestIdentifier(t *testing.T) {
	long := "A" + strings.Repeat("z_9", 21)
	for value, want := range map[string]bool{
		"AUDIO_ONLY": true, "a": true, "x1_": true, long: true,
		long + "b": false, "": false, "1a": false, "_a": false, "AUDIO-ONLY": false, "é": false, "a b": false,
	} {
		if got := Identifier(value); got != want {
			t.Errorf("Identifier(%q) = %t; want %t", value, got, want)
		}
	}
}
