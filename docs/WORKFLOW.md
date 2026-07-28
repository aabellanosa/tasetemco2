# TASETEMCO Workflow Document

For the current role-handoff views, see [TASETEMCO Current-System Workflow Diagrams](TASETEMCO_WORKFLOW_DIAGRAMS.md).

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
- Maintain previous / existing loan balances during client data setup
- Approve or reject reasoned requests to unlock a saved previous-loan revision
- Encode loan terms, collateral, co-makers, and amortization details
- Recommend approval or rejection
- Monitor delinquency and collection status

Restrictions:

- Cannot release loan proceeds
- Cannot approve loans beyond assigned authority
- Cannot alter posted collections

### 3.5 Loan Decision Responsibility

TASETEMCO currently consolidates loan decision responsibility under the System Administrator. The workflow still preserves the distinct decision step and audit trail so the responsibility can later be reassigned if the cooperative separates duties.

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
- Select previous-loan labels from active loan products and request corrections when locked
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
| General Manager | Yes | Yes | No | Yes | No | No | No | No | No | Yes | No | No | No |
| Accountant / Bookkeeper | No | No | No | No | No | No | No | No | No | Yes | Yes | Yes | Yes |
| Loan Officer | Yes | No | No | No | No | No | No | No | No | No | No | No | No |
| Teller / Cashier | Yes | No | No | No | No | Yes | Yes | Yes | Yes | No | No | No | No |
| Membership Officer | Yes | Yes | Yes | No | Yes | No | No | No | No | No | No | No | No |
| Auditor / Compliance Officer | Yes | Yes | No | No | No | No | No | No | No | Yes | No | No | No |
| Board / Read-Only Executive | No | No | No | No | No | No | No | No | No | No | No | No | No |

Previous / Existing Loans are maintained separately from general member profile fields. System Administrator, Membership Officer, and Loan Officer can encode multiple historical rows with application date, outstanding balance, and notes. Loan labels are selected from active loan products; an inactive or legacy label already stored on a row remains visible as historical until changed. The first save immediately locks the set. A later correction requires a reasoned unlock request and a Loan Officer approval or rejection with remarks. Approval permits exactly one save, which creates the next revision and locks the set again. The request, decision, actors, remarks, and timestamps form the audit trail. These setup balances do not create teller cash movement, loan release records, or ledger entries.

For demo testing across browser profiles, the Members workflow auto-refreshes every 5 seconds. The manual Refresh button pulls the latest member applications, active members, and initial payment history immediately.

Members Workspace UI Refactor v1 organizes the Members screen into role-aware tabs: Applications, Imports, Teller Transactions, Member Directory, and Transaction History. This keeps application processing, CSV import staging, teller activity, member profile review, and transaction audit history visually separate while keeping the same permissions and backend behavior.

Membership applications capture gender, a searchable Philippine ID type, ID number, and `Required Initial Share Capital` as the expected membership requirement. Either the System Administrator or General Manager may approve a submitted membership application. Teller/Cashier records the actual opening payment for share capital, membership fee, and savings after approval. The System Administrator and Membership Officer can also view and edit gender, ID type, and ID number in the member profile.

TASETEMCO Member Classification v1 makes cluster/group a controlled value instead of free text. Manual application and profile forms use a dropdown. Member imports normalize matching values case-insensitively and flag unknown classifications before staging or finalization. Approved values are `REGULAR MEMBERS CAPTURE`, `REGULAR MEMBERS NON CAPTURE`, `RETIREES`, `REGULAR MEMBERS LGU`, `COMMUNITY A MEMBERS`, and `COMMUNITY B MEMBERS`.

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

Loan Product Foundation v1 replaces the Loans placeholder with persisted lending templates. The System Administrator can create and edit product codes, amount/term limits, annual rate, interest method, payment frequency, service-fee rate, insurance rate, CBU rate, savings-retention rate, penalty rate, accounting mappings, and status. General Manager, Loan Officer, Teller / Cashier, Membership Officer, and Auditor / Compliance Officer have read-only product access. Membership Officer uses this access to select active products as previous-loan labels and cannot maintain product rules. The seeded TASETEMCO products include LBP Loan, which follows the Appliance Loan rules, is non-revolving, and permits principal up to PHP 500,000. Existing Postgres deployments add it with `npm run pg:seed-loan-products`; no schema migration is required. Petty Cash Loan is limited to PHP 1,000 to PHP 2,000 and has no service fee.

