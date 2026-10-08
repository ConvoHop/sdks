/**
 * Docs pipeline configuration. Languages aren't listed here: docgen discovers
 * them from docs/languages/<id>/language.json, so adding a language never
 * edits this file. See docs/docs-pipeline.md.
 */
export default {
  title: "ConvoHop SDK documentation",
  description: "Reference documentation, quickstarts and tested examples for the ConvoHop SDKs.",
  /** Language directories, each with a language.json (spec/docs/language.schema.json). */
  languagesDirectory: "docs/languages",
  /** Generated, committed output. docgen owns every file in it. */
  outputDirectory: "docs/site",
  /**
   * Quickstart topics in navigation order. A language lists the topics it
   * covers in its language.json. Every language's index shows the topic
   * summary, so keep it true for both server and client SDKs.
   */
  topics: [
    {
      id: "server",
      title: "Server",
      summary: "Call ConvoHop from your backend with a backend key: principals, sessions, conversations and messages.",
    },
    {
      id: "client",
      title: "Client",
      summary: "Sign in a user with a session token, then send, watch and replay messages.",
    },
    {
      id: "webhooks",
      title: "Webhooks",
      summary: "Verify signed webhook deliveries and handle events.",
    },
    {
      id: "push",
      title: "Push notifications",
      summary: "Deliver messages and calls to your users' devices as APNs, FCM and Web Push notifications.",
    },
    {
      id: "calling",
      title: "Calling",
      summary: "Start, join and end voice and video calls.",
    },
  ],
};
