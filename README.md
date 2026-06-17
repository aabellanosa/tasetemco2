# TASETEMCO

TASETEMCO is a prototype cooperative core ledger system for Philippine cooperatives. This branch is the React, Chakra UI, Node.js, and Postgres pivot for the next working prototype.

## React/Postgres Pivot

The spike is split into:

- `frontend/` - Vite, React, Chakra UI
- `backend/` - Node.js, Express, in-memory seed mode or Postgres persistence

The backend runs with in-memory seed data when `DATABASE_URL` is blank. Set `DATABASE_URL` to use local or hosted Postgres persistence.

To prepare a local Postgres database for the pivot, copy `backend/.env.example` to `backend/.env`, set `DATABASE_URL`, then run:

```powershell
npm run pg:migrate
npm run pg:seed
```

If tester input becomes messy, reset the configured database back to the demo seed:

```powershell
npm run pg:reset-demo
```

`pg:reset-demo` writes a JSON backup under `data/backups/` before clearing and reseeding the configured Postgres database. You can also run a backup manually:

```powershell
npm run pg:backup
```

## Running The Spike

Install dependencies:

```powershell
npm install
```

Run the backend:

```powershell
npm run dev:backend
```

Run the frontend in another terminal:

```powershell
npm run dev:frontend
```

Open:

```text
http://127.0.0.1:5173
```

The Vite dev server proxies `/api` requests to `http://127.0.0.1:4000`.

## Render Deployment

This branch can run as a single Render Web Service. The backend serves the built React app from `frontend/dist`, so the deployed service handles both the UI and `/api` routes.

Recommended manual Render settings:

```text
Runtime: Node
Build Command: npm install && npm run build
Pre-Deploy Command: npm run render:predeploy
Start Command: npm start
Health Check Path: /api/health
```

Create a Render Postgres database and set the web service `DATABASE_URL` from the database connection string. If using a Render Blueprint, `render.yaml` defines the web service and Postgres database together.

Render free services do not expose an editable Pre-Deploy Command. On the free tier, run migrations from your local terminal with the Render External Database URL before deploying code that changes the database shape:

```powershell
$env:DATABASE_URL="paste_render_external_database_url_here"
$env:PGSSLMODE="require"
npm run pg:migrate
Remove-Item Env:DATABASE_URL
Remove-Item Env:PGSSLMODE
```

Run `pg:migrate` for schema changes only. Do not run `pg:seed` or `pg:reset-demo` against the hosted demo unless you intentionally want to overwrite or reset tester data.

After the first deploy, seed the demo data once from the Render Shell:

```powershell
npm run render:seed
```

Do not use `pg:reset-demo` on the hosted demo unless you intentionally want to wipe tester input and restore the seed.

The `admin` user also has a Demo Maintenance panel under Users. It can download a JSON backup of hosted demo data and reset the Postgres database to the seed rows. Reset requires typing `RESET TASETEMCO` and automatically downloads a pre-reset backup.

## Spike Checks

```powershell
npm run check
npm test
```

`npm test` starts the spike API in in-memory mode, checks `/api/health`, and runs the core workflow smoke test. In Postgres mode, `/api/health` also reports `schema: "ok"` or lists missing schema columns.

After `backend/.env` points to a local Postgres database, run the persistence smoke test with:

```powershell
npm run smoke:postgres
```

The Postgres smoke test resets the configured database to the demo seed, confirms `/api/health` reports `database: "postgres"`, and runs the same core workflow against persistent tables.

## Prototype Login Accounts

The public screen is a staff login page. No operational data is shown until a user signs in.

All seeded users currently use this prototype password:

```text
p@55@LL
```

The current spike uses one shared prototype password in code. Production behavior should move passwords into the database as salted hashes with forced password changes.

| Username | Role | Default Screen |
| --- | --- | --- |
| `admin` | System Administrator | Users and Roles |
| `manager` | General Manager | Dashboard |
| `bookkeeper` | Accountant / Bookkeeper | General Ledger |
| `loanofficer` | Loan Officer | Loans |
| `approver` | Credit Committee / Approver | Loans |
| `teller01` | Teller / Cashier | Dashboard |
| `membership` | Membership Officer | Members |
| `auditor` | Auditor / Compliance Officer | Financial Reports |
| `board` | Board / Read-Only Executive | Financial Reports |

## Spike Role Permissions

The React/Postgres pivot uses action-level permissions, not just screen access. For membership workflows:

| Role | View Members | View Applications | Create Applications | Approve Applications | Member Import Preview | Record Initial Payment | Record Share Capital | Record Savings Deposit | Record Savings Withdrawal | View Ledger | Review Batch | Post Teller Batch | Close Batch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| System Administrator | Yes | Yes | Yes | Yes | Yes | No | No | No | No | Yes | No | No | No |
| General Manager | Yes | Yes | No | No | No | No | No | No | No | Yes | No | No | No |
| Accountant / Bookkeeper | No | No | No | No | No | No | No | No | No | Yes | Yes | Yes | Yes |
| Loan Officer | Yes | No | No | No | No | No | No | No | No | No | No | No | No |
| Credit Committee / Approver | Yes | Yes | No | No | No | No | No | No | No | No | No | No | No |
| Teller / Cashier | Yes | No | No | No | No | Yes | Yes | Yes | Yes | No | No | No | No |
| Membership Officer | Yes | Yes | Yes | No | Yes | No | No | No | No | No | No | No | No |
| Auditor / Compliance Officer | Yes | Yes | No | No | No | No | No | No | No | Yes | No | No | No |
| Board / Read-Only Executive | No | No | No | No | No | No | No | No | No | No | No | No | No |

