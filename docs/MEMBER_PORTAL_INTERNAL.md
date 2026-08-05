# Member Portal v1a — Staff and Technical Workflow

## Staff workflow

System Administrators, General Managers, and Membership Officers manage portal access under **Users → Member Portal Accounts**.

- Provision: select an existing member and assign a unique username. The system enforces one account per member and generates a one-time temporary password.
- Reset password: generates a replacement temporary password, returns the account to Active, requires a password change, and invalidates existing member sessions.
- Lock or disable: prevents login and immediately invalidates member sessions. Enable returns the account to Active without changing its password.
- Credential handling: copy an issued temporary password immediately. It is never shown again and cannot be recovered.

Every provision, login result, password change/reset, and status action creates a member-portal audit event separate from staff security events.

## Technical boundary

Member identities live in `member_portal_accounts`; audit records live in `member_portal_audit_events`. They do not use the staff `users`, `user_security_events`, or in-memory `sessions` structures. The member cookie is `tasetemco_member_session`; the staff cookie remains `tasetemco_spike_session`.

Member endpoints are namespaced under `/api/member-portal`. Administrative endpoints are under `/api/admin/member-portal-accounts`. The overview endpoint accepts no member number: it derives `member_no` solely from the authenticated member session.

The v1a response is an explicit allow-list containing identity summary, CBU and savings balances, loan summaries, cost-center dues, and an `asOf` timestamp. It does not serialize the general member statement and therefore excludes ID, contact/address, beneficiary, and other private profile fields.

## PostgreSQL rollout

Run `npm run pg:migrate` using the target database configuration. The schema operation creates both member portal tables and the audit lookup index idempotently. Verify `/api/health` reports no missing schema columns before provisioning production accounts.

## Operational checks

1. Provision a test member and securely capture the temporary password.
2. Confirm staff credentials do not work at Member Portal Login and member credentials do not work at Staff Login.
3. Confirm overview access is blocked until the temporary password is changed.
4. Compare displayed balances and loans with the staff member statement.
5. Reset, lock, disable, and enable the test account; verify session invalidation and audit events.
6. Inspect the browser/API response to ensure ID numbers and beneficiaries are absent.
