# Vendored data sources

These files are vendored verbatim from upstream and are redistributed here only as inputs to `tools/build-root-inventory.py`. None of them are modified in place; any derived files live elsewhere in the repo (primarily under `docs/roots/`).

See [ADR-009](../../docs/decisions/ADR-009-local-root-pipeline.md) for rationale.

## quran-morphology.txt

- **Source:** [mustafa0x/quran-morphology](https://github.com/mustafa0x/quran-morphology)
- **Upstream author:** Kais Dukes, *Quranic Arabic Corpus*, version 0.4 (2011), [corpus.quran.com](https://corpus.quran.com)
- **Mustafa0x derivative:** pre-converts Buckwalter ASCII to Arabic Unicode; root and lemma fields are stored in Arabic script.
- **License:** GNU General Public License. The upstream header states "Permission is granted to copy and distribute verbatim copies of this file, but CHANGING IT IS NOT ALLOWED." We redistribute it verbatim; our derivative JSONs under `docs/roots/` are independent works built from the data, not modifications of the file itself.
- **Last fetched:** 2026-04-11

## quran-uthmani.txt

- **Source:** [Tanzil.net](https://tanzil.net/download/)
- **Variant:** full Uthmani text (`quranType=uthmani`, `marks=true`, `sajdah=true`)
- **License:** Tanzil.net terms permit redistribution of verbatim copies for non-commercial use with attribution. See `https://tanzil.net/docs/home` for current terms.
- **Last fetched:** 2026-04-11

## quran-trans-en-sahih.txt

- **Source:** [Tanzil.net translations](https://tanzil.net/trans/) — file `en.sahih`
- **Upstream translator:** Saheeh International
- **Role:** draft English translations used to pre-fill the `translation` field in candidate verse entries. These are **not** final translations — every selected verse gets a teacher-paraphrased translation per the style guide in `docs/LESSON-PLAN.md` before it lands in a lesson.
- **License:** Tanzil.net translation-mirror terms (non-commercial, verbatim).
- **Last fetched:** 2026-04-11
