using System.Collections.Generic;
using Xunit;

namespace ConvoHop.Tests.TestSupport
{
    /// <summary>Theory data built from names, so each name runs and reports as its own case.</summary>
    internal static class Theories
    {
        internal static TheoryData<string> Names(IEnumerable<string> names)
        {
            var data = new TheoryData<string>();
            foreach (string name in names) data.Add(name);
            return data;
        }
    }
}
