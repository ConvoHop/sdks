using System;
using System.IO;

namespace ConvoHop.Docgen;

/// <summary>Prints the surface JSON of a language file's packages. tools/docgen/extractors/dotnet.mjs builds and runs it.</summary>
internal static class Program
{
    private static int Main(string[] args)
    {
        if (args.Length != 2)
        {
            Console.Error.WriteLine("usage: dotnet ConvoHop.Docgen.dll <repository root> <language.json>");
            return 2;
        }
        try
        {
            var root = Path.GetFullPath(args[0]);
            var surface = LanguageExtractor.Extract(root, Path.GetFullPath(args[1], root));
            using var output = Console.OpenStandardOutput();
            SurfaceJson.Write(output, surface);
            return 0;
        }
        catch (ExtractException error)
        {
            Console.Error.WriteLine($"dotnet extractor: {error.Message}");
            return 1;
        }
    }
}