| Loan Product Access | View | Create / Edit |
| --- | --- | --- |
| System Administrator | Yes | Yes |
| General Manager | Yes | No |
| Loan Officer | Yes | No |
| Teller / Cashier | Yes | No |
| Auditor / Compliance Officer | Yes | No |
| Membership Officer | Yes | No |

Loan Application v1 adds a separate Applications tab beside Loan Products. The Loan Officer selects an active member and active product, enters requested principal, term, purpose, application date, and internal collateral type, and saves a Draft. Collateral type is limited to `PDC`, `ATM Cards`, or `Payroll`, supports management review only, and is intentionally excluded from the printed loan application form. The system validates the amount and term against the selected product and snapshots the product rules into the application so later product edits do not silently change an existing request. Only the originating Loan Officer can edit or submit their Draft.

Loan Balance Snapshot v1 records approval evidence as of the application date: the manually encoded previous-loan balance, current outstanding balance of system loans, CBU/share-capital balance, regular savings balance, and secured-savings balance. Secured savings is shown separately from regular savings and remains visible as zero when the member has no secured-savings balance. These frozen values support the organic approval logic and appear on the printable loan sheet instead of changing with later transactions.

Loan Credit Review v1 makes Submitted applications actionable for the System Administrator in TASETEMCO's current workflow. Admin records credit assessment notes, recommended principal, recommended term, decision date, and decision remarks, then chooses `Approved`, `Rejected`, or `Returned`. Approval recommendations cannot exceed the requested amount or term. Rejection and return require remarks. Returned applications remain visible with their review evidence and become editable by the originating Loan Officer; saving moves them back to Draft for resubmission. Approved and Rejected applications cannot receive another decision. The dedicated Approver demo login has been retired, but the decision step remains explicit in the workflow and audit trail.

Loan Computation and Amortization Preview v1 adds a separate Computations tab. The originating Loan Officer selects an Approved application and first payment date, then previews a repayment schedule based on the application's snapshotted principal, term, rate, interest method, payment frequency, and deduction rules. TASETEMCO products use 2.5% monthly diminishing-balance interest. Most loan products deduct a 4.5% service fee from principal, but Petty Cash Loan has no service fee. Salary, Educational, and Appliance loans also deduct 1.5% insurance, 2% CBU, and 1% savings retention; CBU may be removed only when the member is fully subscribed. Saving creates one immutable loan and its installment rows, then changes the application status to `For Release`.

Loan Release v1a adds a Releases tab. Teller/Cashier sees loans marked `For Release`, verifies member and computed amounts, enters release date and a unique voucher/reference number, and confirms cash released. Cash must exactly equal net proceeds. The system creates one immutable release record, assigns it to the current Open teller batch, includes net proceeds in batch cash-out, and changes both loan and application status to `Released`. Teller cannot change principal, fee, interest, or schedule.

Saved-computation actions `View Schedule` and `Print Breakdown` are presented on the Releases tab rather than the Computations tab. The printable loan packet defaults to 8.5 x 13 paper and is ordered as four pages: application and approval; loan-proceeds details with acknowledgement and payee signature; promissory-note appendix; and amortization schedule.

Loan Release v1b uses the standard teller batch review and posting cycle. Teller submits the batch cash count, Bookkeeper records any required variance note and marks the batch Reviewed, then `Post reviewed batch` creates the release journal. The entry debits the snapshotted Loans Receivable account for principal; credits the snapshotted Cash account for net proceeds; credits Service Fee Other Income and Insurance Other Income for deducted fees; and credits Share Capital and Savings Deposits Payable for CBU/savings retention. Posted CBU and savings retention update member balances. The release, loan, and application become `Posted`; release history, batch details, Posted Entries, Trial Balance, and Statement of Financial Condition receive the journal evidence.

