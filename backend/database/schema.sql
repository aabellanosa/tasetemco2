CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  role_name VARCHAR(120) NOT NULL,
  additional_roles TEXT NOT NULL DEFAULT '[]',
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  default_view VARCHAR(40) NOT NULL DEFAULT 'dashboard',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_no VARCHAR(40) NOT NULL UNIQUE,
  full_name VARCHAR(180) NOT NULL,
  cluster_name VARCHAR(160) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  share_capital DECIMAL(18,2) NOT NULL DEFAULT 0,
  savings_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  previous_loan_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE members ADD COLUMN IF NOT EXISTS gender VARCHAR(30) NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN IF NOT EXISTS id_type VARCHAR(80) NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN IF NOT EXISTS id_number VARCHAR(120) NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS member_previous_loans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_no VARCHAR(40) NOT NULL,
  loan_label VARCHAR(160) NOT NULL DEFAULT '',
  application_date DATE,
  outstanding_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  notes TEXT NOT NULL,
  created_by VARCHAR(80) NOT NULL DEFAULT '',
  updated_by VARCHAR(80) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_code VARCHAR(40) NOT NULL UNIQUE,
  product_name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  minimum_principal DECIMAL(18,2) NOT NULL DEFAULT 0,
  maximum_principal DECIMAL(18,2) NOT NULL DEFAULT 0,
  minimum_term_months INT NOT NULL DEFAULT 1,
  maximum_term_months INT NOT NULL DEFAULT 1,
  annual_interest_rate_bps INT NOT NULL DEFAULT 0,
  interest_method VARCHAR(40) NOT NULL DEFAULT 'Flat Interest',
  payment_frequency VARCHAR(40) NOT NULL DEFAULT 'Monthly',
  processing_fee DECIMAL(18,2) NOT NULL DEFAULT 0,
  service_fee_rate_bps INT NOT NULL DEFAULT 0,
  insurance_fee_rate_bps INT NOT NULL DEFAULT 0,
  cbu_rate_bps INT NOT NULL DEFAULT 0,
  savings_retention_rate_bps INT NOT NULL DEFAULT 0,
  cbu_optional BOOLEAN NOT NULL DEFAULT FALSE,
  penalty_rate_bps INT NOT NULL DEFAULT 0,
  loans_receivable_account VARCHAR(40) NOT NULL DEFAULT '1050',
  interest_income_account VARCHAR(40) NOT NULL DEFAULT '4010',
  processing_fee_account VARCHAR(40) NOT NULL DEFAULT '4030',
  insurance_income_account VARCHAR(40) NOT NULL DEFAULT '4050',
  share_capital_account VARCHAR(40) NOT NULL DEFAULT '3010',
  savings_account VARCHAR(40) NOT NULL DEFAULT '2020',
  penalty_income_account VARCHAR(40) NOT NULL DEFAULT '4040',
  cash_account VARCHAR(40) NOT NULL DEFAULT '1010',
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_no VARCHAR(40) NOT NULL UNIQUE,
  member_no VARCHAR(40) NOT NULL,
  member_name VARCHAR(180) NOT NULL,
  product_code VARCHAR(40) NOT NULL,
  product_name VARCHAR(160) NOT NULL,
  requested_principal DECIMAL(18,2) NOT NULL DEFAULT 0,
  requested_term_months INT NOT NULL DEFAULT 1,
  purpose TEXT NOT NULL,
  collateral_type VARCHAR(30) NOT NULL DEFAULT 'PDC',
  application_date DATE NOT NULL,
  annual_interest_rate_bps INT NOT NULL DEFAULT 0,
  interest_method VARCHAR(40) NOT NULL,
  payment_frequency VARCHAR(40) NOT NULL,
  processing_fee DECIMAL(18,2) NOT NULL DEFAULT 0,
  service_fee_rate_bps INT NOT NULL DEFAULT 0,
  insurance_fee_rate_bps INT NOT NULL DEFAULT 0,
  cbu_rate_bps INT NOT NULL DEFAULT 0,
  savings_retention_rate_bps INT NOT NULL DEFAULT 0,
  cbu_optional BOOLEAN NOT NULL DEFAULT FALSE,
  penalty_rate_bps INT NOT NULL DEFAULT 0,
  loans_receivable_account VARCHAR(40) NOT NULL,
  interest_income_account VARCHAR(40) NOT NULL,
  processing_fee_account VARCHAR(40) NOT NULL,
  insurance_income_account VARCHAR(40) NOT NULL DEFAULT '4050',
  share_capital_account VARCHAR(40) NOT NULL DEFAULT '3010',
  savings_account VARCHAR(40) NOT NULL DEFAULT '2020',
  penalty_income_account VARCHAR(40) NOT NULL,
  cash_account VARCHAR(40) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Draft',
  created_by VARCHAR(80) NOT NULL,
  submitted_by VARCHAR(80),
  submitted_at TIMESTAMP NULL,
  credit_assessment_notes TEXT NOT NULL DEFAULT '',
  recommended_principal DECIMAL(18,2) NOT NULL DEFAULT 0,
  recommended_term_months INT NOT NULL DEFAULT 0,
  decision VARCHAR(30),
  decision_remarks TEXT NOT NULL DEFAULT '',
  decision_date DATE,
  decided_by VARCHAR(80),
  decided_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_document_forms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_no VARCHAR(40) NOT NULL UNIQUE,
  form_data TEXT NOT NULL,
  created_by VARCHAR(80) NOT NULL DEFAULT '',
  updated_by VARCHAR(80) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS credit_assessment_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS collateral_type VARCHAR(30) NOT NULL DEFAULT 'PDC';
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS recommended_principal INT NOT NULL DEFAULT 0;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS recommended_term_months INT NOT NULL DEFAULT 0;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS decision VARCHAR(30);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS decision_remarks TEXT NOT NULL DEFAULT '';
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS decision_date DATE;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS decided_by VARCHAR(80);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS decided_at TIMESTAMP NULL;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS manual_previous_loan_balance DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS system_outstanding_loan_balance DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS cbu_balance DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS savings_balance DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS secured_savings_balance DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS service_fee_rate_bps INT NOT NULL DEFAULT 0;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS insurance_fee_rate_bps INT NOT NULL DEFAULT 0;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS cbu_rate_bps INT NOT NULL DEFAULT 0;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS savings_retention_rate_bps INT NOT NULL DEFAULT 0;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS cbu_optional BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS insurance_income_account VARCHAR(40) NOT NULL DEFAULT '4050';
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS share_capital_account VARCHAR(40) NOT NULL DEFAULT '3010';
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS savings_account VARCHAR(40) NOT NULL DEFAULT '2020';

