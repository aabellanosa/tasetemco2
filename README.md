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
| `teller01` | Teller / Cashier | Dashboard |
| `membership` | Membership Officer | Members |
| `auditor` | Auditor / Compliance Officer | Financial Reports |
| `board` | Board / Read-Only Executive | Financial Reports |

## Spike Role Permissions

The React/Postgres pivot uses action-level permissions, not just screen access. For membership workflows:

| Role | View Members | View Applications | Create Applications | Approve Applications | Member Import Preview | Record Initial Payment | Record Share Capital | Record Savings Deposit | Record Savings Withdrawal | View Ledger | Review Batch | Post Teller Batch | Close Batch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| System Administrator | Yes | Yes | Yes | Yes | Yes | No | No | No | No | Yes | No | No | No |
| General Manager | Yes | Yes | No | Yes | No | No | No | No | No | Yes | No | No | No |
| Accountant / Bookkeeper | No | No | No | No | No | No | No | No | No | Yes | Yes | Yes | Yes |
| Loan Officer | Yes | No | No | No | No | Yes | Yes | Yes | No | No | No | No | No |
| Teller / Cashier | Yes | No | No | No | No | Yes | Yes | Yes | Yes | No | No | No | No |
| Membership Officer | Yes | Yes | Yes | No | Yes | No | No | No | No | No | No | No | No |
| Auditor / Compliance Officer | Yes | Yes | No | No | No | No | No | No | No | Yes | No | No | No |
| Board / Read-Only Executive | No | No | No | No | No | No | No | No | No | No | No | No | No |

Previous / Existing Loans are maintained separately from general member profile fields. `admin`, `membership`, and `loanofficer` can encode multiple historical rows. Labels are selected from active loan products; existing inactive or legacy labels remain visible as historical. The first save locks the set. Corrections require a reasoned unlock request and a Loan Officer decision with remarks; approval permits one save before the next revision locks again. The system retains the request, decision, actors, remarks, and timestamps. These setup balances do not create teller cash movement, loan release records, or ledger entries.

The Members workflow auto-refreshes every 5 seconds for demo testing across browser profiles. Users can also click Refresh to pull the latest member applications, active members, and initial payment history.

Members Workspace UI Refactor v1 organizes the Members screen into role-aware tabs: Applications, Imports, Teller Transactions, Member Directory, and Transaction History. Users only see tabs for workflows their role can use, reducing the earlier single-page crowding while preserving the same backend behavior.

Only the `admin` user can access Demo Maintenance controls. Other roles are blocked by the API even if they attempt to call the maintenance endpoints directly.

The `admin` user can also manage prototype staff accounts under Users. Admin can create staff users, assign role/default screen, and activate or deactivate non-admin accounts. All prototype accounts still use the shared test password `p@55@LL`; production password storage is intentionally left for a later security spike.

The Auditor / Compliance Officer has read-only User / Security access. Auditor can review usernames, roles, default screens, and account status, but cannot see the shared prototype password, create or modify users, download backups, or reset demo data.

Member Profile v1 expands member master data with contact number, address, birthdate, gender, civil status, occupation/source of income, membership date, cluster/group, Philippine ID type, ID number, and status. ID type uses the same searchable selection available in membership applications. `admin` and `membership` can update profile fields; other member-view roles can inspect them read-only. Share capital and savings balances stay read-only because they are derived from transactions.

Previous / Existing Loans v1 replaces the single manual previous-loan amount with a normalized multi-row member detail table. Each row captures an active-product label, application date, outstanding balance, and notes. `admin`, `membership`, and `loanofficer` can perform the initial capture; Loan Officer receives this capability without full member-profile edit access. Saved sets are immutable until a reasoned request is approved by a Loan Officer, and each approval allows exactly one revised save before relocking. Historical inactive labels remain readable.

TASETEMCO Member Classification v1 makes cluster/group a controlled value instead of free text. Manual application/profile forms use a dropdown, member imports normalize case and spacing, and unknown classifications are flagged before import finalization. Approved values are `REGULAR MEMBERS CAPTURE`, `REGULAR MEMBERS NON CAPTURE`, `RETIREES`, `REGULAR MEMBERS LGU`, `COMMUNITY A MEMBERS`, and `COMMUNITY B MEMBERS`.