Teller Cash Funding v1a introduces a controlled custody lifecycle before cash payouts. Accountant / Bookkeeper prepares the funding with assigned Teller, whole-peso amount, source account, date, and unique reference. General Manager approves it. The assigned Teller acknowledges physical or controlled receipt into the current Open batch. The acknowledged amount becomes Opening Funding, and expected ending cash is calculated as `Opening Funding + Cash In - Cash Out`. Batch details retain the preparer, approver, acknowledger, funding source, and reference.

Teller Cash Funding v1b adds the funding-demand and payout guard. Accountant / Bookkeeper sees the loans currently marked `For Release` and their combined net proceeds beside acknowledged funding, other Open-batch cash receipts, existing cash payouts, available teller cash, and the remaining shortage. Teller/Cashier sees available cash in the release queue. The Release action is unavailable when a loan's net proceeds exceed available cash, and the backend independently rejects the attempt. Postgres locks the Open batch and recalculates cash before inserting the release, preventing two concurrent releases from consuming the same funding. Prepared and Approved amounts do not count until the assigned Teller acknowledges them.

Teller Cash Funding v1c adds accounting completion to the reviewed-batch posting cycle. After Teller submits cash count and Bookkeeper reviews the batch, `Post reviewed batch` creates one funding-transfer journal for each unposted acknowledged funding: debit `1010 - Cash on Hand` and credit the source account recorded during preparation, normally `1020 - Cash in Bank`. Loan release and other teller transaction journals are posted by the same command. Funding remains `Acknowledged` because that status proves Teller custody; separate posting fields and the linked journal number prove that the transfer reached the general ledger. The batch cannot close while acknowledged funding remains unposted.

Loan Collection v1-v2 introduces flexible receipt collection against the earliest unpaid installment. Teller/Cashier selects a posted loan and the system presents the next collectible installment, the amount due now, and the total remaining loan balance. Teller may enter the actual amount received as a partial, full, or advance payment, but cannot exceed the remaining loan balance. The system previews the allocation before confirmation: interest is applied first, then principal, and any excess over the current installment is treated as advance principal payment. A unique official receipt/reference is required. Recording creates an immutable cash-in row in the Open teller batch and updates installment status as `Partial` or `Paid`. After Teller cash count and Bookkeeper review, `Post reviewed batch` debits Cash on Hand for the total received, credits Loans Receivable for principal applied, and credits Interest Income for interest applied. Bookkeeper sees the same principal-applied and interest-applied split in the unposted teller batch and batch details before posting. Loan Officer, Admin, Manager, and Auditor have read-only collection visibility.

Loan Portfolio Watch v1 makes collection follow-up visible on authorized dashboards. The seeded demo includes one posted loan with an overdue installment and one installment due within 7 days. Borrower-level alert details are shown only to management, loan, accounting, audit, and executive roles because overdue loan information is sensitive member credit data. Teller/Cashier and Membership Officer dashboards do not receive portfolio-wide borrower details.

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
| Loan Officer | Yes | No |
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

The implemented status flow is `Draft -> Submitted -> Approved -> For Release -> Released -> Posted`, with alternate `Rejected` or `Returned` decisions. A returned application follows `Returned -> Draft -> Submitted`. The dedicated Approver role is removed; System Administrator owns the separate audited decision step. Flexible partial, full, and advance loan collections are implemented against the earliest collectible installment.

Initial member payment is a one-time onboarding transaction. After it exists for a member, the system blocks another initial payment; later savings activity uses Savings Deposit or Savings Withdrawal, and later share capital additions use Share Capital Contribution.

Cash-in OR/reference numbers are unique across initial member payments, share capital contributions, and savings deposits. Withdrawal voucher/reference numbers are unique across savings withdrawals.

Bookkeeper posts Teller Batch payments to the general ledger. The current slice creates a balanced journal entry: debit Cash on Hand; credit Share Capital, Membership Fee Income, and Savings Deposits Payable.

Member statements show each member's share capital balance, savings balance, initial payment activity, share capital contributions, savings transactions, posting status, and linked journal entry number once posted.

Teller/Cashier can record regular share capital contributions after onboarding. Bookkeeper posts those contributions to the ledger as debit Cash on Hand and credit Share Capital.

Teller/Cashier can record regular savings deposits after onboarding. Bookkeeper posts those deposits to the ledger as debit Cash on Hand and credit Savings Deposits Payable.

