using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Text;

namespace ConvoHop.Docgen;

/// <summary>A source file: its repository-relative path and its text.</summary>
internal sealed record SourceFile(string Path, string Text);

/// <summary>Compiles a package's sources the way its project does for one target framework.</summary>
/// <remarks>
/// The extractor reads the project file instead of evaluating MSBuild, so it rejects the project settings
/// it would otherwise get wrong: compile item changes, extra preprocessor symbols and computed target frameworks.
/// </remarks>
internal static class PackageCompiler
{
    private static readonly Regex NetPattern = new(@"^net(\d+)\.(\d+)$", RegexOptions.CultureInvariant);
    private static readonly Regex StandardPattern = new(@"^netstandard(\d+)\.(\d+)$", RegexOptions.CultureInvariant);
    private static readonly string[] StandardVersions = ["1.0", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "2.0", "2.1"];
    private static readonly string[] CoreAppVersions = ["1.0", "1.1", "2.0", "2.1", "2.2", "3.0", "3.1"];
    private static readonly string[] UnsupportedSettings = ["Compile", "EnableDefaultCompileItems", "DefineConstants", "DisableImplicitFrameworkDefines"];

    /// <summary>The project name and target frameworks of the single project file in a package's source directory.</summary>
    public static (string Name, IReadOnlyList<string> Frameworks) ReadProject(string root, string directory)
    {
        var relative = Relative(root, directory);
        if (!Directory.Exists(directory)) throw new ExtractException($"{relative}: no such directory");
        var projects = Directory.GetFiles(directory, "*.csproj", SearchOption.TopDirectoryOnly);
        if (projects.Length != 1)
            throw new ExtractException($"{relative}: expected one .csproj file, found {projects.Length}");
        var path = projects[0];
        var file = Relative(root, path);
        var document = Load(root, path);
        RejectUnsupportedSettings(root, path, document);
        for (var parent = directory; parent is not null && IsWithin(root, parent); parent = Path.GetDirectoryName(parent))
        {
            foreach (var name in new[] { "Directory.Build.props", "Directory.Build.targets" })
            {
                var imported = Path.Combine(parent, name);
                if (!File.Exists(imported)) continue;
                var importedDocument = Load(root, imported);
                RejectUnsupportedSettings(root, imported, importedDocument);
                var framework = importedDocument.Descendants().FirstOrDefault(IsFrameworkElement);
                if (framework is not null)
                    throw new ExtractException($"{At(root, imported, framework)}: set <{framework.Name.LocalName}> in {file} instead");
            }
        }
        var targets = document.Descendants().Where(IsFrameworkElement).ToList();
        if (targets.Count != 1)
            throw new ExtractException($"{file}: expected one <TargetFramework> or <TargetFrameworks>, found {targets.Count}");
        var target = targets[0];
        var group = target.Parent;
        if (target.Attribute("Condition") is not null || group is null || group.Name.LocalName != "PropertyGroup"
            || group.Attribute("Condition") is not null || group.Parent != document.Root)
            throw new ExtractException($"{At(root, path, target)}: <{target.Name.LocalName}> must be unconditional, in an unconditional top-level <PropertyGroup>");
        if (target.Value.Contains("$(", StringComparison.Ordinal))
            throw new ExtractException($"{At(root, path, target)}: <{target.Name.LocalName}> can't use properties");
        var frameworks = target.Value.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (frameworks.Length == 0) throw new ExtractException($"{At(root, path, target)}: <{target.Name.LocalName}> is empty");
        if (frameworks.Distinct(StringComparer.OrdinalIgnoreCase).Count() != frameworks.Length)
            throw new ExtractException($"{At(root, path, target)}: <{target.Name.LocalName}> lists a framework twice");
        foreach (var framework in frameworks) PreprocessorSymbols(framework);
        return (Path.GetFileNameWithoutExtension(path), frameworks);
    }

    /// <summary>The preprocessor symbols the .NET SDK defines in a Release build for a target framework.</summary>
    public static IReadOnlyList<string> PreprocessorSymbols(string framework)
    {
        var symbols = new List<string> { "TRACE", "RELEASE" };
        var net = NetPattern.Match(framework);
        var standard = StandardPattern.Match(framework);
        if (net.Success && Number(net.Groups[1].Value) >= 5)
        {
            var major = Number(net.Groups[1].Value);
            symbols.AddRange(["NET", "NETCOREAPP", $"NET{major}_{Number(net.Groups[2].Value)}"]);
            for (var version = 5; version <= major; version++) symbols.Add($"NET{version}_0_OR_GREATER");
            symbols.AddRange(CoreAppVersions.Select(version => $"NETCOREAPP{version.Replace('.', '_')}_OR_GREATER"));
        }
        else if (standard.Success && Array.IndexOf(StandardVersions, $"{standard.Groups[1].Value}.{standard.Groups[2].Value}") is var index and >= 0)
        {
            symbols.AddRange(["NETSTANDARD", $"NETSTANDARD{StandardVersions[index].Replace('.', '_')}"]);
            symbols.AddRange(StandardVersions.Take(index + 1).Select(version => $"NETSTANDARD{version.Replace('.', '_')}_OR_GREATER"));
        }
        else
        {
            throw new ExtractException($"target framework {framework} isn't supported; use netstandard1.0 to netstandard2.1, or net5.0 or later");
        }
        return symbols;
    }

