# TASETEMCO Workflow Document

## 1. Purpose

TASETEMCO is a cooperative operations and accounting system prototype. Its goal is to support day-to-day cooperative transactions and produce reliable ledger-based financial reports, especially the Statement of Financial Condition and Statement of Operations.

The system should be built around a simple rule: operational transactions create accounting entries, and financial statements are generated from the general ledger.

## 2. Target Cooperative Users

The first target is a Philippine multi-purpose or credit cooperative with member savings, share capital, loans, collections, and basic accounting operations.

The prototype should support these functional areas:

- Membership management
- Share capital tracking
- Savings and time deposit accounts
- Loan application, approval, release, and collection
- Teller and cashier transactions
- General ledger posting
- Trial balance
- Financial statements
- Management and audit review

## 3. Recommended User Levels

Multi-user accounts are a best practice because cooperative systems handle cash, member balances, loans, approvals, and financial statements. Every user should have an individual account. Shared accounts should be avoided.

### 3.1 System Administrator

The System Administrator manages technical and security settings.

Typical access:

- Create, edit, deactivate, and unlock user accounts
- Assign user roles
- Configure branches, departments, and system settings
- Configure backup and restore routines
- View audit logs
- Reset passwords

Restrictions:

- Should not normally approve loans, post accounting adjustments, or override financial controls unless separately assigned by management

### 3.2 General Manager

The General Manager has high-level operational oversight.

Typical access:

- View dashboard and portfolio summaries
- View all members, accounts, loans, and reports
- Approve selected high-value transactions, depending on policy
- Review branch or department performance
- View audit logs and exception reports

Restrictions:

- Should not directly edit posted accounting entries
- Should not process teller cash transactions

### 3.3 Accountant / Bookkeeper

The Accountant or Bookkeeper manages accounting records and reports.

Typical access:

- View and manage chart of accounts
- Create and post journal vouchers
- Review system-generated accounting entries
- Generate trial balance
- Generate financial statements
- Process month-end and year-end closing
- Review statutory fund allocations and surplus distribution

Restrictions:

- Should not approve own journal entries if maker-checker control is enabled
- Should not process member cash transactions unless explicitly assigned

### 3.4 Loan Officer

The Loan Officer manages loan applications and monitoring.

Typical access:

- Create loan applications
- View borrower profile and account history
- Encode loan terms, collateral, co-makers, and amortization details
- Recommend approval or rejection
- Monitor delinquency and collection status

Restrictions:

- Cannot release loan proceeds
- Cannot approve loans beyond assigned authority
- Cannot alter posted collections

### 3.5 Credit Committee / Approver

The Credit Committee or Approver reviews and approves loans.

Typical access:

- View loan applications and supporting data
- Approve, reject, or return applications
- Set approved loan amount and conditions
- Review exception cases

Restrictions:

- Cannot encode loan applications as the maker if strict segregation is enabled
- Cannot release cash or post accounting entries directly

### 3.6 Teller / Cashier

The Teller or Cashier handles front-line transactions.

Typical access:

- Receive savings deposits
- Process savings withdrawals
- Receive share capital payments
- Receive loan amortization payments
- Print or issue transaction slips
- View own teller batch and cash position

Restrictions:

- Cannot approve loans
- Cannot edit member master records after approval
- Cannot change accounting entries directly
- Cannot view sensitive reports beyond teller scope

### 3.7 Membership Officer

The Membership Officer manages member records.

Typical access:

- Encode member applications
- Update member contact information
- Capture membership classification and cluster/group
- Track member status

Restrictions:

- Cannot post financial transactions
- Cannot approve withdrawals, loans, or journal entries

### 3.8 Auditor / Compliance Officer

The Auditor or Compliance Officer reviews records without changing normal operations.

Typical access:

- View all modules in read-only mode
- View audit trail
- Generate exception reports
- Review user activity and transaction history
- Review compliance reports

Restrictions:

- No posting, approval, deletion, or override permissions

### 3.9 Board / Read-Only Executive

Board users need controlled visibility for governance.

Typical access:

- View financial statements
- View portfolio summaries
- View selected management reports
- View high-level membership and performance data

Restrictions:

- No encoding, approval, posting, or account maintenance access

### 3.10 Current Spike Membership Permissions

The React/Postgres pivot separates screen access from action access. A role may view member records without being allowed to encode a new member application.

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

For demo testing across browser profiles, the Members workflow auto-refreshes every 5 seconds. The manual Refresh button pulls the latest member applications, active members, and initial payment history immediately.

Members Workspace UI Refactor v1 organizes the Members screen into role-aware tabs: Applications, Imports, Teller Transactions, Member Directory, and Transaction History. This keeps application processing, CSV import staging, teller activity, member profile review, and transaction audit history visually separate while keeping the same permissions and backend behavior.

