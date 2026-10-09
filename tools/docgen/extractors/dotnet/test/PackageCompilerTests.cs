using System;
using System.IO;
using System.Linq;
using System.Text;
using Xunit;

namespace ConvoHop.Docgen.Tests;

public sealed class PackageCompilerTests : IDisposable
{
    private readonly string root = Directory.CreateTempSubdirectory("convohop-docgen-").FullName;

    public void Dispose() => Directory.Delete(root, recursive: true);

    private string Write(string path, string text)
    {
        var full = Path.Combine(root, path);
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        File.WriteAllText(full, text);
        return full;
    }

    private string Project(string properties, string items = "") => Write("src/Lib/Lib.csproj", $"""
        <Project Sdk="Microsoft.NET.Sdk">
          <PropertyGroup>
            {properties}
          </PropertyGroup>
          {items}
        </Project>
        """);

    [Fact]
    public void DefinesTheSdkPreprocessorSymbols()
    {
        Assert.Equal(
            new[]
            {
                "TRACE", "RELEASE", "NET", "NETCOREAPP", "NET10_0", "NET5_0_OR_GREATER", "NET6_0_OR_GREATER", "NET7_0_OR_GREATER",
                "NET8_0_OR_GREATER", "NET9_0_OR_GREATER", "NET10_0_OR_GREATER", "NETCOREAPP1_0_OR_GREATER", "NETCOREAPP1_1_OR_GREATER",
                "NETCOREAPP2_0_OR_GREATER", "NETCOREAPP2_1_OR_GREATER", "NETCOREAPP2_2_OR_GREATER", "NETCOREAPP3_0_OR_GREATER",
                "NETCOREAPP3_1_OR_GREATER",
            },
            PackageCompiler.PreprocessorSymbols("net10.0"));
        Assert.Equal(
            new[]
            {
                "TRACE", "RELEASE", "NETSTANDARD", "NETSTANDARD2_0", "NETSTANDARD1_0_OR_GREATER", "NETSTANDARD1_1_OR_GREATER",
                "NETSTANDARD1_2_OR_GREATER", "NETSTANDARD1_3_OR_GREATER", "NETSTANDARD1_4_OR_GREATER", "NETSTANDARD1_5_OR_GREATER",
                "NETSTANDARD1_6_OR_GREATER", "NETSTANDARD2_0_OR_GREATER",
            },
            PackageCompiler.PreprocessorSymbols("netstandard2.0"));
    }

    [Theory]
    [InlineData("net48")]
    [InlineData("netcoreapp3.1")]
    [InlineData("net10.0-windows")]
    [InlineData("netstandard3.0")]
    public void RejectsOtherTargetFrameworks(string framework)
    {
        var error = Assert.Throws<ExtractException>(() => PackageCompiler.PreprocessorSymbols(framework));

        Assert.Equal($"target framework {framework} isn't supported; use netstandard1.0 to netstandard2.1, or net5.0 or later", error.Message);
    }

    [Fact]
    public void ReadsTheTargetFrameworks()
    {
        Project("<TargetFrameworks> netstandard2.0 ; net10.0 </TargetFrameworks>");

        var (name, frameworks) = PackageCompiler.ReadProject(root, Path.Combine(root, "src/Lib"));

        Assert.Equal("Lib", name);
        Assert.Equal(new[] { "netstandard2.0", "net10.0" }, frameworks);
    }

    [Theory]
    [InlineData("<TargetFramework Condition=\"'$(X)' == ''\">net10.0</TargetFramework>", "", "src/Lib/Lib.csproj:3: <TargetFramework> must be unconditional, in an unconditional top-level <PropertyGroup>")]
    [InlineData("<TargetFramework>$(Frameworks)</TargetFramework>", "", "src/Lib/Lib.csproj:3: <TargetFramework> can't use properties")]
    [InlineData("<TargetFrameworks>net10.0;net10.0</TargetFrameworks>", "", "src/Lib/Lib.csproj:3: <TargetFrameworks> lists a framework twice")]
    [InlineData("<TargetFrameworks>;</TargetFrameworks>", "", "src/Lib/Lib.csproj:3: <TargetFrameworks> is empty")]
    [InlineData("<Nullable>enable</Nullable>", "", "src/Lib/Lib.csproj: expected one <TargetFramework> or <TargetFrameworks>, found 0")]
    [InlineData("<TargetFramework>net10.0</TargetFramework><DefineConstants>EXTRA</DefineConstants>", "", "src/Lib/Lib.csproj:3: <DefineConstants> isn't supported; the extractor compiles every .cs file with the framework's standard preprocessor symbols")]
    [InlineData("<TargetFramework>net10.0</TargetFramework>", "<ItemGroup><Compile Remove=\"Old.cs\" /></ItemGroup>", "src/Lib/Lib.csproj:5: <Compile> isn't supported; the extractor compiles every .cs file with the framework's standard preprocessor symbols")]
    [InlineData("<TargetFramework>net48</TargetFramework>", "", "target framework net48 isn't supported; use netstandard1.0 to netstandard2.1, or net5.0 or later")]
    public void RejectsProjectsItCannotReadExactly(string properties, string items, string expected)
    {
        Project(properties, items);

        var error = Assert.Throws<ExtractException>(() => PackageCompiler.ReadProject(root, Path.Combine(root, "src/Lib")));

        Assert.Equal(expected, error.Message);
    }