The Members workflow auto-refreshes every 5 seconds for demo testing across browser profiles. Users can also click Refresh to pull the latest member applications, active members, and initial payment history.

Members Workspace UI Refactor v1 organizes the Members screen into role-aware tabs: Applications, Imports, Teller Transactions, Member Directory, and Transaction History. Users only see tabs for workflows their role can use, reducing the earlier single-page crowding while preserving the same backend behavior.

Only the `admin` user can access Demo Maintenance controls. Other roles are blocked by the API even if they attempt to call the maintenance endpoints directly.

The `admin` user can also manage prototype staff accounts under Users. Admin can create staff users, assign role/default screen, and activate or deactivate non-admin accounts. All prototype accounts still use the shared test password `p@55@LL`; production password storage is intentionally left for a later security spike.

Member Profile v1 expands member master data with contact number, address, birthdate, civil status, occupation/source of income, membership date, cluster/group, and status. `admin` and `membership` can update profile fields; other member-view roles can inspect them read-only. Share capital and savings balances stay read-only because they are derived from transactions.

Member Import Preview v0 lets `admin` and `membership` paste a CSV export from Excel, map source columns to member profile fields, and review validation issues before any database write exists. It checks missing full names, duplicate member numbers in the upload, member numbers that already exist, invalid dates, and unknown statuses. This is intentionally preview-only while client Excel formats are still being discovered.

Member Import Staging v1 adds a controlled save step after preview. `admin` and `membership` can create a staged import batch from the mapped rows, review batch history, and inspect row-level validation results. Staged rows do not create or update active members yet; final import remains a later approval/finalization spike. This spike adds Postgres tables, so run `npm run pg:migrate` against the target database before deploying the app code.

Member Import Finalize v1 lets the `admin` user finalize a staged import batch. Only rows still marked Ready become active member records; issue rows stay unresolved in the batch. Imported members start with zero share capital and zero savings because financial balances remain teller/accounting transactions. This spike adds finalization columns to import batches, so run `npm run pg:migrate` against the target database before deploying the app code.

Opening Balance Import Planning v0 adds a preview-only Ledger panel for existing member financial balances at cutover. Admin and Bookkeeper can paste CSV rows, map member number/name, share capital opening balance, savings opening balance, cutover date, and source reference, then review validation issues before any balance write exists. Unknown columns remain visible but unmapped.

The Ledger workspace uses role-aware tabs so users open one ledger work area at a time. Batch Review contains cash count, review/post/close actions, and unposted teller batch rows; Opening Balances contains the cutover balance preview; Batch History contains closed/submitted batch evidence; Posted Entries contains journal entries.

Opening Balance Import Staging schema v1 adds Postgres tables for future staged cutover balance batches and rows. It does not yet save or finalize opening balances from the UI. Run `npm run pg:migrate` against the target database before deploying this app build.

Opening Balance Import Staging v1 lets Admin and Bookkeeper save the mapped opening-balance preview as a staged batch. Staged batches show ready rows, issue rows, share capital total, savings total, source label, creator, and timestamp. This still does not finalize balances, update member statements, or create journal entries.

Membership applications capture `Required Initial Share Capital` as the expected membership requirement. Teller/Cashier records the actual opening payment for share capital, membership fee, and savings after Admin approval.

Initial member payment is a one-time onboarding transaction. After it exists for a member, the system blocks another initial payment; later savings activity uses Savings Deposit or Savings Withdrawal, and later share capital additions use Share Capital Contribution.

Cash-in OR/reference numbers are unique across initial member payments, share capital contributions, and savings deposits. Withdrawal voucher/reference numbers are unique across savings withdrawals.

Bookkeeper posts Teller Batch payments to the general ledger. The current slice creates a balanced journal entry: debit Cash on Hand; credit Share Capital, Membership Fee Income, and Savings Deposits Payable.

Member statements show each member's share capital balance, savings balance, initial payment activity, share capital contributions, savings transactions, posting status, and linked journal entry number once posted.

Teller/Cashier can record regular share capital contributions after onboarding. Bookkeeper posts those contributions to the ledger as debit Cash on Hand and credit Share Capital.

Teller/Cashier can record regular savings deposits after onboarding. Bookkeeper posts those deposits to the ledger as debit Cash on Hand and credit Savings Deposits Payable.

Teller/Cashier can record savings withdrawals within available savings. Bookkeeper posts those withdrawals to the ledger as debit Savings Deposits Payable and credit Cash on Hand.

The Teller/Cashier UI now uses a member-first transaction workspace: select the member, review balances, choose the transaction type, then complete only the selected form.

