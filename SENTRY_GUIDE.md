# Sentry CLI Integration Guide for Agents

This document details how agents can access Sentry to check live production issues, query unresolved errors, and inspect specific events using the Sentry CLI.

---

## 1. Environment Configuration

The Sentry CLI relies on environment variables defined in the `.env` file (and documented in `.env.example`). Agents should expect the following variables to be available:

```env
SENTRY_ORG=the-comprehensive-solution
SENTRY_PROJECT_CLIENT=vexea-frontend
SENTRY_PROJECT_SERVER=vexea-server
SENTRY_AUTH_TOKEN=your_sentry_auth_token_here
```

---

## 2. Querying Live Sentry Issues

To interact with Sentry, use the locally available Sentry CLI through `npx @sentry/cli`. Always specify the `--org` parameter explicitly.

### Listing All Issues
To list recent issues for the client project:
```bash
npx @sentry/cli issues list --org the-comprehensive-solution -p vexea-frontend
```

To list issues for the server project:
```bash
npx @sentry/cli issues list --org the-comprehensive-solution -p vexea-server
```

### Filtering for Unresolved Issues
To inspect only active/unresolved issues, append the `--query "is:unresolved"` argument:
```bash
npx @sentry/cli issues list --org the-comprehensive-solution -p vexea-frontend --query "is:unresolved"
```

---

## 3. Querying Sentry Events

Sometimes issues list broad titles, but inspecting recent events shows the detailed logs or exact error occurrences.

### Listing Recent Events
To list the most recent events (including exact timestamps and titles) capped at a clean row count:
```bash
npx @sentry/cli events list --org the-comprehensive-solution -p vexea-frontend --pages 1 --max-rows 10
```

---

## 4. Troubleshooting / Connection Verification

To verify that the configuration is valid and the authentication token can access Sentry:
```bash
npx @sentry/cli info
```
This will print information about the active token scope, organization, and project.
