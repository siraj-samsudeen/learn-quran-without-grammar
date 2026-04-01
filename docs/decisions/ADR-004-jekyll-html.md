# ADR-004: Using `markdown="0"` for HTML Blocks in Kramdown

**Status:** Accepted  
**Date:** 2025-01-01

## Context

Lesson pages and the home page use custom HTML elements inside Markdown files — specifically `<div>` blocks for lesson cards and audio labels:

```html
<div class="lesson-card" onclick="location.href='...';">
<div class="lesson-card-title"><a href="...">Lesson 1 — Title</a></div>
<div class="lesson-card-arabic">اللَّهُ أَكْبَرُ</div>
<div class="lesson-card-meta">Root · Theme · Anchor</div>
</div>
```

Jekyll uses **Kramdown** as its Markdown processor (configured via `_config.yml`). Kramdown has a feature — and a footgun — called `parse_block_html`:

- With `parse_block_html: true` (our setting): Kramdown processes the *contents* of HTML blocks as Markdown by default
- This means Kramdown can reformat or break Arabic text, strip attributes, or mangle nested HTML
- The specific failure mode: Arabic text inside a div gets wrapped in `<p>` tags incorrectly, breaking RTL layout

## Decision

Add `markdown="0"` to any HTML wrapper div that contains content we do not want Kramdown to touch:

```html
<div class="lesson-card" markdown="0" onclick="...">
```

This is Kramdown's explicit opt-out — "do not process the contents of this element as Markdown."

We set `parse_block_html: true` globally (in `_config.yml`) so that *some* HTML blocks can use Markdown inside them (e.g., a div wrapping a paragraph). The `markdown="0"` attribute is added only where needed.

## Consequences

**Enables:**
- Arabic text and nested HTML render exactly as written
- Lesson cards display correctly without unexpected formatting
- Mix of Markdown-processed and raw-HTML blocks in the same file

**Constrains:**
- Every new HTML block containing Arabic text or complex nested structure needs `markdown="0"` explicitly — easy to forget
- The attribute is Kramdown-specific; it would need to be removed if switching to a different Markdown processor

**Checklist for new HTML blocks:**  
If a div contains Arabic text, audio elements, or more than one level of nesting → add `markdown="0"`. If a div contains only plain prose → `markdown="0"` is optional but harmless to add.