Teller/Cashier can record savings withdrawals within available savings. Bookkeeper posts those withdrawals to the ledger as debit Savings Deposits Payable and credit Cash on Hand.

The Teller/Cashier UI uses a member-first transaction workspace: search and select the member, review balances, choose the transaction type, then complete only the selected form. The shared Chakra member autocomplete supports name, member number, cluster, and contact-number matching. Up/Down changes the highlighted result, Enter selects, Tab selects and advances, and Escape closes without changing the selection. This keyboard path is also used for cost-center charge rows and loan applications.

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

SUMMO Report v1 adds a monthly `REGULAR MEMBERS CAPTURE` operational receivables report. Finalized C1 and C2 cost-center payables supply Canteen, finalized WRS payables supply WRS, finalized GMAR / G-mar Commercial payables supply G-mar Capital, and posted Monthly Contributions supply TFEA, CBU, and Secured Savings directly from system transactions. The existing SUMMO calculation applies the configured 200-basis-point G-mar interest rate. Bookkeeper uses the XLSX import only for categories not yet captured in-system, reviews validation, finalizes the import, and refreshes a draft. The system combines both source types with active member data, scheduled system loan installments, posted cash collections, and an opening or prior locked SUMMO balance. General Manager locks or reopens periods; Auditor and Board have read-only access. The system-generated analytical export contains Regular Capture, Loan Details, and Audit sheets. SUMMO imports and cost-center payables do not create accounting journals; cash-paid Monthly Contributions post through the reviewed teller batch.

Client-format SUMMO Workbook v1 preserves the cooperative's exact six-sheet workbook as a controlled output template. `Generate Preview` reads current system movements, while `Download Locked Version` requires an already locked SUMMO month. The first-sheet pilot fills only `REG_MEM_CAP`: Active Regular Capture member names; the earliest posted LBP due date and monthly installment in columns F and G; G-mar Capital in column P; Canteen in column S; WRS in column T; and posted TFEA, CBU, and Secured Savings in columns U, V, and AE. Native LBP schedules replace new external LBP imports. An overlap with a legacy finalized LBP import blocks locking to prevent double counting. Protected column Q remains untouched and retains the workbook's shared `=P[row]*0.02` interest formula. The other five cluster sheets, formulas, headers, merged cells, and formatting remain unchanged. Generation stops if the expected sheet/header/color safeguards fail or if the Active Regular Capture roster exceeds the current 67 member rows.

| SUMMO Access | View / Export | Prepare Imports and Drafts | Lock / Reopen |
| --- | --- | --- | --- |
| System Administrator | Yes | Yes | Yes |
| General Manager | Yes | No | Yes |
| Accountant / Bookkeeper | Yes | Yes | No |
| Auditor / Compliance Officer | Yes | No | No |
| Board / Read-Only Executive | Yes | No | No |

Daily Cost Center Payables v1 gives Teller/Cashier a multi-member Draft batch for Canteen A, Canteen B, WRS, GMAR / G-mar Commercial, and future configured centers. Canteen A/B retain codes C1/C2 and both map to SUMMO Canteen. GMAR is seeded with type `Commercial Store` and SUMMO mapping `G-mar Capital`. A transaction date may be backdated for a skipped input day. Drafts have no payable effect and only the creating Teller may edit them. Finalization creates immutable member payable movements and snapshots the cost center's SUMMO mapping so a later configuration change cannot rewrite historical reports. Correction is a linked negative reversal with a required reason, followed by a corrected row in a new Draft. Admin configures centers and reviews activity but does not encode, finalize, or reverse payable batches unless explicitly assigned an additional Teller role.

General Manager, Accountant / Bookkeeper, and Auditor can reconcile cost-center activity by date, center, status, or member and drill down through batch, source entry, movement, actor, and reason. A member filter recalculates totals and row counts for only that member, including the member's portion of a mixed-member batch.

Cost-center movements are routed by member cluster. The current SUMMO consumes only Active `REGULAR MEMBERS CAPTURE` members. Transactions for Non Capture, LGU, Retirees, Community A, and Community B remain recorded and reconcilable but await their respective cluster reports; their absence from Regular Capture SUMMO does not mean the transactions were lost.

