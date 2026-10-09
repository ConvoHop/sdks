using System;
using System.Collections.Generic;
using System.Text.Json;

namespace ConvoHop.Internal
{
    // Builds the canonical GraphQL request body for one generated operation. Failures are ProtocolFormatException.
    internal static class GraphqlRequest
    {
        internal static string Build(OperationDescriptor operation, string? projectId, JsonElement input, string requestId,
            JsonElement? credentialDeliveryPermit, string incarnation, string? observedServingEpoch)
        {
            var context = new Dictionary<string, object?>(StringComparer.Ordinal) { ["requestId"] = Protocol.ParseId(requestId) };
            if (projectId != null) context["projectId"] = Protocol.ParseId(projectId);
            if (credentialDeliveryPermit != null)
            {
                if (credentialDeliveryPermit.Value.ValueKind != JsonValueKind.Object)
                    throw new ProtocolFormatException("A credential delivery permit must be a JSON object");
                context["credentialDeliveryPermit"] = credentialDeliveryPermit.Value;
            }

            if (incarnation != "management") context["incarnation"] = incarnation;
            if (observedServingEpoch != null) context["observedServingEpoch"] = observedServingEpoch;

            if (operation.Plane == "communication")
            {
                if (projectId == null) throw new ProtocolFormatException("Communication operations require an explicit project");
            }
            else if (projectId != null)
            {
                throw new ProtocolFormatException("Management project selection belongs in the generated operation input");
            }

            if (input.ValueKind != JsonValueKind.Object) throw new ProtocolFormatException("Invalid protocol object");
            var allowed = new HashSet<string>(operation.InputFields, StringComparer.Ordinal);
            foreach (JsonProperty property in input.EnumerateObject())
            {
                if (!allowed.Contains(CanonicalJson.PropertyName(property)))
                    throw new ProtocolFormatException("Unknown GraphQL input field");
            }

            if (credentialDeliveryPermit != null && operation.Id != "communication.redeemCredential" &&
                operation.Id != "communication.acknowledgeCredential")
            {
                throw new ProtocolFormatException("A credential delivery permit is only valid for redemption or acknowledgement");
            }

            var variables = new Dictionary<string, object?>(StringComparer.Ordinal) { ["context"] = context };
            if (operation.InputFields.Count != 0) variables["input"] = input;
            return CanonicalJson.Serialize(new Dictionary<string, object?>(StringComparer.Ordinal)
            {
                ["query"] = operation.Document,
                ["operationName"] = operation.OperationName,
                ["variables"] = variables,
            });
        }
    }
}