Membership applications capture `Required Initial Share Capital` as the expected membership requirement. Teller/Cashier records the actual opening payment for share capital, membership fee, and savings after Admin approval.

Member Import Preview v0 is available only to the System Administrator and Membership Officer. It accepts pasted CSV text exported from Excel, detects columns, lets the user map columns to member profile fields, and shows validation issues before any import write is implemented. The current preview checks missing full names, duplicate member numbers in the upload, member numbers that already exist, invalid dates, and unknown statuses.

Member Import Staging v1 lets the System Administrator and Membership Officer save the mapped preview as a staged import batch. The system stores batch totals, ready rows, issue rows, creator, timestamp, and row-level validation issues. Staged rows are not active member records yet; a later finalization step should decide which ready rows become members.

Member Import Finalize v1 lets the System Administrator finalize a staged import batch. Ready rows are inserted into active members with zero share capital and zero savings. Rows with issues remain in the import batch for correction or later review. Membership Officer can still preview and stage imports but cannot finalize them.

Opening Balance Import Planning v0 adds a preview-only Ledger panel for cutover balances. The System Administrator and Accountant / Bookkeeper can paste CSV rows, map the current opening-balance fields, and review validation issues for member number, duplicate rows, non-negative share capital, non-negative savings, cutover date, and source reference. Unknown client Excel columns remain visible but unmapped until the cooperative confirms whether they should become system fields.

The Ledger workspace uses role-aware tabs so users open one ledger work area at a time. Batch Review contains cash count, review/post/close actions, and unposted teller batch rows; Opening Balances contains the cutover balance preview; Batch History contains closed/submitted batch evidence; Posted Entries contains journal entries.

Opening Balance Import Staging schema v1 adds Postgres tables for future staged cutover balance batches and rows. It does not yet save or finalize opening balances from the UI. Run `npm run pg:migrate` against the target database before deploying this app build.

Opening Balance Import Staging v1 lets the System Administrator and Accountant / Bookkeeper save the mapped opening-balance preview as a staged batch. Staged batches show ready rows, issue rows, share capital total, savings total, source label, creator, and timestamp. This still does not finalize balances, update member statements, or create journal entries.

Opening Balance Import Details v1 lets the System Administrator and Accountant / Bookkeeper open staged batches to inspect row-level status, validation issues, and raw source values. The System Administrator can reject a staged batch when it should be excluded from future finalization; rejected batches remain visible as audit evidence.

Opening Balance Import Finalization v1d.1 lets the System Administrator finalize ready rows after confirmation. Ready-row share capital and savings amounts are added to member balances; issue or conflicting rows are skipped; finalized/skipped counts, actor, timestamp, and row status are retained. Finalized batches cannot run twice, and later uploads flag members whose opening balances were already finalized. This spike does not create general-ledger journal entries yet.

Opening Balance Accounting Entries v1d.2 creates one balanced journal when an opening-balance batch is finalized: debit `1090 Opening Balance Clearing`, credit `3010 Share Capital`, and credit `2020 Savings Deposits Payable`. The journal uses only finalized rows, links back to the import batch, appears in Posted Entries and financial reports, and brings opening-balance subsidiary totals into Control Account Reconciliation. Finalized batches created before this spike show an Admin-only `Post Missing Journal` repair action.

Opening Balance Visibility v1e adds finalized opening balances to each member statement with batch number, cutover date, source reference, amounts, and linked journal number. The Member Subsidiary Ledger separately shows opening share capital and opening savings beside normal transaction movements and current balances.

Loan Product Foundation v1 replaces the Loans placeholder with persisted lending templates. The System Administrator can create and edit product codes, amount/term limits, annual rate, interest method, payment frequency, processing fee, penalty rate, accounting mappings, and status. General Manager, Loan Officer, Credit Committee / Approver, Teller / Cashier, and Auditor / Compliance Officer have read-only product access. The seeded products are Regular Loan, Emergency Loan, and Small Business Loan.

| Loan Product Access | View | Create / Edit |
| --- | --- | --- |
| System Administrator | Yes | Yes |
| General Manager | Yes | No |
| Loan Officer | Yes | No |
| Credit Committee / Approver | Yes | No |
| Teller / Cashier | Yes | No |
| Auditor / Compliance Officer | Yes | No |
| Membership Officer | No | No |

Loan Application v1 adds a separate Applications tab beside Loan Products. The Loan Officer selects an active member and active product, enters requested principal, term, purpose, and application date, and saves a Draft. The system validates the amount and term against the selected product and snapshots the product rules into the application so later product edits do not silently change an existing request. Only the originating Loan Officer can edit or submit their Draft.

Loan Credit Review v1 makes Submitted applications actionable for the Credit Committee / Approver. The reviewer records credit assessment notes, recommended principal, recommended term, decision date, and decision remarks, then chooses `Approved`, `Rejected`, or `Returned`. Approval recommendations cannot exceed the requested amount or term. Rejection and return require remarks. Returned applications remain visible with their review evidence and become editable by the originating Loan Officer; saving moves them back to Draft for resubmission. Approved and Rejected applications cannot receive another decision.

