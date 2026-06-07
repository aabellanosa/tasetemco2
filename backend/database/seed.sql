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