Member Import Preview v0 lets `admin` and `membership` paste a CSV export from Excel, map source columns to member profile fields, and review validation issues before any database write exists. It checks missing full names, duplicate member numbers in the upload, member numbers that already exist, invalid dates, and unknown statuses. This is intentionally preview-only while client Excel formats are still being discovered.

Member Import Staging v1 adds a controlled save step after preview. `admin` and `membership` can create a staged import batch from the mapped rows, review batch history, and inspect row-level validation results. Staged rows do not create or update active members yet; final import remains a later approval/finalization spike. This spike adds Postgres tables, so run `npm run pg:migrate` against the target database before deploying the app code.

Member Import Finalize v1 lets the `admin` user finalize a staged import batch. Only rows still marked Ready become active member records; issue rows stay unresolved in the batch. Imported members start with zero share capital and zero savings because financial balances remain teller/accounting transactions. This spike adds finalization columns to import batches, so run `npm run pg:migrate` against the target database before deploying the app code.

Opening Balance Import Planning v0 adds a preview-only Ledger panel for existing member financial balances at cutover. Admin and Bookkeeper can paste CSV rows, map member number/name, share capital opening balance, savings opening balance, cutover date, and source reference, then review validation issues before any balance write exists. Unknown columns remain visible but unmapped.

The Ledger workspace uses role-aware tabs so users open one ledger work area at a time. Batch Review contains cash count, review/post/close actions, and unposted teller batch rows; Opening Balances contains the cutover balance preview; Batch History contains closed/submitted batch evidence; Posted Entries contains journal entries.

Opening Balance Import Staging schema v1 adds Postgres tables for future staged cutover balance batches and rows. It does not yet save or finalize opening balances from the UI. Run `npm run pg:migrate` against the target database before deploying this app build.

Opening Balance Import Staging v1 lets Admin and Bookkeeper save the mapped opening-balance preview as a staged batch. Staged batches show ready rows, issue rows, share capital total, savings total, source label, creator, and timestamp. This still does not finalize balances, update member statements, or create journal entries.

Opening Balance Import Details v1 lets Admin and Bookkeeper open staged batches to inspect row-level status, validation issues, and raw source values. Admin can reject a staged batch when it should be excluded from future finalization; rejected batches remain visible as audit evidence.

Opening Balance Import Finalization v1d.1 lets Admin finalize ready rows after confirmation. Ready-row share capital and savings amounts are added to member balances; issue or conflicting rows are skipped; finalized/skipped counts, actor, timestamp, and row status are retained. Finalized batches cannot run twice, and later uploads flag members whose opening balances were already finalized. This spike does not create general-ledger journal entries yet.

Opening Balance Accounting Entries v1d.2 creates one balanced journal when an opening-balance batch is finalized: debit `1090 Opening Balance Clearing`, credit `3010 Share Capital`, and credit `2020 Savings Deposits Payable`. The journal uses only finalized rows, links back to the import batch, appears in Posted Entries and financial reports, and brings opening-balance subsidiary totals into Control Account Reconciliation. Finalized batches created before this spike show an Admin-only `Post Missing Journal` repair action.

Opening Balance Visibility v1e adds finalized opening balances to each member statement with batch number, cutover date, source reference, amounts, and linked journal number. The Member Subsidiary Ledger separately shows opening share capital and opening savings beside normal transaction movements and current balances.

Loan Product Foundation v1 replaces the Loans placeholder with persisted lending templates. Admin can create and edit product codes, amount/term limits, annual rate, interest method, payment frequency, service-fee rate, insurance rate, CBU rate, savings-retention rate, penalty rate, accounting mappings, and status. Manager, Loan Officer, Teller / Cashier, Membership Officer, and Auditor have read-only product access. Membership Officer uses this access for the active-product previous-loan dropdown and cannot maintain product rules. The seeded TASETEMCO products include LBP Loan, which follows the Appliance Loan rules, remains non-revolving, and allows principal up to PHP 500,000. Existing Postgres deployments add LBP with `npm run pg:seed-loan-products`; no schema migration is required. Petty Cash Loan is limited to PHP 1,000 to PHP 2,000 and has no service fee.

