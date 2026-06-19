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

INSERT INTO members (
  member_no, full_name, cluster_name, status, share_capital, savings_balance,
  contact_number, address, birthdate, civil_status, occupation, membership_date
) VALUES
  (
    'M-000482', 'Maria L. Santos', 'Market Vendors Cluster', 'Active', 62000, 184500,
    '0917-555-0101', 'Poblacion Public Market, Tarlac City', '1981-04-12', 'Married',
    'Market vendor', '2019-03-18'
  ),
  (
    'M-000517', 'Benito P. Cruz', 'Rice Farmers Cluster', 'Active', 44000, 76800,
    '0918-555-0102', 'Brgy. San Isidro, Tarlac City', '1976-09-24', 'Married',
    'Rice farmer', '2020-07-06'
  ),
  (
    'M-000621', 'Alma R. Dizon', 'Teachers Cluster', 'Active', 83000, 221400,
    '0919-555-0103', 'Brgy. Maliwalo, Tarlac City', '1988-11-02', 'Single',
    'Public school teacher', '2021-01-15'
  )
ON CONFLICT (member_no) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  cluster_name = EXCLUDED.cluster_name,
  status = EXCLUDED.status,
  share_capital = EXCLUDED.share_capital,
  savings_balance = EXCLUDED.savings_balance,
  contact_number = EXCLUDED.contact_number,
  address = EXCLUDED.address,
  birthdate = EXCLUDED.birthdate,
  civil_status = EXCLUDED.civil_status,
  occupation = EXCLUDED.occupation,
  membership_date = EXCLUDED.membership_date;

INSERT INTO loan_products (
  product_code, product_name, description, minimum_principal, maximum_principal,
  minimum_term_months, maximum_term_months, annual_interest_rate_bps,
  interest_method, payment_frequency, processing_fee, penalty_rate_bps,
  loans_receivable_account, interest_income_account, processing_fee_account,
  penalty_income_account, cash_account, status
) VALUES
  (
    'REGULAR', 'Regular Loan', 'General-purpose member loan with monthly flat interest.',
    5000, 100000, 3, 24, 1200, 'Flat Interest', 'Monthly', 250, 200,
    '1050', '4010', '4030', '4040', '1010', 'Active'
  ),
  (
    'EMERGENCY', 'Emergency Loan', 'Short-term loan for urgent member needs.',
    1000, 20000, 1, 6, 800, 'Flat Interest', 'Monthly', 100, 200,
    '1050', '4010', '4030', '4040', '1010', 'Active'
  ),
  (
    'SMALL-BIZ', 'Small Business Loan', 'Working-capital loan for qualified member enterprises.',
    10000, 250000, 6, 36, 1500, 'Flat Interest', 'Monthly', 500, 300,
    '1050', '4010', '4030', '4040', '1010', 'Active'
  )
ON CONFLICT (product_code) DO UPDATE SET
  product_name = EXCLUDED.product_name,
  description = EXCLUDED.description,
  minimum_principal = EXCLUDED.minimum_principal,
  maximum_principal = EXCLUDED.maximum_principal,
  minimum_term_months = EXCLUDED.minimum_term_months,
  maximum_term_months = EXCLUDED.maximum_term_months,
  annual_interest_rate_bps = EXCLUDED.annual_interest_rate_bps,
  interest_method = EXCLUDED.interest_method,
  payment_frequency = EXCLUDED.payment_frequency,
  processing_fee = EXCLUDED.processing_fee,
  penalty_rate_bps = EXCLUDED.penalty_rate_bps,
  loans_receivable_account = EXCLUDED.loans_receivable_account,
  interest_income_account = EXCLUDED.interest_income_account,
  processing_fee_account = EXCLUDED.processing_fee_account,
  penalty_income_account = EXCLUDED.penalty_income_account,
  cash_account = EXCLUDED.cash_account,
  status = EXCLUDED.status,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO loan_applications (
  application_no, member_no, member_name, product_code, product_name,
  requested_principal, requested_term_months, purpose, application_date,
  annual_interest_rate_bps, interest_method, payment_frequency,
  processing_fee, penalty_rate_bps, loans_receivable_account,
  interest_income_account, processing_fee_account, penalty_income_account,
  cash_account, status, created_by, submitted_by, submitted_at,
  credit_assessment_notes, recommended_principal, recommended_term_months,
  decision, decision_remarks, decision_date, decided_by, decided_at
) VALUES
  (
    'LA-2026-0001', 'M-000517', 'Benito P. Cruz', 'REGULAR', 'Regular Loan',
    30000, 12, 'Farm inputs for the next planting season', '2026-06-15',
    1200, 'Flat Interest', 'Monthly', 250, 200, '1050', '4010', '4030', '4040',
    '1010', 'Submitted', 'loanofficer', 'loanofficer', '2026-06-15 10:00:00+08',
    '', 0, 0, NULL, '', NULL, NULL, NULL
  )
ON CONFLICT (application_no) DO UPDATE SET
  member_no = EXCLUDED.member_no,
  member_name = EXCLUDED.member_name,
  product_code = EXCLUDED.product_code,
  product_name = EXCLUDED.product_name,
  requested_principal = EXCLUDED.requested_principal,
  requested_term_months = EXCLUDED.requested_term_months,
  purpose = EXCLUDED.purpose,
  application_date = EXCLUDED.application_date,
  annual_interest_rate_bps = EXCLUDED.annual_interest_rate_bps,
  interest_method = EXCLUDED.interest_method,
  payment_frequency = EXCLUDED.payment_frequency,
  processing_fee = EXCLUDED.processing_fee,
  penalty_rate_bps = EXCLUDED.penalty_rate_bps,
  status = EXCLUDED.status,
  created_by = EXCLUDED.created_by,
  submitted_by = EXCLUDED.submitted_by,
  submitted_at = EXCLUDED.submitted_at,
  credit_assessment_notes = EXCLUDED.credit_assessment_notes,
  recommended_principal = EXCLUDED.recommended_principal,
  recommended_term_months = EXCLUDED.recommended_term_months,
  decision = EXCLUDED.decision,
  decision_remarks = EXCLUDED.decision_remarks,
  decision_date = EXCLUDED.decision_date,
  decided_by = EXCLUDED.decided_by,
  decided_at = EXCLUDED.decided_at,
  updated_at = CURRENT_TIMESTAMP;

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