Loan Computation and Amortization Preview v1 adds a separate Computations tab. The originating Loan Officer selects an Approved application and first payment date, then previews a repayment schedule based on the application's snapshotted principal, term, rate, interest method, payment frequency, and processing fee. The current engine supports Flat Interest. Total interest is principal multiplied by the annual rate and term fraction; principal and interest are distributed as whole pesos, with rounding remainders assigned to the final installment. Saving creates one immutable loan and its installment rows, then changes the application status to `For Release`.

Loan Release v1a adds a Releases tab. Teller/Cashier sees loans marked `For Release`, verifies member and computed amounts, enters release date and a unique voucher/reference number, and confirms cash released. Cash must exactly equal net proceeds. The system creates one immutable release record, assigns it to the current Open teller batch, includes net proceeds in batch cash-out, and changes both loan and application status to `Released`. Teller cannot change principal, fee, interest, or schedule.

Loan Release v1b uses the standard teller batch review and posting cycle. Teller submits the batch cash count, Bookkeeper records any required variance note and marks the batch Reviewed, then `Post reviewed batch` creates the release journal. The entry debits the snapshotted Loans Receivable account for principal, credits the snapshotted Cash account for net proceeds, and credits the snapshotted Processing Fee Income account for the fee. The release, loan, and application become `Posted`; release history, batch details, Posted Entries, Trial Balance, and Statement of Financial Condition receive the journal evidence.

Teller Cash Funding v1a introduces a controlled custody lifecycle before cash payouts. Accountant / Bookkeeper prepares the funding with assigned Teller, whole-peso amount, source account, date, and unique reference. General Manager approves it. The assigned Teller acknowledges physical or controlled receipt into the current Open batch. The acknowledged amount becomes Opening Funding, and expected ending cash is calculated as `Opening Funding + Cash In - Cash Out`. Batch details retain the preparer, approver, acknowledger, funding source, and reference.

Teller Cash Funding v1b adds the funding-demand and payout guard. Accountant / Bookkeeper sees the loans currently marked `For Release` and their combined net proceeds beside acknowledged funding, other Open-batch cash receipts, existing cash payouts, available teller cash, and the remaining shortage. Teller/Cashier sees available cash in the release queue. The Release action is unavailable when a loan's net proceeds exceed available cash, and the backend independently rejects the attempt. Postgres locks the Open batch and recalculates cash before inserting the release, preventing two concurrent releases from consuming the same funding. Prepared and Approved amounts do not count until the assigned Teller acknowledges them.

Teller Cash Funding v1c adds accounting completion to the reviewed-batch posting cycle. After Teller submits cash count and Bookkeeper reviews the batch, `Post reviewed batch` creates one funding-transfer journal for each unposted acknowledged funding: debit `1010 - Cash on Hand` and credit the source account recorded during preparation, normally `1020 - Cash in Bank`. Loan release and other teller transaction journals are posted by the same command. Funding remains `Acknowledged` because that status proves Teller custody; separate posting fields and the linked journal number prove that the transfer reached the general ledger. The batch cannot close while acknowledged funding remains unposted.

| Loan Application Access | View | Create / Edit Own Draft | Submit Own Draft | Credit Decision |
| --- | --- | --- | --- | --- |
| System Administrator | Yes | No | No | No |
| General Manager | Yes | No | No | No |
| Loan Officer | Yes | Yes | Yes | No |
| Credit Committee / Approver | Yes | No | No | Yes |
| Auditor / Compliance Officer | Yes | No | No | No |
| Teller / Cashier | No | No | No | No |
| Membership Officer | No | No | No | No |

| Loan Computation Access | View Schedule | Preview / Save |
| --- | --- | --- |
| System Administrator | Yes | No |
| General Manager | Yes | No |
| Loan Officer | Yes | Own approved applications |
| Credit Committee / Approver | Yes | No |
| Auditor / Compliance Officer | Yes | No |
| Teller / Cashier | No | No |
| Membership Officer | No | No |

| Loan Release Access | View | Release Cash |
| --- | --- | --- |
| System Administrator | Yes | No |
| General Manager | Yes | No |
| Loan Officer | Yes | No |
| Credit Committee / Approver | Yes | No |
| Teller / Cashier | Yes | Yes |
| Auditor / Compliance Officer | Yes | No |
| Membership Officer | No | No |

| Teller Cash Funding Access | View | Prepare | Approve | Acknowledge |
| --- | --- | --- | --- | --- |
| System Administrator | Yes | No | No | No |
| General Manager | Yes | No | Yes | No |
| Accountant / Bookkeeper | Yes | Yes | No | No |
| Teller / Cashier | Yes | No | No | Assigned funding |
| Auditor / Compliance Officer | Yes | No | No | No |
| Other roles | No | No | No | No |

