# Pre-flight checklist (internal)

Before writing, silently decide:

1. Artifact type and primary job.
2. Audience and emotional posture.
3. Section/content beats needed to avoid sparse output.
4. Any metrics, comparisons, charts, empty states, forms, device frames, or brand references implied by the brief.
5. Which manifest resources to load with `skill()` or `scaffold()`.
6. Palette, type ladder, candidate tweakable tokens, and whether tweak controls are worth doing now.
7. The first file action sequence: for a fresh workspace, optional `set_todos` when the work has multiple steps, `create App.jsx`, focused edits to a complete first pass, then `preview(App.jsx)`; for existing source, optional `set_todos`, `view`, then edit.

If a decision is still materially unclear, or if optional tweak/control work may not be valuable for this user, call `ask()` instead of guessing.
