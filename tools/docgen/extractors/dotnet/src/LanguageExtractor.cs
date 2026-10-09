using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;

namespace ConvoHop.Docgen;

/// <summary>Extracts the packages a language file lists, one package per namespace.</summary>
internal static class LanguageExtractor
{
    public static SurfaceDocument Extract(string root, string languageFile)
    {
        var (id, packages) = ReadLanguage(root, languageFile);
        var surfaces = new Dictionary<string, SurfacePackage>(StringComparer.Ordinal);
        foreach (var group in packages.GroupBy(package => package.Source, StringComparer.Ordinal))
        {
            var directory = Path.GetFullPath(group.Key, root);
            var (project, frameworks) = PackageCompiler.ReadProject(root, directory);
            var sources = PackageCompiler.ReadSources(root, PackageCompiler.SourceFiles(root, directory));
            var namespaces = group.Select(package => package.Name).ToList();
            foreach (var surface in ExtractPackages(project, namespaces, sources, frameworks)) surfaces[surface.Name] = surface;
        }
        return new SurfaceDocument(id, packages.Select(package => surfaces[package.Name]).ToList());
    }

    /// <summary>Extracts one surface per namespace, and fails unless every target framework has the same surface.</summary>
    public static IReadOnlyList<SurfacePackage> ExtractPackages(
        string project, IReadOnlyList<string> namespaces, IReadOnlyList<SourceFile> sources, IReadOnlyList<string> frameworks)
    {
        IReadOnlyList<SurfacePackage>? first = null;
        foreach (var framework in frameworks)
        {
            var packages = SurfaceBuilder.Build(PackageCompiler.Compile(project, sources, framework), namespaces);
            if (first is null)
            {
                first = packages;
                continue;
            }
            for (var index = 0; index < packages.Count; index++)
            {
                var difference = SurfaceJson.FirstDifference(first[index], packages[index]);
                if (difference is not null)
                    throw new ExtractException($"{first[index].Name}#{difference} differs between {frameworks[0]} and {framework}; every target framework must have the same public API and docs");
            }
        }
        return first ?? throw new ExtractException($"{project}: no target frameworks");
    }

    private static (string Id, IReadOnlyList<(string Name, string Source)> Packages) ReadLanguage(string root, string languageFile)
    {
        var file = PackageCompiler.Relative(root, languageFile);
        try
        {
            using var document = JsonDocument.Parse(File.ReadAllBytes(languageFile));
            var language = document.RootElement;
            var id = Text(language, "id", file);
            if (!language.TryGetProperty("packages", out var list) || list.ValueKind != JsonValueKind.Array || list.GetArrayLength() == 0)
                throw new ExtractException($"{file}: packages must be a non-empty array");
            var packages = list.EnumerateArray()
                .Select(package => (Name: Text(package, "name", file), Source: Text(package, "source", file)))
                .ToList();
            var duplicate = packages.GroupBy(package => package.Name, StringComparer.Ordinal).FirstOrDefault(group => group.Count() > 1);
            if (duplicate is not null) throw new ExtractException($"{file}: package {duplicate.Key} is listed twice");
            return (id, packages);
        }
        catch (Exception error) when (error is IOException or UnauthorizedAccessException or JsonException)
        {
            throw new ExtractException($"{file}: {error.Message}");
        }
    }

    private static string Text(JsonElement element, string name, string file) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value)
            && value.ValueKind == JsonValueKind.String && value.GetString() is { Length: > 0 } text
            ? text
            : throw new ExtractException($"{file}: every {(name == "id" ? "language" : "package")} needs a non-empty string {name}");
}