The implemented status flow is `Draft -> Submitted -> Approved -> For Release -> Released -> Posted`, with alternate `Rejected` or `Returned` decisions. A returned application follows `Returned -> Draft -> Submitted`. Loan collections are not yet implemented.

Initial member payment is a one-time onboarding transaction. After it exists for a member, the system blocks another initial payment; later savings activity uses Savings Deposit or Savings Withdrawal, and later share capital additions use Share Capital Contribution.

Cash-in OR/reference numbers are unique across initial member payments, share capital contributions, and savings deposits. Withdrawal voucher/reference numbers are unique across savings withdrawals.

Bookkeeper posts Teller Batch payments to the general ledger. The current slice creates a balanced journal entry: debit Cash on Hand; credit Share Capital, Membership Fee Income, and Savings Deposits Payable.

Member statements show each member's share capital balance, savings balance, initial payment activity, share capital contributions, savings transactions, posting status, and linked journal entry number once posted.

Teller/Cashier can record regular share capital contributions after onboarding. Bookkeeper posts those contributions to the ledger as debit Cash on Hand and credit Share Capital.

Teller/Cashier can record regular savings deposits after onboarding. Bookkeeper posts those deposits to the ledger as debit Cash on Hand and credit Savings Deposits Payable.

Teller/Cashier can record savings withdrawals within available savings. Bookkeeper posts those withdrawals to the ledger as debit Savings Deposits Payable and credit Cash on Hand.

The Teller/Cashier UI uses a member-first transaction workspace: select the member, review balances, choose the transaction type, then complete only the selected form.

Teller and Bookkeeper screens show unposted teller batch cash position: cash in, cash out, net cash, transaction count, and clear transaction counts for initial payments, share capital contributions, savings deposits, and savings withdrawals.

Teller/Cashier records transactions into the current Open teller batch. In this spike, the batch lifecycle is `Open -> Submitted -> Reviewed -> Closed`; Bookkeeper closes a reviewed batch after its teller transactions are posted, and the system opens the next batch for new teller activity.

Bookkeeper posting is gated by batch review: teller transactions cannot be posted until their assigned batch is Reviewed. The Bookkeeper can post the reviewed teller batch in one action; the system creates traceable journal entries for each source transaction. Cash variance is shown as a warning, and non-zero variance requires a Bookkeeper variance note before review.

Official batch close uses a confirmation step. The Bookkeeper reviews cash totals, posted and unposted counts, may enter a closing note, and the system stores closed by, closed at, and closing note for audit review.

The Ledger screen includes read-only Teller Batch History so Bookkeeper, Admin, Manager, and Auditor-style users can inspect batch status, cash count evidence, posted entry counts, unposted counts, reviewer, and close timing after the batch leaves the active work area. Each history row has a View action that opens batch details with cash count evidence, source transactions, and linked journal entries.

The Reports screen uses a report selector layout. Users choose one report at a time, review its generated timestamp, and refresh the report data without scrolling through every report on one page.

The Reports screen includes a read-only Daily Cash Position report summarizing teller batch cash in, cash out, net cash, expected cash, actual cash, variance, posting counts, and closed batch evidence.

The Reports screen also includes a read-only Member Subsidiary Ledger report summarizing member share capital balances, savings balances, movement totals, and posted/unposted transaction counts.

The Reports screen includes a Control Account Reconciliation report that compares prototype-activity subsidiary totals for Share Capital and Savings Deposits Payable against posted general ledger control account balances.

The Reports screen includes a Trial Balance report that summarizes posted general ledger debit and credit totals per account and flags whether the ledger is Balanced or Out of Balance.

The Reports screen includes a Statement of Financial Condition report. It presents assets, liabilities, and equity from posted general ledger balances. Until formal closing entries are built, current-period income and expense balances are shown as Current Period Surplus or Deficit under equity.

## 4. Core Workflow

### 4.1 Member Registration

1. Membership Officer encodes the member application.
2. Required profile details are recorded.
3. Required Initial Share Capital is reviewed.
4. Authorized officer approves membership.
5. System creates the member record and member number.
6. Teller records the initial share capital, membership fee, and savings payment.
7. System blocks duplicate initial member payments for the same member.
8. Member becomes available for paid member account activity.

Suggested status flow:

- Draft
- Pending Approval
- Active
- Suspended
- Withdrawn
- Deceased

### 4.2 Share Capital Contribution

1. Teller receives share capital payment.
2. System validates active membership.
3. System validates that the OR/reference number has not been used for another cash-in transaction.
4. Transaction is saved in Teller Batch status and receipt is generated.
5. Member share capital subsidiary balance is updated.
6. Accountant / Bookkeeper reviews and posts the teller batch.
7. System generates accounting entry when the batch is posted.

Sample accounting effect:

- Debit: Cash on Hand or Cash in Bank
- Credit: Share Capital

