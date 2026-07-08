# TASETEMCO Workflow Responsibility Diagrams

This document shows the major cooperative workflows from the viewpoint of who handles each step and what is passed to the next person or system area.

Legend:

```text
[Role/User]        Person or user type responsible for the step
(System)           Automated validation, record update, or report output
-->                Handoff to the next role or system area
==>                Accounting or ledger posting effect
```

## 1. Membership Creation And Initial Payment

```text
[Membership Officer]
  Receives member application details
  Encodes member application
  Includes Required Initial Share Capital
        |
        v
(System)
  Validates required member fields
  Stores application as Pending Approval
        |
        v
[System Administrator]
  Reviews application
  Approves membership
        |
        v
(System)
  Creates active member profile
  Marks member as needing initial payment
        |
        v
[Teller / Cashier]
  Collects initial share capital
  Collects membership fee
  Collects initial savings
  Issues OR/reference
        |
        v
(System)
  Adds transaction to Open Teller Batch
  Blocks duplicate initial payment for same member
  Blocks duplicate OR/reference
        |
        v
[Accountant / Bookkeeper]
  Reviews teller batch
  Posts balanced journal entry
        |
        v
==> General Ledger
  Debit: Cash on Hand
  Credit: Share Capital
  Credit: Membership Fee Income
  Credit: Savings Deposits Payable
```

Critical controls:

```text
Membership Officer prepares.
System Administrator approves.
Teller handles cash.
Bookkeeper posts accounting entry.
```

## 2. Member Masterlist Import From Excel

```text
[Membership Officer or System Administrator]
  Receives Excel/CSV member masterlist
  Pastes/imports sample rows
  Maps Excel columns to system fields
        |
        v
(System)
  Validates member numbers
  Detects duplicate member numbers
  Detects missing names and invalid dates
  Shows ready rows and issue rows
        |
        v
[Membership Officer or System Administrator]
  Reviews preview result with client/source file
  Stages import batch
        |
        v
(System)
  Stores staged batch
  Does not yet create members from issue rows
        |
        v
[System Administrator]
  Finalizes ready rows
        |
        v
(System)
  Creates active member profiles
  Keeps skipped/issue rows for review
```

Critical controls:

```text
Import preview is not yet a database change.
Finalization creates members only from valid ready rows.
Financial balances are handled separately from profile import.
```

## 3. Opening Balance Import

```text
[Accountant / Bookkeeper or System Administrator]
  Receives opening balance source file
  Maps member number, share capital, savings, cutover date, and reference
        |
        v
(System)
  Validates member exists
  Validates money fields to two decimals
  Detects duplicate member numbers in upload
  Detects members already finalized in prior opening balance import
        |
        v
[Accountant / Bookkeeper or System Administrator]
  Reviews ready rows and issue rows
  Stages opening balance batch
        |
        v
[System Administrator]
  Finalizes ready rows after confirmation
        |
        v
(System)
  Updates member share capital balance
  Updates member savings balance
  Links result to import evidence
        |
        v
==> General Ledger
  Opening balance journal is created so subsidiary balances reconcile to GL
```

Critical controls:

```text
Member profile import and financial opening balance import are separate.
Opening balances should be finalized only after client review.
Bookkeeper/Admin owns accounting cutover data.
```

## 4. Normal Teller Transactions

```text
[Member]
  Requests savings deposit, savings withdrawal, or share capital contribution
        |
        v
[Teller / Cashier]
  Selects active member
  Encodes transaction type and amount
  Enters OR/reference number
        |
        v
(System)
  Validates member status
  Validates amount
  Blocks duplicate OR/reference
  Blocks withdrawal beyond available savings
  Adds transaction to Open Teller Batch
        |
        v
[Teller / Cashier]
  Counts actual cash at end of day
  Submits teller batch
        |
        v
[Accountant / Bookkeeper]
  Reviews batch transactions
  Reviews cash count and variance
  Adds variance note if needed
  Marks batch Reviewed
        |
        v
[Accountant / Bookkeeper]
  Posts reviewed batch
        |
        v
==> General Ledger
  Savings deposit: Debit Cash, Credit Savings Deposits Payable
  Savings withdrawal: Debit Savings Deposits Payable, Credit Cash
  Share capital contribution: Debit Cash, Credit Share Capital
```

Critical controls:

```text
Teller owns cash encoding.
Bookkeeper owns posting.
Cash variance must be reviewed before closing.
```

## 5. Teller Batch Closing

```text
[Teller / Cashier]
  Records daily transactions into Open batch
  Counts physical cash
  Submits batch
        |
        v
(System)
  Summarizes cash in, cash out, net cash, transaction mix, and variance
        |
        v
[Accountant / Bookkeeper]
  Reviews submitted batch
  Records variance note when needed
  Marks batch Reviewed
        |
        v
[Accountant / Bookkeeper]
  Posts unposted transactions
        |
        v
(System)
  Links posted journal entries to batch transactions
        |
        v
[Accountant / Bookkeeper]
  Officially closes batch
        |
        v
(System)
  Locks closed batch
  Opens next teller batch for future transactions
```

