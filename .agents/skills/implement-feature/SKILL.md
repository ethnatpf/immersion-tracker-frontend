---
name: implement-feature
description: Implement a complete new Immersion Tracker feature, from requirements and planning through tests-first development, backend binding when needed, independent implementation review, and final verification. Use for end-to-end feature implementation rather than isolated fixes, reviews, or documentation changes.
---

# Complete feature implementation

## Understand and plan

1. Read the applicable `AGENTS.md`, inspect the relevant implementation, and establish the requested behavior and acceptance criteria. For UI work, consult the relevant Penpot designs as required by `AGENTS.md`.
2. Ask the user about unclear requirements before implementing. Do not silently choose product behavior, fill contract gaps, or treat unanswered questions as approval. Continue only independent investigation while waiting for answers.
3. Switch to Plan mode if it is not already active, using the environment's supported mode control. If you cannot change modes, ask the user to switch before implementation; do not claim to have changed modes. In Plan mode, resolve remaining questions and produce an actionable plan covering acceptance criteria, test scenarios, implementation scope, UI and backend needs, and verification. Follow the environment's plan-to-implementation handoff.
4. Read the [testing skill](../testing/SKILL.md) before selecting or writing tests. If backend data binding is needed, also read and apply the [backend integration skill](../backend-integration/SKILL.md). Follow `AGENTS.md` directly for UI implementation; no additional UI skill is required. Follow its Context7 and installed Next.js documentation requirements where applicable.

## Tests first, then implementation

- Write meaningful tests for the agreed feature behavior before implementing it, following the testing skill's boundaries and repository conventions. Preserve its agreement about authorization for new E2E journeys.
- Run the new or changed tests and confirm they fail because the requested behavior is missing or incorrect. Resolve setup, import, tooling, and fixture failures before treating the run as the red stage. Record the expected failures.
- Only after observing the intended red stage, implement the feature until the tests pass. Add further tests before implementing newly identified behavior. Refactor with the tests staying green.
- **Explicit prototype exception:** when the user says requirements are uncertain and asks to prototype first, explore the requested prototype without requiring tests first. Confirm the settled behavior with the user before completing the feature, then add or update relevant tests using the testing skill. Prototyping changes the order, not the final coverage requirement.
- For UI work, apply the repository's design, component, accessibility, validation, and shared-code conventions. For backend binding, use the backend integration skill throughout implementation and verification.

## Review and fix

1. Format changed code using the repository's configured formatter or established formatting conventions. Keep formatting scoped to the feature's changes.
2. Run the relevant checks required by the testing skill and resolve failures before requesting review.
3. Invoke the `implementation_reviewer` agent defined in [.codex/agents/implementation_reviewer.toml](../../../.codex/agents/implementation_reviewer.toml), following `AGENTS.md`. Provide the user requirements and acceptance criteria, changed-file scope or diff baseline, observed red-stage failures (or the explicit prototype exception), and verification results. The reviewer reviews code and tests without editing them. If the environment cannot invoke configured custom agents directly, delegate a review using that definition's instructions; if delegation is unavailable, use the repository's disclosed self-review fallback.
4. Address each actionable finding. Add or strengthen regression tests first for behavior fixes, observe the intended failure, then make the correction. Reformat affected code and rerun the relevant checks.
5. Request focused follow-up review of the findings and fixes. Repeat until actionable findings are resolved. If a finding or required check is blocked, report the concrete blocker and do not claim the feature is complete.

## Finish

- Ensure all changed code is formatted and the final relevant tests and checks from the testing skill pass after the last changes. Include type checking and linting where required by that skill. Run authorized browser journeys when applicable; disclose any remaining verification gaps.
- Summarize the delivered behavior, checks actually run and their results, review outcome, and any unresolved blockers. Never claim a test, mode switch, or independent review occurred without observing it.
