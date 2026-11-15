---
name: concise-ui-copy
description: Keeps UI text short and scannable. Use whenever creating or editing pages, dashboards, cards, briefings or any user-facing text in the frontend.
---

# Concise UI copy

## Rules
- No paragraphs in the UI. Max 2 lines per text block.
- Card = title (max 4 words) + one key number + one status badge + optional 1-line hint (max 80 chars).
- Never repeat the same sentence on several cards. If modules share a message, aggregate it once
  (e.g. "4 modules above 4 mmHg" instead of 4 identical sentences).
- Put explanations, formulas and sources into an info tooltip or a collapsed "Details" section.
  Collapsed by default.
- Briefing: max 3 short bullets for the immediate horizon, 1 line for the prolonged horizon,
  max 2 actions, each max 12 words.
- Prefer number + icon + color over sentences. Chart caption: max 1 line.
- Data provenance (REAL / SIM / ASSUMPTION) = small badge, not a sentence.
- No intros, no helper text, no marketing copy, no placeholder text.
- Before finishing, scan every changed page: if a block is longer than 2 lines, shorten it or move it into a tooltip.