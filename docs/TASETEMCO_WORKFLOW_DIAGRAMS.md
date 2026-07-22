# TASETEMCO Current-System Workflow Diagrams

Updated: 21 July 2026

These diagrams describe the implemented React, Node/Express, and Postgres prototype. They distinguish operational records, teller-batch posting, report-only SUMMO imports, and role handoffs.

## Find a Workflow in the UI

| Work | Primary role | UI location |
| --- | --- | --- |
| Receive initial/share/savings payments or release savings | Teller / Cashier | Members -> Teller Transactions |
| Encode C1, C2, WRS, or G-mar Commercial member payables | Teller / Cashier | Members -> Cost Center Charges |
| Collect monthly TFEA, CBU, and Secured Savings | Teller / Cashier | Members -> Monthly Contributions |
| Review cost-center totals or one member | General Manager / Bookkeeper / Auditor | Ledger or Members -> Cost Center Charges |
| Create and submit a loan application | Loan Officer | Loans -> Applications |
| Decide a submitted loan | System Administrator | Loans -> Applications |
| Release or collect a loan | Teller / Cashier | Loans -> Releases / Collections |
| Prepare Regular Capture SUMMO | Bookkeeper / Admin | Reports -> Regular Members Capture SUMMO |
| Generate client-format SUMMO Preview | Bookkeeper / Admin | Reports -> Regular Members Capture SUMMO |
| Download official client-format workbook | Authorized report viewer, after lock | Reports -> Regular Members Capture SUMMO |
| Lock or reopen SUMMO | General Manager / Admin | Reports -> Regular Members Capture SUMMO |

Searchable member fields support mouse-free use: type a name, member number, cluster, or contact number; use Up/Down to highlight; use Enter to select or Tab to select and continue to the next field. Loan release and collection queues can be filtered by loan number, member name, or member number.

Legend:

```text
[Role]       staff action
(System)     validation, calculation, persistence, or generated output
-->          workflow handoff
==>          general-ledger effect
```

## 1. Membership, Initial Payment, and Member Setup

```text
[Membership Officer]
  Encode application and required initial share capital
        |
        v
(System) Validate and save Pending Approval
        |
        v
[System Administrator] Approve membership
        |
        v
(System) Create active member with controlled cluster/type
        |
        v
[Teller] Collect initial share, membership fee, and savings
        |
        v
(System) Add immutable receipt to Open Teller Batch
        |
        v
[Bookkeeper] Review batch --> Post --> Close
        |
        v
==> Cash / Share Capital / Fee Income / Savings Payable
```

Member setup additions:

```text
[Membership Officer or Admin]
  Maintain profile and controlled member classification

[Membership Officer, Loan Officer, or Admin]
  Select each label from Active Loan Products
  Enter application date, balance, and notes
        |
        v
(System) Save revision 1 and immediately lock the loan set
        |
        v
[Membership Officer, Loan Officer, or Admin]
  Submit a reasoned unlock request when correction is needed
        |
        v
[Loan Officer] Approve or reject with decision remarks
        |
        +---- Rejected ----> (System) Keep loan set locked
        |
        +---- Approved ----> (System) Allow exactly one save
                                      |
                                      v
                            Save next revision and lock again

(System)
  Retain request, decision, actor, remarks, and timestamps
  Keep inactive historical labels visible until replaced
  Treat rows as setup/reference data only; do not create
  cash movement or a new system loan
```

## 2. Member Masterlist Import

```text
[Membership Officer or Admin]
  Paste CSV exported from the client workbook
  Map source columns to member fields
        |
        v
(System)
  Normalize member number and cluster/type
  Validate names, dates, duplicates, status, and classifications
  Mark each row Ready or Issue
        |
        v
[Membership Officer or Admin] Stage reviewed import batch
        |
        v
[System Administrator] Finalize ready rows
        |
        v
(System)
  Create active member profiles with zero financial balances
  Retain skipped and issue rows as audit evidence
```

## 3. Financial Opening Balance Import

