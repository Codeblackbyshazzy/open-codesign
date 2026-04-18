# Project Consensus

The single source of truth for what we agreed on, what is shipped, what is open, and how a new contributor (human or AI) gets going.

Last updated: 2026-04-18

---

## 1. Product north star

open-codesign is a **desktop AI design tool**. The user types a prompt, the app produces an HTML / PDF / PPTX / asset bundle. It is the open-source counterpart to Anthropic's [Claude Design](https://www.anthropic.com/news/claude-design-anthropic-labs).

- Form factor: **Electron desktop** (Mac / Win / Linux)
- Model layer: **`@mariozechner/pi-ai`** (multi-provider — Anthropic, OpenAI, Gemini, OpenRouter, DeepSeek, Ollama, …)
- Auth: **BYOK only** (no proxy, no cloud account)
- Storage: **local-first** (SQLite + TOML config)
- Design language: **aligned with [open-cowork](https://github.com/OpenCoworkAI/open-cowork)** (warm beige Claude-style)
- License: **Apache-2.0**

The full vision is in [`docs/VISION.md`](./docs/VISION.md). The eight killer demos we committed to replicate are listed there.

---

## 2. Hard constraints (non-negotiable, every PR is checked)

1. Install size **≤ 80 MB**
2. Prod dep count **≤ 30**
3. **No bundled model runtimes** (no Ollama / Python / browser binaries)
4. **Apache-2.0 compatible deps only** (reject GPL / AGPL / SSPL / proprietary)
5. **Lazy-load every heavy feature** (PPTX, web capture, codebase scan, …)
6. **No silent fallbacks** — errors throw with a structured `code` and surface in UI
7. **All UI uses `packages/ui` tokens** — no hardcoded colors / fonts / px
8. **Schema-version everything that lives on disk** (config, SQLite, IPC, exports)
9. **`§5b`**: every PR description marks ✅ on Compatible / Upgradeable / No-bloat / Elegant
10. **DCO sign-off** on every commit (`git commit -s`)

Full text: [`docs/PRINCIPLES.md`](./docs/PRINCIPLES.md).

---

## 3. Locked technical stack

| Layer | Choice | Why |
|---|---|---|
| Package manager | pnpm + Turborepo | Workspaces + cache |
| Lint + format | Biome (single tool) | Replaces ESLint + Prettier |
| TypeScript | strict, `verbatimModuleSyntax`, `noUncheckedIndexedAccess` | No `any`, bracket notation for index access |
| Tests | Vitest unit + Playwright E2E | Mock at `core` boundary, never SDK level |
| Versioning | Changesets | Don't hand-edit `CHANGELOG.md` |
| Node | 22 LTS (`.nvmrc`) | |
| UI framework | React 19 + Vite 6 | Matches what AI generates natively |
| Styles | Tailwind v4 + CSS variables | Tokens in `packages/ui/src/tokens.css` |
| State | Zustand | Don't introduce Redux / MobX |
| Components | Radix primitives + custom shadcn-style | Lucide icons only |
| Sandbox renderer | Electron iframe `srcdoc` + esbuild-wasm + import maps | Chosen over Sandpack / WebContainers in [research/03](./docs/research/03-sandbox-runtime.md) |
| PPTX export | `pptxgenjs` + `dom-to-pptx` (Tier 2) — Tier 1 is text-only | [research/04](./docs/research/04-pptx-export.md) |
| Electron | latest stable, **NOT 41.x** (cross-origin isolation regression) | |
| Persistent storage | `better-sqlite3` for history; TOML for config (no electron-store blob) | |
| Credential storage | Electron `safeStorage` → `~/.config/open-codesign/config.toml` | |
| i18n | `i18next` + `react-i18next` (en + zh-CN) — landing in #2 | |

---

## 4. Repository layout

```
apps/
  desktop/                 Electron shell (main + preload + renderer)
packages/
  core/                    Generation orchestration (prompt → artifact)
  providers/               pi-ai wrapper + missing-capability layer
  runtime/                 Sandbox iframe + overlay script
  ui/                      Design tokens + Wordmark + base components
  artifacts/               Streaming <artifact> tag parser + zod schemas
  exporters/               HTML (live), PDF/PPTX/ZIP (stubbed in main)
  templates/               Built-in demo prompts + system prompts
  shared/                  Types, zod schemas (ChatMessage, ModelRef, etc.)
  i18n/                    en + zh-CN translations (landing in #2)
website/                   VitePress marketing site (en + zh)
docs/
  VISION.md
  PRINCIPLES.md
  ARCHITECTURE.md
  ROADMAP.md
  COLLABORATION.md
  DIFFERENTIATION.md
  RESEARCH_QUEUE.md        Index of all research reports
  research/                01-09: Claude Design teardown, sandbox, PPTX, pi-ai, onboarding UX, …
examples/                  Reproductions of the eight Claude Design demos
.github/
  workflows/               CI / Release / CodeQL / Scorecard / Codex bot / Dep review
  prompts/                 Bot prompts (PR review, issue auto-response)
```

Detailed package boundaries: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## 5. Current state — what is on `main`

✅ Merged:
- **#1 Onboarding wizard** (3 steps: Welcome / Paste-with-auto-detect / Choose Model) + `safeStorage` keychain + IPC + zod-validated payload
- **#4 First demo wiring** (system prompt extracted to `packages/templates/src/system/`, real HTML exporter, PreviewToolbar, exporter IPC, `dialog.showSaveDialog`)
- **#5 Marketing website** (VitePress + Tailwind v4 + en/zh + llms.txt + GitHub Pages deploy workflow)
- **UIUX iteration v1** (4 commits: Wordmark component, EmptyMark SVG, full token scale — text/leading/tracking/space/motion + warm shadows + global focus-visible)
- **Preload path fix** (electron-vite outputs `.mjs`, main process now loads it correctly)

🔧 PRs open with conflicts (need manual resolution before merge):
- **#2 i18n** — adds `packages/i18n`, refactors `BUILTIN_DEMOS` to per-locale, locale IPC. Conflicts with onboarding and first-demo on `App.tsx`, `store.ts`, `main/index.ts`, `preload/index.ts`
- **#3 preview-ux** — Settings overlay (4 tabs), command palette (Cmd+K), Toast, Sidebar/PreviewPane/TopBar extraction, theme toggle. Conflicts on `App.tsx`, `store.ts`
- **#6 reliability** — error boundaries, AbortController cancellation, retry with exponential backoff + 429 handling, iframe error reporting + overlay defense. Conflicts on `App.tsx`, `store.ts`, `core/index.ts`, `providers/index.ts`
- **#7 exporters** — real PDF (puppeteer-core + system Chrome), real PPTX (pptxgenjs + CJK fix), real ZIP (zip-lib). Stacked on #4. Conflicts on `package.json`, `PreviewToolbar.tsx`

🤖 Background agents — none currently running.

---

## 6. The pilot demo — what works today

Set up:
```bash
git clone git@github.com:OpenCoworkAI/open-codesign.git
cd open-codesign
pnpm install
pnpm --filter @open-codesign/desktop dev
```

Walk-through:
1. App launches, shows the **Welcome** step of the onboarding wizard
2. Click **Use my API key**, paste a real key (`sk-ant-…` for Anthropic, `sk-…` for OpenAI, `sk-or-…` for OpenRouter)
3. The provider is auto-detected, the key is validated against `/v1/models`, the OS keychain stores the encrypted blob
4. Step 3 picks default models (primary + fast)
5. The chat shell appears with four starter chips
6. Click any starter → press **Send** → the model streams an HTML artifact → it renders in the right pane
7. Click **Export ▾ → HTML** → save anywhere → opens in browser
8. **PDF / PPTX / ZIP** show as "Coming in Phase 2" until #7 lands

Dev shortcut: `VITE_OPEN_CODESIGN_DEV_KEY=sk-ant-… pnpm dev` to skip onboarding and go straight to the chat.

---

## 7. How to add a feature (the workflow)

For a non-trivial change, follow [`docs/COLLABORATION.md`](./docs/COLLABORATION.md). Short version:

1. **Open an Issue or Discussion first** if it isn't obvious.
2. **Research first**: if the answer isn't already in `docs/research/`, write a short report and add a row to `RESEARCH_QUEUE.md`.
3. **Plan**: for > 5 tool calls or > 3 files, drop a plan in `.claude/workspace/<slug>/task_plan.md`.
4. **Worktree**: `git worktree add -b wt/<slug> .claude/worktrees/<slug> main` (gitignored).
5. **Tier 1 only** — ship the simplest version that works (PRINCIPLES §5).
6. **Run** `pnpm install && pnpm -r typecheck && pnpm lint && pnpm -r test` before pushing.
7. **PR with the standard template**, signed (`git commit -s`).
8. **Squash merge** to main after CI green and one human review.
9. **Clean up** the worktree and delete the branch.

Currently we are pre-alpha and solo, so we **squash-merge directly without external review** as soon as CI is green. Once we have outside contributors we restore the review gate.

---

## 8. CI / GitHub setup

- **CI** (`.github/workflows/ci.yml`): matrix Mac / Win / Linux. Runs lint, typecheck, test. DCO check separately.
- **Release** (`.github/workflows/release.yml`): only opens Changesets Version PRs. No publish or signing yet (that needs notarization certs).
- **CodeQL / Scorecard / Dependency Review**: gated on `repo.visibility == 'public'`. Skipped while private.
- **Codex bot PR review** + **issue auto-response**: gated on `vars.CODEX_BOT_ENABLED == 'true'`. To enable, set the var and add `OPENAI_API_KEY` + `OPENAI_BASE_URL` secrets.
- **Renovate**: weekly grouped non-major updates; pi-ai pinned via group rule; **Electron 41.x explicitly excluded**.
- **GitHub topics**: 20 set, including `ai-design`, `claude-design`, `byok`, `local-first`, `multi-model`, …

---

## 9. Known gotchas (read before debugging)

- **Preload path**: electron-vite outputs `out/preload/index.mjs`, NOT `.js`. The main process loads `index.mjs` and Electron 33+ supports it natively. (Fixed in `49985a9` follow-up.)
- **pi-ai is single-maintainer** (`badlogic/pi-mono`, ~36k stars but bus-factor 1). Pin the version, never amend their library, wrap missing capabilities in `packages/providers`.
- **Electron 41.x has a cross-origin isolation regression**. Renovate excludes it; do not bypass.
- **`useLiteralKeys` Biome rule is OFF** — it conflicts with TS `noPropertyAccessFromIndexSignature` (we use bracket notation for env / config / record access).
- **Tailwind v4 arbitrary length values**: use `text-[length:var(--text-xl)]`, not `text-[var(--text-xl)]` — the latter is treated as ambiguous and silently ignored.
- **Squash-merge can leave conflict markers** if a rebase is partially done before the merge. Always grep for `<<<<<<<` after a merge to be safe.
- **The `.gitignore` itself was once in conflict** (`.gitignore.add` artifact). If you see it, just `git checkout --ours .gitignore && rm -f .gitignore.add`.

---

## 10. Open research items / things we deliberately don't know yet

- **No exported HTML sample from Claude Design has been obtained.** Until we have one, the artifact schema in `packages/shared` is tentative. PRs that lock new persisted shapes are blocked.
- **Bundle-size CI gate is documented but not yet wired** (no `size-limit` step in `ci.yml`).
- **Mac notarization + Windows Authenticode** certs are not provisioned. Release workflow does not sign.
- **Discord, ProductHunt hunter, public launch sequence** — all deferred until v0.1 ship readiness.

---

## 11. Top backlog (post current PRs)

Ordered by `(impact × ease)` per [`docs/research/09-polish-parity-backlog.md`](./docs/research/09-polish-parity-backlog.md):

1. Resolve the four open PR conflicts (#2 i18n, #3 preview-ux, #6 reliability, #7 exporters)
2. UIUX iteration v2 — chat history list, generation-in-progress states, settings drawer (push 7.5/10 → 9/10)
3. Streaming generation in `core` (Tier 2 — currently blocking)
4. Inline comment loop (`wt/inline-comment` per parity backlog)
5. AI-generated custom sliders (`wt/sliders`)
6. Three-column model A/B race (`wt/ab-race`) — highest viral potential
7. CLI mode (`wt/cli`)
8. Web capture + URL Style Steal (`wt/web-capture`)
9. Codebase → Design System extraction (`wt/codebase-ds`)
10. Mac notarization + Homebrew Cask (`wt/release-eng`)

---

## 12. Where to look for what

| If you want to … | Read |
|---|---|
| Understand WHY of any decision | `docs/research/NN-<topic>.md` |
| See locked product decisions | `docs/VISION.md` |
| See what NOT to do (CI-enforced) | `docs/PRINCIPLES.md` |
| See package boundaries | `docs/ARCHITECTURE.md` |
| See open-source conventions | `docs/COLLABORATION.md`, `CONTRIBUTING.md` |
| Ship a new feature workflow | `docs/COLLABORATION.md` |
| Ship a UI change | start at `packages/ui/src/tokens.css`, then `apps/desktop/src/renderer/src/` |
| Add a model provider | `packages/providers/src/` (validate.ts shows the pattern) |
| Add a built-in demo | `packages/templates/src/index.ts` |
| Tune the system prompt | `packages/templates/src/system/design-generator.md` |

---

## 13. Contact

This is currently a 1-person project (hqhq1025) about to onboard a second contributor. Any of these channels work:

- GitHub Issue (bugs / scoped requests)
- GitHub Discussion (architecture / open-ended)
- PR comment (per-line code conversation)
- (Discord invite — TBD)

When in doubt, open an Issue and link the relevant section of this document.
