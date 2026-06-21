# AgentForge — Expert UI/UX + Marketing Review (2026-06-21)

Full live walkthrough of every page, viewed as a senior product designer with a
marketing/conversion lens. Verdict: the **core surfaces are genuinely good**
(Create wizard, Process Builder canvas, Settings, Security, end‑user portal).
What drags the product down to "looks like an internal tool" is **inconsistency
between pages** and a handful of cheap polish misses — not the individual screens.

Icons across all 6 themes were already fixed in a prior pass (theme‑aware status
colors); this review is everything else.

---

## TIER 1 — Consistency (biggest "is this one product?" impact)

1. **Three different navigation shells.** The app currently wears three different
   chromes:
   - Admin SPA (Dashboard/Agent Hub/Tools/…): **left sidebar**, brand "AgentForge / AI Agent Builder".
   - Process Builder: **top horizontal nav bar**, brand "**Admin Portal**".
   - Lab: **minimal centered header** + "Back to Admin".
   Going admin → builder → lab feels like three separate apps. Pick ONE shell
   (recommend the left sidebar everywhere, or a persistent top bar everywhere) and
   one brand name. "Admin Portal" vs "AgentForge" must be reconciled.

2. **Font inconsistency.** The Lab page renders headings in a different typeface
   (rounded/geometric) than the admin SPA. Standardize one type system across all
   entry pages (index, process-builder, lab, chat).

3. **Stat-card styling differs by page.** Dashboard stat cards (Agents/Tools/Users)
   are plain; Security stat cards are bordered with color-coded numbers. Same
   component, two looks. Pick one stat-card style and reuse it.

---

## TIER 2 — Quick wins (cheap, high polish-per-hour)

4. **Title truncation is far too aggressive.** Examples seen live:
   - Agent Hub: "Employee Expense Reimbursemen…", "Electronics …", "Currency A…"
   - Tools: "**AC…**" (that's "ACME" — unreadable)
   Allow titles to wrap to 2 lines (or widen the clamp + add a hover tooltip).
   Right now names are unusable.

5. **"AgentForge Studio" nav item is mislabeled.** Clicking it just opens the
   **Create-agent wizard** (`#create`) — the same thing as the dashboard "Create AI
   Agent" card and Agent Hub's "+ Create". Rename to "Create", or make Studio a
   real distinct surface. As-is it's confusing and redundant.

6. **"Delete All" is dangerously prominent.** On Tools it's a big red button right
   next to "+ Create Tool". One mis-click nukes everything. Move it into an
   overflow (⋯) menu and/or require a typed confirmation.

7. **ZZ junk test data is visible** (ZZ Redirect, ZZ Capture tools; ZZ test
   departments/roles noted earlier). Clean before any demo.

8. **Duplicate labeling on Tool cards.** Each card shows an uppercase "API" pill
   AND a lowercase "api" tag — same info, two styles. Keep one.

9. **Pale, low-contrast feature tags on Lab** (REST / JSON / AI-Powered, etc.).
   Text sits on tints of its own color and is hard to read. Darken tag text to the
   strong shade of the same hue.

10. **End-user portal placeholders.** Banner reads "Du tech AI Agent Portal" (du
    brand is lowercase "du Tech") and org name shows "**Default Organization**".
    Set the real org name + correct casing — "Default Organization" looks unfinished.

---

## TIER 3 — Marketing / conversion polish

11. **Dashboard hero has no primary CTA button.** The hero states the value prop
    but the main action ("Create an agent") is just one card among six below. Add a
    single prominent "Create your first agent →" button in the hero.

12. **Quick Actions grid is unbalanced.** 6 cards in a 4-then-2 layout leaves two
    empty slots and ragged card heights (the "Create AI Agent" copy is much longer
    than the others). Use a 3×2 grid, equalize copy length, and make the primary
    "Create AI Agent" card visually dominant (it's the money action — it shouldn't
    look identical to "Security").

13. **Stat numbers aren't actionable.** Agents/Tools/Users are static. Make each a
    link to its section, and consider a subtle trend/delta so they feel like a real
    dashboard, not decoration.

14. **Value-prop copy is generic.** "Build, deploy, and manage intelligent AI
    agents that transform how your organization works" could be any SaaS. For an
    enterprise/sovereign-cloud buyer, sharpen to concrete outcomes (no-code, audited
    & secure, time-to-deploy). One sharp sentence beats two vague ones.

15. **Empty states look unfinished.** "No description", "Policies 0" read as gaps.
    Replace with helpful prompts ("Add a description", "No policies yet — create one").

---

## What's already strong (keep as the benchmark)

- **Create-agent wizard:** clear 3-step indicator, two well-differentiated choice
  cards, color-coded capability tags, explicit Selected state. Best screen in the app.
- **Process Builder canvas:** friendly palette grouping, human-readable property
  panel ("How does this process start?" + Tip). Great.
- **Settings:** theme picker with live gradient previews; real Google/Microsoft logos.
- **Security Center:** solid stat row + tabbed structure + clean user table.
- **End-user portal:** polished gradient hero, good empty states, clear two-path
  "Get Started".

---

## Suggested order of attack

1. Unify the nav shell + brand name (Tier 1.1) — single biggest credibility lift.
2. Fix title truncation everywhere (Tier 2.4) — currently breaks usability.
3. Rename / remove "AgentForge Studio" (Tier 2.5).
4. Dashboard hero CTA + 3×2 Quick Actions (Tier 3.11/3.12) — the page buyers see first.
5. Mop up: ZZ data, Delete All, duplicate tags, Lab tag contrast, portal org name.