CREATE TABLE IF NOT EXISTS loans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loan_no VARCHAR(40) NOT NULL UNIQUE,
  application_no VARCHAR(40) NOT NULL UNIQUE,
  member_no VARCHAR(40) NOT NULL,
  member_name VARCHAR(180) NOT NULL,
  product_code VARCHAR(40) NOT NULL,
  product_name VARCHAR(160) NOT NULL,
  principal DECIMAL(18,2) NOT NULL DEFAULT 0,
  term_months INT NOT NULL DEFAULT 1,
  annual_interest_rate_bps INT NOT NULL DEFAULT 0,
  interest_method VARCHAR(40) NOT NULL,
  payment_frequency VARCHAR(40) NOT NULL,
  processing_fee DECIMAL(18,2) NOT NULL DEFAULT 0,
  service_fee_rate_bps INT NOT NULL DEFAULT 0,
  insurance_fee DECIMAL(18,2) NOT NULL DEFAULT 0,
  insurance_fee_rate_bps INT NOT NULL DEFAULT 0,
  cbu_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  cbu_rate_bps INT NOT NULL DEFAULT 0,
  cbu_applied BOOLEAN NOT NULL DEFAULT FALSE,
  savings_retention_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  savings_retention_rate_bps INT NOT NULL DEFAULT 0,
  total_interest DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_payable DECIMAL(18,2) NOT NULL DEFAULT 0,
  net_proceeds DECIMAL(18,2) NOT NULL DEFAULT 0,
  installment_count INT NOT NULL DEFAULT 0,
  first_payment_date DATE NOT NULL,
  maturity_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'For Release',
  computed_by VARCHAR(80) NOT NULL,
  computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_installments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loan_no VARCHAR(40) NOT NULL,
  installment_no INT NOT NULL,
  due_date DATE NOT NULL,
  principal_due DECIMAL(18,2) NOT NULL DEFAULT 0,
  interest_due DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_due DECIMAL(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (loan_no, installment_no)
);

