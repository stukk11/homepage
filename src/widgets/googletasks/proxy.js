import cache from "memory-cache";

import getServiceWidget from "utils/config/service-helpers";
import createLogger from "utils/logger";
import { formatApiCall } from "utils/proxy/api-helpers";
import { httpProxy } from "utils/proxy/http";
import widgets from "widgets/widgets";

const proxyName = "googletasksProxyHandler";
const accessTokenCacheKey = `${proxyName}__accessToken`;
const tokenUrl = "https://oauth2.googleapis.com/token";
const logger = createLogger(proxyName);

async function getAccessToken(widget, cacheKey, forceNew = false) {
  if (!forceNew) {
    const cached = cache.get(cacheKey);
    if (cached) return cached;
  }

  const body = new URLSearchParams({
    client_id: widget.clientId,
    client_secret: widget.clientSecret,
    refresh_token: widget.refreshToken,
    grant_type: "refresh_token",
  }).toString();

  const [status, , data] = await httpProxy(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (status !== 200) {
    logger.error("Google OAuth token refresh failed with status %d: %s", status, data);
    return null;
  }

  try {
    const { access_token: accessToken, expires_in: expiresIn } = JSON.parse(data.toString());
    if (!accessToken) return null;

    // refresh a minute before Google expires the token
    cache.put(cacheKey, accessToken, Math.max((expiresIn ?? 3600) - 60, 60) * 1000);
    return accessToken;
  } catch (e) {
    logger.error("Unable to parse Google OAuth token response: %s", e);
  }

  return null;
}

async function apiCall(widget, endpoint, cacheKey) {
  const url = new URL(formatApiCall(widgets[widget.type].api, { ...widget, endpoint }));
  const request = async (accessToken) =>
    httpProxy(url, {
      method: "GET",
      headers: { accept: "application/json", Authorization: `Bearer ${accessToken}` },
    });

  let accessToken = await getAccessToken(widget, cacheKey);
  if (!accessToken) return { status: 401, data: null };

  let [status, , data] = await request(accessToken);

  if (status === 401) {
    logger.debug("Google Tasks API rejected the request, attempting to obtain a new access token");
    cache.del(cacheKey);
    accessToken = await getAccessToken(widget, cacheKey, true);
    if (!accessToken) return { status, data: null };
    [status, , data] = await request(accessToken);
  }

  if (status !== 200) {
    logger.error("Error getting data from Google Tasks: %s status %d. Data: %s", url, status, data);
    return { status, data: null };
  }

  try {
    return { status, data: JSON.parse(data.toString()) };
  } catch (e) {
    logger.error("Error parsing Google Tasks response: %s", e);
  }

  return { status: 500, data: null };
}

export default async function googletasksProxyHandler(req, res) {
  const { group, service, index } = req.query;

  if (!group || !service) {
    logger.debug("Invalid or missing service '%s' or group '%s'", service, group);
    return res.status(400).json({ error: "Invalid proxy service type" });
  }

  const widget = await getServiceWidget(group, service, index);

  if (!widget) {
    logger.debug("Invalid or missing widget for service '%s' in group '%s'", service, group);
    return res.status(400).json({ error: "Invalid proxy service type" });
  }

  if (!widget.clientId || !widget.clientSecret || !widget.refreshToken) {
    logger.debug("Missing credentials for Google Tasks widget in service '%s'", service);
    return res.status(400).json({ error: "Missing Google Tasks credentials" });
  }

  const cacheKey = `${accessTokenCacheKey}.${group}.${service}.${index ?? 0}`;
  const taskList = encodeURIComponent(widget.taskList ?? "@default");
  const tasks = await apiCall(
    widget,
    `lists/${taskList}/tasks?showCompleted=false&showHidden=false&maxResults=100`,
    cacheKey,
  );

  if (!tasks.data) {
    return res.status(tasks.status).json({ error: "Error fetching Google Tasks" });
  }

  return res.status(200).json({
    tasks: (tasks.data.items ?? [])
      .filter((task) => task.status !== "completed" && task.title)
      .map((task) => ({
        id: task.id,
        title: task.title,
        notes: task.notes ?? null,
        // Google stores only the date part of a due date, as midnight UTC
        due: task.due ? task.due.slice(0, 10) : null,
        position: task.position ?? "",
      })),
  });
}
