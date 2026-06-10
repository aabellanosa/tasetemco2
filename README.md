# TASETEMCO

TASETEMCO is a prototype cooperative core ledger system for Philippine cooperatives. This branch is the React, Chakra UI, and MySQL/MariaDB spike for the next working prototype.

## React/MySQL Spike

The spike is split into:

- `frontend/` - Vite, React, Chakra UI
- `backend/` - Node.js, Express, optional MySQL/MariaDB

The backend runs with in-memory seed data if MySQL is not configured yet. To use MySQL, copy `backend/.env.example` to `backend/.env`, fill in the database settings, then apply:

```text
backend/database/schema.sql
backend/database/seed.sql
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

## Spike Checks

```powershell
npm run check
npm test
```

`npm test` starts the spike API, checks `/api/health`, and verifies that the `membership` user can log in.

## Prototype Login Accounts

The public screen is a staff login page. No operational data is shown until a user signs in.

All seeded users currently use this prototype password:

```text
p@55@LL
```

The password is stored in SQLite as a salted hash, not plain text.

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

The React/MySQL spike uses action-level permissions, not just screen access. For membership workflows:

| Role | View Members | View Applications | Create Applications | Approve Applications | Record Initial Payment | Record Share Capital | Record Savings Deposit | Record Savings Withdrawal | View Ledger | Review Batch | Post Teller Batch | Close Batch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| System Administrator | Yes | Yes | Yes | Yes | No | No | No | No | Yes | No | No | No |
| General Manager | Yes | Yes | No | No | No | No | No | No | Yes | No | No | No |
| Accountant / Bookkeeper | No | No | No | No | No | No | No | No | Yes | Yes | Yes | Yes |
| Loan Officer | Yes | No | No | No | No | No | No | No | No | No | No | No |
| Credit Committee / Approver | Yes | Yes | No | No | No | No | No | No | No | No | No | No |
| Teller / Cashier | Yes | No | No | No | Yes | Yes | Yes | Yes | No | No | No | No |
| Membership Officer | Yes | Yes | Yes | No | No | No | No | No | No | No | No | No |
| Auditor / Compliance Officer | Yes | Yes | No | No | No | No | No | No | Yes | No | No | No |
| Board / Read-Only Executive | No | No | No | No | No | No | No | No | No | No | No | No |

The Members workflow auto-refreshes every 5 seconds for demo testing across browser profiles. Users can also click Refresh to pull the latest member applications, active members, and initial payment history.

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

Bookkeeper posting is gated by batch review: teller transactions cannot be posted until their assigned batch is Reviewed. The Bookkeeper can post the reviewed teller batch in one action; the system creates traceable journal entries for each source transaction. Cash variance is shown as a warning for discussion and review, but it does not block posting yet.

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

## Planned Stack

- Frontend: HTML/CSS/JavaScript first, upgradeable to a component framework later if needed
- Backend: Node.js HTTP server
- Database: SQLite via Node's built-in `node:sqlite` module
- Auth: Multi-user accounts with role-based access control
- Reporting: Ledger-driven reports generated from posted transactions

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
- `GET /api/users`
- `GET /api/roles`

## Documentation

- [Workflow Document](docs/WORKFLOW.md)
