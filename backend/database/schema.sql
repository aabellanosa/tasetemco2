CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  role_name VARCHAR(120) NOT NULL,
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
  share_capital INT NOT NULL DEFAULT 0,
  savings_balance INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_no VARCHAR(40) NOT NULL UNIQUE,
  full_name VARCHAR(180) NOT NULL,
  cluster_name VARCHAR(160) NOT NULL,
  contact_number VARCHAR(60) NOT NULL,
  initial_share_capital INT NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'Pending Approval',
  created_by VARCHAR(80) NOT NULL,
  approved_by VARCHAR(80),
  approved_member_no VARCHAR(40),
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS initial_member_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_no VARCHAR(40) NOT NULL UNIQUE,
  batch_no VARCHAR(40) NOT NULL,
  member_no VARCHAR(40) NOT NULL,
  member_name VARCHAR(180) NOT NULL,
  share_capital_amount INT NOT NULL DEFAULT 0,
  membership_fee_amount INT NOT NULL DEFAULT 0,
  savings_deposit_amount INT NOT NULL DEFAULT 0,
  cash_received INT NOT NULL DEFAULT 0,
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
  amount INT NOT NULL DEFAULT 0,
  cash_received INT NOT NULL DEFAULT 0,
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
  amount INT NOT NULL DEFAULT 0,
  cash_received INT NOT NULL DEFAULT 0,
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
  amount INT NOT NULL DEFAULT 0,
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
  debit INT NOT NULL DEFAULT 0,
  credit INT NOT NULL DEFAULT 0,
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
  expected_cash INT NOT NULL DEFAULT 0,
  actual_cash INT NOT NULL DEFAULT 0,
  variance INT NOT NULL DEFAULT 0,
  transaction_count INT NOT NULL DEFAULT 0,
  variance_note TEXT,
  variance_noted_by VARCHAR(80),
  variance_noted_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS teller_cash_counts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  count_no VARCHAR(40) NOT NULL UNIQUE,
  batch_no VARCHAR(40) NOT NULL,
  expected_cash INT NOT NULL DEFAULT 0,
  actual_cash INT NOT NULL DEFAULT 0,
  variance INT NOT NULL DEFAULT 0,
  transaction_count INT NOT NULL DEFAULT 0,
  submitted_by VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Submitted',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
