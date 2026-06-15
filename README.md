# Flowable React Portal

A demonstration React application showing how to embed **Flowable Forms** inside a React SPA and drive the Flowable Platform REST API from a modern frontend stack.

## Purpose

This app acts as a lightweight work portal that lets users:

- Browse **apps** (grouped collections of processes and cases) exposed by a Flowable Platform instance
- Launch **start forms** for processes and cases using the `@flowable/forms` React renderer
- Submit form payloads to create process or case instances, with variables flowing through correctly
- Monitor **open tasks** assigned to the current user and open their task forms

It was built as a reference implementation for teams who want to embed Flowable's form engine in a custom React UI rather than using the standard Flowable Work application.

## Highlights

### `@flowable/forms` embedding

The `FlwForm` component (`src/components/FlwForm.tsx`) lazy-loads `@flowable/forms/index-complete.js` and calls its imperative `render(element, props)` API, which mounts a self-contained React form inside a plain `<div>`. This approach keeps the forms library out of the main bundle and avoids React version conflicts.

Key callbacks wired in `AppModal`:

| Callback | Purpose |
|---|---|
| `onOutcomePressed(payload, outcome)` | Receives the submitted form payload and outcome value; used to POST the start request |
| `onChange(payload)` | Tracks the latest form state in a ref as a fallback for rapid submissions |

### App launcher modal

Selecting an app opens a modal gallery (`src/components/AppModal.tsx`) that:

1. Fetches the start form for the selected process or case definition
2. Renders it with `@flowable/forms` if a form exists; otherwise starts immediately
3. POSTs the combined form payload + `initiator` variable to the appropriate create endpoint on submit
4. Includes a live search bar to filter items within a large app

### Navigation and task list

`src/components/Menu.tsx` maintains a collapsible, searchable app list and a task list that polls every 10 seconds. Completing or starting work triggers an immediate refresh via a lightweight pub/sub context (`MenuRefreshContext`).

## Flowable Platform APIs used

| Endpoint | Method | Purpose |
|---|---|---|
| `/platform-api/work-definitions` | GET | Load all apps, processes, and cases |
| `/platform-api/process-definitions/{id}/start-form` | GET | Fetch start form for a process |
| `/platform-api/case-definitions/{id}/start-form` | GET | Fetch start form for a case |
| `/platform-api/process-instances` | POST | Create a process instance (with form payload) |
| `/platform-api/case-instances` | POST | Create a case instance (with form payload) |
| `/platform-api/search/tasks?filterId=open` | GET | List open tasks for the current user |
| `/platform-api/tasks/{id}` | GET | Load task header details |
| `/platform-api/tasks/{id}/form` | GET | Fetch task form |
| `/platform-api/tasks/{id}/action` | POST | Complete a task (with form payload) |

All requests use HTTP Basic authentication. The auth header is centralised in `src/api/client.ts`.

## Tech stack

| | |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 6 |
| Routing | React Router v7 |
| Forms | `@flowable/forms` 2025.2.x |
| Proxy | Vite dev-server proxy → Flowable Platform at `localhost:8090` |

## Getting started

```bash
yarn install
yarn dev        # starts on http://localhost:5173
```

Requires a running Flowable Platform instance at `http://localhost:8090`. The Basic auth credentials are set in `src/api/client.ts`.