Monthly Member Contributions v1 gives Teller/Cashier a separate multi-member Draft for cash-paid TFEA, CBU, and Secured Savings. Saving a Draft has no cash, balance, payable, journal, or SUMMO effect. The creating Teller adds the batch to the current Open teller batch using a unique official receipt/reference; its full total then forms part of expected cashier cash. After cash count and Bookkeeper review, reviewed-batch posting debits `1010 - Cash on Hand`, credits `2030 - TFEA Payable`, `3010 - Share Capital`, and `2040 - Secured Savings Payable`, creates immutable SUMMO movements, and increases each member's CBU/share-capital balance by the posted CBU amount. These contributions never aggregate into member payables.

Secured Savings Subsidiary v1 maintains a member `secured_savings_balance` independently from regular savings. Posted Monthly Contributions increase this secured balance. Teller/Cashier may record a Secured Savings Withdrawal against the posted balance less pending withdrawals. Recording reserves availability and adds a cash-out row to the Open teller batch without reducing the posted balance. Bookkeeper posting debits `2040 - Secured Savings Payable`, credits `1010 - Cash on Hand`, and decreases only the secured balance. Member statements, transaction history, the Member Subsidiary Ledger, and Control Account Reconciliation show Secured Savings separately.

Daily Remittance v1 gives Teller/Cashier a fixed-grid cash Draft for money turned over by cooperative operations and service units. Every Active Admin-configured definition appears automatically; zero-value rows remain visual only and are not saved. The Teller records a Remittance Date, Cash Received Date, globally unique receipt/reference, positive source amounts, and optional remarks. The operational date may be backdated but cannot follow the cash date. Adding the Draft to the Open teller batch includes its total in expected cashier cash. After cash count and Bookkeeper review, posting debits `1010 - Cash on Hand` and credits the income account snapshotted from each source definition. Canteen A/B retain separate cost centers. WRS and Water Bottle A/B roll up under WRS while preserving source detail. POS, GCASH, and LOADER are standalone, non-cost-center sources; each retains its own reporting group and posts to `4080 - Other Operating Income`. Piso WiFi A/B, Printing & Photocopy, Water Vendo A/B, Catering, and additional Admin-configured sources retain their own reporting definitions. Daily Remittance creates no member payable and has no SUMMO effect.

Daily Disbursement v1 mirrors Daily Remittance as a fixed-grid cash-out Draft. Admin configures category name, reporting group, optional cost center, `5xxx` expense account, display order, and status. The initial categories are Canteen A, Canteen B, WRS, Building and renovations, Travel, and Other expenses. Canteen A/B and WRS retain cost-center attribution; the other initial categories belong to cooperative operations. Teller records a backdateable Disbursement Date, actual Cash Disbursed Date, globally unique voucher/reference, positive category amounts, and optional remarks. Adding the Draft to the Open teller batch includes its total in cash-out. After cash count and Bookkeeper review, posting debits the snapshotted expense accounts and credits `1010 - Cash on Hand`. The Teller cash position and Admin Outstanding Teller Batch use the same active batch ID and therefore must show matching transaction rows and counts.

| Cost Center Access | Configure Centers | Encode / Finalize / Reverse | Reconcile / Drill Down |
| --- | --- | --- | --- |
| System Administrator | Yes | No | Yes |
| Teller / Cashier | No | Yes, own Draft/finalized sources | Batch history and movement audit |
| General Manager | No | No | Yes |
| Accountant / Bookkeeper | No | No | Yes |
| Auditor / Compliance Officer | No | No | Yes |

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
5. System Administrator records the loan decision.
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
2. System shows amount due now and remaining loan balance.
3. Teller receives the actual amount paid.
4. System previews whether the receipt is partial, full, or advance.
5. System applies payment to interest first, then principal.
6. Bookkeeper reviews the allocation in the teller batch.
7. Accounting entry is generated and posted with teller batch.

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

### 4.11 Daily Cost-Center Payable Capture