| Loan Product Access | View | Create / Edit |
| --- | --- | --- |
| System Administrator | Yes | Yes |
| General Manager | Yes | No |
| Loan Officer | Yes | No |
| Teller / Cashier | Yes | No |
| Auditor / Compliance Officer | Yes | No |
| Membership Officer | Yes | No |

Loan Application v1 adds persisted Draft and Submitted applications under a role-aware Loans workspace. The Loan Officer selects an active member and active loan product, enters the requested principal, term, purpose, application date, and internal collateral type, then saves a Draft. Collateral type is limited to `PDC`, `ATM Cards`, or `Payroll`, supports management review only, and is intentionally excluded from the printed loan application form. Product amount and term limits are enforced, and the product's rate, method, frequency, fees, penalties, and accounting mappings are snapshotted into the application. The application also snapshots the manually encoded previous-loan balance, current outstanding system-loan balance, CBU/share-capital balance, regular savings balance, and secured-savings balance as of the application date for approval review and printing; secured savings remains a separate value and displays as zero when absent.

Loan Credit Review v1 lets the System Administrator review Submitted applications and record assessment notes, recommended principal, recommended term, decision date, remarks, actor, and timestamp. Decisions are `Approved`, `Rejected`, or `Returned`. Rejection and return require remarks; approval cannot exceed the member's requested amount or term. Returned applications become editable by the originating Loan Officer and move back to Draft when saved. Approved and Rejected applications are immutable. The loan decision responsibility remains distinct, but the dedicated Approver demo login has been retired for TASETEMCO's current workflow.

Loan Computation and Amortization Preview v1 lets the originating Loan Officer compute an Approved application using its snapshotted product terms. TASETEMCO products use 2.5% monthly diminishing-balance interest. Most loan products deduct a 4.5% service fee from principal, but Petty Cash Loan has no service fee. Salary, Educational, and Appliance loans also deduct 1.5% insurance, 2% CBU, and 1% savings retention; CBU can be removed during computation when the member is fully subscribed. The preview shows principal, interest, all deductions, net proceeds, total payable, maturity, and every installment, then saves the schedule once as `For Release`.

Loan Release v1a lets Teller/Cashier release only loans marked `For Release`. Teller confirms the release date, unique voucher/reference number, and cash released, which must exactly equal computed net proceeds. The release is immutable, linked to the current Open teller batch, counted as cash-out, and changes the loan and application status to `Released`. Loan Officer, Admin, Manager, and Auditor have read-only release visibility. The `View Schedule` and `Print Breakdown` actions are located on the Releases tab for saved computations. The printable loan packet defaults to 8.5 x 13 paper and is ordered as four pages: application and approval, loan-proceeds details with acknowledgement/payee signature, promissory-note appendix, and amortization schedule. Bookkeeper journal posting remains Loan Release v1b.

Loan Release v1b brings released loans into the existing reviewed-batch posting control. After Teller submits cash count and Bookkeeper marks the batch Reviewed, one-button posting creates a balanced journal from the frozen application mappings: debit Loans Receivable for principal; credit Cash on Hand for net proceeds; credit Service Fee Other Income and Insurance Other Income for deducted fees; and credit Share Capital and Savings Deposits Payable for CBU/savings retention. Posted CBU and savings retention update member balances. The release, loan, and application become `Posted`, and release history and batch details retain the linked journal number. Reposting is idempotent.

Teller Cash Funding v1a establishes custody before payouts. Bookkeeper prepares a whole-peso funding amount with Teller, source account, date, and unique reference; General Manager approves it; the assigned Teller acknowledges receipt into the current Open batch. Acknowledged funding becomes Opening Funding, so expected ending cash is `Opening Funding + Cash In - Cash Out`. Funding evidence remains visible in batch details.

