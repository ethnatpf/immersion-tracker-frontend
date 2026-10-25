---
name: implement-feature
description: Implement a complete new Immersion Tracker feature, from requirements and planning through behavior-focused testing, backend binding when needed, independent implementation review, and final verification. Use for end-to-end feature implementation rather than isolated fixes, reviews, or documentation changes.
---

# Complete feature implementation

## Understand and plan

1. Read the applicable `AGENTS.md`, inspect the working tree and relevant implementation, and establish the requested behavior and acceptance criteria. Record the intended change scope and starting diff or baseline, including existing staged, unstaged, and untracked changes. Preserve unrelated user changes. For UI work, consult the relevant Penpot designs as required by `AGENTS.md`.
2. Clarify material product ambiguity or missing API contracts before implementing dependent behavior. Do not treat unanswered questions as approval. Continue independent work while waiting. Choose routine, reversible technical details using repository conventions; state consequential assumptions without requiring approval for every implementation choice.
3. Produce an actionable plan proportional to the feature, covering acceptance criteria, test scenarios, implementation scope, UI and backend needs, and verification. Use Plan mode when available and appropriate or requested, respecting the environment's mode controls and handoff rules. If it is unavailable, present the plan and continue within existing authorization; a mode switch is not a prerequisite for implementation.
4. Read the [testing skill](../testing/SKILL.md) before selecting or writing tests. If backend data binding is needed, also read and apply the [backend integration skill](../backend-integration/SKILL.md). Follow `AGENTS.md` directly for UI implementation; no additional UI skill is required. Follow its Context7 and installed Next.js documentation requirements where applicable.

## Test and implement

- Follow the testing skill as the source of truth for test selection and order: strict TDD for calculations, domain rules, and other behavior warranting unit tests; prefer tests first for other clear behavior. During layout exploration or uncertain implementation, implement first and then test the settled behavior. Clarify material product decisions as described above. Preserve the agreement about authorization for new E2E journeys.
- For TDD work, write meaningful tests, run them, and observe failure for the intended missing or incorrect behavior before implementing it. Resolve setup, import, tooling, and fixture failures before treating the run as the red stage. Record the expected failures, implement until the tests pass, and refactor with tests staying green.
- Add or update relevant tests before considering behavior complete, including after exploration. Do not manufacture behavioral tests for purely visual changes or assertions tied to temporary scaffolding.
- For UI work, apply the repository's design, component, accessibility, validation, and shared-code conventions. For backend binding, use the backend integration skill throughout implementation and verification.
- Inspect the rendered UI against the relevant Penpot design, including responsive layouts and keyboard interaction for the changed flow. Distinguish visual inspection from automated E2E journeys, whose authorization follows the testing skill. If browser inspection is unavailable, report the verification gap.

## Review and fix

1. Format changed code using the repository's configured formatter or established formatting conventions. Keep formatting scoped to the feature's changes.
2. Run the relevant checks required by the testing skill and resolve failures introduced by the feature before requesting review. Distinguish pre-existing failures from regressions and report any blocked checks without expanding into unrelated repairs.
3. Invoke the `implementation_reviewer` agent defined in [.codex/agents/implementation_reviewer.toml](../../../.codex/agents/implementation_reviewer.toml), following `AGENTS.md`. Provide the user requirements and acceptance criteria, feature changes relative to the recorded baseline, observed red-stage failures or reasons for implementation-first exploration, and verification results. Identify overlapping pre-existing edits so the reviewer can assess the combined behavior without attributing all changes to this feature. The reviewer reviews code and tests without editing them. If the environment cannot invoke configured custom agents directly, delegate a review using that definition's instructions; if delegation is unavailable, use the repository's disclosed self-review fallback.
4. Resolve each actionable finding through a correction or an evidence-backed explanation of why a change is unnecessary. For behavior fixes, add or strengthen regression tests first and observe the intended failure before correcting the implementation. Reformat affected code and rerun the relevant checks. Keep optional suggestions separate from completion blockers.
5. Request focused follow-up review of fixes and disputed findings, including the supporting evidence. Repeat as needed until actionable findings are resolved; do not silently dismiss them. If a finding or required check remains blocked, report the concrete blocker and do not claim the feature is complete.

## Finish

- Confirm that formatting and relevant tests and checks cover the final code. Passing checks from the review stage count toward completion; rerun affected checks after changes or when new evidence warrants it, rather than repeating unchanged suites at each stage. Include type checking and linting where required by the testing skill. Run authorized browser journeys when applicable; disclose pre-existing failures and remaining verification gaps.
- Summarize the delivered behavior, checks actually run and their results, review outcome, and any unresolved blockers. Never claim a test, mode switch, or independent review occurred without observing it.
