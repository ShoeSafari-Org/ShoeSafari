# GitHub Actions pinning and updates

All workflow actions must use a full 40-character commit SHA. Keep a trailing comment with the upstream release tag so the pinned version is readable.

To update an action:

1. Choose a release from the action's upstream repository and review its release notes and source.
2. Verify the release tag resolves to the commit SHA in that same upstream repository.
3. Replace every occurrence across `.github/workflows/` with the full SHA and its release comment.
4. Review the workflow diff and run the affected workflow checks before merging.

Do not use branches or movable tags such as `main`, `stable`, or `v4` as the action reference. For `dtolnay/rust-toolchain`, the action code is pinned to its `v1` release; the `toolchain: stable` input intentionally continues to select Rust's stable compiler channel.

## Dependency security checks

Pull requests that change a JavaScript manifest run the dependency security
workflow. GitHub's dependency review blocks newly introduced high or critical
issues, while the production-only npm audit blocks the same severities in the
resolved application dependency tree. Low and moderate findings remain
advisory and are retained as an artifact so maintainers can triage them without
silently weakening the merge gate.

The workflow installs with lifecycle scripts disabled, uses only pinned GitHub
Actions, and never includes development-only packages in the blocking audit.
When an advisory is accepted, record the owner, rationale, affected package,
and review date in the security issue or release notes; do not suppress the
finding in the workflow.
## Supported CI toolchains

The main CI workflow keeps the compatibility checks small and independent:

- Frontend checks run on Node.js 18 and 20, matching the `engines.node` minimum and the versions currently used by the repository's workflows.
- Accessibility checks run with Playwright's Chromium browser. The browser is installed from the matrix value so another supported browser can be added without multiplying frontend or contract jobs.
- Soroban contract checks run on Rust's stable channel with the `wasm32v1-none` target, `rustfmt`, and `clippy`.

Only the npm-backed jobs use dependency caching, keyed by `package-lock.json`; the contract job intentionally avoids an additional cache so Rust toolchain and target changes cannot reuse stale artifacts. Keep the matrices separate; do not create a cross-product of Node, browser, and Rust versions.
