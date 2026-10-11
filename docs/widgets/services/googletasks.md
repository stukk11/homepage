---
title: Google Tasks
description: Google Tasks Widget Configuration
---

Learn more about [Google Tasks](https://support.google.com/tasks).

Shows the number of open, due today and overdue tasks in one Google Tasks list.

Allowed fields: `["open", "dueToday", "overdue"]`. The counts can be hidden altogether with `enableBlocks: false`.

A list of the next 10 tasks ordered by due date, with their notes, is disabled by default, but can be enabled with the `enableTaskList` option. Due dates within a week are shown relative to today, later ones as a date (`dd.mm.yyyy`).

The Google Tasks API only supports OAuth, so the widget needs an OAuth client and a refresh token:

1. In the [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the **Google Tasks API**.
2. Configure the OAuth consent screen (user type _External_) and add yourself as a test user. Then **publish the app**: refresh tokens for apps left in _Testing_ expire after 7 days.
3. Create an **OAuth client ID** of type _Web application_ with `https://developers.google.com/oauthplayground` as an authorized redirect URI, and note the client ID and secret.
4. In the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/), open the settings, tick _Use your own OAuth credentials_ and enter the client ID and secret. Authorize the `https://www.googleapis.com/auth/tasks.readonly` scope, then exchange the authorization code for tokens and copy the refresh token.

`taskList` is the ID of the list to show and defaults to `@default`, your first list. List IDs are returned by the [tasklists.list](https://developers.google.com/workspace/tasks/reference/rest/v1/tasklists/list) API.

```yaml
widget:
  type: googletasks
  clientId: your-client-id.apps.googleusercontent.com
  clientSecret: your-client-secret
  refreshToken: your-refresh-token
  taskList: "@default" # optional, defaults to @default
  enableBlocks: true # optional, defaults to true
  enableTaskList: true # optional, defaults to false
```
