INSERT INTO users (full_name, username, role_name, status, default_view) VALUES
  ('Elena D. Ramos', 'admin', 'System Administrator', 'Active', 'users'),
  ('Victor M. Lim', 'manager', 'General Manager', 'Active', 'dashboard'),
  ('Grace P. Uy', 'bookkeeper', 'Accountant / Bookkeeper', 'Active', 'ledger'),
  ('Paolo C. Mendoza', 'loanofficer', 'Loan Officer', 'Active', 'loans'),
  ('Nora S. Angeles', 'teller01', 'Teller / Cashier', 'Active', 'dashboard'),
  ('Arnel V. Bautista', 'membership', 'Membership Officer', 'Active', 'members'),
  ('Celia T. Abad', 'auditor', 'Auditor / Compliance Officer', 'Active', 'reports'),
  ('Roberto J. Villanueva', 'board', 'Board / Read-Only Executive', 'Active', 'reports')
ON CONFLICT (username) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role_name = EXCLUDED.role_name,
  status = EXCLUDED.status,
  default_view = EXCLUDED.default_view;

UPDATE users
SET status = 'Inactive'
WHERE username = 'approver';

INSERT INTO members (
  member_no, full_name, cluster_name, status, share_capital, savings_balance,
  previous_loan_balance, contact_number, address, birthdate, civil_status, occupation, membership_date
) VALUES
  (
    'M-000482', 'Maria L. Santos', 'REGULAR MEMBERS CAPTURE', 'Active', 62000, 184500, 0,
    '0917-555-0101', 'Poblacion Public Market, Tarlac City', '1981-04-12', 'Married',
    'Market vendor', '2019-03-18'
  ),
  (
    'M-000517', 'Benito P. Cruz', 'REGULAR MEMBERS NON CAPTURE', 'Active', 44000, 76800, 0,
    '0918-555-0102', 'Brgy. San Isidro, Tarlac City', '1976-09-24', 'Married',
    'Rice farmer', '2020-07-06'
  ),
  (
    'M-000621', 'Alma R. Dizon', 'REGULAR MEMBERS LGU', 'Active', 83000, 221400, 0,
    '0919-555-0103', 'Brgy. Maliwalo, Tarlac City', '1988-11-02', 'Single',
    'Public school teacher', '2021-01-15'
  )
ON CONFLICT (member_no) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  cluster_name = EXCLUDED.cluster_name,
  status = EXCLUDED.status,
  share_capital = EXCLUDED.share_capital,
  savings_balance = EXCLUDED.savings_balance,
  previous_loan_balance = EXCLUDED.previous_loan_balance,
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
    'PETTY-CASH', 'Petty Cash Loan', 'One-month petty cash loan from PHP 1,000 to PHP 2,000 with no service fee.',
    1000, 2000, 1, 1, 3000, 'Diminishing Balance', 'Monthly', 0, 0,
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
  ),
  (
    'LBP', 'LBP Loan', 'LBP loan with Appliance Loan rules and a PHP 500,000 maximum principal.',
    5000, 500000, 6, 60, 3000, 'Diminishing Balance', 'Monthly', 0, 450,
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
  ),
  (
    'LA-DEMO-PASTDUE', 'M-000621', 'Alma R. Dizon', 'SALARY', 'Salary Loan',
    15000, 3, 'Demo posted loan for collection follow-up', 'ATM Cards', CURRENT_DATE - INTERVAL '70 days',
    3000, 'Diminishing Balance', 'Monthly', 675, 450, 0, 0, 0, FALSE,
    200, '1050', '4010', '4030', '4050', '3010', '2020', '4040',
    '1010', 'Posted', 'loanofficer', 'loanofficer', CURRENT_TIMESTAMP - INTERVAL '70 days',
    'Demo account for overdue collection monitoring.', 15000, 3, 'Approved', 'Approved for seeded demo.',
    CURRENT_DATE - INTERVAL '69 days', 'admin', CURRENT_TIMESTAMP - INTERVAL '69 days'
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
  application_no, full_name, cluster_name, contact_number, gender, id_type, id_number,
  initial_share_capital, status, created_by
) VALUES
  ('MA-2026-0001', 'Julieta M. Navarro', 'COMMUNITY A MEMBERS', '0917-555-0148',
   'Female', 'PhilSys ID / ePhilID', '0000-0000-0001', 5000, 'Pending Approval', 'membership')
ON CONFLICT (application_no) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  cluster_name = EXCLUDED.cluster_name,
  contact_number = EXCLUDED.contact_number,
  gender = EXCLUDED.gender,
  id_type = EXCLUDED.id_type,
  id_number = EXCLUDED.id_number,
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

