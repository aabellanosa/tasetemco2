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