```text
[Bookkeeper or Admin]
  Map member, share capital, savings, cutover date, and source reference
        |
        v
(System) Validate member, money, dates, duplicates, and prior finalization
        |
        v
[Bookkeeper or Admin] Stage and review batch
        |
        v
[System Administrator] Finalize ready rows
        |
        v
(System)
  Update member share/savings balances
  Retain source and batch evidence
        |
        v
==> Debit Opening Balance Clearing
    Credit Share Capital
    Credit Savings Deposits Payable
```

## 4. Normal Teller Transaction and Batch Lifecycle

```text
[Teller]
  Search and select active member
  Record initial payment, share contribution,
  savings deposit, or savings withdrawal
        |
        v
(System)
  Validate balance, amount, member status, and unique reference
  Add transaction to Open batch
        |
        v
[Teller] Count cash --> Submit batch
        |
        v
[Bookkeeper]
  Review cash evidence and variance
  Record required variance note
  Mark Reviewed
        |
        v
[Bookkeeper] Post reviewed batch
        |
        v
(System) Create and link source journals
        |
        v
[Bookkeeper] Close fully posted batch
        |
        v
(System) Lock history and open the next batch
```

Keyboard path: type to filter, use Up/Down, then press Tab to select and advance. The same member autocomplete is used in Teller transactions, loan applications, and cost-center charge rows.

## 5. Loan Application and Decision — No Dedicated Loan Approver

```text
[Loan Officer]
  Select active member and loan product
  Encode amount, term, purpose, date, and internal collateral
  Save/edit own Draft
  Prepare and print supporting paper form
        |
        v
[Loan Officer] Submit application
        |
        v
(System) Make Submitted application read-only
        |
        v
[System Administrator]
  Review assessment and supporting data
  Approve, Reject, or Return
        |                         |
        | Returned                | Approved
        v                         v
[Loan Officer] Revise Draft   [Loan Officer]
  and resubmit                 Preview and save computation
                                  |
                                  v
                              (System)
                                Create immutable loan and schedule
                                Mark For Release
```

Controls:

```text
The dedicated Credit Committee / Approver login and role are removed.
The decision remains a separate audited step owned by System Administrator.
Loan Officer cannot decide, release cash, or post the resulting journal.
```

## 6. Loan Computation and Documents

```text
[Loan Officer]
  Select Approved application and first-payment date
        |
        v
(System)
  Use snapshotted product terms
  Calculate deductions, net proceeds, and installment schedule
        |
        v
[Loan Officer]
  Review computation
  Save immutable schedule
  Print loan breakdown / amortization attachment
        |
        v
(System) Mark loan For Release; no cash moves yet
```

## 7. Teller Funding and Loan Release

```text
(System) Show For Release demand and available teller cash
        |
        v
[Bookkeeper] Prepare funding transfer
        |
        v
[General Manager] Approve funding
        |
        v
[Assigned Teller] Acknowledge funding into Open batch
        |
        v
(System) Recalculate available cash and guard concurrent releases
        |
        v
[Teller] Release exact net proceeds with unique voucher
        |
        v
(System) Add release as Open-batch cash-out evidence
        |
        v
[Bookkeeper] Review and post batch
        |
        v
==> Funding: Debit Cash on Hand / Credit source account
==> Release: Debit Loans Receivable / Credit Cash and deductions
```

## 8. Flexible Loan Collection

```text
[Teller] Select posted loan and next collectible installment
        |
        v
(System) Show due now, remaining loan balance, and payment preview
        |
        v
[Teller]
  Enter actual partial, full, or advance receipt
  Enter unique OR/reference
        |
        v
(System)
  Apply payment to interest first, then principal
  Prevent receipt above remaining loan balance
  Mark installment Partial or Paid
  Add receipt to Open Teller Batch
        |
        v
[Bookkeeper] Review allocation and post batch
        |
        v
==> Debit Cash on Hand
    Credit Interest Income
    Credit Loans Receivable
```

## 9. Standard Ledger-Driven Reports

```text
[Teller and operational modules] Produce source evidence
        |
        v
[Bookkeeper] Review and post teller batches/journals
        |
        v
(System)
  Daily Cash Position
  Member Subsidiary Ledger
  Control Account Reconciliation
  Trial Balance
  Statement of Financial Condition
        |
        v
[Manager / Board / Auditor] Read-only review and oversight
```

