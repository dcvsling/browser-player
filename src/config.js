export const APP_CONFIG = {
  auth: {
    clientId: "a39d10ff-3017-4e23-aef6-aeecf2688b52",
    tenantId: "55604d97-faf8-4a3c-8f8d-c7a4fbc9b8b6",
    authority: "consumers",
    scopes: ["User.Read", "Files.Read", "Files.Read.All"],
    redirectPath: "/auth",
  },
  graph: {
    childrenEndpoint:
      "https://graph.microsoft.com/v1.0/drives/B2D7A30C38920DE8/items/B2D7A30C38920DE8!134726/children",
    acceptedExt: [".mp4"],
    includeSubfolders: true,
    maxTraversalDepth: 12,
    refreshMs: 5 * 60 * 1000,
  },
  storageKey: "browser-player-ai-state-v1",
};
