INSERT INTO users (full_name, username, role_name, status, default_view) VALUES
  ('Elena D. Ramos', 'admin', 'System Administrator', 'Active', 'users'),
  ('Victor M. Lim', 'manager', 'General Manager', 'Active', 'dashboard'),
  ('Grace P. Uy', 'bookkeeper', 'Accountant / Bookkeeper', 'Active', 'ledger'),
  ('Paolo C. Mendoza', 'loanofficer', 'Loan Officer', 'Active', 'loans'),
  ('Lorna B. Aquino', 'approver', 'Credit Committee / Approver', 'Active', 'loans'),
  ('Nora S. Angeles', 'teller01', 'Teller / Cashier', 'Active', 'dashboard'),
  ('Arnel V. Bautista', 'membership', 'Membership Officer', 'Active', 'members'),
  ('Celia T. Abad', 'auditor', 'Auditor / Compliance Officer', 'Active', 'reports'),
  ('Roberto J. Villanueva', 'board', 'Board / Read-Only Executive', 'Active', 'reports')
ON CONFLICT (username) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role_name = EXCLUDED.role_name,
  status = EXCLUDED.status,
  default_view = EXCLUDED.default_view;

INSERT INTO members (member_no, full_name, cluster_name, status, share_capital, savings_balance) VALUES
  ('M-000482', 'Maria L. Santos', 'Market Vendors Cluster', 'Active', 62000, 184500),
  ('M-000517', 'Benito P. Cruz', 'Rice Farmers Cluster', 'Active', 44000, 76800),
  ('M-000621', 'Alma R. Dizon', 'Teachers Cluster', 'Active', 83000, 221400)
ON CONFLICT (member_no) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  cluster_name = EXCLUDED.cluster_name,
  status = EXCLUDED.status,
  share_capital = EXCLUDED.share_capital,
  savings_balance = EXCLUDED.savings_balance;

INSERT INTO member_applications (
  application_no, full_name, cluster_name, contact_number,
  initial_share_capital, status, created_by
) VALUES
  ('MA-2026-0001', 'Julieta M. Navarro', 'General Membership', '0917-555-0148', 5000, 'Pending Approval', 'membership')
ON CONFLICT (application_no) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  cluster_name = EXCLUDED.cluster_name,
  contact_number = EXCLUDED.contact_number,
  initial_share_capital = EXCLUDED.initial_share_capital,
  status = EXCLUDED.status,
  created_by = EXCLUDED.created_by;

INSERT INTO teller_batches (
  batch_no, teller_username, status, opened_at, expected_cash,
  actual_cash, variance, transaction_count
) VALUES
  ('TB-2026-0001', 'teller01', 'Open', '2026-06-10 08:00:00+08', 0, 0, 0, 0)
ON CONFLICT (batch_no) DO UPDATE SET
  teller_username = EXCLUDED.teller_username,
  status = EXCLUDED.status,
  opened_at = EXCLUDED.opened_at,
  expected_cash = EXCLUDED.expected_cash,
  actual_cash = EXCLUDED.actual_cash,
  variance = EXCLUDED.variance,
  transaction_count = EXCLUDED.transaction_count;

INSERT INTO initial_member_payments (
  payment_no, batch_no, member_no, member_name, share_capital_amount,
  membership_fee_amount, savings_deposit_amount, cash_received,
  reference_no, received_by, status
) VALUES
  ('IP-2026-0001', 'TB-2026-0001', 'M-000482', 'Maria L. Santos', 5000, 100, 1000, 6100, 'OR-10001', 'teller01', 'Teller Batch')
ON CONFLICT (payment_no) DO UPDATE SET
  batch_no = EXCLUDED.batch_no,
  member_no = EXCLUDED.member_no,
  member_name = EXCLUDED.member_name,
  share_capital_amount = EXCLUDED.share_capital_amount,
  membership_fee_amount = EXCLUDED.membership_fee_amount,
  savings_deposit_amount = EXCLUDED.savings_deposit_amount,
  cash_received = EXCLUDED.cash_received,
  reference_no = EXCLUDED.reference_no,
  received_by = EXCLUDED.received_by,
  status = EXCLUDED.status;