Critical controls:

```text
Only reviewed batches are posted.
Only posted/reconciled batches are closed.
Closed batch details remain visible for audit.
```

## 6. Loan Application And Approval

```text
[Loan Officer]
  Selects active member
  Selects loan product
  Encodes requested principal, term, purpose, and application date
        |
        v
(System)
  Validates loan product limits
  Stores Draft or Submitted loan application
        |
        v
[Credit Committee / Approver]
  Reviews application
  Records assessment notes
  Approves, rejects, or returns application
        |
        v
(System)
  Keeps decision evidence
  Approved application becomes available for computation
        |
        v
[Loan Officer]
  Generates amortization preview
  Saves computation
        |
        v
(System)
  Creates loan account and installment schedule
  Marks loan as For Release
```

Critical controls:

```text
Loan Officer prepares.
Approver decides.
System keeps product terms and decision evidence.
Computation does not release cash.
```

## 7. Loan Funding And Release

```text
(System)
  Shows loans marked For Release
  Computes total release funding demand
        |
        v
[Accountant / Bookkeeper]
  Reviews funding demand
  Prepares teller cash funding request
        |
        v
[General Manager]
  Approves prepared teller funding
        |
        v
[Teller / Cashier]
  Acknowledges approved funding into Open batch
        |
        v
(System)
  Increases available teller cash for release
        |
        v
[Teller / Cashier]
  Releases exact net proceeds to borrower
  Enters release voucher/reference
        |
        v
(System)
  Blocks release if acknowledged funding and batch cash are insufficient
  Adds release as cash-out evidence in Open Teller Batch
        |
        v
[Accountant / Bookkeeper]
  Reviews and posts teller batch
        |
        v
==> General Ledger
  Debit: Loans Receivable
  Credit: Cash on Hand
  Credit: Processing Fee Income, when applicable
```

Critical controls:

```text
Bookkeeper identifies funding need.
Manager approves funding.
Teller acknowledges cash before release.
System blocks release without available cash.
Bookkeeper posts the accounting entry.
```

## 8. Loan Collection

```text
[Member/Borrower]
  Pays scheduled loan installment
        |
        v
[Teller / Cashier]
  Selects loan
  Collects next scheduled installment
  Enters OR/reference
        |
        v
(System)
  Validates next unpaid installment
  Splits amount between principal and interest based on schedule
  Adds collection to Open Teller Batch
        |
        v
[Accountant / Bookkeeper]
  Reviews teller batch
  Posts loan collection
        |
        v
==> General Ledger
  Debit: Cash on Hand
  Credit: Loans Receivable
  Credit: Interest Income
        |
        v
(System)
  Marks installment as paid
  Updates loan balance and collection history
```

Critical controls:

```text
Teller collects cash.
System applies scheduled split.
Bookkeeper posts to GL.
Loan balances update from posted collection evidence.
```

## 9. Reports And Oversight

```text
[Teller / Cashier]
  Provides teller batch and cash count evidence
        |
        v
[Accountant / Bookkeeper]
  Posts journals
  Reviews reconciliations
        |
        v
(System)
  Produces ledger-driven reports
        |
        v
[General Manager]
  Reviews cash position, loan activity, and financial reports
        |
        v
[Board / Read-Only Executive]
  Reviews summary reports
        |
        v
[Auditor / Compliance Officer]
  Reviews user access, audit trail, batch details, and posted evidence
```

Critical reports:

```text
Daily Cash Position
Member Subsidiary Ledger
Control Account Reconciliation
Trial Balance
Statement of Financial Condition
Statement of Operations
Loan Portfolio Aging
Audit Trail
```

## 10. Small-Coop Role Consolidation Discussion

If TASETEMCO chooses fewer staff roles, keep the system principle clear:

```text
One person may hold multiple permissions.
One account should still belong to one person.
The system should record who prepared, approved, posted, released, or reset each item.
```

Possible consolidated model for discussion:

```text
[Operations Staff]
  Membership encoding
  Teller transactions
  Loan collection
  Member lookup

[Admin / Accounting Officer]
  User access
  Membership approval
  Loan approval or management approval, if assigned by policy
  Teller batch review
  Ledger posting
  Reports
  Demo/data maintenance
```

Separation-of-duty warning:

```text
Avoid giving one person unchecked control over:
  cash receipt/release + ledger posting + final approval

If unavoidable because the cooperative is small:
  keep audit logs visible
  require supporting references
  make reports reviewable by Manager, Board, or Auditor
```
