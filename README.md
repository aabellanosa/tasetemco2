# TASETEMCO

TASETEMCO is a prototype cooperative core ledger system for Philippine cooperatives. The current build uses a small Node.js server with SQLite-backed sample data. It is intended to evolve into a multi-user cooperative operations system with transaction posting and CDA-aligned financial reports.

## Current Prototype

- Static HTML, CSS, and JavaScript frontend
- Small Node.js HTTP server
- SQLite database seeded on first run
- Sample members, deposits, share capital, loans, teller activity, ledger accounts, users, roles, and reports
- Workflow screen with a 9-role access matrix and guided action flows
- CDA-style report naming:
  - Statement of Financial Condition
  - Statement of Operations
- Balanced sample trial balance

## Running Locally

```powershell
npm start
```

Then open:

```text
http://127.0.0.1:3000
```

The SQLite file is created at `data/tasetemco.db` and is ignored by git.

If port 3000 is already occupied:

```powershell
$env:PORT="3010"; npm start
```

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

## Workflow UI

The Workflow screen shows the recommended access matrix for all 9 cooperative roles. It also acts as the first guided workflow area: buttons such as Add member, Release loan, View journal, Post batch, Export CSV, Add user, Search, Notifications, and New transaction now route to workflow step panels instead of doing nothing.

This is intentionally incremental. The current buttons open best-practice process guidance. Later passes can replace each workflow panel with real forms and database writes.

## Planned Stack

- Frontend: HTML/CSS/JavaScript first, upgradeable to a component framework later if needed
- Backend: Node.js HTTP server
- Database: SQLite via Node's built-in `node:sqlite` module
- Auth: Multi-user accounts with role-based access control
- Reporting: Ledger-driven reports generated from posted transactions

## API Endpoints

- `GET /api/dashboard`
- `GET /api/members`
- `GET /api/products`
- `GET /api/loans`
- `GET /api/transactions`
- `GET /api/ledger`
- `GET /api/reports`
- `GET /api/users`
- `GET /api/roles`

## Documentation

- [Workflow Document](docs/WORKFLOW.md)
