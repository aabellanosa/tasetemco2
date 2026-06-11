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
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  role_name = VALUES(role_name),
  status = VALUES(status),
  default_view = VALUES(default_view);

INSERT INTO members (member_no, full_name, cluster_name, status, share_capital, savings_balance) VALUES
  ('M-000482', 'Maria L. Santos', 'Market Vendors Cluster', 'Active', 62000, 184500),
  ('M-000517', 'Benito P. Cruz', 'Rice Farmers Cluster', 'Active', 44000, 76800),
  ('M-000621', 'Alma R. Dizon', 'Teachers Cluster', 'Active', 83000, 221400)
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  cluster_name = VALUES(cluster_name),
  status = VALUES(status),
  share_capital = VALUES(share_capital),
  savings_balance = VALUES(savings_balance);

INSERT INTO member_applications (
  application_no, full_name, cluster_name, contact_number,
  initial_share_capital, status, created_by
) VALUES
  ('MA-2026-0001', 'Julieta M. Navarro', 'General Membership', '0917-555-0148', 5000, 'Pending Approval', 'membership')
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  cluster_name = VALUES(cluster_name),
  contact_number = VALUES(contact_number),
  initial_share_capital = VALUES(initial_share_capital),
  status = VALUES(status),
  created_by = VALUES(created_by);

INSERT INTO teller_batches (
  batch_no, teller_username, status, opened_at, expected_cash,
  actual_cash, variance, transaction_count
) VALUES
  ('TB-2026-0001', 'teller01', 'Open', '2026-06-10 08:00:00', 0, 0, 0, 0)
ON DUPLICATE KEY UPDATE
  teller_username = VALUES(teller_username),
  status = VALUES(status),
  opened_at = VALUES(opened_at),
  expected_cash = VALUES(expected_cash),
  actual_cash = VALUES(actual_cash),
  variance = VALUES(variance),
  transaction_count = VALUES(transaction_count);

INSERT INTO initial_member_payments (
  payment_no, batch_no, member_no, member_name, share_capital_amount,
  membership_fee_amount, savings_deposit_amount, cash_received,
  reference_no, received_by, status
) VALUES
  ('IP-2026-0001', 'TB-2026-0001', 'M-000482', 'Maria L. Santos', 5000, 100, 1000, 6100, 'OR-10001', 'teller01', 'Teller Batch')
ON DUPLICATE KEY UPDATE
  batch_no = VALUES(batch_no),
  member_no = VALUES(member_no),
  member_name = VALUES(member_name),
  share_capital_amount = VALUES(share_capital_amount),
  membership_fee_amount = VALUES(membership_fee_amount),
  savings_deposit_amount = VALUES(savings_deposit_amount),
  cash_received = VALUES(cash_received),
  reference_no = VALUES(reference_no),
  received_by = VALUES(received_by),
  status = VALUES(status);
