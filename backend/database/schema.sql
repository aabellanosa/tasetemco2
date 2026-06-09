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

CREATE TABLE IF NOT EXISTS initial_member_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_no VARCHAR(40) NOT NULL UNIQUE,
  member_no VARCHAR(40) NOT NULL,
  member_name VARCHAR(180) NOT NULL,
  share_capital_amount INT NOT NULL DEFAULT 0,
  membership_fee_amount INT NOT NULL DEFAULT 0,
  savings_deposit_amount INT NOT NULL DEFAULT 0,
  cash_received INT NOT NULL DEFAULT 0,
  reference_no VARCHAR(80) NOT NULL,
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
  member_no VARCHAR(40) NOT NULL,
  member_name VARCHAR(180) NOT NULL,
  amount INT NOT NULL DEFAULT 0,
  cash_received INT NOT NULL DEFAULT 0,
  reference_no VARCHAR(80) NOT NULL,
  received_by VARCHAR(80) NOT NULL,
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