1. Teller selects C1, C2, WRS, GMAR / G-mar Commercial, or another Active cost center.
2. Teller selects the transaction date; skipped days may be entered later using the actual date.
3. Teller searches and selects one or more Active members and records amount, source reference, and remarks.
4. System saves a Draft batch without changing member payables.
5. The creating Teller may revise their Draft.
6. Teller or Admin finalizes the batch.
7. System creates one immutable payable movement for every source row and stores the posting-time SUMMO mapping.
8. If incorrect, the creating Teller or Admin enters a required reason and creates a linked reversal.
9. Any replacement amount is entered through a new Draft instead of editing finalized evidence.
10. Management reviewers reconcile totals and drill down to the member and movement evidence.

Status and correction flow:

- `Draft -> Finalized`
- `Finalized Charge -> Linked Reversal`
- A finalized source row is never edited or deleted.

### 4.12 Monthly Member Contribution Cash Capture

1. Teller opens Members -> Monthly Contributions and selects the contribution month.
2. Teller enters a unique official receipt/reference and one or more Active member rows.
3. Each row may contain TFEA, CBU, Secured Savings, or any combination; at least one amount must be positive.
4. Teller saves a Draft. The Draft has no cash, balance, payable, journal, or SUMMO effect.
5. The creating Teller adds the Draft to the current Open teller batch.
6. System includes the full batch total in expected cashier cash and blocks duplicate cash-in references.
7. Teller submits the cash count; Bookkeeper reviews the teller batch and records any required variance note.
8. Bookkeeper posts the reviewed batch. The system creates one balanced contribution journal, posts system SUMMO movements, and increases each member's CBU/share-capital balance.
9. A locked Regular Capture SUMMO month blocks new or unposted contribution activity for affected members.

Secured Savings withdrawal continuation:

1. Teller selects an Active member and reviews Regular Savings and Secured Savings as separate balances.
2. Teller selects Secured Savings Withdrawal and enters the amount plus a unique voucher/reference.
3. System validates the amount against posted Secured Savings less all pending secured withdrawals.
4. Recording reserves availability and adds cash-out to the current Open teller batch; the posted balance does not change yet.
5. Teller submits the cash count and Bookkeeper reviews the batch.
6. Posting debits Secured Savings Payable, credits Cash on Hand, decreases the member secured balance, and leaves regular savings unchanged.

### 4.13 Daily Remittance Cash Capture

1. Admin maintains remittance-source definitions: name, reporting group, optional cost center, income account, display order, and Active/Inactive status.
2. Teller opens Members -> Daily Remittance. The fixed grid displays every Active configured source automatically.
3. Teller enters the operational Remittance Date, actual Cash Received Date, globally unique receipt/reference, source amounts, and optional remarks.
4. Only positive grid rows are saved. The Draft has no cash, journal, member-payable, or SUMMO effect.
5. The creating Teller adds the Draft to the current Open teller batch, making its total part of expected cashier cash.
6. Teller submits the cash count; Bookkeeper reviews the batch and records any required variance note.
7. Bookkeeper posts the reviewed batch. The journal debits Cash on Hand and credits the snapshotted income accounts.
8. Canteen A/B remain separately attributable. WRS and Water Bottle A/B retain source detail while rolling up under WRS.
9. POS, GCASH, and LOADER remain standalone, have no cost center, and post to `4080 - Other Operating Income`.
10. Admin, management, accounting, and audit users have read-only transaction access. Only Teller/Cashier sees New, Save Draft, and Add to Teller Batch.

### 4.14 Daily Disbursement Cash Capture

1. Admin maintains category definitions: name, reporting group, optional cost center, expense account, display order, and Active/Inactive status.
2. Teller opens Members -> Daily Disbursement. Every Active category appears in a fixed grid.
3. Teller enters a Disbursement Date, actual Cash Disbursed Date, unique voucher/reference, positive amounts, and optional remarks. The operational date may be backdated but cannot follow the actual cash date.
4. Only positive rows are saved. A Draft has no cash or journal effect.
5. The creating Teller adds the Draft to the current Open teller batch, making its total part of cash-out and expected ending cash.
6. Teller and Admin monitor the same active batch ID; their batch transaction counts and rows must reconcile.
7. Teller submits the cash count and Bookkeeper reviews the batch.
8. Bookkeeper posts the reviewed batch. The journal debits the snapshotted `5xxx` expense accounts and credits `1010 - Cash on Hand`.
9. Canteen A/B retain cost centers C1/C2, WRS retains cost center WRS, and Building and renovations, Travel, and Other expenses remain attributed to cooperative operations.
10. Admin may add future categories or revise unposted category definitions. Saved entries retain their expense-account and cost-center snapshots.

