import { beforeEach, describe, expect, it, vi } from "vitest";

import createMockRes from "test-utils/create-mock-res";

const { httpProxy, getServiceWidget, cache, logger } = vi.hoisted(() => {
  const store = new Map();

  return {
    httpProxy: vi.fn(),
    getServiceWidget: vi.fn(),
    cache: {
      get: vi.fn((k) => store.get(k)),
      put: vi.fn((k, v) => store.set(k, v)),
      del: vi.fn((k) => store.delete(k)),
      _reset: () => store.clear(),
    },
    logger: {
      debug: vi.fn(),
      error: vi.fn(),
    },
  };
});

vi.mock("utils/logger", () => ({
  default: () => logger,
}));
vi.mock("utils/config/service-helpers", () => ({
  default: getServiceWidget,
}));
vi.mock("utils/proxy/http", () => ({
  httpProxy,
}));
vi.mock("memory-cache", () => ({
  default: cache,
  ...cache,
}));
vi.mock("widgets/widgets", () => ({
  default: { googletasks: { api: "https://tasks.googleapis.com/tasks/v1/{endpoint}" } },
}));

import googletasksProxyHandler from "./proxy";

const credentials = { type: "googletasks", clientId: "id", clientSecret: "secret", refreshToken: "refresh" };
const tokenResponse = (token) => [
  200,
  "application/json",
  Buffer.from(JSON.stringify({ access_token: token, expires_in: 3599 })),
];
const tasksResponse = [
  200,
  "application/json",
  Buffer.from(
    JSON.stringify({
      items: [
        {
          id: "1",
          title: "Pay bills",
          notes: "Electricity",
          status: "needsAction",
          due: "2020-01-02T00:00:00.000Z",
          position: "001",
        },
        { id: "2", title: "Water plants", status: "needsAction", position: "002" },
        { id: "3", title: "Done already", status: "completed", position: "003" },
        { id: "4", title: "", status: "needsAction", position: "004" },
      ],
    }),
  ),
];

describe("widgets/googletasks/proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cache._reset();
  });

  it("returns 400 when credentials are missing", async () => {
    getServiceWidget.mockResolvedValue({ type: "googletasks", clientId: "id" });

    const res = createMockRes();
    await googletasksProxyHandler({ query: { group: "g", service: "svc", index: "0" } }, res);

    expect(httpProxy).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it("refreshes the access token and returns open tasks of the default list", async () => {
    getServiceWidget.mockResolvedValue(credentials);
    httpProxy.mockResolvedValueOnce(tokenResponse("tok")).mockResolvedValueOnce(tasksResponse);

    const res = createMockRes();
    await googletasksProxyHandler({ query: { group: "g", service: "svc", index: "0" } }, res);

    expect(httpProxy.mock.calls[0][0]).toBe("https://oauth2.googleapis.com/token");
    expect(httpProxy.mock.calls[0][1].body).toContain("grant_type=refresh_token");
    expect(httpProxy.mock.calls[1][0].toString()).toContain("/lists/%40default/tasks?showCompleted=false");
    expect(httpProxy.mock.calls[1][1].headers.Authorization).toBe("Bearer tok");
    expect(res.statusCode).toBe(200);
    expect(res.body.tasks).toEqual([
      { id: "1", title: "Pay bills", notes: "Electricity", due: "2020-01-02", position: "001" },
      { id: "2", title: "Water plants", notes: null, due: null, position: "002" },
    ]);
  });

  it("reuses a cached token and refreshes it once when Google rejects it", async () => {
    getServiceWidget.mockResolvedValue({ ...credentials, taskList: "abc" });
    cache.put("googletasksProxyHandler__accessToken.g.svc.0", "stale");
    httpProxy
      .mockResolvedValueOnce([401, "application/json", Buffer.from("{}")])
      .mockResolvedValueOnce(tokenResponse("fresh"))
      .mockResolvedValueOnce(tasksResponse);

    const res = createMockRes();
    await googletasksProxyHandler({ query: { group: "g", service: "svc", index: "0" } }, res);

    expect(httpProxy).toHaveBeenCalledTimes(3);
    expect(httpProxy.mock.calls[0][1].headers.Authorization).toBe("Bearer stale");
    expect(httpProxy.mock.calls[2][0].toString()).toContain("/lists/abc/tasks");
    expect(httpProxy.mock.calls[2][1].headers.Authorization).toBe("Bearer fresh");
    expect(res.statusCode).toBe(200);
  });

  it("returns an error when the token refresh fails", async () => {
    getServiceWidget.mockResolvedValue(credentials);
    httpProxy.mockResolvedValueOnce([400, "application/json", Buffer.from('{"error":"invalid_grant"}')]);

    const res = createMockRes();
    await googletasksProxyHandler({ query: { group: "g", service: "svc", index: "0" } }, res);

    expect(httpProxy).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe("Error fetching Google Tasks");
  });
});
