# Hakai

Hakai is an experimental full-stack web framework built on [Deno](https://deno.com). Its goals, described in
[`docs/hakai.md`](docs/hakai.md), are:

- **Scopes**: an app is split into `scopes/` (for example `auth`, `dashboard`). Pages, components and stores live in a
  scope and are only available within it, which keeps code colocated and concerns separated.
- **Declarative pages**: pages and components are `.kai` files with a `<template>`, a `<script>` and a `<style>`
  section. State is meant to be described declaratively rather than assigned imperatively.
- **Built on Deno**: Hakai is written in TypeScript and runs on Deno.

`docs/hakai.md` describes the intended design. Much of it is not implemented yet (see [Status](#status)).

## Workspace layout

This repository is a Deno workspace (see [`deno.json`](deno.json)):

| Folder      | Package           | Contents                                                                                         |
| ----------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| `cli/`      | `@hakai/cli`      | The `hakai` command: `create` and `serve` (dev server with hot reload, see `cli/serve/hmr/`).    |
| `core/`     | `@hakai/core`     | The API imported by apps: `hakaiConfig()` and a placeholder `state()`.                           |
| `internal/` | `@hakai/internal` | Code shared by the CLI: the `.kai` compiler, build checks, config loading and utilities.         |
| `sandbox/`  | —                 | A sketch of an example app (`sandbox/finish`). It is not part of the workspace and does not run. |

## Try it

1. [Install Deno](https://docs.deno.com/runtime/getting_started/installation/).
2. Clone this repository and create an app next to it:

   ```sh
   git clone https://github.com/KevTale/hakai.git
   deno run -A hakai/cli/main.ts create --name my-app
   ```

   This runs `hakai create`, which generates:

   ```
   my-app/
       scopes/
           home/
               home.page.kai
       deno.json
       favicon.ico
       hakai.config.ts
   ```

3. Start the dev server from the app folder:

   ```sh
   cd my-app
   deno run -A ../hakai/cli/main.ts serve
   ```

   This runs `hakai serve`, which serves the app at <http://localhost:8000>. Use this command rather than the `serve`
   task in the generated `deno.json`, which points to a script that does not exist.

### What `hakai serve` does today

- Checks that page names are unique across all scopes.
- Serves `/` with the root page set in `hakai.config.ts` (`root.scope` and `root.page`).
- Maps nested URLs to pages in the same scope: `/reports/sales` renders `reports.page.kai`, with
  `reports_sales.page.kai` inserted at its `<Slot />`.
- Replaces capitalised tags such as `<Widget />` with `widget.component.kai`, looked up in the page's scope first and
  then in `design-system/components/`.
- Replaces `{{ name }}` in the template with the value of `const name = ...` from `<script>`. Only literal strings,
  numbers, booleans and `null` are supported.
- Watches `scopes/` and pushes updates to open browser tabs over a WebSocket. Errors are shown in an overlay.

## Status

Hakai is at an early, experimental stage (version 0.0.6) and is not ready for real apps. Not implemented yet: reactivity
(`state()` is a placeholder), page styles (`<style>` is parsed but not applied), stores, the `build` command, and the
`--tailwind` option of `create`, which has no effect. See [`docs/todos.md`](docs/todos.md) for the roadmap and progress.
