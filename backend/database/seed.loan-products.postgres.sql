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
ON CONFLICT (product_code) DO NOTHING;
