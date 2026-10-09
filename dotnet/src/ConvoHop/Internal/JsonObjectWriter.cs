using System.Text;

namespace ConvoHop.Internal
{
    // Compact JSON objects with fields in insertion order and JSON.stringify string escaping, for push payloads whose
    // field order and byte size are part of the contract.
    internal sealed class JsonObjectWriter
    {
        private readonly StringBuilder _json = new StringBuilder("{");
        private bool _empty = true;

        // Skips the field when value is null.
        internal JsonObjectWriter String(string name, string? value)
        {
            if (value == null) return this;
            Name(name);
            CanonicalJson.WriteString(_json, value);
            return this;
        }

        internal JsonObjectWriter Raw(string name, string json)
        {
            Name(name);
            _json.Append(json);
            return this;
        }

        internal string Close() => _json.Append('}').ToString();

        private void Name(string name)
        {
            if (!_empty) _json.Append(',');
            _empty = false;
            CanonicalJson.WriteString(_json, name);
            _json.Append(':');
        }
    }
}