### 4.2.1 Initial Member Payment Posting

1. Teller records initial share capital, membership fee, and savings.
2. System validates that the member has no previous initial member payment.
3. System validates that the OR/reference number has not been used for another cash-in transaction.
4. Transaction status is Teller Batch.
5. Accountant / Bookkeeper reviews the batch in General Ledger.
6. Bookkeeper posts the transaction.
7. Transaction status becomes Posted.
8. Journal entry becomes available for ledger-driven reports.

Sample accounting effect:

- Debit: Cash on Hand
- Credit: Share Capital
- Credit: Membership Fee Income
- Credit: Savings Deposits Payable

### 4.2.2 Member Statement View

1. Authorized staff opens the active member list.
2. User selects a member statement.
3. System shows current share capital and savings balances.
4. System lists member-level initial payment, share capital contribution, savings deposit, and savings withdrawal transactions.
5. Transaction status shows whether each item is still in Teller Batch or already Posted.
6. Posted transactions show the linked journal entry number for accounting traceability.

Primary users:

- Teller / Cashier, to confirm balances before front-line transactions
- Membership Officer, to confirm onboarding completion
- General Manager, for oversight
- Accountant / Bookkeeper, for subsidiary-to-ledger reconciliation
- Auditor / Compliance Officer, for traceability review

### 4.3 Savings Deposit

1. Teller selects member savings account.
2. Teller encodes deposit amount and reference.
3. System validates account status.
4. System validates that the OR/reference number has not been used for another cash-in transaction.
5. Transaction is saved in Teller Batch status and receipt is generated.
6. Member savings balance is updated.
7. Accountant / Bookkeeper reviews and posts the teller batch.
8. Journal entry becomes available for ledger-driven reports.

Sample accounting effect:

- Debit: Cash on Hand or Cash in Bank
- Credit: Savings Deposits Payable

### 4.4 Savings Withdrawal

1. Teller selects member account.
2. System checks available balance and restrictions.
3. Teller encodes withdrawal amount.
4. System prevents withdrawals above available savings.
5. System validates that the withdrawal voucher/reference number has not been used for another withdrawal.
6. Transaction is saved in Teller Batch status.
7. Member savings balance is reduced.
8. Accountant / Bookkeeper reviews and posts the teller batch.
9. Journal entry becomes available for ledger-driven reports.

Sample accounting effect:

- Debit: Savings Deposits Payable
- Credit: Cash on Hand or Cash in Bank

### 4.5 Teller Cash Count

1. Teller reviews the unposted teller batch cash position.
2. System shows cash in, cash out, expected net cash, transaction count, and transaction mix.
3. Teller counts actual cash on hand.
4. Teller submits the cash count.
5. System stores expected cash, actual cash, variance, submitted by, and status.
6. Teller batch status moves from Open to Submitted.
7. Accountant / Bookkeeper reviews the submitted teller batch.
8. Bookkeeper marks the batch as Reviewed.
9. Bookkeeper posts all teller transactions assigned to the reviewed batch.
10. Bookkeeper confirms official close and may record a closing note.
11. System opens the next teller batch for new teller activity.

Current prototype behavior:

- Implemented batch statuses are Open, Submitted, Reviewed, and Closed.
- Transactions are assigned to the active Open batch at entry time.
- Posting is blocked until the assigned batch is Reviewed.
- Bookkeeper posts all reviewed batch transactions in one action.
- The system still creates source-level journal entries for traceability.
- A reviewed batch cannot close while it still has unposted teller transactions.
- Posting is not blocked directly by variance, but non-zero variance must be explained before review.
- Teller Batch History is read-only and shows open, submitted, reviewed, and closed batch evidence.
- Batch History View opens the read-only detail package: batch header, cash count evidence, transactions, and linked journal entries.
- Variance notes are stored with noted by and noted at fields for audit review.
- Official close stores closed by, closed at, and optional closing note.
- Daily Cash Position summarizes teller batch cash evidence for Bookkeeper, Manager, Auditor, and Board review.
- Member Subsidiary Ledger summarizes member share capital and savings balances for reconciliation.
- Control Account Reconciliation compares prototype activity subsidiary totals to posted GL control account balances.
- Trial Balance summarizes posted general ledger debit and credit totals and confirms whether the ledger remains balanced.
- Statement of Financial Condition presents the balance-sheet view and confirms whether Assets equal Liabilities plus Equity.
- Reports are opened one at a time through a selector layout instead of being stacked on a single long page.

### 4.6 Loan Application

1. Loan Officer creates application.
2. Borrower details, loan product, amount, term, co-maker, and collateral are encoded.
3. System checks member standing, share capital, savings, and existing loans.
4. Loan Officer submits recommendation.
5. Credit Committee or authorized approver reviews.
6. Application is approved, rejected, or returned.

Suggested status flow:

