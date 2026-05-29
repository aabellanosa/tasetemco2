# Tabon Coop

Tabon Coop is a prototype cooperative core ledger system for Philippine cooperatives. The current build is UI-only with pre-populated sample data. It is intended to evolve into a Node.js and SQLite application with multi-user access, transaction posting, and CDA-aligned financial reports.

## Current Prototype

- Static HTML, CSS, and JavaScript
- Sample members, deposits, share capital, loans, teller activity, ledger accounts, and reports
- CDA-style report naming:
  - Statement of Financial Condition
  - Statement of Operations
- Balanced sample trial balance

Open `index.html` directly in a browser to view the prototype.

## Planned Stack

- Frontend: HTML/CSS/JavaScript first, upgradeable to a component framework later if needed
- Backend: Node.js
- Database: SQLite
- Auth: Multi-user accounts with role-based access control
- Reporting: Ledger-driven reports generated from posted transactions

## Documentation

- [Workflow Document](docs/WORKFLOW.md)
