# .NET SDK

The `ConvoHop` package wraps the ConvoHop API for .NET backends. It runs on your servers with a secret backend key, verifies the webhooks that ConvoHop sends, and builds push requests from notification events.

## How it fits in

1. Your users sign in to your app with your own authentication.
2. Your backend uses the `ConvoHop` package to map each user to a ConvoHop principal and issue a short-lived session for the user's device.
3. Your app passes the session to a client SDK, such as [`@convohop/client`](../typescript/quickstarts/client.md) in browsers, which sends, watches and calls as that one user.
4. ConvoHop sends signed webhooks to your backend. `Webhooks.Verify` verifies them, and `PushPayloads` builds APNs, FCM and Web Push requests from notification events for you to send with your own push credentials.

Keep the backend key on your servers. It never belongs in client code, such as a browser, MAUI, Blazor WebAssembly or Unity app, or in bundles, storage, URLs or logs.

## Install

The package isn't on NuGet yet. Build it from a clone of [the SDK repository](https://github.com/ConvoHop/sdks) with the .NET 10 SDK that the clone's `global.json` selects. From the clone's root, pack it into a folder:

```sh
dotnet pack dotnet/src/ConvoHop -c Release -o "$PWD/dotnet/artifacts"
```

Then add that folder to your project as a package source, and add the `ConvoHop` package from it, as [install from source](https://github.com/ConvoHop/sdks/blob/main/dotnet/README.md#install-from-source) shows.

The package has `netstandard2.0` and `net10.0` assets, and its tests run on .NET 8, 9 and 10. The `netstandard2.0` asset should also run on .NET Framework 4.7.2 or later, but that isn't tested. The `net10.0` asset has no dependencies, and the `netstandard2.0` asset depends on `System.Text.Json`, `Microsoft.Bcl.AsyncInterfaces` and `Microsoft.Bcl.TimeProvider`. The build is deterministic and has Source Link, so debuggers can step into the matching source.

## Clients

- `ProjectServerClient` calls one project with a backend key. Its helpers, such as `Principals`, `Sessions` and `Conversation(id)`, check that each reply names the resource you asked for. Its generated `Communication` property reaches every Communication API operation that a backend can send.
- `ConvoHopManagementClient` calls the Management API with an operator access token. Its generated `Management` property reaches every management operation.

Create one client when your backend starts and share it: clients are safe for concurrent use. Every method that sends a request is asynchronous and takes a `CancellationToken`, and nullable reference types are annotated throughout.

A failed call throws a `ConvoHopException`, whose `Code` is the stable error code and whose `Outcome` says whether the request took effect. The request and response models in `ConvoHop.Models` are generated from the GraphQL schema like the other SDKs' types. They serialize with `System.Text.Json` source generation, never reflection or Newtonsoft.Json.

## Tested examples

Every C# sample in these docs is a region of a file in [the examples project](https://github.com/ConvoHop/sdks/tree/main/docs/languages/dotnet/examples), which CI builds with warnings as errors and tests with xUnit on .NET 8 and 10. On .NET 8 the samples use the package's `netstandard2.0` asset, and on .NET 10 its `net10.0` asset:

- The server samples run against the conformance mock, a local stand-in for the ConvoHop API, including dropped connections.
- The webhooks samples verify deliveries signed the way ConvoHop signs them, through ASP.NET Core's request and result types.
- The push samples run on every vector of the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md), and check the requests with `Lib.Net.Http.WebPush` and `FirebaseAdmin`.
