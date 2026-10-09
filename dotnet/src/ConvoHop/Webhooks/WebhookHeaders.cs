using System;
using System.Collections.Generic;

namespace ConvoHop
{
    /// <summary>
    /// The request headers of a webhook delivery. Names match ASCII case-insensitively. A header that is present more than
    /// once fails verification with <see cref="WebhookVerificationCode.InvalidHeader"/>.
    /// </summary>
    /// <remarks>
    /// ASP.NET Core: <c>WebhookHeaders.From(request.Headers)</c>. <c>HttpRequestMessage</c>:
    /// <c>WebhookHeaders.From(message.Headers)</c>. A dictionary: <c>WebhookHeaders.From(dictionary)</c>.
    /// </remarks>
    public sealed class WebhookHeaders
    {
        private static readonly string[] Names = { "webhook-id", "webhook-timestamp", "webhook-signature" };

        private readonly Slot[]? _slots;
        private readonly Func<string, string?>? _lookup;

        private WebhookHeaders(Slot[]? slots, Func<string, string?>? lookup)
        {
            _slots = slots;
            _lookup = lookup;
        }

        /// <summary>Headers with one value per entry, such as a <c>Dictionary&lt;string, string&gt;</c>.</summary>
        /// <param name="headers">The headers. Entries with a null value are ignored.</param>
        /// <returns>The headers to verify.</returns>
        /// <remarks>A name in more than one entry, in any casing, is a repeated header.</remarks>
        public static WebhookHeaders From(IEnumerable<KeyValuePair<string, string>> headers)
        {
            if (headers == null) throw new ArgumentNullException(nameof(headers));
            var slots = new Slot[Names.Length];
            foreach (KeyValuePair<string, string> header in headers)
            {
                int index = IndexOf(header.Key);
                if (index < 0 || header.Value == null) continue;
                if (++slots[index].Keys == 1)
                {
                    slots[index].Values = 1;
                    slots[index].Value = header.Value;
                }
            }

            return new WebhookHeaders(slots, null);
        }

        /// <summary>
        /// Headers with several values per entry, such as ASP.NET Core's <c>IHeaderDictionary</c> or
        /// <c>System.Net.Http.Headers.HttpHeaders</c>.
        /// </summary>
        /// <typeparam name="TValues">The collection of one header's values.</typeparam>
        /// <param name="headers">The headers. Entries with a null collection are ignored.</param>
        /// <returns>The headers to verify.</returns>
        /// <remarks>A name in more than one entry, in any casing, or with more than one value, is a repeated header.</remarks>
        public static WebhookHeaders From<TValues>(IEnumerable<KeyValuePair<string, TValues>> headers)
            where TValues : IEnumerable<string?>
        {
            if (headers == null) throw new ArgumentNullException(nameof(headers));
            var slots = new Slot[Names.Length];
            foreach (KeyValuePair<string, TValues> header in headers)
            {
                int index = IndexOf(header.Key);
                if (index < 0 || header.Value == null) continue;
                if (++slots[index].Keys > 1) continue;
                foreach (string? value in header.Value)
                {
                    if (++slots[index].Values > 1) break;
                    slots[index].Value = value;
                }
            }

            return new WebhookHeaders(slots, null);
        }

        /// <summary>
        /// Headers read through a lookup, like the Fetch API's <c>Headers.get</c>. Verification calls it with each lowercase
        /// header name.
        /// </summary>
        /// <param name="lookup">Returns the header's value, or null when it is absent. It decides how repeated headers combine.</param>
        /// <returns>The headers to verify.</returns>
        public static WebhookHeaders From(Func<string, string?> lookup) =>
            new WebhookHeaders(null, lookup ?? throw new ArgumentNullException(nameof(lookup)));

        internal string Read(string name)
        {
            string? value;
            if (_lookup != null)
            {
                value = _lookup(name);
            }
            else
            {
                Slot slot = _slots![Array.IndexOf(Names, name)];
                if (slot.Keys > 1 || slot.Values > 1)
                    throw new WebhookVerificationException(WebhookVerificationCode.InvalidHeader, "Repeated " + name + " header");
                value = slot.Value;
            }

            if (string.IsNullOrEmpty(value))
                throw new WebhookVerificationException(WebhookVerificationCode.MissingHeader, "Missing " + name + " header");
            return value!;
        }

        // HTTP field names are ASCII tokens, so only ASCII letters fold.
        private static int IndexOf(string? key)
        {
            if (key == null) return -1;
            for (int index = 0; index < Names.Length; index++)
            {
                string name = Names[index];
                if (key.Length != name.Length) continue;
                int position = 0;
                while (position < key.Length)
                {
                    char current = key[position];
                    if (current >= 'A' && current <= 'Z') current = (char)(current + ('a' - 'A'));
                    if (current != name[position]) break;
                    position++;
                }

                if (position == key.Length) return index;
            }

            return -1;
        }

        private struct Slot
        {
            public int Keys;
            public int Values;
            public string? Value;
        }
    }
}