Teller Cash Funding v1b gives Bookkeeper a funding-demand view of every loan currently marked `For Release`, including member, computation date, net proceeds, total demand, acknowledged funding, other batch receipts, existing payouts, available teller cash, and shortage. Teller sees the same available-cash control in the release queue. A release is disabled in the UI and rejected by the API when net proceeds exceed `Acknowledged Funding + Cash In - Cash Out`. The database path locks and rechecks the Open batch before insert so concurrent releases cannot spend the same available cash. Only acknowledged funding counts; Prepared or Approved funding does not.

Teller Cash Funding v1c completes the accounting transfer during reviewed-batch posting. The Bookkeeper's existing `Post reviewed batch` action posts each unposted acknowledged funding as debit `1010 - Cash on Hand` and credit the funding's recorded source account, normally `1020 - Cash in Bank`. The same action continues posting the loan release journal. Funding remains `Acknowledged` as custody evidence while `postedBy`, `postedAt`, and `postedEntryNo` prove accounting completion. Batch details and funding history show the linked journal, closing is blocked while acknowledged funding remains unposted, and reposting cannot create duplicates.

Loan Collection v1-v3 supports real receipt amounts against the earliest unpaid installment. Teller/Cashier sees only posted loans and the next collectible installment, records a unique official receipt/reference, and may accept a partial, full, or advance payment as long as the amount does not exceed the remaining loan balance. The UI previews every affected installment before confirmation. Payment is applied to the oldest unpaid installment first, interest then principal, and any excess continues sequentially through future installments. Fully covered rows become `Paid`, the last partly covered row becomes `Partial`, and the original amortization schedule and interest are not recomputed. One receipt retains its detailed installment allocations while entering the Open teller batch as one cash-in transaction. Bookkeeper sees the aggregate principal and interest split before posting. After cash count and review, `Post reviewed batch` debits Cash on Hand, credits Loans Receivable for principal applied, and credits Interest Income for interest applied. Skipped-installment, penalty, payoff, and amortization-recalculation policies remain separate future decisions.

Loan Officer Collection and Cash Turnover v1 allows Loan Officers to encode member initial payments, share-capital contributions, savings deposits, monthly member contributions, and loan collections. These cash-in transactions enter a separate Loan Officer collection batch. The Loan Officer submits its frozen transaction count and cash total; the Cashier physically counts the turnover and may accept it only when the counted amount matches. Acceptance transfers the transactions into the Cashier's Open batch for final cash count, Bookkeeper review, and posting. The audit trail retains collector, turnover submitter, Cashier acceptor, timestamps, source batch, and target batch. Loan Officers receive no savings-withdrawal, secured-withdrawal, loan-release, disbursement, final cash-count, review, or posting authority.

Loan Portfolio Watch v1 seeds one demo posted loan with an overdue installment and one near-due installment so collection follow-up can be demonstrated after reset/seed. The dashboard shows borrower-level overdue details only to management, loan, accounting, audit, and executive roles; Teller/Cashier and Membership Officer do not receive portfolio-wide overdue borrower details.

| Loan Application Access | View | Create / Edit Own Draft | Submit Own Draft | Credit Decision |
| --- | --- | --- | --- | --- |
| System Administrator | Yes | No | No | Yes |
| General Manager | Yes | No | No | No |
| Loan Officer | Yes | Yes | Yes | No |
| Auditor / Compliance Officer | Yes | No | No | No |
| Teller / Cashier | No | No | No | No |
| Membership Officer | No | No | No | No |

| Loan Computation Access | View Schedule | Preview / Save |
| --- | --- | --- |
| System Administrator | Yes | No |
| General Manager | Yes | No |
| Loan Officer | Yes | Own approved applications |
| Auditor / Compliance Officer | Yes | No |
| Teller / Cashier | No | No |
| Membership Officer | No | No |

| Teller Cash Funding Access | View | Prepare | Approve | Acknowledge |
| --- | --- | --- | --- | --- |
| System Administrator | Yes | No | No | No |
| General Manager | Yes | No | Yes | No |
| Accountant / Bookkeeper | Yes | Yes | No | No |
| Teller / Cashier | Yes | No | No | Assigned funding |
| Auditor / Compliance Officer | Yes | No | No | No |
| Other roles | No | No | No | No |