- Draft
- Submitted
- Under Review
- Approved
- Rejected
- Released
- Current
- Past Due
- Closed
- Written Off

### 4.7 Loan Release

1. Approved loan is selected for release.
2. System calculates deductions, charges, net proceeds, and amortization schedule.
3. Authorized user confirms release.
4. Teller or cashier disburses proceeds.
5. System posts loan receivable and related cash/bank movement.
6. Borrower loan ledger is created.

Sample accounting effect:

- Debit: Loans Receivable
- Credit: Cash on Hand or Cash in Bank
- Credit: Service Fees, if deducted
- Credit: Savings Deposits Payable, if proceeds are credited to savings

### 4.8 Loan Collection

1. Teller selects loan account.
2. System computes amount due, interest, penalties, and principal allocation.
3. Teller receives payment.
4. System updates loan amortization and outstanding balance.
5. Accounting entry is generated and posted with teller batch.

Sample accounting effect:

- Debit: Cash on Hand or Cash in Bank
- Credit: Loans Receivable
- Credit: Interest Income from Loans
- Credit: Penalties or Service Fees, if applicable

### 4.9 Journal Voucher

1. Accountant prepares journal voucher.
2. Debit and credit lines are encoded.
3. System validates that total debit equals total credit.
4. Voucher is submitted for review.
5. Authorized reviewer approves and posts.
6. Entry becomes part of the general ledger.

Suggested status flow:

- Draft
- For Review
- Posted
- Reversed

### 4.10 Month-End Closing

1. Ensure all teller batches are posted.
2. Reconcile cash on hand and bank accounts.
3. Review loan aging and interest accruals.
4. Post depreciation, accruals, and adjustments.
5. Generate trial balance.
6. Generate Statement of Financial Condition.
7. Generate Statement of Operations.
8. Lock closed period after approval.

## 5. Reporting Workflow

Reports should be generated from posted ledger entries and supporting subsidiary ledgers.

Priority reports:

- Daily Cash Position
- Member Subsidiary Ledger
- Control Account Reconciliation
- Trial Balance
- Statement of Financial Condition
- Statement of Operations
- Statement of Changes in Equity
- Cash Flow Statement
- Member Share Capital Subsidiary Ledger
- Savings Subsidiary Ledger
- Loan Portfolio Aging
- Loan Releases and Collections
- Teller Cash Position
- Audit Trail
- User Activity Report

## 6. Access Control Principles

TASETEMCO should use role-based access control with optional permission overrides.

Recommended rules:

- Every staff member has a unique username.
- Passwords are never shared.
- Inactive staff accounts are deactivated, not deleted.
- Critical transactions use maker-checker approval.
- Posted entries are reversed, not edited directly.
- User actions are recorded in an audit trail.
- Sensitive reports are limited by role.
- Cashiers can see only their own teller batches unless they have supervisor access.
- Admin access is separated from accounting approval access where possible.

## 6.1 Public Screen and Login Behavior

Before anyone logs in, the system should show a public staff login screen. This screen should show the cooperative identity, system name, and login form only. Operational data such as member balances, loans, reports, teller activity, and user lists should not be visible before authentication.

For this prototype, nine seeded users can sign in with the same temporary password: `p@55@LL`.

Best-practice production behavior:

- Initial passwords are temporary.
- Users are forced to change temporary passwords at first login.
- Passwords are stored as salted hashes, never as plain text.
- Sessions expire after a defined idle period.
- Failed login attempts are logged and eventually locked out.
- Role restrictions are enforced in both the user interface and backend API.

Current seeded users:

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

## 6.2 Persistence and Demo Reset

The React/Postgres pivot keeps in-memory seed mode when `DATABASE_URL` is blank. This preserves the original prototype behavior for quick local demos.

When Postgres settings are configured, the demo database can be prepared with:

```powershell
npm run pg:migrate
npm run pg:seed
```

For shared organic testing, messy tester input should be cleaned through the protected demo reset command:

```powershell
npm run pg:reset-demo
```

The reset command creates a JSON backup under `data/backups/`, clears the configured Postgres database tables, and reapplies the demo seed.

After local Postgres settings are confirmed, run the persistence smoke test with:

```powershell
npm run smoke:postgres
```

This resets the configured database to the demo seed, starts the backend in Postgres mode, verifies `/api/health`, and runs the core workflow against persistent tables.

## 6.3 Render Deployment

The working app can be deployed to Render as one Node Web Service. The backend serves the built React frontend from `frontend/dist`, while API routes remain under `/api`.

Recommended Render settings:

```text
Runtime: Node
Build Command: npm install && npm run build
Pre-Deploy Command: npm run render:predeploy
Start Command: npm start
Health Check Path: /api/health
```

Use Render Postgres for hosted persistence and set `DATABASE_URL` on the web service. The included `render.yaml` can be used as a Blueprint starting point.

