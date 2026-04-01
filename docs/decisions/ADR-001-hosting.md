# ADR-001: Hosting on GitHub Pages with Jekyll

**Status:** Accepted  
**Date:** 2025-01-01

## Context

The course is a collection of static content: Markdown lesson files, a CSS stylesheet, and audio files. It has no server-side logic, no user accounts, and no database. It needs to be:

- Free to host indefinitely
- Easy to update (a teacher adding lesson files, not a developer deploying infrastructure)
- Accessible on any device without installation
- Able to serve Arabic text and embedded audio reliably

## Decision

Use **GitHub Pages** as the host with **Jekyll** as the static site generator.

- GitHub Pages is free, CDN-backed, and requires zero server configuration.
- Jekyll is GitHub Pages' built-in generator — no CI pipeline or build scripts needed. Push Markdown → site rebuilds automatically.
- A single `default.html` layout handles all pages. No framework, no components, no build toolchain to maintain.
- The entire site lives in one git repository. History, backups, and collaboration are built in.

Deployment workflow: `git add . && git commit && git push` → live in ~1 minute.

## Consequences

**Enables:**
- Free, indefinite hosting
- No deployment infrastructure to maintain
- Any contributor with git access can add lessons
- Full version history of all content

**Constrains:**
- Static only — no server-side personalisation, progress tracking, or search without third-party services
- Jekyll version is pinned to whatever GitHub Pages supports (currently Jekyll 3.x)
- Build time increases as the site grows (still fast at current scale)

**Future migration path:**  
If the site outgrows GitHub Pages (e.g., needs PWA features or a native app), the Markdown lesson files are fully portable. The content does not depend on Jekyll-specific features beyond basic front matter and `relative_url`.
