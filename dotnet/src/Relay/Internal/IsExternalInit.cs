#if NETSTANDARD2_0
namespace System.Runtime.CompilerServices
{
    // Enables init accessors when compiling for netstandard2.0.
    internal static class IsExternalInit
    {
    }
}
#endif