INSERT INTO loans (
  loan_no, application_no, member_no, member_name, product_code, product_name,
  principal, term_months, annual_interest_rate_bps, interest_method, payment_frequency,
  processing_fee, service_fee_rate_bps, insurance_fee, insurance_fee_rate_bps,
  cbu_amount, cbu_rate_bps, cbu_applied, savings_retention_amount,
  savings_retention_rate_bps, total_interest, total_payable, net_proceeds,
  installment_count, first_payment_date, maturity_date, status, computed_by, computed_at
) VALUES (
  'LN-DEMO-PASTDUE', 'LA-DEMO-PASTDUE', 'M-000621', 'Alma R. Dizon', 'SALARY', 'Salary Loan',
  15000, 3, 3000, 'Diminishing Balance', 'Monthly',
  675, 450, 0, 0, 0, 0, FALSE, 0, 0, 750.00, 15750.00, 14325,
  3, CURRENT_DATE - INTERVAL '35 days', CURRENT_DATE + INTERVAL '35 days', 'Posted',
  'loanofficer', CURRENT_TIMESTAMP - INTERVAL '68 days'
)
ON CONFLICT (loan_no) DO UPDATE SET
  application_no = EXCLUDED.application_no,
  member_no = EXCLUDED.member_no,
  member_name = EXCLUDED.member_name,
  product_code = EXCLUDED.product_code,
  product_name = EXCLUDED.product_name,
  principal = EXCLUDED.principal,
  term_months = EXCLUDED.term_months,
  annual_interest_rate_bps = EXCLUDED.annual_interest_rate_bps,
  interest_method = EXCLUDED.interest_method,
  payment_frequency = EXCLUDED.payment_frequency,
  processing_fee = EXCLUDED.processing_fee,
  service_fee_rate_bps = EXCLUDED.service_fee_rate_bps,
  insurance_fee = EXCLUDED.insurance_fee,
  insurance_fee_rate_bps = EXCLUDED.insurance_fee_rate_bps,
  cbu_amount = EXCLUDED.cbu_amount,
  cbu_rate_bps = EXCLUDED.cbu_rate_bps,
  cbu_applied = EXCLUDED.cbu_applied,
  savings_retention_amount = EXCLUDED.savings_retention_amount,
  savings_retention_rate_bps = EXCLUDED.savings_retention_rate_bps,
  total_interest = EXCLUDED.total_interest,
  total_payable = EXCLUDED.total_payable,
  net_proceeds = EXCLUDED.net_proceeds,
  installment_count = EXCLUDED.installment_count,
  first_payment_date = EXCLUDED.first_payment_date,
  maturity_date = EXCLUDED.maturity_date,
  status = EXCLUDED.status,
  computed_by = EXCLUDED.computed_by,
  computed_at = EXCLUDED.computed_at;

INSERT INTO loan_installments (
  loan_no, installment_no, due_date, principal_due, interest_due, total_due, status
) VALUES
  ('LN-DEMO-PASTDUE', 1, CURRENT_DATE - INTERVAL '35 days', 5000, 375.00, 5375.00, 'Scheduled'),
  ('LN-DEMO-PASTDUE', 2, CURRENT_DATE + INTERVAL '5 days', 5000, 250.00, 5250.00, 'Scheduled'),
  ('LN-DEMO-PASTDUE', 3, CURRENT_DATE + INTERVAL '35 days', 5000, 125.00, 5125.00, 'Scheduled')
ON CONFLICT (loan_no, installment_no) DO UPDATE SET
  due_date = EXCLUDED.due_date,
  principal_due = EXCLUDED.principal_due,
  interest_due = EXCLUDED.interest_due,
  total_due = EXCLUDED.total_due,
  status = EXCLUDED.status;

INSERT INTO loan_releases (
  release_no, loan_no, batch_no, member_no, member_name, principal,
  processing_fee, insurance_fee, cbu_amount, savings_retention_amount,
  net_proceeds, cash_released, release_date, reference_no, released_by,
  status, posted_by, posted_entry_no, posted_at
) VALUES (
  'LR-DEMO-PASTDUE', 'LN-DEMO-PASTDUE', 'TB-DEMO-PASTDUE', 'M-000621', 'Alma R. Dizon', 15000,
  675, 0, 0, 0, 14325, 14325, CURRENT_DATE - INTERVAL '65 days', 'VCH-DEMO-PASTDUE', 'teller01',
  'Posted', 'bookkeeper', 'JE-DEMO-PASTDUE', CURRENT_TIMESTAMP - INTERVAL '65 days'
)
ON CONFLICT (release_no) DO UPDATE SET
  loan_no = EXCLUDED.loan_no,
  batch_no = EXCLUDED.batch_no,
  member_no = EXCLUDED.member_no,
  member_name = EXCLUDED.member_name,
  principal = EXCLUDED.principal,
  processing_fee = EXCLUDED.processing_fee,
  insurance_fee = EXCLUDED.insurance_fee,
  cbu_amount = EXCLUDED.cbu_amount,
  savings_retention_amount = EXCLUDED.savings_retention_amount,
  net_proceeds = EXCLUDED.net_proceeds,
  cash_released = EXCLUDED.cash_released,
  release_date = EXCLUDED.release_date,
  reference_no = EXCLUDED.reference_no,
  released_by = EXCLUDED.released_by,
  status = EXCLUDED.status,
  posted_by = EXCLUDED.posted_by,
  posted_entry_no = EXCLUDED.posted_entry_no,
  posted_at = EXCLUDED.posted_at;

INSERT INTO summo_rules (cluster_name, rule_key, effective_from, value_text) VALUES
  ('REGULAR MEMBERS CAPTURE', 'RATE_GMAR_BPS', '2000-01', '200'),
  ('REGULAR MEMBERS CAPTURE', 'RATE_PREVIOUS_BALANCE_BPS', '2000-01', '200'),
  ('REGULAR MEMBERS CAPTURE', 'RATE_PETTY_CASH_BPS', '2000-01', '250'),
  ('REGULAR MEMBERS CAPTURE', 'PRODUCT_SALARY', '2000-01', 'salaryLoan'),
  ('REGULAR MEMBERS CAPTURE', 'PRODUCT_EMERGENCY', '2000-01', 'emergencyLoan'),
  ('REGULAR MEMBERS CAPTURE', 'PRODUCT_APPLIANCE', '2000-01', 'applianceLoan'),
  ('REGULAR MEMBERS CAPTURE', 'PRODUCT_LBP', '2000-01', 'lbp'),
  ('REGULAR MEMBERS CAPTURE', 'PRODUCT_EDUCATIONAL', '2000-01', 'educationalLoan'),
  ('REGULAR MEMBERS CAPTURE', 'PRODUCT_PETTY-CASH', '2000-01', 'pettyCash')
ON CONFLICT (cluster_name, rule_key, effective_from) DO NOTHING;