Render free services do not expose an editable Pre-Deploy Command. On the free tier, run schema migrations manually from a local terminal using the Render External Database URL before deploying code that changes database columns:

```powershell
$env:DATABASE_URL="paste_render_external_database_url_here"
$env:PGSSLMODE="require"
npm run pg:migrate
Remove-Item Env:DATABASE_URL
Remove-Item Env:PGSSLMODE
```

Run `pg:migrate` for schema changes only. Do not run `pg:seed` or `pg:reset-demo` against the hosted demo unless the intent is to overwrite or reset hosted tester data. The health endpoint reports schema status so missing migration columns are visible before normal screens fail.

After the first successful deploy, seed demo rows once from the Render Shell:

```powershell
npm run render:seed
```

Do not run `pg:reset-demo` against the hosted demo unless the intent is to wipe organic tester input and restore the demo seed.

The `admin` user has a Demo Maintenance panel under Users. This panel shows Postgres table counts, downloads a JSON backup, and can reset hosted demo data to the seed rows. Reset requires the typed confirmation `RESET TASETEMCO` and downloads a pre-reset backup automatically.

Maintenance controls are intentionally limited to the System Administrator. Other users should not be able to access these actions through the UI or direct API calls.

The System Administrator also manages prototype staff users under Users. Admin can create a staff user, assign role and default screen, and activate or deactivate non-admin accounts. All users continue to share the prototype password `p@55@LL` until a later authentication security spike introduces per-user password storage and reset flows.

The Auditor / Compliance Officer has read-only User / Security access. Auditor can review usernames, roles, default screens, and account status, but cannot see the shared prototype password, create or modify users, download backups, or reset demo data.

Member Profile v1 adds editable master-data fields for contact number, address, birthdate, civil status, occupation/source of income, membership date, cluster/group, and status. The System Administrator and Membership Officer can update these fields. Manager, Auditor, and other member-view roles can review the profile read-only. Financial balances remain transaction-derived and cannot be edited from the profile panel.

Member Import Preview v0 supports client discovery of existing Excel columns before a write-enabled importer is built. Admin and Membership Officer can paste CSV text, map fields, and review validation results. The preview does not create or update member records.

Member Import Staging v1 persists the preview into `member_import_batches` and `member_import_rows`. It is still a review queue, not a final import. Because this spike adds Postgres tables, run `npm run pg:migrate` against the local or hosted target database before deploying the app code.

Member Import Finalize v1 adds finalization fields to import batches and keeps the accounting boundary intact: imported profile rows do not carry share capital or savings balances. Run `npm run pg:migrate` before deploying this app build to any Postgres target.

Opening Balance Import Planning v0 is intentionally read-only. It prepares the future migration path for existing members' share capital and savings balances without asking Teller/Cashier to encode historical balances one by one. Later staging/finalization should reconcile subsidiary opening balances to general ledger opening balances.

Opening Balance Import Staging schema v1 creates the future `opening_balance_import_batches` and `opening_balance_import_rows` tables. This is a schema-only foundation: it does not yet save UI previews or post opening balances. Run `npm run pg:migrate` before deploying this app build to any Postgres target.

Opening Balance Import Staging v1 stores the preview into the opening-balance staging tables and lists saved batches in Ledger. It remains a review queue only; a later finalization spike should apply approved opening balances and create the related accounting evidence.

Opening Balance Import Details v1 adds row-level batch inspection and Admin-only rejection. Rejection changes the staged batch status to `Rejected` and keeps the batch in history for audit review.

Opening Balance Import Finalization v1d.1 applies ready staged rows to member share capital and savings balances with Admin confirmation and transactional persistence. Issue rows remain unapplied. The following accounting spike must create balanced opening journal entries so these subsidiary balances reconcile to the general ledger.

Opening Balance Accounting Entries v1d.2 completes that accounting link. The clearing-account debit represents the historical assets and other opening-balance components that are not yet individually mapped in this prototype; it is not current teller cash. A later full opening-trial-balance migration should replace or reconcile the clearing amount against the cooperative's confirmed asset, liability, and equity accounts.

Opening Balance Visibility v1e makes the audit trail readable from member-facing operational screens. Finalized opening rows are immutable evidence and remain cross-referenced to their import batch, source reference, cutover date, and opening journal.

Loan Product Foundation v1 adds the `loan_products` Postgres table and seeded lending rules. Run `npm run pg:migrate` and then `npm run pg:seed-loan-products` before deploying this app build to a local or hosted Postgres target. The product-only seed is safe to run without resetting unrelated demo data. Products define future application constraints but do not create loans, schedules, releases, repayments, or journal entries yet.

Loan Application v1 adds the `loan_applications` Postgres table. Run `npm run pg:migrate` before starting or deploying this build. Full demo reset/seed includes one Submitted sample application; ordinary operation starts with the existing database contents and does not require adding fictitious applications. Product terms are copied into each application as an audit snapshot. No loan account, release, schedule, collection, or journal entry is created by this slice.

