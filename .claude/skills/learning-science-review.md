# Skill: Learning Science Review

## When to Use

Activate this skill when the user says **"review the lesson for learning improvements"** or similar phrases like "learning science review", "LSR", "review from a student's perspective", or "check the lesson for improvements". Also activate when the user asks about making a lesson easier to absorb, remember, or recall.

## What This Skill Does

Performs a comprehensive learning-science review of a lesson from the "Learn Qur'an Without Grammar" course, produces a consolidated report, walks the user through each recommendation for approval, then implements the approved changes.

## Phase 1: Review (Sub-Agents)

Ask the user: **"Full review (4 sub-agents) or quick review (single pass)?"**

### Full Review — Launch 4 Sub-Agents in Parallel

Read the lesson file first, then launch **4 sub-agents simultaneously**, each with a different analytical lens. Pass the full lesson content to each sub-agent.

**Sub-Agent 1 — Encoding & Retrieval Specialist**
Focus areas:
- Dual Coding (Paivio) — verbal + visual channels
- Elaborative Interrogation — prompting "why?" questions
- Generation Effect — does the student produce/predict anything?
- Testing Effect / Retrieval Practice — low-stakes recall opportunities
- Desirable Difficulties (Bjork) — productive struggle
- Spaced Repetition — mechanisms for revisiting
- Interleaving — mixing roots in practice vs. blocking
- Concrete Examples & Analogies

**Sub-Agent 2 — Emotional Engagement & Motivation Specialist**
Focus areas:
- Emotional Tagging (McGaugh, Cahill) — leveraging emotionally charged material
- Narrative Transportation (Green & Brock) — story arcs that deepen processing
- Self-Determination Theory (Deci & Ryan) — autonomy, competence, relatedness
- Curiosity Gaps (Loewenstein) — unresolved questions that pull forward
- Protégé Effect — mechanisms to teach others
- Affective Design — tone, warmth, pacing
- Identity Connection — linking to Muslim identity, worship, daily practice
- Cognitive Load & Pacing balance with emotional content

**Sub-Agent 3 — Cognitive Load & Presentation Specialist**
Focus areas:
- Cognitive Load Theory (Sweller) — intrinsic, extraneous, germane load
- Chunking (Miller) — grouping within working memory limits
- Signaling / Cueing (Mayer) — visual highlighting of key elements
- Segmenting Principle (Mayer) — manageable lesson segments
- Multimedia Principles (Mayer) — spatial/temporal contiguity, coherence, redundancy
- Progressive Disclosure — information revealed at the right time
- Scannability & Navigation — visual hierarchy, returning-student access
- Bilingual Processing Load — Arabic script + transliteration + English

**Sub-Agent 4 — Islamic Pedagogy Specialist**
Focus areas:
- Adab of learning — does the lesson cultivate reverence, humility, and intention?
- Connection to ʿibādah — does the learning feel like an act of worship, not just study?
- Tarbiyah (character development) — do the chosen ayahs and hooks nurture the student's relationship with Allah?
- Prophetic teaching methods — storytelling, repetition, questioning, building on the familiar
- Spiritual motivation — does the lesson inspire the student to want more Qur'an, not just more vocabulary?
- Du'ā and dhikr integration — are connections to daily worship practices explicit?
- Community and ummah — does the student feel part of something larger?
- Appropriate handling of sacred text — is the Qur'anic content treated with proper respect and context?

### Each Sub-Agent Prompt Must Include:
1. The agent's specific analytical lens and focus areas (from above)
2. The full lesson content (read the lesson .md file and paste it in)
3. Context: "This is 'Learn Qur'an Without Grammar' — a self-study course for Muslims who want to recognize Qur'anic Arabic by ear. It uses root-word families, anchors from daily prayer (adhān/ṣalāh), and audio immersion. No grammar terminology, no memorization pressure. The student is a beginner with zero Arabic knowledge beyond daily prayers."
4. Request for a structured report with: (a) what the lesson does well, (b) specific improvement ideas with principle + change + reasoning, (c) quick-win suggestions

### Quick Review — Single Pass
If the user chooses quick review, do NOT launch sub-agents. Instead, analyse the lesson yourself using all four lenses combined in a single pass. Produce a similar structured report but in one response.

## Phase 2: Consolidation

After all sub-agents return, produce a **consolidated summary** with:

1. **Consensus strengths** — what multiple agents praised
2. **Top recommendations table** — ranked by how many agents flagged them, with the learning science principle
3. **Quick wins table** — changes under 10 minutes each
4. **"If you only do 3 things" priority list**

## Phase 3: Guided Decision-Making

Walk the user through **each recommendation one by one**, using `AskUserQuestion` with clear options:
- Present the recommendation with its rationale
- Offer choices: "Yes", "Modified version", "Skip", "Defer"
- Record each decision before moving to the next

## Phase 4: Implementation

After all decisions are collected:
1. Create an implementation plan listing all approved changes
2. Present the plan to the user for approval via `ProposePlanToUser`
3. Implement changes to: lesson .md files, CSS, JS, layout files, or new pages as needed
4. Verify the changes don't break existing functionality (especially `lesson-cards.js` which processes `### N ·` headings)
5. Commit and push when the user confirms

## Important Caveats

- **lesson-cards.js compatibility**: The JS collects `<p>` siblings after `### N · form-name` headings until it hits a boundary (HR, H2, H3). Any new content added within a verse card zone must be either: (a) a `<p>` that fits the classification (arabic/english/hook/ref), or (b) placed AFTER the `---` HR boundary. Otherwise the JS will eat it as "extras" and remove it.
- **Kramdown HTML blocks**: Use `<div markdown="0">` when embedding raw HTML (especially `<details>`, `<summary>`, interactive elements). See ADR-004.
- **Arabic text in bold**: The CSS makes all `<strong>` tags render in Amiri font at 1.2em — this affects any bold text, not just Arabic. Be aware when adding bold English text near Arabic.
- **Statelesness**: Each review run is fresh. Don't assume knowledge of previous reviews.