## 10. Daily Cost-Center Member Payables

```text
[System Administrator]
  Maintain cost centers and future SUMMO mapping
  Seeded mappings:
    C1/C2 -> Canteen
    WRS   -> WRS
    GMAR  -> G-mar Capital
        |
        v
[Teller / Cashier]
  Choose cost center and transaction date
  Search/select one or more Active members
  Enter amount, source reference, and optional remarks
        |
        v
(System) Save Draft batch; no member payable effect yet
        |
        +---- Teller edits own Draft or adds skipped-day input
        |
        v
[Creating Teller or Admin] Finalize batch
        |
        v
(System)
  Create immutable member payable movement per source row
  Snapshot cost-center-to-SUMMO mapping at finalization
  Show movement on member statement and reconciliation
        |
        +---- Incorrect charge ----> [Creating Teller or Admin]
        |                              Enter required reversal reason
        |                                    |
        |                                    v
        |                           (System) Create linked negative movement
        |                                    |
        |                                    v
        |                           Enter correction in a new Draft batch
        v
[Manager / Bookkeeper / Auditor]
  Reconcile by date, center, status, or member
  Drill down to batch, source entry, movement, actor, and reason
```

Cost-center controls:

```text
Draft                         editable only by its creating Teller
Finalized source rows         immutable
Correction                    linked reversal with mandatory reason
Duplicate center/date/ref     rejected
Skipped transaction day       allowed through backdated Draft date
Locked Regular Capture month  blocks new/edit/finalize/reverse activity
Reopened month                permits correction and retains reopen audit
```

Member-filtered reconciliation recalculates row counts and amounts for only the selected member, including that member's portion of a mixed-member batch. Clearing the member filter restores full-batch totals.

## 11. Monthly Member Contribution Cash Collection

```text
[Teller / Cashier]
  Open Members -> Monthly Contributions
  Select contribution month
  Enter unique official receipt/reference
  Add Active members with TFEA, CBU, and/or Secured Savings
        |
        v
(System) Save Draft
  no cash effect
  no member balance effect
  no member payable effect
  no journal or SUMMO effect
        |
        v
[Creating Teller] Add to current Open teller batch
        |
        v
(System) Include the full total in expected cashier cash
        |
        v
[Teller] Submit cash count
        |
        v
[Bookkeeper] Review and post teller batch
        |
        v
(System)
  Debit Cash on Hand
  Credit TFEA Payable
  Credit Share Capital for CBU
  Credit Secured Savings Payable
  Create immutable SUMMO movements
  Increase member CBU/share-capital balances
```

Monthly Contributions do not aggregate member payables. Only Posted contribution movements fill TFEA, CBU, and Secured Savings in SUMMO. A locked Regular Capture month blocks new or unposted activity for affected members.

## 12. Cost Center and Other Sources into SUMMO — Regular Members Capture

```text
(System sources)
  Finalized C1/C2 payable movements -> Canteen
  Finalized WRS payable movements   -> WRS
  Finalized GMAR payable movements  -> G-mar Capital
  Posted cash contribution movements -> TFEA, CBU, Secured Savings
  Posted loan installments and collections
        |
        +-------------------------+
                                  |
[Bookkeeper]                      |
  Use XLSX only for categories    |
  not yet captured in-system:     |
  LBP, G-mar, provident,          |
  honorarium, payroll deduction,  |
  opening balance, and adjustments|
        |
        v
[Bookkeeper] Upload XLSX and review Ready / Issue rows
        |
        v
(System)
  Require member number, in-period date, category,
  positive amount, unique reference, and valid reversal reference
        |
        v
[Bookkeeper] Finalize valid import batch
        |
        v
(System)
  Combine finalized system and external movements with:
    active Regular Capture roster
    scheduled system loan installments due in the month
    posted system cash collections
    opening balance or prior locked SUMMO ending balance

  Calculate configurable interest and two-decimal totals
  Carry member credit when ending balance is negative
  Block locking when:
    relevant cost-center Draft batches remain
    monthly contribution batches remain Draft or unposted
    a system-managed category also exists in Excel imports
    a finalized cost center has no supported SUMMO mapping
    loan products or period-chain rules are unresolved
        |
        v
[Bookkeeper] Refresh and reconcile Draft
  Review source totals and movement/batch/member drill-down
  Optionally filter the screen to one member (export remains complete)
        |
        v
[General Manager] Lock monthly version
        |
        v
(System)
  Snapshot rows, rates, totals, actors, and audit evidence
        |
        +---- Analytical export ----> Regular Capture, Loan Details, and Audit
        |
        +---- Client-format export -> Preserve exact six-sheet workbook
                                      Fill REG_MEM_CAP only:
                                        member names
                                        GMAR    -> G-mar Capital (column P)
                                        C1 + C2 -> Canteen
                                        WRS     -> WRS
                                        TFEA    -> TFEA (column U)
                                        CBU     -> CBU/S (column V)
                                        Secured -> Savings (column AE)
        |
        v
[Auditor / Board] Read-only review
```