    [Fact]
    public void RejectsSettingsInDirectoryBuildFiles()
    {
        Project("<TargetFramework>net10.0</TargetFramework>");
        Write("src/Directory.Build.props", "<Project>\n  <PropertyGroup><TargetFramework>net9.0</TargetFramework></PropertyGroup>\n</Project>");

        var error = Assert.Throws<ExtractException>(() => PackageCompiler.ReadProject(root, Path.Combine(root, "src/Lib")));

        Assert.Equal("src/Directory.Build.props:2: set <TargetFramework> in src/Lib/Lib.csproj instead", error.Message);

        Write("src/Directory.Build.props", "<Project>\n  <PropertyGroup><DefineConstants>X</DefineConstants></PropertyGroup>\n</Project>");
        error = Assert.Throws<ExtractException>(() => PackageCompiler.ReadProject(root, Path.Combine(root, "src/Lib")));
        Assert.StartsWith("src/Directory.Build.props:2: <DefineConstants> isn't supported", error.Message);
    }

    [Fact]
    public void RequiresExactlyOneProject()
    {
        Project("<TargetFramework>net10.0</TargetFramework>");
        Write("src/Lib/Other.csproj", "<Project />");

        var error = Assert.Throws<ExtractException>(() => PackageCompiler.ReadProject(root, Path.Combine(root, "src/Lib")));

        Assert.Equal("src/Lib: expected one .csproj file, found 2", error.Message);
    }

    [Fact]
    public void ListsSourcesWithPartialFilesAfterTheirMainFile()
    {
        foreach (var file in new[] { "AB.cs", "A.Part.cs", "A.cs", "Models/B.cs", "bin/X.cs", "obj/Y.cs", ".hidden/Z.cs", "notes.txt" })
            Write($"src/Lib/{file}", "");

        Assert.Equal(
            new[] { "src/Lib/A.cs", "src/Lib/A.Part.cs", "src/Lib/AB.cs", "src/Lib/Models/B.cs" },
            PackageCompiler.SourceFiles(root, Path.Combine(root, "src/Lib")));
    }

    [Fact]
    public void ExtractsTheLanguageFilePackagesInOrder()
    {
        Project("<TargetFrameworks>netstandard2.0;net10.0</TargetFrameworks>");
        Write("src/Lib/Client.cs", "namespace Lib { /// <summary>A client.</summary>\npublic sealed class Client { } }");
        Write("src/Lib/Models/Model.cs", "namespace Lib.Models { /// <summary>A model.</summary>\npublic sealed class Model { } }");
        var language = Write("docs/language.json", """
            {
              "id": "test",
              "packages": [
                { "name": "Lib.Models", "source": "src/Lib" },
                { "name": "Lib", "source": "src/Lib" }
              ]
            }
            """);

        var document = LanguageExtractor.Extract(root, language);
        using var output = new MemoryStream();
        SurfaceJson.Write(output, document);

        Assert.Equal(
            """{"language":"test","packages":[{"name":"Lib.Models","symbols":[{"name":"Model","kind":"class","signatures":["public sealed class Model"],"docs":"A model.","members":[{"name":"Model","kind":"constructor","signatures":["public Model();"],"docs":""}]}]},{"name":"Lib","symbols":[{"name":"Client","kind":"class","signatures":["public sealed class Client"],"docs":"A client.","members":[{"name":"Client","kind":"constructor","signatures":["public Client();"],"docs":""}]}]}]}"""
                + "\n",
            Encoding.UTF8.GetString(output.ToArray()));
    }
}