CREATE TABLE IF NOT EXISTS loan_releases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  release_no VARCHAR(40) NOT NULL UNIQUE,
  loan_no VARCHAR(40) NOT NULL UNIQUE,
  batch_no VARCHAR(40) NOT NULL,
  member_no VARCHAR(40) NOT NULL,
  member_name VARCHAR(180) NOT NULL,
  principal DECIMAL(18,2) NOT NULL DEFAULT 0,
  processing_fee DECIMAL(18,2) NOT NULL DEFAULT 0,
  insurance_fee DECIMAL(18,2) NOT NULL DEFAULT 0,
  cbu_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  savings_retention_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  net_proceeds DECIMAL(18,2) NOT NULL DEFAULT 0,
  cash_released DECIMAL(18,2) NOT NULL DEFAULT 0,
  release_date DATE NOT NULL,
  reference_no VARCHAR(80) NOT NULL UNIQUE,
  released_by VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Teller Batch',
  posted_by VARCHAR(80),
  posted_entry_no VARCHAR(40),
  posted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_collections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  collection_no VARCHAR(40) NOT NULL UNIQUE,
  loan_no VARCHAR(40) NOT NULL,
  installment_no INT NOT NULL,
  batch_no VARCHAR(40) NOT NULL,
  member_no VARCHAR(40) NOT NULL,
  member_name VARCHAR(180) NOT NULL,
  principal_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  interest_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  amount_received DECIMAL(18,2) NOT NULL DEFAULT 0,
  collection_date DATE NOT NULL,
  reference_no VARCHAR(80) NOT NULL UNIQUE,
  received_by VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Teller Batch',
  posted_by VARCHAR(80),
  posted_entry_no VARCHAR(40),
  posted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_no VARCHAR(40) NOT NULL UNIQUE,
  full_name VARCHAR(180) NOT NULL,
  cluster_name VARCHAR(160) NOT NULL,
  contact_number VARCHAR(60) NOT NULL,
  initial_share_capital DECIMAL(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'Pending Approval',
  created_by VARCHAR(80) NOT NULL,
  approved_by VARCHAR(80),
  approved_member_no VARCHAR(40),
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE member_applications ADD COLUMN IF NOT EXISTS gender VARCHAR(30) NOT NULL DEFAULT '';
ALTER TABLE member_applications ADD COLUMN IF NOT EXISTS id_type VARCHAR(80) NOT NULL DEFAULT '';
ALTER TABLE member_applications ADD COLUMN IF NOT EXISTS id_number VARCHAR(120) NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS member_import_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  import_no VARCHAR(40) NOT NULL UNIQUE,
  source_label VARCHAR(160) NOT NULL DEFAULT 'CSV Paste',
  status VARCHAR(40) NOT NULL DEFAULT 'Staged',
  total_rows INT NOT NULL DEFAULT 0,
  ready_rows INT NOT NULL DEFAULT 0,
  issue_rows INT NOT NULL DEFAULT 0,
  created_by VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE member_import_batches ADD COLUMN IF NOT EXISTS finalized_by VARCHAR(80);
ALTER TABLE member_import_batches ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP NULL;
ALTER TABLE member_import_batches ADD COLUMN IF NOT EXISTS imported_rows INT NOT NULL DEFAULT 0;
ALTER TABLE member_import_batches ADD COLUMN IF NOT EXISTS skipped_rows INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS member_import_rows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  import_no VARCHAR(40) NOT NULL,
  row_no INT NOT NULL,
  member_no VARCHAR(40) NOT NULL DEFAULT '',
  full_name VARCHAR(180) NOT NULL DEFAULT '',
  cluster_name VARCHAR(160) NOT NULL DEFAULT '',
  contact_number VARCHAR(60) NOT NULL DEFAULT '',
  address TEXT NOT NULL,
  birthdate DATE,
  civil_status VARCHAR(40) NOT NULL DEFAULT '',
  occupation VARCHAR(120) NOT NULL DEFAULT '',
  membership_date DATE,
  member_status VARCHAR(30) NOT NULL DEFAULT 'Active',
  row_status VARCHAR(40) NOT NULL DEFAULT 'Ready',
  issues TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS opening_balance_import_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  import_no VARCHAR(40) NOT NULL UNIQUE,
  source_label VARCHAR(160) NOT NULL DEFAULT 'CSV Paste',
  status VARCHAR(40) NOT NULL DEFAULT 'Staged',
  total_rows INT NOT NULL DEFAULT 0,
  ready_rows INT NOT NULL DEFAULT 0,
  issue_rows INT NOT NULL DEFAULT 0,
  total_share_capital DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_savings DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_by VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finalized_by VARCHAR(80),
  finalized_at TIMESTAMP NULL,
  finalized_rows INT NOT NULL DEFAULT 0,
  skipped_rows INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS opening_balance_import_rows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  import_no VARCHAR(40) NOT NULL,
  row_no INT NOT NULL,
  member_no VARCHAR(40) NOT NULL DEFAULT '',
  member_name VARCHAR(180) NOT NULL DEFAULT '',
  share_capital_opening_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  savings_opening_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  cutover_date DATE,
  source_reference VARCHAR(120) NOT NULL DEFAULT '',
  row_status VARCHAR(40) NOT NULL DEFAULT 'Ready',
  issues TEXT NOT NULL,
  raw_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finalized_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS initial_member_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_no VARCHAR(40) NOT NULL UNIQUE,
  batch_no VARCHAR(40) NOT NULL,
  member_no VARCHAR(40) NOT NULL,
  member_name VARCHAR(180) NOT NULL,
  share_capital_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  membership_fee_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  savings_deposit_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  cash_received DECIMAL(18,2) NOT NULL DEFAULT 0,
  reference_no VARCHAR(80) NOT NULL UNIQUE,
  received_by VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Teller Batch',
  posted_by VARCHAR(80),
  posted_entry_no VARCHAR(40),
  posted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS savings_deposits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  deposit_no VARCHAR(40) NOT NULL UNIQUE,
  batch_no VARCHAR(40) NOT NULL,
  member_no VARCHAR(40) NOT NULL,
  member_name VARCHAR(180) NOT NULL,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  cash_received DECIMAL(18,2) NOT NULL DEFAULT 0,
  reference_no VARCHAR(80) NOT NULL UNIQUE,
  received_by VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Teller Batch',
  posted_by VARCHAR(80),
  posted_entry_no VARCHAR(40),
  posted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS share_capital_contributions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contribution_no VARCHAR(40) NOT NULL UNIQUE,
  batch_no VARCHAR(40) NOT NULL,
  member_no VARCHAR(40) NOT NULL,
  member_name VARCHAR(180) NOT NULL,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  cash_received DECIMAL(18,2) NOT NULL DEFAULT 0,
  reference_no VARCHAR(80) NOT NULL UNIQUE,
  received_by VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Teller Batch',
  posted_by VARCHAR(80),
  posted_entry_no VARCHAR(40),
  posted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS savings_withdrawals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  withdrawal_no VARCHAR(40) NOT NULL UNIQUE,
  batch_no VARCHAR(40) NOT NULL,
  member_no VARCHAR(40) NOT NULL,
  member_name VARCHAR(180) NOT NULL,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  reference_no VARCHAR(80) NOT NULL UNIQUE,
  released_by VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Teller Batch',
  posted_by VARCHAR(80),
  posted_entry_no VARCHAR(40),
  posted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_no VARCHAR(40) NOT NULL UNIQUE,
  source_type VARCHAR(80) NOT NULL,
  source_no VARCHAR(40) NOT NULL,
  description VARCHAR(220) NOT NULL,
  posted_by VARCHAR(80) NOT NULL,
  posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_no VARCHAR(40) NOT NULL,
  account_code VARCHAR(40) NOT NULL,
  account_name VARCHAR(160) NOT NULL,
  debit DECIMAL(18,2) NOT NULL DEFAULT 0,
  credit DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teller_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_no VARCHAR(40) NOT NULL UNIQUE,
  teller_username VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Open',
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP NULL,
  reviewed_at TIMESTAMP NULL,
  reviewed_by VARCHAR(80),
  closed_at TIMESTAMP NULL,
  closed_by VARCHAR(80),
  closing_note TEXT,
  expected_cash DECIMAL(18,2) NOT NULL DEFAULT 0,
  actual_cash DECIMAL(18,2) NOT NULL DEFAULT 0,
  variance DECIMAL(18,2) NOT NULL DEFAULT 0,
  transaction_count INT NOT NULL DEFAULT 0,
  variance_note TEXT,
  variance_noted_by VARCHAR(80),
  variance_noted_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS teller_cash_counts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  count_no VARCHAR(40) NOT NULL UNIQUE,
  batch_no VARCHAR(40) NOT NULL,
  expected_cash DECIMAL(18,2) NOT NULL DEFAULT 0,
  actual_cash DECIMAL(18,2) NOT NULL DEFAULT 0,
  variance DECIMAL(18,2) NOT NULL DEFAULT 0,
  transaction_count INT NOT NULL DEFAULT 0,
  submitted_by VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Submitted',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teller_fundings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  funding_no VARCHAR(40) NOT NULL UNIQUE,
  batch_no VARCHAR(40),
  teller_username VARCHAR(80) NOT NULL,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  source_account_code VARCHAR(40) NOT NULL DEFAULT '1020',
  source_account_name VARCHAR(160) NOT NULL DEFAULT 'Cash in Bank',
  reference_no VARCHAR(80) NOT NULL UNIQUE,
  funding_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Prepared',
  prepared_by VARCHAR(80) NOT NULL,
  prepared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by VARCHAR(80),
  approved_at TIMESTAMP NULL,
  acknowledged_by VARCHAR(80),
  acknowledged_at TIMESTAMP NULL,
  posted_by VARCHAR(80),
  posted_entry_no VARCHAR(40),
  posted_at TIMESTAMP NULL
);
