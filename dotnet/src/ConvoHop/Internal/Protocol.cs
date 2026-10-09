using System;
using System.Globalization;
using System.Text.RegularExpressions;
using System.Threading;

namespace ConvoHop.Internal
{
    // A malformed protocol value. The transport classifies it as INVALID_RESPONSE or INVALID_REQUEST.
    internal sealed class ProtocolFormatException : Exception
    {
        internal ProtocolFormatException(string message)
            : base(message)
        {
        }
    }

    internal static class Protocol
    {
        internal const string NilId = "00000000-0000-0000-0000-000000000000";
        internal const string MaxInt64 = "9223372036854775807";
        internal const long MaxSafeInteger = 9007199254740991;

        private static readonly Regex IdPattern =
            new Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", RegexOptions.CultureInvariant);

        private static readonly Regex CounterPattern = new Regex("^(0|[1-9][0-9]*)$", RegexOptions.CultureInvariant);

        private static readonly Regex TimestampPattern =
            new Regex("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$", RegexOptions.CultureInvariant);

        // .NET's '$' also matches before a final newline, so every pattern must cover the whole string.
        internal static bool FullMatch(Regex regex, string value)
        {
            Match match = regex.Match(value);
            return match.Success && match.Index == 0 && match.Length == value.Length;
        }

        internal static bool IsId(string? value) => value != null && FullMatch(IdPattern, value) && value != NilId;

        internal static string ParseId(string? value) =>
            IsId(value) ? value! : throw new ProtocolFormatException("Expected a canonical nonzero UUID");

        internal static bool IsCounter(string? value) =>
            value != null && FullMatch(CounterPattern, value) && WithinDecimal(value, MaxInt64);

        internal static string ParseCounter(string? value) =>
            IsCounter(value) ? value! : throw new ProtocolFormatException("Expected a canonical decimal counter");

        // Both values are canonical decimals without leading zeros.
        internal static bool WithinDecimal(string value, string maximum) =>
            value.Length < maximum.Length || (value.Length == maximum.Length && string.CompareOrdinal(value, maximum) <= 0);

        internal static int CompareCounters(string left, string right) =>
            left.Length != right.Length ? left.Length.CompareTo(right.Length) : Math.Sign(string.CompareOrdinal(left, right));

        // A UTC millisecond timestamp that ECMAScript Date.parse accepts: day 1..31 rolls over into the next month,
        // and 24:00:00.000 is the next midnight.
        internal static bool TryParseTimestamp(string? value, out long epochMilliseconds)
        {
            epochMilliseconds = 0;
            if (value == null || !FullMatch(TimestampPattern, value)) return false;
            int year = Digits(value, 0, 4), month = Digits(value, 5, 2), day = Digits(value, 8, 2);
            int hour = Digits(value, 11, 2), minute = Digits(value, 14, 2), second = Digits(value, 17, 2);
            int millisecond = Digits(value, 20, 3);
            if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 24 || minute > 59 || second > 59) return false;
            if (hour == 24 && (minute != 0 || second != 0 || millisecond != 0)) return false;
            long days = DaysFromCivil(year, month, 1) + day - 1;
            epochMilliseconds = days * 86400000L + hour * 3600000L + minute * 60000L + second * 1000L + millisecond;
            return true;
        }

        internal static bool IsTimestamp(string? value) => TryParseTimestamp(value, out _);

        internal static string ParseTimestamp(string? value) =>
            IsTimestamp(value) ? value! : throw new ProtocolFormatException("Expected a UTC millisecond timestamp");

        // True when the timestamp is exactly what Date.prototype.toISOString would print for its instant.
        internal static bool IsExactTimestamp(string? value)
        {
            if (!TryParseTimestamp(value, out _)) return false;
            int year = Digits(value!, 0, 4), month = Digits(value!, 5, 2), day = Digits(value!, 8, 2);
            return Digits(value!, 11, 2) < 24 && day <= DaysInMonth(year, month);
        }

        internal static long TimestampMilliseconds(string value) =>
            TryParseTimestamp(value, out long milliseconds)
                ? milliseconds
                : throw new ProtocolFormatException("Expected a UTC millisecond timestamp");

        // The origin of an HTTPS base URL, or of an explicit loopback HTTP base URL for local development.
        internal static string Origin(string? value)
        {
            const string Message = "Use an HTTPS origin, or explicit loopback HTTP for local development";
            if (value == null || !Uri.TryCreate(value, UriKind.Absolute, out Uri? uri) ||
                uri.UserInfo.Length != 0 || uri.Query.Length != 0 || uri.Fragment.Length != 0 || uri.AbsolutePath != "/" ||
                !(uri.Scheme == "https" || (uri.Scheme == "http" && IsLoopbackHost(uri))))
            {
                throw new ArgumentException(Message, "baseUrl");
            }

            string host = uri.HostNameType == UriHostNameType.IPv6 ? uri.Host : uri.IdnHost;
            if (host.Length == 0) throw new ArgumentException(Message, "baseUrl");
            return uri.Scheme + "://" + host + (uri.IsDefaultPort ? string.Empty : ":" + uri.Port.ToString(CultureInfo.InvariantCulture));
        }

        internal static bool IsLoopbackHost(Uri uri)
        {
            string host = uri.Host.ToLowerInvariant();
            return host == "127.0.0.1" || host == "localhost" || host == "[::1]";
        }

        // Tests replace the ID source for one async flow; production always uses random UUIDs.
        internal static readonly AsyncLocal<Func<string>?> IdSource = new AsyncLocal<Func<string>?>();

        internal static string NewId() => IdSource.Value?.Invoke() ?? Guid.NewGuid().ToString("D");

        private static int Digits(string value, int start, int length)
        {
            int result = 0;
            for (int index = start; index < start + length; index++) result = result * 10 + (value[index] - '0');
            return result;
        }

        internal static bool IsLeapYear(long year) => (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;

        internal static int DaysInMonth(int year, int month) =>
            month == 2 ? (IsLeapYear(year) ? 29 : 28) : (month == 4 || month == 6 || month == 9 || month == 11 ? 30 : 31);

        // Days since 1970-01-01 in the proleptic Gregorian calendar, including year 0.
        internal static long DaysFromCivil(long year, long month, long day)
        {
            year -= month <= 2 ? 1 : 0;
            long era = (year >= 0 ? year : year - 399) / 400;
            long yearOfEra = year - era * 400;
            long dayOfYear = (153 * (month > 2 ? month - 3 : month + 9) + 2) / 5 + day - 1;
            long dayOfEra = yearOfEra * 365 + yearOfEra / 4 - yearOfEra / 100 + dayOfYear;
            return era * 146097 + dayOfEra - 719468;
        }
    }
}
