using System;
using System.Collections.Generic;

namespace ConvoHop
{
    /// <summary>Whether an operation reads authority state or asks the authority to change it.</summary>
    public enum OperationKind
    {
        /// <summary>A read-only GraphQL query.</summary>
        Query,

        /// <summary>A GraphQL mutation that needs receipt evidence and request recovery.</summary>
        Mutation,
    }

    /// <summary>How an operation uses one field of its request context.</summary>
    public enum ContextFieldUse
    {
        /// <summary>The field must be sent.</summary>
        Required,

        /// <summary>The field may be sent.</summary>
        Optional,

        /// <summary>The field must not be sent.</summary>
        Forbidden,
    }

    /// <summary>One request-context field and how an operation uses it.</summary>
    public sealed class ContextField
    {
        internal ContextField(string name, ContextFieldUse use)
        {
            Name = name;
            Use = use;
        }

        /// <summary>The context field name, for example <c>requestId</c>.</summary>
        public string Name { get; }

        /// <summary>How the operation uses the field.</summary>
        public ContextFieldUse Use { get; }
    }

    /// <summary>The input of an operation that takes no input.</summary>
    public sealed class NoInput
    {
        private NoInput()
        {
        }

        /// <summary>The only instance.</summary>
        public static NoInput Value { get; } = new NoInput();
    }

    /// <summary>A generated GraphQL operation: its document, input fields, result type and request semantics.</summary>
    /// <remarks>Instances are generated in <see cref="Operations"/>; they cannot be created by callers.</remarks>
    public abstract class OperationDescriptor
    {
        private protected OperationDescriptor(string id, string plane, OperationKind kind, string field, string operationName,
            string document, string resultType, string contextArgument, string? inputArgument, bool inputRequired,
            IReadOnlyList<string> inputFields, IReadOnlyList<ContextField> contextFields, string idempotency, string layer,
            string pagination)
        {
            Id = id;
            Plane = plane;
            Kind = kind;
            Field = field;
            OperationName = operationName;
            Document = document;
            ResultType = resultType;
            ContextArgument = contextArgument;
            InputArgument = inputArgument;
            InputRequired = inputRequired;
            InputFields = inputFields;
            ContextFields = contextFields;
            Idempotency = idempotency;
            Layer = layer;
            Pagination = pagination;
        }

        /// <summary>The stable operation key, for example <c>communication.sendMessage</c>.</summary>
        public string Id { get; }

        /// <summary>The plane that serves the operation: <c>communication</c> or <c>management</c>.</summary>
        public string Plane { get; }

        /// <summary>Whether the operation is a query or a mutation.</summary>
        public OperationKind Kind { get; }

        /// <summary>The GraphQL root field.</summary>
        public string Field { get; }

        /// <summary>The GraphQL operation name sent with the document.</summary>
        public string OperationName { get; }

        /// <summary>The GraphQL document.</summary>
        public string Document { get; }

        /// <summary>The GraphQL result type, for example <c>SendMessageReply!</c>.</summary>
        public string ResultType { get; }

        /// <summary>The name of the request-context argument.</summary>
        public string ContextArgument { get; }

        /// <summary>The name of the input argument, or null when the operation takes no input.</summary>
        public string? InputArgument { get; }

        /// <summary>Whether the input argument is required.</summary>
        public bool InputRequired { get; }

        /// <summary>The input fields the operation accepts.</summary>
        public IReadOnlyList<string> InputFields { get; }

        /// <summary>The request-context fields and how the operation uses them.</summary>
        public IReadOnlyList<ContextField> ContextFields { get; }

        /// <summary>The idempotency class, such as <c>safe</c>, <c>idempotent</c>, <c>permitBound</c> or <c>replayOnly</c>.</summary>
        public string Idempotency { get; }

        /// <summary>The SDK layer that may call the operation: <c>client</c>, <c>server</c> or <c>both</c>.</summary>
        public string Layer { get; }

        /// <summary>The pagination style: <c>none</c>, <c>cursor</c>, <c>sequence</c> or <c>bounded</c>.</summary>
        public string Pagination { get; }

        /// <summary>The CLR type of the operation input.</summary>
        public abstract Type InputType { get; }

        /// <summary>The CLR type of the operation result.</summary>
        public abstract Type ResultClrType { get; }

        /// <summary>Returns <see cref="Id"/>.</summary>
        /// <returns>The operation ID.</returns>
        public override string ToString() => Id;
    }

    /// <summary>A generated GraphQL operation with its typed input and result.</summary>
    /// <typeparam name="TInput">The input model, or <see cref="NoInput"/>.</typeparam>
    /// <typeparam name="TResult">The result model.</typeparam>
    public sealed class OperationDescriptor<TInput, TResult> : OperationDescriptor
    {
        internal OperationDescriptor(string id, string plane, OperationKind kind, string field, string operationName,
            string document, string resultType, string contextArgument, string? inputArgument, bool inputRequired,
            IReadOnlyList<string> inputFields, IReadOnlyList<ContextField> contextFields, string idempotency, string layer,
            string pagination)
            : base(id, plane, kind, field, operationName, document, resultType, contextArgument, inputArgument, inputRequired,
                inputFields, contextFields, idempotency, layer, pagination)
        {
        }

        /// <inheritdoc />
        public override Type InputType => typeof(TInput);

        /// <inheritdoc />
        public override Type ResultClrType => typeof(TResult);
    }
}
