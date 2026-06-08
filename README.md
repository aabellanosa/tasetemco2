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

| Role | View Members | View Applications | Create Applications | Approve Applications | Record Initial Payment |
| --- | --- | --- | --- | --- | --- |
| System Administrator | Yes | Yes | Yes | Yes | No |
| General Manager | Yes | Yes | No | No | No |
| Accountant / Bookkeeper | No | No | No | No | No |
| Loan Officer | Yes | No | No | No | No |
| Credit Committee / Approver | Yes | Yes | No | No | No |
| Teller / Cashier | Yes | No | No | No | Yes |
| Membership Officer | Yes | Yes | Yes | No | No |
| Auditor / Compliance Officer | Yes | Yes | No | No | No |
| Board / Read-Only Executive | No | No | No | No | No |

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
- `GET /api/products`
- `GET /api/loans`
- `GET /api/transactions`
- `GET /api/ledger`
- `GET /api/reports`
- `GET /api/users`
- `GET /api/roles`

## Documentation

- [Workflow Document](docs/WORKFLOW.md)