| Loan Release Access | View | Release Cash |
| --- | --- | --- |
| System Administrator | Yes | No |
| General Manager | Yes | No |
| Loan Officer | Yes | No |
| Teller / Cashier | Yes | Yes |
| Auditor / Compliance Officer | Yes | No |
| Membership Officer | No | No |

| Loan Collection Access | View | Collect Next Installment |
| --- | --- | --- |
| System Administrator | Yes | No |
| General Manager | Yes | No |
| Accountant / Bookkeeper | Ledger and batch evidence | No |
| Loan Officer | Yes | Yes |
| Teller / Cashier | Yes | Yes |
| Auditor / Compliance Officer | Yes | No |
| Membership Officer | No | No |

Membership applications capture gender, a searchable Philippine ID type, ID number, and `Required Initial Share Capital` as the expected membership requirement. Either the System Administrator or General Manager may approve a submitted membership application. Teller/Cashier records the actual opening payment for share capital, membership fee, and savings after approval.

Initial member payment is a one-time onboarding transaction. After it exists for a member, the system blocks another initial payment; later savings activity uses Savings Deposit or Savings Withdrawal, and later share capital additions use Share Capital Contribution.

Cash-in OR/reference numbers are unique across initial member payments, share capital contributions, savings deposits, and loan collections. Withdrawal voucher/reference numbers are unique across savings withdrawals.

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

Monthly Member Contributions are recorded by Teller/Cashier or Loan Officer as cash-paid TFEA, CBU, and Secured Savings. A Loan Officer contribution enters their separate collection batch and reaches Cashier expected cash only after physical turnover acceptance. A Draft has no effect. Reviewed-batch posting creates the balanced journal, feeds SUMMO columns U, V, and AE, and increases member CBU/share-capital balances. Run `npm run pg:migrate` before deploying the application build that introduces this workflow.

Secured Savings is a separate member subsidiary from regular savings. Posted Monthly Contributions increase the secured balance. Teller/Cashier may record a Secured Savings Withdrawal up to the posted balance less pending withdrawals; it enters the Open teller batch as cash-out. Reviewed-batch posting debits `2040 - Secured Savings Payable`, credits `1010 - Cash on Hand`, and decreases only the member's secured-savings balance.

Daily Remittance records cash turned over by cooperative operations and service units. Teller/Cashier uses a fixed grid containing every Active Admin-configured source, enters a backdated operational Remittance Date, the actual Cash Received Date, a unique receipt/reference, and positive source amounts. Zero-value grid rows are not saved. Adding the Draft to the Open teller batch includes its total in expected cashier cash; reviewed-batch posting debits `1010 - Cash on Hand` and credits each source's snapshotted income account. Canteen A/B retain separate cost centers, while WRS and Water Bottle A/B retain source detail and roll up under WRS. POS, GCASH, and LOADER are standalone, non-cost-center sources that post to `4080 - Other Operating Income`. Daily Remittance creates no member payable and has no SUMMO effect. Admin configures sources and has read-only transaction access; Teller/Cashier performs cash capture. Run `npm run pg:migrate` before deployment.

Daily Disbursement is the cash-out mirror of Daily Remittance. Teller/Cashier records a backdateable Disbursement Date, the actual Cash Disbursed Date, a unique voucher/reference, and positive amounts in the fixed category grid. Standard categories are Canteen A, Canteen B, WRS, Building and renovations, Travel, Water, Light, Wifi, SSS, Pag-ibig, Philhealth, and Other expenses; `Other expenses` is displayed last. Canteen A, Canteen B, and WRS retain cost-center attribution, while the remaining standard categories belong to cooperative operations. Admin may configure additional categories and revise reporting groups, cost centers, `5xxx` expense accounts, display order, and status. Adding a Draft to the Open teller batch includes its total as cash-out. Reviewed-batch posting debits the snapshotted expense accounts and credits `1010 - Cash on Hand`. Teller and Admin cash-position views use the same active batch ID, so their transaction counts and rows reconcile. Run `npm run pg:migrate`; the migration inserts missing standard categories and moves `Other expenses` to the last standard display position without requiring a separate seed or reset.

- [Workflow Document](docs/WORKFLOW.md)