Client-format workbook flow:

```text
[Bookkeeper or Admin] Select reporting month
        |
        +---- Generate Preview
        |       |
        |       v
        |     (System) Read current finalized cost-center movements
        |
        +---- General Manager/Admin locks month
                |
                v
              [Authorized report viewer] Download Locked Version
                        |
                        v
                      (System)
                        Validate six sheet names and REG_MEM_CAP structure
                        Validate light-green B, P, S, and T target cells
                        Never overwrite protected Q interest formulas
                        Stop when Active roster exceeds 67 template rows
                        Preserve formulas, yellow/manual cells, styles,
                        merged cells, and all other worksheets
                        Produce a newly filled XLSX; never alter the master
```

SUMMO source boundary:

```text
System data is authoritative where implemented.
Excel supplies only temporary external/report-supporting movements.
SUMMO Excel imports do not post accounting journals.
Finalized imports are immutable; corrections use a superseding batch or reversal.
Reopening a locked month also unlocks every later locked SUMMO month.
Finalized cost-center movements retain their posting-time SUMMO mapping.
The client-format pilot uses finalized system cost-center movements only; temporary SUMMO Excel imports do not fill its G-mar Capital, Canteen, or WRS cells.
GMAR writes principal to column P only. Column Q retains the workbook's shared 2% formula.
Preview is operational working output. Locked Version is the official frozen-month output.
```

Cluster routing and current coverage:

| Member cluster | Cost-center transaction status | Monthly SUMMO status |
| --- | --- | --- |
| REGULAR MEMBERS CAPTURE | Recorded and reconciled | Implemented |
| REGULAR MEMBERS NON CAPTURE | Recorded and retained | Future cluster report |
| REGULAR MEMBERS LGU | Recorded and retained | Future cluster report |
| RETIREES | Recorded and retained | Future cluster report |
| COMMUNITY A MEMBERS | Recorded and retained | Future cluster report |
| COMMUNITY B MEMBERS | Recorded and retained | Future cluster report |

A transaction outside `REGULAR MEMBERS CAPTURE` is not lost when absent from the current SUMMO. It remains in cost-center history and reconciliation until its own cluster report is implemented.

## 13. Administration and Audit

```text
[System Administrator]
  Maintain users, roles, loan products, and demo data
        |
        v
(System)
  Preserve individual actors, timestamps, references,
  source batches, posting links, decisions, locks, and reopen reasons
        |
        v
[Auditor] Review users, transactions, batches, journals, and reports read-only
```

## 14. Current Role Separation Summary

```text
Membership Officer  prepares member records and requests previous-loan unlocks
System Administrator approves membership and decides submitted loans
Loan Officer         prepares loans and decides previous-loan unlock requests
Bookkeeper           reviews/posts batches, reconciles cost centers, and prepares SUMMO
General Manager      approves teller funding and locks/reopens SUMMO periods
Teller               receives/releases cash, encodes cost-center payables, and acknowledges funding
Auditor / Board      review authorized evidence and reports without posting
```