### 4.15 Regular Capture SUMMO Preparation and Locking

1. Teller completes and finalizes relevant C1, C2, WRS, and GMAR batches.
2. Bookkeeper uses XLSX only for categories still outside system capture.
3. System combines finalized cost-center movements, finalized Excel movements, loan installments, posted collections, and carried/opening balance.
4. System blocks locking when a relevant cost-center Draft remains, when the same Canteen/WRS/G-mar category appears in both system and Excel, or when mapping/period validation is unresolved.
5. Bookkeeper refreshes the Draft and reconciles source totals plus batch/member/movement drill-down.
6. General Manager or Admin locks the monthly version.
7. A locked Regular Capture period blocks new, edited, finalized, or reversed cost-center activity for affected members and dates.
8. General Manager or Admin may reopen with a required audit reason; every later locked SUMMO period is reopened as part of the forward chain.
9. Screen filtering to one member does not change the complete stored snapshot or XLSX export.
10. Bookkeeper or Admin may generate a client-format Preview before locking; it fills only member names, G-mar Capital, Canteen, and WRS on `REG_MEM_CAP` from finalized system movements.
11. After locking, an authorized report viewer may download the official Locked client-format workbook.
12. System validates the six expected worksheets, first-sheet title and headers, approved light-green target cells, formula protection, and 67-row capacity before writing any output.

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
- Regular Members Capture SUMMO
- Cost Center Charge Reconciliation

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

For this prototype, eight seeded users can sign in with the same temporary password: `p@55@LL`. The former dedicated loan-approver login has been removed; System Administrator owns the explicit decision step in the current workflow.

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

Member Profile v1 adds editable master-data fields for contact number, address, birthdate, gender, civil status, occupation/source of income, membership date, cluster/group, Philippine ID type, ID number, and status. ID type uses the same searchable selection available in membership applications. The System Administrator and Membership Officer can update these fields. Manager, Auditor, and other member-view roles can review the profile read-only. Financial balances remain transaction-derived and cannot be edited from the profile panel.

Previous / Existing Loans v1 replaces the single manual previous-loan amount with a normalized multi-row member detail table. Each row captures loan label, application date, outstanding balance, and notes. System Administrator, Membership Officer, and Loan Officer can maintain this loan-history section; Loan Officer receives this specific capability without receiving full member-profile edit access.

TASETEMCO Member Classification v1 makes cluster/group a controlled value instead of free text. The approved values are `REGULAR MEMBERS CAPTURE`, `REGULAR MEMBERS NON CAPTURE`, `RETIREES`, `REGULAR MEMBERS LGU`, `COMMUNITY A MEMBERS`, and `COMMUNITY B MEMBERS`. Excel/CSV import rows with unknown classifications are treated as issue rows until corrected.

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

Loan Product Foundation v1 adds the `loan_products` Postgres table and seeded lending rules. TASETEMCO loan rules add service-fee, insurance, CBU, savings-retention, optional-CBU, and related account-mapping columns. Run `npm run pg:migrate` and then `npm run pg:seed-loan-products` before deploying this app build to a local or hosted Postgres target. The product-only seed is safe to run without resetting unrelated demo data. Products define future application constraints but do not create loans, schedules, releases, repayments, or journal entries yet.

Loan Application v1 adds the `loan_applications` Postgres table. Loan Collateral Tracking v1 adds `loan_applications.collateral_type` for internal management review, limited to `PDC`, `ATM Cards`, or `Payroll`; this field is intentionally excluded from the printed loan application form. Run `npm run pg:migrate` before starting or deploying this build. Full demo reset/seed includes one Submitted sample application; ordinary operation starts with the existing database contents and does not require adding fictitious applications. Product terms and application-date member balances are copied into each application as audit snapshots. No loan account, release, schedule, collection, or journal entry is created by this slice.

Loan Credit Review v1 adds decision columns to `loan_applications`, including assessment notes, recommendations, decision, remarks, date, actor, and timestamp. Run `npm run pg:migrate` before starting or deploying this build. The migration preserves existing applications and initializes the new review fields without seeding or resetting hosted tester data.

