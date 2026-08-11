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

## Artwork Visual DNA

Before creating, editing, mapping, or approving any product illustration, read
[`ARTWORK_STYLEGUIDE.md`](./ARTWORK_STYLEGUIDE.md). Its Golden Masters, palette,
isometric geometry, prompt template, negative prompts, and reject gate are
mandatory. Approved artwork marked `DO NOT TOUCH` must remain byte-identical.