Loan Credit Review v1 adds decision columns to `loan_applications`, including assessment notes, recommendations, decision, remarks, date, actor, and timestamp. Run `npm run pg:migrate` before starting or deploying this build. The migration preserves existing applications and initializes the new review fields without seeding or resetting hosted tester data.

Loan Computation and Amortization Preview v1 adds the `loans` and `loan_installments` Postgres tables. Run `npm run pg:migrate` before starting or deploying this build. No seed is required: Approved applications are computed through the Loan Officer UI. Saving is transactional and unique per application, preventing partial or duplicate schedules. No release transaction or accounting journal is created by this slice.

Loan Release v1a adds the `loan_releases` Postgres table. Run `npm run pg:migrate` before starting or deploying this build. No seed is required. Release vouchers are unique across loan releases and savings withdrawals, each loan can be released only once, and the release is linked to a teller batch. The release remains `Teller Batch` until Loan Release v1b adds Bookkeeper posting and the balanced journal.

Loan Release v1b requires no new database table or migration beyond v1a. It uses existing journal entry tables and the posting fields already present on `loan_releases`. One-button posting is idempotent: a Posted release is excluded from the unposted batch and cannot create a duplicate journal.

Teller Cash Funding v1a adds the `teller_fundings` Postgres table. Run `npm run pg:migrate` before starting or deploying this build. No seed is required. Funding follows `Prepared -> Approved -> Acknowledged`; only acknowledged funding contributes to batch opening cash. This fixes artificial teller cash-count variance when adequate funding is acknowledged, but it does not yet post the source-account transfer to the general ledger.

Teller Cash Funding v1b requires no schema migration and no seed. It derives funding demand and available cash from existing loans, teller funding, receipts, withdrawals, and releases. Available cash is `Acknowledged Funding + Cash In - Cash Out`; the release API recalculates this under an Open-batch database lock before recording a payout.

Teller Cash Funding v1c adds nullable `posted_by`, `posted_entry_no`, and `posted_at` columns to `teller_fundings`. Run `npm run pg:migrate` before starting or deploying this build. No seed is required. The migration is additive and preserves existing funding and tester data. Reviewed-batch posting is idempotent and rejects a funding source mapped to `1010 - Cash on Hand`.

## 7. Audit Trail Requirements

The system should record who did what, when, and from where.

Minimum audit fields:

- User ID
- Role
- Date and time
- Module
- Action
- Record ID
- Previous value, when applicable
- New value, when applicable
- IP address or device name, when available

Events to audit:

- Login and logout
- Failed login attempts
- Password reset
- User role changes
- Member creation and updates
- Loan approval and release
- Teller transactions
- Journal voucher posting
- Transaction reversal
- Period closing and reopening

## 8. Planned Database Modules

For the Postgres persistence phase, the first database tables should include:

- users
- roles
- permissions
- user_roles
- members
- member_status_history
- savings_accounts
- deposit_transactions
- share_capital_transactions
- loan_products
- loans
- loan_amortization
- loan_transactions
- chart_of_accounts
- journal_entries
- journal_entry_lines
- teller_batches
- audit_logs
- accounting_periods

## 9. Prototype Screens

The current UI prototype includes:

- Dashboard
- Workflow
- Members
- Accounts
- Loans
- General Ledger
- Reports
- Users and Roles

The Workflow screen includes a role access matrix for the 9 recommended user levels and guided workflow panels for common actions.

Next recommended screens:

- Login
- User Management
- Role Management
- Member Profile Detail
- Transaction Entry
- Loan Application Detail
- Teller Batch Posting
- Journal Voucher Entry
- Audit Trail

## 9.1 Incremental Button Workflow Strategy

The prototype should make buttons functional in layers.

Layer 1 is navigation and guidance:

- Buttons route to the correct workflow panel.
- The panel shows the responsible role, normal control points, and expected steps.
- The user can see what should happen next even before full forms exist.

Layer 2 is form capture:

- Replace the workflow panel with a real form.
- Validate required fields.
- Save draft records to SQLite.
- Keep status values such as Draft, Submitted, Approved, Posted, or Reversed.

Layer 3 is posting and approval:

- Add maker-checker controls.
- Generate subsidiary ledger entries.
- Generate general ledger entries.
- Record the action in the audit trail.

This avoids building large fragile screens too early while still keeping the prototype useful and testable.

## 10. Implementation Notes

When backend work begins, the application should treat the general ledger as the source of financial statements. Member savings, share capital, and loans should have subsidiary ledgers that reconcile to their related general ledger control accounts.

For example:

- Total savings subsidiary balances should reconcile to Savings Deposits Payable.
- Total share capital subsidiary balances should reconcile to Share Capital.
- Total loan outstanding balances should reconcile to Loans Receivable.

This keeps the system useful for operations and credible for accounting review.