Teller and Bookkeeper screens show unposted teller batch cash position: cash in, cash out, net cash, transaction count, and clear transaction counts for initial payments, share capital contributions, savings deposits, and savings withdrawals.

Teller/Cashier records transactions into the current Open teller batch. In this spike, the batch lifecycle is `Open -> Submitted -> Reviewed -> Closed`; Bookkeeper closes a reviewed batch after its teller transactions are posted, and the system opens the next batch for new teller activity.

Bookkeeper posting is gated by batch review: teller transactions cannot be posted until their assigned batch is Reviewed. The Bookkeeper can post the reviewed teller batch in one action; the system creates traceable journal entries for each source transaction. Cash variance is shown as a warning, and non-zero variance requires a Bookkeeper variance note before review.

Official batch close uses a confirmation step. The Bookkeeper reviews cash totals, posted and unposted counts, may enter a closing note, and the system stores closed by, closed at, and closing note for audit review.

The Ledger screen includes read-only Teller Batch History so Bookkeeper, Admin, Manager, and Auditor-style users can inspect batch status, cash count evidence, posted entry counts, unposted counts, reviewer, and close timing after the batch leaves the active work area. Each history row has a View action that opens batch details with cash count evidence, source transactions, and linked journal entries.

The Reports screen uses a report selector layout so users open one report at a time, review its generated timestamp, and refresh report data without scrolling through every report on one page.

The Reports screen includes a read-only Daily Cash Position report summarizing teller batch cash in, cash out, net cash, expected cash, actual cash, variance, posting counts, and closed batch evidence.

The Reports screen also includes a read-only Member Subsidiary Ledger report summarizing member share capital balances, savings balances, movement totals, and posted/unposted transaction counts.

The Reports screen includes a Control Account Reconciliation report that compares prototype-activity subsidiary totals for Share Capital and Savings Deposits Payable against posted general ledger control account balances.

The Reports screen includes Trial Balance and Statement of Financial Condition reports generated from posted general ledger balances.

## Workflow UI

The Workflow screen shows the recommended access matrix for all 9 cooperative roles. It also acts as the first guided workflow area: buttons such as Add member, Release loan, View journal, Post batch, Export CSV, Add user, Search, Notifications, and New transaction now route to workflow step panels instead of doing nothing.

This is intentionally incremental. The current buttons open best-practice process guidance. Later passes can replace each workflow panel with real forms and database writes.

## Static Documentation Build

The documentation branch includes a static site in `site/`. Build it with:

```powershell
npm run build
```

The generated deploy folder is:

```text
dist-docs/
```

Run the smoke test with:

```powershell
npm test
```

For GitHub Actions deployment to Namecheap, set these repository secrets:

- `NAMECHEAP_FTP_SERVER`
- `NAMECHEAP_FTP_USERNAME`
- `NAMECHEAP_FTP_PASSWORD`
- `NAMECHEAP_FTP_SERVER_DIR`

Example server directory:

```text
/public_html/docs/
```

## Active App Stack

- Frontend: Vite, React, Chakra UI in `frontend/`
- Backend: Node.js, Express in `backend/`
- Database: in-memory seed mode by default; Postgres persistence is being introduced in mini-spikes
- Deployment: single Render Web Service with Render Postgres
- Auth: multi-user prototype login with role-based access control
- Reporting: ledger-driven reports generated from posted transactions

The root-level `server.js`, `app.js`, `src/db.js`, `index.html`, and `styles.css` belong to the earlier SQLite prototype. They are kept only as historical reference and should not be used for the active React/Postgres app or Render deployment.

## API Endpoints

- `GET /api/dashboard`
- `GET /api/members`
- `GET /api/members/:memberId/statement`
- `GET /api/share-capital-contributions`
- `POST /api/share-capital-contributions`
- `GET /api/savings-deposits`
- `POST /api/savings-deposits`
- `GET /api/savings-withdrawals`
- `POST /api/savings-withdrawals`
- `GET /api/teller-cash-count`
- `POST /api/teller-cash-count`
- `GET /api/teller-batches`
- `GET /api/teller-batches/:batchId`
- `POST /api/teller-batches/:batchId/review`
- `POST /api/teller-batches/:batchId/close`
- `GET /api/products`
- `GET /api/loans`
- `GET /api/transactions`
- `GET /api/ledger`
- `POST /api/ledger/teller-batches/:paymentId/post`
- `POST /api/ledger/teller-batches/:batchId/post-reviewed`
- `POST /api/ledger/share-capital-contributions/:contributionId/post`
- `POST /api/ledger/savings-deposits/:depositId/post`
- `POST /api/ledger/savings-withdrawals/:withdrawalId/post`
- `GET /api/reports`
- `GET /api/reports/daily-cash-position`
- `GET /api/reports/member-subsidiary-ledger`
- `GET /api/reports/control-account-reconciliation`
- `GET /api/reports/trial-balance`
- `GET /api/reports/statement-of-financial-condition`
- `GET /api/users`
- `GET /api/roles`

## Documentation

- [Workflow Document](docs/WORKFLOW.md)
