<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Agent Skills & Operational Rules

You MUST strictly adhere to the following execution workflow for all tasks:

1. **Coding & Refactoring (`karpathy-guidelines`):**
   - **MANDATORY for all code creation, refactoring, or bug fixes.**
   - Touch only what is necessary (surgical changes), keep implementations as simple as possible, surface assumptions before coding, and define verifiable success criteria.

2. **Planning & Feature Design (`grill-me`):**
   - **MANDATORY before starting any new feature, architectural change, or task planning.**
   - Do NOT write code immediately when a new idea or feature is presented. First, invoke `grill-me` to stress-test assumptions, ask critical questions, and challenge edge cases until the architecture is 100% bulletproof.

3. **Session Continuation (`handoff`):**
   - **Manual execution only.** Invoke this skill when the user explicitly requests a handoff or types `@handoff`. Compact the current session into a handoff document for a fresh session.

4. **Skill Discovery (`find-skills`):**
   - Use during task triage whenever a specialized workflow may exist but is not already covered by an available project skill.

5. **React Quality (`react-best-practices`):**
   - **MANDATORY for all React code creation, review, refactoring, and performance work in this project.**

## Product detail viewport and gallery rules

- On desktop (width >= 1024px), the complete product detail must fit inside the viewport: site header, product heading, gallery/illustration, all configuration fields, prices, and action buttons. Neither the page nor the configuration panel may require vertical scrolling. Do not achieve this by clipping controls or hiding required information; use compact responsive layout. Keep normal document scrolling on mobile.
- Verify every product category at 1366x768 and 1024x600, including the additional plank modes and unavailable variants. Account for the site header and maintain visible space above the product heading.
- Desktop product details use a focused viewport layout without the site footer; other pages and mobile details retain the footer.
- The gallery and visualization must retain matching container dimensions. Illustrations use bounded height and contain sizing.
- The lightbox is a centered white window, approximately 65% of the desktop viewport, with blurred surroundings, brown controls with strong hover feedback, and no visible image counter. Closing it preserves the last viewed image in the gallery.
