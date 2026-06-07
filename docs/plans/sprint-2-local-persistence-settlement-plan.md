# Sprint 2 Local Persistence And Settlement Plan

Status: consensus complete
Mode: ralplan
Implementation started: false
Code files modified by this plan: none

## ADR

Decision: use Expo SQLite table-based persistence for Sprint 2.

Drivers:
- Current data is relational: `Expense` plus `ExpenseShare`.
- Monthly queries and settlement updates require consistent multi-row reads/writes.
- Receivable/payable calculations depend on share settlement state.
- Sprint 2 needs local restart persistence, not backend sync.

Alternatives considered:
- AsyncStorage: lower setup cost and simpler bootstrap, but would require JSON blob rewrites and manual consistency management for expense/share aggregates.
- `expo-sqlite/kv-store`: useful as an AsyncStorage-compatible bridge, but still key-value shaped.
- Expo SQLite tables: best fit for relational local-first data, atomic writes, month queries, and future category/statistics expansion.

## Recommended Stories

1. Package hygiene
   - Remove broken `"undefined"` dependency from `package.json` and `package-lock.json`.
   - Install `expo-sqlite` with `npx expo install expo-sqlite`.

2. Persistence bootstrap
   - Do not add `initialize()` to the shared `ExpenseRepository` interface.
   - Add `createPersistentAppServices()` that opens SQLite, applies migrations, seeds initial data if needed, and returns `AppServices`.
   - Update `App.tsx` to show a minimal loading/error shell until persistent services are ready.
   - Keep `createAppServices(repository)` for mock tests and dependency injection.

3. SQLite repository
   - Add `src/repositories/sqlite/SQLiteExpenseRepository.ts`.
   - Tables: `meta`, `users`, `categories`, `expenses`, `expense_shares`.
   - Use transactions for `createExpenseWithShares`.
   - Use parameterized statements for reads and writes.
   - Seed users/categories and optional dummy expenses/shares only once on an empty database.

4. Settlement API
   - Extend `ExpenseRepository` with `updateShareSettlement(shareId, settledAmountKRW): Promise<ExpenseShare>`.
   - Add `ExpenseService.updateShareSettlement`.
   - Add `AppDataContext.updateShareSettlement`, followed by `refresh()`.
   - Derive status:
     - `0` => `PENDING`
     - `0 < settledAmountKRW < shareAmountKRW` => `PARTIAL`
     - `settledAmountKRW === shareAmountKRW` => `DONE`
   - Reject negative, non-integer, and over-share KRW values.

5. Settlement UI
   - Add an `ExpenseDetail` modal route opened from `ExpenseListScreen` rows.
   - Detail screen shows expense amount, payer, burden owners, share amounts, settlement status, and remaining amount.
   - For shares where current user is payer and share owner differs, show receivable settlement controls.
   - For shares where current user is burden owner and payer differs, show payable settlement controls.
   - Minimal controls: `정산 완료` and partial KRW input.
   - Do not add settlement history in Sprint 2.

6. Preserve calculation semantics
   - Do not rewrite `calculateTotalPaid`, `calculateActualSpent`, `calculateReceivable`, or `calculatePayable` unless a test proves a bug.
   - Continue using `remainingShareAmount`.
   - Settlement changes must affect only receivable/payable, not total paid or actual spent.

## Acceptance Criteria

- Created expenses persist after app reload/restart.
- SQLite-backed repository returns the same data shape as the mock repository.
- Mark done updates a share to `DONE` and `settledAmountKRW=shareAmountKRW`.
- Partial settlement updates a share to `PARTIAL`.
- Partial and done settlements reduce receivable/payable correctly.
- Settlement status changes do not change `totalPaidKRW` or `actualSpentKRW`.
- Existing equal/direct split creation behavior remains intact.
- No excluded features are introduced.

## Verification Plan

- `npm run typecheck`
- `npm test`
- Repository contract tests for mock and SQLite adapter where feasible.
- Persistence integration: create repository, insert expense, recreate repository with same DB name, verify expense/share remains.
- Settlement tests: mark done and partial settlement produce expected summary deltas.
- Manual Expo smoke: create expense, reload app, verify persistence, settle share, verify summary.

## Consensus Gate

Architect review:
- Initial verdict: `ITERATE`.
- Required revisions: explicit async bootstrap, no `initialize()` on `ExpenseRepository`, concrete `ExpenseDetail` settlement entrypoint, tighter SQLite test strategy, package cleanup prerequisite.
- Revisions applied.

Critic review:
- Verdict: `APPROVE`.
- Basis: plan is concrete, testable, repo-aligned, option-consistent, and risk-mitigated.

Consensus gate:
- complete: true
- order: Architect review completed before Critic review
- recommended follow-up: `$ultragoal` for sequential implementation, or `$ultragoal` plus `$team` for parallel delivery lanes.
