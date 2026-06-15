# Sinsin User Flow Source

This folder is the source of truth for mobile app user-flow documentation.

## Principles

- YAML and Markdown are the source, not screenshots or flowchart images.
- Registry files define screens, routes, events, permissions, and APIs before flows reference them.
- `flows/*.flow.yaml` files describe machine-readable paths for AI review and future visualization.
- `docs/*.md` files explain the same flows for product, design, and engineering review.
- Normal paths and exception paths are documented together.

## Structure

```txt
planning/user-flows/
  registry/
    screens.yaml
    routes.yaml
    events.yaml
    permissions.yaml
    apis.yaml
  flows/
    auth.flow.yaml
    onboarding.flow.yaml
    home.flow.yaml
    profile.flow.yaml
    notification.flow.yaml
    error-recovery.flow.yaml
  docs/
    auth.md
    onboarding.md
    home.md
    profile.md
    notification.md
    error-recovery.md
  generated/
    mermaid/
    json/
```

## Current Coverage

- `auth.flow.yaml`: login, social login, signup, email verification, password reset, account-state routing.
- `onboarding.flow.yaml`: CKD status selection, step loading, answer validation, submission, signup profile completion.
- `home.flow.yaml`: home record tab, meal record options, photo/text analysis, diary registration, skip meal, pending analysis notification.
- `profile.flow.yaml`: My Page, profile edit, kidney profile edit, password change, inquiry, withdrawal.
- `notification.flow.yaml`: notification settings, permission request, scheduling, notification history.
- `error-recovery.flow.yaml`: app launch policy gate, session restore, blocked account, unauthenticated access, onboarding redirect, retry paths.

## Validation Checklist

- Every flow has at least one `start` node and one `end` node.
- Every edge `from` and `to` references a node in the same flow.
- Every screen node with `screen` references `registry/screens.yaml`.
- Every route in a flow references `registry/routes.yaml`.
- Every API action references `registry/apis.yaml`.
- Every analytics event references `registry/events.yaml`.
- Every decision node has at least two outgoing edges.
- Every API action has an explicit success and failure path.
- Auth-required screens include unauthenticated handling in either the flow or `error-recovery.flow.yaml`.
- Permission nodes include denied handling.