    private static bool IsFrameworkElement(XElement element) =>
        element.Name.LocalName is "TargetFramework" or "TargetFrameworks";

    private static void RejectUnsupportedSettings(string root, string path, XDocument document)
    {
        foreach (var element in document.Descendants())
        {
            var name = element.Name.LocalName;
            if (Array.IndexOf(UnsupportedSettings, name) >= 0)
                throw new ExtractException($"{At(root, path, element)}: <{name}> isn't supported; the extractor compiles every .cs file with the framework's standard preprocessor symbols");
        }
    }

    private static XDocument Load(string root, string path)
    {
        try
        {
            return XDocument.Load(path, LoadOptions.SetLineInfo);
        }
        catch (Exception error) when (error is XmlException or IOException or UnauthorizedAccessException)
        {
            throw new ExtractException($"{Relative(root, path)}: {error.Message}");
        }
    }

    private static string At(string root, string path, XElement element) =>
        $"{Relative(root, path)}:{((IXmlLineInfo)element).LineNumber}";

    private static int Number(string digits) => int.Parse(digits, NumberStyles.None, CultureInfo.InvariantCulture);

    private static bool IsWithin(string root, string path)
    {
        var relative = Path.GetRelativePath(root, path);
        return relative == "." || !(relative == ".." || relative.StartsWith(".." + Path.DirectorySeparatorChar, StringComparison.Ordinal) || Path.IsPathRooted(relative));
    }

    /// <summary>Every .cs file under a directory except build output and dot-folders, as repository-relative paths.</summary>
    /// <remarks>Sorting by the path without <c>.cs</c> puts a partial type's main file before its <c>Type.Part.cs</c> files.</remarks>
    public static IReadOnlyList<string> SourceFiles(string root, string directory)
    {
        var files = new List<string>();
        void Walk(string current)
        {
            foreach (var file in Directory.EnumerateFiles(current))
            {
                if (file.EndsWith(".cs", StringComparison.Ordinal)) files.Add(Relative(root, file));
            }
            foreach (var child in Directory.EnumerateDirectories(current))
            {
                var name = Path.GetFileName(child);
                if (name is "bin" or "obj" || name.StartsWith('.')) continue;
                Walk(child);
            }
        }
        Walk(directory);
        if (files.Count == 0) throw new ExtractException($"{Relative(root, directory)}: no .cs files");
        return files.OrderBy(file => file[..^3], StringComparer.Ordinal).ThenBy(file => file, StringComparer.Ordinal).ToList();
    }

    /// <summary>Reads source files given as repository-relative paths.</summary>
    public static IReadOnlyList<SourceFile> ReadSources(string root, IReadOnlyList<string> files) =>
        files.Select(file =>
        {
            try
            {
                return new SourceFile(file, File.ReadAllText(Path.Combine(root, file), Encoding.UTF8));
            }
            catch (Exception error) when (error is IOException or UnauthorizedAccessException)
            {
                throw new ExtractException($"{file}: {error.Message}");
            }
        }).ToList();

    /// <summary>Compiles source files for a target framework, against the extractor's own runtime assemblies.</summary>
    /// <remarks>
    /// Only declarations matter, so semantic errors such as unimplemented source-generated members are
    /// ignored; the surface builder fails instead when a documented signature has a type that doesn't resolve.
    /// </remarks>
    public static CSharpCompilation Compile(string name, IReadOnlyList<SourceFile> sources, string framework)
    {
        var options = new CSharpParseOptions(LanguageVersion.Latest, DocumentationMode.Parse, SourceCodeKind.Regular, PreprocessorSymbols(framework));
        var trees = new List<SyntaxTree>();
        foreach (var source in sources)
        {
            var tree = CSharpSyntaxTree.ParseText(SourceText.From(source.Text, Encoding.UTF8), options, source.Path);
            var syntaxError = tree.GetDiagnostics().FirstOrDefault(item => item.Severity == DiagnosticSeverity.Error);
            if (syntaxError is not null)
            {
                var line = syntaxError.Location.GetLineSpan().StartLinePosition.Line + 1;
                throw new ExtractException($"{source.Path}:{line}: {syntaxError.GetMessage(CultureInfo.InvariantCulture)} (with the {framework} preprocessor symbols)");
            }
            trees.Add(tree);
        }
        var compilationOptions = new CSharpCompilationOptions(
            OutputKind.DynamicallyLinkedLibrary,
            nullableContextOptions: NullableContextOptions.Enable,
            allowUnsafe: true,
            deterministic: true);
        return CSharpCompilation.Create(name, trees, References.Value, compilationOptions);
    }

    private static readonly Lazy<ImmutableArray<MetadataReference>> References = new(() =>
    {
        var directory = Path.GetDirectoryName(typeof(object).Assembly.Location)
            ?? throw new ExtractException("can't find the .NET runtime directory");
        var trusted = AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") as string
            ?? throw new ExtractException("can't list the .NET runtime assemblies");
        return trusted.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries)
            .Where(path => string.Equals(Path.GetDirectoryName(path), directory, StringComparison.Ordinal))
            .Order(StringComparer.Ordinal)
            .Select(path => (MetadataReference)MetadataReference.CreateFromFile(path))
            .ToImmutableArray();
    });

    /// <summary>A path relative to the repository root, with <c>/</c> separators.</summary>
    public static string Relative(string root, string path) =>
        Path.GetRelativePath(root, path).Replace(Path.DirectorySeparatorChar, '/');
}
