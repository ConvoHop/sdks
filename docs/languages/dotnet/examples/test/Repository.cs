using System;
using System.IO;

namespace Examples.Tests;

// The sdks checkout the tests run in: they read spec/ and start conformance/mock from it.
internal static class Repository
{
    public static string Root { get; } = FindRoot();

    public static string PathTo(params string[] parts) => Path.Combine(Root, Path.Combine(parts));

    private static string FindRoot()
    {
        for (DirectoryInfo? directory = new(AppContext.BaseDirectory); directory != null; directory = directory.Parent)
        {
            if (File.Exists(Path.Combine(directory.FullName, "conformance", "mock", "cli.mjs"))) return directory.FullName;
        }
        throw new InvalidOperationException("Run the tests from inside the sdks repository.");
    }
}