Loan Computation and Amortization Preview v1 adds the `loans` and `loan_installments` Postgres tables. Run `npm run pg:migrate` before starting or deploying this build. No seed is required: Approved applications are computed through the Loan Officer UI. Saving is transactional and unique per application, preventing partial or duplicate schedules. No release transaction or accounting journal is created by this slice.

Loan Release v1a adds the `loan_releases` Postgres table. Run `npm run pg:migrate` before starting or deploying this build. No seed is required. Release vouchers are unique across loan releases and savings withdrawals, each loan can be released only once, and the release is linked to a teller batch. The release remains `Teller Batch` until Loan Release v1b adds Bookkeeper posting and the balanced journal.

Loan Release v1b requires no new database table or migration beyond v1a. It uses existing journal entry tables and the posting fields already present on `loan_releases`. One-button posting is idempotent: a Posted release is excluded from the unposted batch and cannot create a duplicate journal.

Teller Cash Funding v1a adds the `teller_fundings` Postgres table. Run `npm run pg:migrate` before starting or deploying this build. No seed is required. Funding follows `Prepared -> Approved -> Acknowledged`; only acknowledged funding contributes to batch opening cash. This fixes artificial teller cash-count variance when adequate funding is acknowledged, but it does not yet post the source-account transfer to the general ledger.

Teller Cash Funding v1b requires no schema migration and no seed. It derives funding demand and available cash from existing loans, teller funding, receipts, withdrawals, and releases. Available cash is `Acknowledged Funding + Cash In - Cash Out`; the release API recalculates this under an Open-batch database lock before recording a payout.

Teller Cash Funding v1c adds nullable `posted_by`, `posted_entry_no`, and `posted_at` columns to `teller_fundings`. Run `npm run pg:migrate` before starting or deploying this build. No seed is required. The migration is additive and preserves existing funding and tester data. Reviewed-batch posting is idempotent and rejects a funding source mapped to `1010 - Cash on Hand`.

Loan Collection v1a adds the `loan_collections` Postgres table. Run `npm run pg:migrate` before starting or deploying this build. Loan Collection v1 allows multiple receipts against the same installment so partial payments can be completed later; official receipt references remain unique across cash-in transactions. Recording plus installment status update is transactional. Existing organically created posted loans become collectible without rebuilding their schedules.

Loan Collection v2 is UI-only and requires no migration. It makes the allocation discoverable before Teller confirms the receipt and in Bookkeeper review surfaces: interest applied, principal applied, amount received, payment type, and balance after receipt.

Daily Cost Center Payables v1 adds `cost_centers`, `member_charge_batches`, `member_charge_entries`, and `member_charge_movements`. The SUMMO integration adds a posting-time `summo_column` snapshot to movements and backfills existing movements from their current cost-center configuration. The G-mar extension seeds `GMAR / G-mar Commercial` with SUMMO mapping `G-mar Capital`; run `npm run pg:migrate` so an existing Postgres installation receives that cost center. The later searchable-selector and report-filter UI changes require no schema migration.

Monthly Member Contributions adds `monthly_contribution_batches`, `monthly_contribution_entries`, and `monthly_contribution_movements`, including teller-batch and journal-posting evidence. Run `npm run pg:migrate` before deploying this build. No seed or reset is required.

Secured Savings Subsidiary adds `members.secured_savings_balance` and `secured_savings_withdrawals`. Run `npm run pg:migrate` before deployment. The migration is additive and requires no seed or reset.

Daily Remittance adds `remittance_sources`, `daily_remittance_batches`, and `daily_remittance_entries`. The migration seeds the standard source definitions and renames cost-center display names Canteen 1/2 to Canteen A/B while retaining codes C1/C2 and existing SUMMO mappings. Run `npm run pg:migrate` before deployment. No full seed or reset is required.

Daily Disbursement adds `disbursement_categories`, `daily_disbursement_batches`, and `daily_disbursement_entries`. The migration seeds Canteen A, Canteen B, WRS, Building and renovations, Travel, and Other expenses using `ON CONFLICT DO NOTHING`. Run `npm run pg:migrate` after deploying the application build. No separate `pg:seed` or database reset is required.

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
