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
    'M-000482', 'Maria L. Santos', 'REGULAR MEMBERS CAPTURE', 'Active', 62000, 184500,
    '0917-555-0101', 'Poblacion Public Market, Tarlac City', '1981-04-12', 'Married',
    'Market vendor', '2019-03-18'
  ),
  (
    'M-000517', 'Benito P. Cruz', 'REGULAR MEMBERS NON CAPTURE', 'Active', 44000, 76800,
    '0918-555-0102', 'Brgy. San Isidro, Tarlac City', '1976-09-24', 'Married',
    'Rice farmer', '2020-07-06'
  ),
  (
    'M-000621', 'Alma R. Dizon', 'REGULAR MEMBERS LGU', 'Active', 83000, 221400,
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
  interest_method, payment_frequency, processing_fee, service_fee_rate_bps,
  insurance_fee_rate_bps, cbu_rate_bps, savings_retention_rate_bps, cbu_optional,
  penalty_rate_bps, loans_receivable_account, interest_income_account, processing_fee_account,
  insurance_income_account, share_capital_account, savings_account,
  penalty_income_account, cash_account, status
) VALUES
  (
    'EMERGENCY', 'Emergency Loan', 'Six-month emergency loan with service fee deducted from proceeds.',
    1000, 20000, 6, 6, 3000, 'Diminishing Balance', 'Monthly', 0, 450,
    0, 0, 0, FALSE, 200, '1050', '4010', '4030', '4050', '3010', '2020',
    '4040', '1010', 'Active'
  ),
  (
    'PETTY-CASH', 'Petty Cash Loan', 'One-month petty cash loan with service fee deducted from proceeds.',
    500, 10000, 1, 1, 3000, 'Diminishing Balance', 'Monthly', 0, 450,
    0, 0, 0, FALSE, 200, '1050', '4010', '4030', '4050', '3010', '2020',
    '4040', '1010', 'Active'
  ),
  (
    'SALARY', 'Salary Loan', 'Salary loan with service fee, insurance, CBU, and savings retention.',
    10000, 350000, 6, 60, 3000, 'Diminishing Balance', 'Monthly', 0, 450,
    150, 200, 100, TRUE, 200, '1050', '4010', '4030', '4050', '3010', '2020',
    '4040', '1010', 'Active'
  ),
  (
    'EDUCATIONAL', 'Educational Loan', 'Education-purpose loan with standard retention deductions.',
    5000, 10000, 6, 60, 3000, 'Diminishing Balance', 'Monthly', 0, 450,
    150, 200, 100, TRUE, 200, '1050', '4010', '4030', '4050', '3010', '2020',
    '4040', '1010', 'Active'
  ),
  (
    'APPLIANCE', 'Appliance Loan', 'Appliance loan with standard retention deductions.',
    5000, 100000, 6, 60, 3000, 'Diminishing Balance', 'Monthly', 0, 450,
    150, 200, 100, TRUE, 200, '1050', '4010', '4030', '4050', '3010', '2020',
    '4040', '1010', 'Active'
  ),
  (
    'SMALL-BUSINESS', 'Small Business Loan', 'Entrepreneurial loan with standard retention deductions.',
    5000, 100000, 6, 60, 3000, 'Diminishing Balance', 'Monthly', 0, 450,
    150, 200, 100, TRUE, 200, '1050', '4010', '4030', '4050', '3010', '2020',
    '4040', '1010', 'Active'
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
  service_fee_rate_bps = EXCLUDED.service_fee_rate_bps,
  insurance_fee_rate_bps = EXCLUDED.insurance_fee_rate_bps,
  cbu_rate_bps = EXCLUDED.cbu_rate_bps,
  savings_retention_rate_bps = EXCLUDED.savings_retention_rate_bps,
  cbu_optional = EXCLUDED.cbu_optional,
  penalty_rate_bps = EXCLUDED.penalty_rate_bps,
  loans_receivable_account = EXCLUDED.loans_receivable_account,
  interest_income_account = EXCLUDED.interest_income_account,
  processing_fee_account = EXCLUDED.processing_fee_account,
  insurance_income_account = EXCLUDED.insurance_income_account,
  share_capital_account = EXCLUDED.share_capital_account,
  savings_account = EXCLUDED.savings_account,
  penalty_income_account = EXCLUDED.penalty_income_account,
  cash_account = EXCLUDED.cash_account,
  status = EXCLUDED.status,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO loan_applications (
  application_no, member_no, member_name, product_code, product_name,
  requested_principal, requested_term_months, purpose, collateral_type, application_date,
  annual_interest_rate_bps, interest_method, payment_frequency,
  processing_fee, service_fee_rate_bps, insurance_fee_rate_bps, cbu_rate_bps,
  savings_retention_rate_bps, cbu_optional, penalty_rate_bps, loans_receivable_account,
  interest_income_account, processing_fee_account, insurance_income_account,
  share_capital_account, savings_account, penalty_income_account, cash_account,
  status, created_by, submitted_by, submitted_at,
  credit_assessment_notes, recommended_principal, recommended_term_months,
  decision, decision_remarks, decision_date, decided_by, decided_at
) VALUES
  (
    'LA-2026-0001', 'M-000517', 'Benito P. Cruz', 'SALARY', 'Salary Loan',
    30000, 12, 'Farm inputs for the next planting season', 'PDC', '2026-06-15',
    3000, 'Diminishing Balance', 'Monthly', 0, 450, 150, 200, 100, TRUE,
    200, '1050', '4010', '4030', '4050', '3010', '2020', '4040',
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
  collateral_type = EXCLUDED.collateral_type,
  application_date = EXCLUDED.application_date,
  annual_interest_rate_bps = EXCLUDED.annual_interest_rate_bps,
  interest_method = EXCLUDED.interest_method,
  payment_frequency = EXCLUDED.payment_frequency,
  processing_fee = EXCLUDED.processing_fee,
  service_fee_rate_bps = EXCLUDED.service_fee_rate_bps,
  insurance_fee_rate_bps = EXCLUDED.insurance_fee_rate_bps,
  cbu_rate_bps = EXCLUDED.cbu_rate_bps,
  savings_retention_rate_bps = EXCLUDED.savings_retention_rate_bps,
  cbu_optional = EXCLUDED.cbu_optional,
  penalty_rate_bps = EXCLUDED.penalty_rate_bps,
  loans_receivable_account = EXCLUDED.loans_receivable_account,
  interest_income_account = EXCLUDED.interest_income_account,
  processing_fee_account = EXCLUDED.processing_fee_account,
  insurance_income_account = EXCLUDED.insurance_income_account,
  share_capital_account = EXCLUDED.share_capital_account,
  savings_account = EXCLUDED.savings_account,
  penalty_income_account = EXCLUDED.penalty_income_account,
  cash_account = EXCLUDED.cash_account,
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
  ('MA-2026-0001', 'Julieta M. Navarro', 'COMMUNITY A MEMBERS', '0917-555-0148', 5000, 'Pending Approval', 'membership')
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
