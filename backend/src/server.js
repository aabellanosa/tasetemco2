import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import cookie from "cookie";
import dotenv from "dotenv";
import express from "express";
import pg from "pg";
import {
  dashboard,
  defaultPassword,
  initialPayments,
  journalEntries,
  loanApplications,
  loanCollections,
  loanInstallments,
  loanProducts,
  loanReleases,
  loans,
  memberApplications,
  memberImportBatches,
  memberImportRows,
  members,
  openingBalanceImportBatches,
  openingBalanceImportRows,
  publicUser,
  roles,
  roleViews,
  savingsDeposits,
  savingsWithdrawals,
  shareCapitalContributions,
  tellerBatches,
  tellerCashCounts,
  tellerFundings,
  users
} from "./data.js";

dotenv.config();

pg.types.setTypeParser(20, (value) => Number(value));
pg.types.setTypeParser(1700, (value) => Number(value));

const MONEY_SCALE = 100;
const MAX_MONEY = 9999999999999.99;

function moneyCents(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.round(amount * MONEY_SCALE) : Number.NaN;
}

function moneyValue(value) {
  const cents = moneyCents(value);
  return Number.isFinite(cents) ? cents / MONEY_SCALE : Number.NaN;
}

function isMoney(value, { positive = false } = {}) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_MONEY) {
    return false;
  }
  if (positive && amount <= 0) {
    return false;
  }
  return Math.abs(amount * MONEY_SCALE - Math.round(amount * MONEY_SCALE)) < 0.000001;
}

function moneyEquals(left, right) {
  return moneyCents(left) === moneyCents(right);
}

function addMoney(...values) {
  return values.reduce((total, value) => total + moneyCents(value), 0) / MONEY_SCALE;
}

function subtractMoney(left, right) {
  return (moneyCents(left) - moneyCents(right)) / MONEY_SCALE;
}

function sumMoney(values) {
  return addMoney(...values);
}

const app = express();
const host = process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");
const port = Number(process.env.PORT || 4000);
const frontendDistCandidates = [
  path.resolve(process.cwd(), "frontend", "dist"),
  path.resolve(process.cwd(), "..", "frontend", "dist")
];
const frontendDistPath = frontendDistCandidates.find((candidate) =>
  fs.existsSync(path.join(candidate, "index.html"))
);
const databaseDirCandidates = [
  path.resolve(process.cwd(), "backend", "database"),
  path.resolve(process.cwd(), "database")
];
const databaseDirPath = databaseDirCandidates.find((candidate) =>
  fs.existsSync(path.join(candidate, "seed.postgres.sql"))
);
const schemaSqlPath = databaseDirPath ? path.join(databaseDirPath, "schema.postgres.sql") : "";
const seedSqlPath = databaseDirPath ? path.join(databaseDirPath, "seed.postgres.sql") : "";
const sessions = new Map();
let pool = null;

const persistedTables = [
  "journal_entry_lines",
  "journal_entries",
  "loan_collections",
  "loan_releases",
  "loan_installments",
  "loans",
  "teller_fundings",
  "teller_cash_counts",
  "initial_member_payments",
  "savings_deposits",
  "share_capital_contributions",
  "savings_withdrawals",
  "teller_batches",
  "opening_balance_import_rows",
  "opening_balance_import_batches",
  "loan_applications",
  "loan_products",
  "member_import_rows",
  "member_import_batches",
  "member_applications",
  "members",
  "users"
];

const requiredSchemaColumns = {
  members: [
    "contact_number",
    "address",
    "birthdate",
    "civil_status",
    "occupation",
    "membership_date"
  ],
  member_import_batches: [
    "import_no",
    "source_label",
    "status",
    "total_rows",
    "ready_rows",
    "issue_rows",
    "created_by",
    "created_at",
    "finalized_by",
    "finalized_at",
    "imported_rows",
    "skipped_rows"
  ],
  member_import_rows: [
    "import_no",
    "row_no",
    "member_no",
    "full_name",
    "cluster_name",
    "contact_number",
    "address",
    "birthdate",
    "civil_status",
    "occupation",
    "membership_date",
    "member_status",
    "row_status",
    "issues"
  ],
  opening_balance_import_batches: [
    "import_no",
    "source_label",
    "status",
    "total_rows",
    "ready_rows",
    "issue_rows",
    "total_share_capital",
    "total_savings",
    "created_by",
    "created_at",
    "finalized_by",
    "finalized_at",
    "finalized_rows",
    "skipped_rows"
  ],
  opening_balance_import_rows: [
    "import_no",
    "row_no",
    "member_no",
    "member_name",
    "share_capital_opening_balance",
    "savings_opening_balance",
    "cutover_date",
    "source_reference",
    "row_status",
    "issues",
    "raw_data",
    "finalized_at"
  ],
  loan_products: [
    "product_code",
    "product_name",
    "description",
    "minimum_principal",
    "maximum_principal",
    "minimum_term_months",
    "maximum_term_months",
    "annual_interest_rate_bps",
    "interest_method",
    "payment_frequency",
    "processing_fee",
    "penalty_rate_bps",
    "loans_receivable_account",
    "interest_income_account",
    "processing_fee_account",
    "penalty_income_account",
    "cash_account",
    "status",
    "created_at",
    "updated_at"
  ],
  loan_applications: [
    "application_no",
    "member_no",
    "member_name",
    "product_code",
    "product_name",
    "requested_principal",
    "requested_term_months",
    "purpose",
    "application_date",
    "annual_interest_rate_bps",
    "interest_method",
    "payment_frequency",
    "processing_fee",
    "penalty_rate_bps",
    "loans_receivable_account",
    "interest_income_account",
    "processing_fee_account",
    "penalty_income_account",
    "cash_account",
    "status",
    "created_by",
    "submitted_by",
    "submitted_at",
    "credit_assessment_notes",
    "recommended_principal",
    "recommended_term_months",
    "decision",
    "decision_remarks",
    "decision_date",
    "decided_by",
    "decided_at",
    "created_at",
    "updated_at"
  ],
  loans: [
    "loan_no",
    "application_no",
    "member_no",
    "member_name",
    "product_code",
    "product_name",
    "principal",
    "term_months",
    "annual_interest_rate_bps",
    "interest_method",
    "payment_frequency",
    "processing_fee",
    "total_interest",
    "total_payable",
    "net_proceeds",
    "installment_count",
    "first_payment_date",
    "maturity_date",
    "status",
    "computed_by",
    "computed_at",
    "created_at"
  ],
  loan_installments: [
    "loan_no",
    "installment_no",
    "due_date",
    "principal_due",
    "interest_due",
    "total_due",
    "status",
    "created_at"
  ],
  loan_releases: [
    "release_no",
    "loan_no",
    "batch_no",
    "member_no",
    "member_name",
    "principal",
    "processing_fee",
    "net_proceeds",
    "cash_released",
    "release_date",
    "reference_no",
    "released_by",
    "status",
    "posted_by",
    "posted_entry_no",
    "posted_at",
    "created_at"
  ],
  loan_collections: [
    "collection_no",
    "loan_no",
    "installment_no",
    "batch_no",
    "member_no",
    "member_name",
    "principal_amount",
    "interest_amount",
    "amount_received",
    "collection_date",
    "reference_no",
    "received_by",
    "status",
    "posted_by",
    "posted_entry_no",
    "posted_at",
    "created_at"
  ],
  teller_fundings: [
    "funding_no",
    "batch_no",
    "teller_username",
    "amount",
    "source_account_code",
    "source_account_name",
    "reference_no",
    "funding_date",
    "status",
    "prepared_by",
    "prepared_at",
    "approved_by",
    "approved_at",
    "acknowledged_by",
    "acknowledged_at",
    "posted_by",
    "posted_entry_no",
    "posted_at"
  ]
};

app.use(express.json());

function wantsPostgres() {
  return Boolean(
    process.env.DATABASE_URL ||
      (process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE)
  );
}

function translateSql(sql) {
  let parameterIndex = 0;

  return sql
    .replace(/`/g, '"')
    .replace(/\?/g, () => `$${(parameterIndex += 1)}`)
    .replace(/AS UNSIGNED/gi, "AS INTEGER")
    .replace(/YEAR\(([^)]+)\)/gi, "EXTRACT(YEAR FROM $1)")
    .replace(/\bAS\s+([a-z][A-Za-z0-9]*)(?=[\s,\n\r)]|$)/g, 'AS "$1"');
}

function createPostgresConfig() {
  const baseConfig = {
    max: 5,
    connectionTimeoutMillis: Number(process.env.PGCONNECT_TIMEOUT_MS || 8000)
  };

  if (process.env.DATABASE_URL) {
    return {
      ...baseConfig,
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined
    };
  }

  return {
    ...baseConfig,
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE
  };
}

function wrapPostgresClient(client) {
  return {
    async execute(sql, params = []) {
      const result = await client.query(translateSql(sql), params);
      return [result.rows, result];
    },
    async query(sql, params = []) {
      const result = await client.query(translateSql(sql), params);
      return [result.rows, result];
    },
    beginTransaction() {
      return client.query("BEGIN");
    },
    commit() {
      return client.query("COMMIT");
    },
    rollback() {
      return client.query("ROLLBACK");
    },
    release() {
      client.release();
    }
  };
}

async function getPool() {
  if (!wantsPostgres()) {
    return null;
  }

  if (!pool) {
    const postgresPool = new pg.Pool(createPostgresConfig());
    pool = {
      async execute(sql, params = []) {
        const result = await postgresPool.query(translateSql(sql), params);
        return [result.rows, result];
      },
      async query(sql, params = []) {
        const result = await postgresPool.query(translateSql(sql), params);
        return [result.rows, result];
      },
      async getConnection() {
        const client = await postgresPool.connect();
        return wrapPostgresClient(client);
      },
      end() {
        return postgresPool.end();
      }
    };
  }

  return pool;
}

function parseSession(request) {
  const cookies = cookie.parse(request.headers.cookie || "");
  return sessions.get(cookies.tasetemco_spike_session) || null;
}

function setSession(response, user) {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, user);
  response.setHeader(
    "Set-Cookie",
    cookie.serialize("tasetemco_spike_session", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 28800
    })
  );
}

function clearSession(request, response) {
  const cookies = cookie.parse(request.headers.cookie || "");
  sessions.delete(cookies.tasetemco_spike_session);
  response.setHeader(
    "Set-Cookie",
    cookie.serialize("tasetemco_spike_session", "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0
    })
  );
}

async function findUser(username) {
  const db = await getPool();

  if (!db) {
    return users.find((user) => user.username === username && (user.status || "Active") === "Active") || null;
  }

  const [rows] = await db.execute(
    `SELECT id, full_name AS name, username, role_name AS role, default_view AS defaultView
     FROM users
     WHERE username = ? AND status = 'Active'
     LIMIT 1`,
    [username]
  );

  return rows[0] || null;
}

async function listSystemUsers() {
  const db = await getPool();

  if (!db) {
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      status: user.status || "Active",
      defaultView: user.defaultView
    }));
  }

  const [rows] = await db.execute(
    `SELECT id, full_name AS name, username, role_name AS role, status,
            default_view AS defaultView, created_at AS createdAt
     FROM users
     ORDER BY username`
  );

  return rows;
}

function mapLoanProduct(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || "",
    minimumPrincipal: Number(row.minimumPrincipal || 0),
    maximumPrincipal: Number(row.maximumPrincipal || 0),
    minimumTermMonths: Number(row.minimumTermMonths || 0),
    maximumTermMonths: Number(row.maximumTermMonths || 0),
    annualInterestRateBps: Number(row.annualInterestRateBps || 0),
    interestMethod: row.interestMethod,
    paymentFrequency: row.paymentFrequency,
    processingFee: Number(row.processingFee || 0),
    penaltyRateBps: Number(row.penaltyRateBps || 0),
    loansReceivableAccount: row.loansReceivableAccount,
    interestIncomeAccount: row.interestIncomeAccount,
    processingFeeAccount: row.processingFeeAccount,
    penaltyIncomeAccount: row.penaltyIncomeAccount,
    cashAccount: row.cashAccount,
    status: row.status,
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || ""
  };
}

async function listLoanProducts() {
  const db = await getPool();

  if (!db) {
    return loanProducts.map(mapLoanProduct);
  }

  const [rows] = await db.execute(
    `SELECT id, product_code AS code, product_name AS name, description,
            minimum_principal AS minimumPrincipal, maximum_principal AS maximumPrincipal,
            minimum_term_months AS minimumTermMonths, maximum_term_months AS maximumTermMonths,
            annual_interest_rate_bps AS annualInterestRateBps,
            interest_method AS interestMethod, payment_frequency AS paymentFrequency,
            processing_fee AS processingFee, penalty_rate_bps AS penaltyRateBps,
            loans_receivable_account AS loansReceivableAccount,
            interest_income_account AS interestIncomeAccount,
            processing_fee_account AS processingFeeAccount,
            penalty_income_account AS penaltyIncomeAccount, cash_account AS cashAccount,
            status, created_at AS createdAt, updated_at AS updatedAt
     FROM loan_products
     ORDER BY product_name, product_code`
  );

  return rows.map(mapLoanProduct);
}

function validateLoanProductInput(body) {
  const code = String(body.code || "").trim().toUpperCase();
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim().slice(0, 1000);
  const minimumPrincipal = Number(body.minimumPrincipal);
  const maximumPrincipal = Number(body.maximumPrincipal);
  const minimumTermMonths = Number(body.minimumTermMonths);
  const maximumTermMonths = Number(body.maximumTermMonths);
  const annualInterestRateBps = Number(body.annualInterestRateBps);
  const processingFee = Number(body.processingFee);
  const penaltyRateBps = Number(body.penaltyRateBps);
  const interestMethod = String(body.interestMethod || "Flat Interest").trim();
  const paymentFrequency = String(body.paymentFrequency || "Monthly").trim();
  const status = String(body.status || "Active").trim();
  const accounts = {
    loansReceivableAccount: String(body.loansReceivableAccount || "1050").trim(),
    interestIncomeAccount: String(body.interestIncomeAccount || "4010").trim(),
    processingFeeAccount: String(body.processingFeeAccount || "4030").trim(),
    penaltyIncomeAccount: String(body.penaltyIncomeAccount || "4040").trim(),
    cashAccount: String(body.cashAccount || "1010").trim()
  };

  if (!/^[A-Z][A-Z0-9-]{2,39}$/.test(code)) {
    return { error: "Product code must use 3-40 uppercase letters, numbers, or dashes." };
  }

  if (name.length < 3) {
    return { error: "Product name is required." };
  }

  if (!isMoney(minimumPrincipal)) {
    return { error: "Minimum principal must be a non-negative amount with up to two decimal places." };
  }

  if (!isMoney(maximumPrincipal, { positive: true }) || maximumPrincipal < minimumPrincipal) {
    return { error: "Maximum principal must be greater than or equal to the minimum principal." };
  }

  if (!Number.isInteger(minimumTermMonths) || minimumTermMonths < 1) {
    return { error: "Minimum term must be at least one month." };
  }

  if (!Number.isInteger(maximumTermMonths) || maximumTermMonths < minimumTermMonths) {
    return { error: "Maximum term must be greater than or equal to the minimum term." };
  }

  if (!Number.isInteger(annualInterestRateBps) || annualInterestRateBps < 0 || annualInterestRateBps > 10000) {
    return { error: "Annual interest rate must be between 0% and 100%." };
  }

  if (!isMoney(processingFee)) {
    return { error: "Processing fee must be a non-negative amount with up to two decimal places." };
  }

  if (!Number.isInteger(penaltyRateBps) || penaltyRateBps < 0 || penaltyRateBps > 10000) {
    return { error: "Penalty rate must be between 0% and 100%." };
  }

  if (!["Flat Interest", "Diminishing Balance"].includes(interestMethod)) {
    return { error: "Interest method is not supported." };
  }

  if (!["Monthly", "Semi-monthly", "Weekly"].includes(paymentFrequency)) {
    return { error: "Payment frequency is not supported." };
  }

  if (!["Active", "Inactive"].includes(status)) {
    return { error: "Status must be Active or Inactive." };
  }

  if (Object.values(accounts).some((account) => !/^[0-9]{4,20}$/.test(account))) {
    return { error: "Accounting mappings must use numeric account codes." };
  }

  return {
    value: {
      code,
      name,
      description,
      minimumPrincipal: moneyValue(minimumPrincipal),
      maximumPrincipal: moneyValue(maximumPrincipal),
      minimumTermMonths,
      maximumTermMonths,
      annualInterestRateBps,
      interestMethod,
      paymentFrequency,
      processingFee: moneyValue(processingFee),
      penaltyRateBps,
      ...accounts,
      status
    }
  };
}

async function createLoanProduct(input) {
  const db = await getPool();

  if (!db) {
    if (loanProducts.some((product) => product.code === input.code)) {
      return { error: "Loan product code already exists.", statusCode: 409 };
    }

    const product = {
      id: Math.max(...loanProducts.map((item) => Number(item.id) || 0), 0) + 1,
      ...input,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    loanProducts.push(product);
    return { product: mapLoanProduct(product) };
  }

  try {
    await db.execute(
      `INSERT INTO loan_products (
         product_code, product_name, description, minimum_principal, maximum_principal,
         minimum_term_months, maximum_term_months, annual_interest_rate_bps,
         interest_method, payment_frequency, processing_fee, penalty_rate_bps,
         loans_receivable_account, interest_income_account, processing_fee_account,
         penalty_income_account, cash_account, status
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.code,
        input.name,
        input.description,
        input.minimumPrincipal,
        input.maximumPrincipal,
        input.minimumTermMonths,
        input.maximumTermMonths,
        input.annualInterestRateBps,
        input.interestMethod,
        input.paymentFrequency,
        input.processingFee,
        input.penaltyRateBps,
        input.loansReceivableAccount,
        input.interestIncomeAccount,
        input.processingFeeAccount,
        input.penaltyIncomeAccount,
        input.cashAccount,
        input.status
      ]
    );
  } catch (error) {
    if (error.code === "23505") {
      return { error: "Loan product code already exists.", statusCode: 409 };
    }
    throw error;
  }

  const products = await listLoanProducts();
  return { product: products.find((product) => product.code === input.code) };
}

async function updateLoanProduct(code, input) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  const db = await getPool();

  if (!db) {
    const product = loanProducts.find((item) => item.code === normalizedCode);
    if (!product) {
      return { error: "Loan product was not found.", statusCode: 404 };
    }
    Object.assign(product, input, { code: normalizedCode, updatedAt: new Date().toISOString() });
    return { product: mapLoanProduct(product) };
  }

  const [existingRows] = await db.execute(
    `SELECT product_code AS code FROM loan_products WHERE product_code = ? LIMIT 1`,
    [normalizedCode]
  );
  if (existingRows.length === 0) {
    return { error: "Loan product was not found.", statusCode: 404 };
  }

  await db.execute(
    `UPDATE loan_products
     SET product_name = ?, description = ?, minimum_principal = ?, maximum_principal = ?,
         minimum_term_months = ?, maximum_term_months = ?, annual_interest_rate_bps = ?,
         interest_method = ?, payment_frequency = ?, processing_fee = ?, penalty_rate_bps = ?,
         loans_receivable_account = ?, interest_income_account = ?, processing_fee_account = ?,
         penalty_income_account = ?, cash_account = ?, status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE product_code = ?`,
    [
      input.name,
      input.description,
      input.minimumPrincipal,
      input.maximumPrincipal,
      input.minimumTermMonths,
      input.maximumTermMonths,
      input.annualInterestRateBps,
      input.interestMethod,
      input.paymentFrequency,
      input.processingFee,
      input.penaltyRateBps,
      input.loansReceivableAccount,
      input.interestIncomeAccount,
      input.processingFeeAccount,
      input.penaltyIncomeAccount,
      input.cashAccount,
      input.status,
      normalizedCode
    ]
  );

  const products = await listLoanProducts();
  return { product: products.find((product) => product.code === normalizedCode) };
}

function mapLoanApplication(row) {
  return {
    id: row.applicationNo || row.id,
    applicationNo: row.applicationNo || row.id,
    memberNo: row.memberNo,
    memberName: row.memberName,
    productCode: row.productCode,
    productName: row.productName,
    requestedPrincipal: Number(row.requestedPrincipal || 0),
    requestedTermMonths: Number(row.requestedTermMonths || 0),
    purpose: row.purpose,
    applicationDate: formatDateOnly(row.applicationDate),
    annualInterestRateBps: Number(row.annualInterestRateBps || 0),
    interestMethod: row.interestMethod,
    paymentFrequency: row.paymentFrequency,
    processingFee: Number(row.processingFee || 0),
    penaltyRateBps: Number(row.penaltyRateBps || 0),
    loansReceivableAccount: row.loansReceivableAccount,
    interestIncomeAccount: row.interestIncomeAccount,
    processingFeeAccount: row.processingFeeAccount,
    penaltyIncomeAccount: row.penaltyIncomeAccount,
    cashAccount: row.cashAccount,
    status: row.status,
    createdBy: row.createdBy,
    submittedBy: row.submittedBy || "",
    submittedAt: row.submittedAt || "",
    creditAssessmentNotes: row.creditAssessmentNotes || "",
    recommendedPrincipal: Number(row.recommendedPrincipal || 0),
    recommendedTermMonths: Number(row.recommendedTermMonths || 0),
    decision: row.decision || "",
    decisionRemarks: row.decisionRemarks || "",
    decisionDate: formatDateOnly(row.decisionDate),
    decidedBy: row.decidedBy || "",
    decidedAt: row.decidedAt || "",
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || ""
  };
}

async function listLoanApplications() {
  const db = await getPool();

  if (!db) {
    return loanApplications.map(mapLoanApplication);
  }

  const [rows] = await db.execute(
    `SELECT application_no AS applicationNo, member_no AS memberNo, member_name AS memberName,
            product_code AS productCode, product_name AS productName,
            requested_principal AS requestedPrincipal,
            requested_term_months AS requestedTermMonths, purpose,
            application_date AS applicationDate,
            annual_interest_rate_bps AS annualInterestRateBps,
            interest_method AS interestMethod, payment_frequency AS paymentFrequency,
            processing_fee AS processingFee, penalty_rate_bps AS penaltyRateBps,
            loans_receivable_account AS loansReceivableAccount,
            interest_income_account AS interestIncomeAccount,
            processing_fee_account AS processingFeeAccount,
            penalty_income_account AS penaltyIncomeAccount, cash_account AS cashAccount,
            status, created_by AS createdBy, submitted_by AS submittedBy,
            submitted_at AS submittedAt,
            credit_assessment_notes AS creditAssessmentNotes,
            recommended_principal AS recommendedPrincipal,
            recommended_term_months AS recommendedTermMonths,
            decision, decision_remarks AS decisionRemarks,
            decision_date AS decisionDate, decided_by AS decidedBy,
            decided_at AS decidedAt, created_at AS createdAt, updated_at AS updatedAt
     FROM loan_applications
     ORDER BY created_at DESC, id DESC`
  );

  return rows.map(mapLoanApplication);
}

async function nextLoanApplicationNo(connection = null) {
  const db = connection || (await getPool());

  if (!db) {
    return `LA-${new Date().getFullYear()}-${String(loanApplications.length + 1).padStart(4, "0")}`;
  }

  const [rows] = await db.execute(
    `SELECT COUNT(*) AS countValue
     FROM loan_applications
     WHERE YEAR(created_at) = YEAR(CURRENT_DATE)`
  );
  return `LA-${new Date().getFullYear()}-${String(Number(rows[0].countValue) + 1).padStart(4, "0")}`;
}

async function validateLoanApplicationInput(body) {
  const memberNo = String(body.memberNo || "").trim();
  const productCode = String(body.productCode || "").trim().toUpperCase();
  const requestedPrincipal = Number(body.requestedPrincipal);
  const requestedTermMonths = Number(body.requestedTermMonths);
  const purpose = String(body.purpose || "").trim();
  const applicationDate = formatDateOnly(body.applicationDate || new Date());
  const memberRows = await listMembers();
  const products = await listLoanProducts();
  const member = memberRows.find((item) => item.id === memberNo && item.status === "Active");
  const product = products.find((item) => item.code === productCode && item.status === "Active");

  if (!member) {
    return { error: "Active member was not found." };
  }

  if (!product) {
    return { error: "Active loan product was not found." };
  }

  if (
    !isMoney(requestedPrincipal, { positive: true }) ||
    requestedPrincipal < product.minimumPrincipal ||
    requestedPrincipal > product.maximumPrincipal
  ) {
    return {
      error: `Requested principal must be between ${product.minimumPrincipal} and ${product.maximumPrincipal}.`
    };
  }

  if (
    !Number.isInteger(requestedTermMonths) ||
    requestedTermMonths < product.minimumTermMonths ||
    requestedTermMonths > product.maximumTermMonths
  ) {
    return {
      error: `Requested term must be between ${product.minimumTermMonths} and ${product.maximumTermMonths} months.`
    };
  }

  if (purpose.length < 5) {
    return { error: "Loan purpose is required." };
  }

  if (!isValidIsoDate(applicationDate)) {
    return { error: "Application date must be a valid YYYY-MM-DD date." };
  }

  return {
    value: {
      memberNo: member.id,
      memberName: member.name,
      productCode: product.code,
      productName: product.name,
      requestedPrincipal: moneyValue(requestedPrincipal),
      requestedTermMonths,
      purpose: purpose.slice(0, 1000),
      applicationDate,
      annualInterestRateBps: product.annualInterestRateBps,
      interestMethod: product.interestMethod,
      paymentFrequency: product.paymentFrequency,
      processingFee: product.processingFee,
      penaltyRateBps: product.penaltyRateBps,
      loansReceivableAccount: product.loansReceivableAccount,
      interestIncomeAccount: product.interestIncomeAccount,
      processingFeeAccount: product.processingFeeAccount,
      penaltyIncomeAccount: product.penaltyIncomeAccount,
      cashAccount: product.cashAccount
    }
  };
}

async function createLoanApplication(input, user) {
  const db = await getPool();
  const applicationNo = await nextLoanApplicationNo();

  if (!db) {
    const application = {
      id: applicationNo,
      applicationNo,
      ...input,
      status: "Draft",
      createdBy: user.username,
      submittedBy: "",
      submittedAt: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    loanApplications.unshift(application);
    return { application: mapLoanApplication(application) };
  }

  await db.execute(
    `INSERT INTO loan_applications (
       application_no, member_no, member_name, product_code, product_name,
       requested_principal, requested_term_months, purpose, application_date,
       annual_interest_rate_bps, interest_method, payment_frequency,
       processing_fee, penalty_rate_bps, loans_receivable_account,
       interest_income_account, processing_fee_account, penalty_income_account,
       cash_account, status, created_by
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?)`,
    [
      applicationNo,
      input.memberNo,
      input.memberName,
      input.productCode,
      input.productName,
      input.requestedPrincipal,
      input.requestedTermMonths,
      input.purpose,
      input.applicationDate,
      input.annualInterestRateBps,
      input.interestMethod,
      input.paymentFrequency,
      input.processingFee,
      input.penaltyRateBps,
      input.loansReceivableAccount,
      input.interestIncomeAccount,
      input.processingFeeAccount,
      input.penaltyIncomeAccount,
      input.cashAccount,
      user.username
    ]
  );

  return { application: (await listLoanApplications()).find((item) => item.applicationNo === applicationNo) };
}

async function updateLoanApplication(applicationNo, input, user) {
  const db = await getPool();

  if (!db) {
    const application = loanApplications.find((item) => item.applicationNo === applicationNo || item.id === applicationNo);
    if (!application) {
      return { error: "Loan application was not found.", statusCode: 404 };
    }
    if (!["Draft", "Returned"].includes(application.status)) {
      return { error: "Only draft or returned loan applications can be edited.", statusCode: 409 };
    }
    if (application.createdBy !== user.username) {
      return { error: "Loan Officer can edit only their own draft applications.", statusCode: 403 };
    }
    Object.assign(application, input, {
      status: "Draft",
      updatedAt: new Date().toISOString()
    });
    return { application: mapLoanApplication(application) };
  }

  const [existingRows] = await db.execute(
    `SELECT status, created_by AS createdBy
     FROM loan_applications
     WHERE application_no = ?
     LIMIT 1`,
    [applicationNo]
  );
  if (existingRows.length === 0) {
    return { error: "Loan application was not found.", statusCode: 404 };
  }
  if (!["Draft", "Returned"].includes(existingRows[0].status)) {
    return { error: "Only draft or returned loan applications can be edited.", statusCode: 409 };
  }
  if (existingRows[0].createdBy !== user.username) {
    return { error: "Loan Officer can edit only their own draft applications.", statusCode: 403 };
  }

  await db.execute(
    `UPDATE loan_applications
     SET member_no = ?, member_name = ?, product_code = ?, product_name = ?,
         requested_principal = ?, requested_term_months = ?, purpose = ?, application_date = ?,
         annual_interest_rate_bps = ?, interest_method = ?, payment_frequency = ?,
         processing_fee = ?, penalty_rate_bps = ?, loans_receivable_account = ?,
         interest_income_account = ?, processing_fee_account = ?, penalty_income_account = ?,
         cash_account = ?, status = 'Draft', updated_at = CURRENT_TIMESTAMP
     WHERE application_no = ?`,
    [
      input.memberNo,
      input.memberName,
      input.productCode,
      input.productName,
      input.requestedPrincipal,
      input.requestedTermMonths,
      input.purpose,
      input.applicationDate,
      input.annualInterestRateBps,
      input.interestMethod,
      input.paymentFrequency,
      input.processingFee,
      input.penaltyRateBps,
      input.loansReceivableAccount,
      input.interestIncomeAccount,
      input.processingFeeAccount,
      input.penaltyIncomeAccount,
      input.cashAccount,
      applicationNo
    ]
  );

  return { application: (await listLoanApplications()).find((item) => item.applicationNo === applicationNo) };
}

async function submitLoanApplication(applicationNo, user) {
  const db = await getPool();

  if (!db) {
    const application = loanApplications.find((item) => item.applicationNo === applicationNo || item.id === applicationNo);
    if (!application) {
      return { error: "Loan application was not found.", statusCode: 404 };
    }
    if (application.status !== "Draft") {
      return { error: "Only draft loan applications can be submitted.", statusCode: 409 };
    }
    if (application.createdBy !== user.username) {
      return { error: "Loan Officer can submit only their own draft applications.", statusCode: 403 };
    }
    const validation = await validateLoanApplicationInput(application);
    if (validation.error) {
      return { error: validation.error, statusCode: 400 };
    }
    application.status = "Submitted";
    application.submittedBy = user.username;
    application.submittedAt = new Date().toISOString();
    application.updatedAt = application.submittedAt;
    return { application: mapLoanApplication(application) };
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT application_no AS applicationNo, member_no AS memberNo,
              product_code AS productCode, requested_principal AS requestedPrincipal,
              requested_term_months AS requestedTermMonths, purpose,
              application_date AS applicationDate, status, created_by AS createdBy
       FROM loan_applications
       WHERE application_no = ?
       LIMIT 1
       FOR UPDATE`,
      [applicationNo]
    );
    const application = rows[0];
    if (!application) {
      await connection.rollback();
      return { error: "Loan application was not found.", statusCode: 404 };
    }
    if (application.status !== "Draft") {
      await connection.rollback();
      return { error: "Only draft loan applications can be submitted.", statusCode: 409 };
    }
    if (application.createdBy !== user.username) {
      await connection.rollback();
      return { error: "Loan Officer can submit only their own draft applications.", statusCode: 403 };
    }
    const validation = await validateLoanApplicationInput(application);
    if (validation.error) {
      await connection.rollback();
      return { error: validation.error, statusCode: 400 };
    }

    await connection.execute(
      `UPDATE loan_applications
       SET status = 'Submitted', submitted_by = ?, submitted_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE application_no = ?`,
      [user.username, applicationNo]
    );
    await connection.commit();
    return { application: (await listLoanApplications()).find((item) => item.applicationNo === applicationNo) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function validateLoanCreditDecision(body, application) {
  const decision = String(body.decision || "").trim();
  const creditAssessmentNotes = String(body.creditAssessmentNotes || "").trim();
  const decisionRemarks = String(body.decisionRemarks || "").trim();
  const decisionDate = formatDateOnly(body.decisionDate || new Date());
  const recommendedPrincipal = Number(body.recommendedPrincipal || 0);
  const recommendedTermMonths = Number(body.recommendedTermMonths || 0);

  if (!["Approved", "Rejected", "Returned"].includes(decision)) {
    return { error: "Decision must be Approved, Rejected, or Returned." };
  }

  if (creditAssessmentNotes.length < 5) {
    return { error: "Credit assessment notes are required." };
  }

  if (!isValidIsoDate(decisionDate)) {
    return { error: "Decision date must be a valid YYYY-MM-DD date." };
  }

  if (["Rejected", "Returned"].includes(decision) && decisionRemarks.length < 5) {
    return { error: "Decision remarks are required when rejecting or returning an application." };
  }

  if (decision === "Approved") {
    if (
      !isMoney(recommendedPrincipal, { positive: true }) ||
      recommendedPrincipal > application.requestedPrincipal
    ) {
      return { error: "Recommended principal must be positive and cannot exceed the requested principal." };
    }

    if (
      !Number.isInteger(recommendedTermMonths) ||
      recommendedTermMonths <= 0 ||
      recommendedTermMonths > application.requestedTermMonths
    ) {
      return { error: "Recommended term must be positive and cannot exceed the requested term." };
    }
  }

  return {
    value: {
      decision,
      creditAssessmentNotes: creditAssessmentNotes.slice(0, 2000),
      recommendedPrincipal: decision === "Approved" ? moneyValue(recommendedPrincipal) : 0,
      recommendedTermMonths: decision === "Approved" ? recommendedTermMonths : 0,
      decisionRemarks: decisionRemarks.slice(0, 2000),
      decisionDate
    }
  };
}

async function decideLoanApplication(applicationNo, body, user) {
  const db = await getPool();

  if (!db) {
    const application = loanApplications.find((item) => item.applicationNo === applicationNo || item.id === applicationNo);
    if (!application) {
      return { error: "Loan application was not found.", statusCode: 404 };
    }
    if (application.status !== "Submitted") {
      return { error: "Only submitted loan applications can receive a credit decision.", statusCode: 409 };
    }
    const validation = validateLoanCreditDecision(body, application);
    if (validation.error) {
      return { error: validation.error, statusCode: 400 };
    }
    Object.assign(application, validation.value, {
      status: validation.value.decision,
      decidedBy: user.username,
      decidedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return { application: mapLoanApplication(application) };
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT application_no AS applicationNo,
              requested_principal AS requestedPrincipal,
              requested_term_months AS requestedTermMonths, status
       FROM loan_applications
       WHERE application_no = ?
       LIMIT 1
       FOR UPDATE`,
      [applicationNo]
    );
    const application = rows[0];
    if (!application) {
      await connection.rollback();
      return { error: "Loan application was not found.", statusCode: 404 };
    }
    if (application.status !== "Submitted") {
      await connection.rollback();
      return { error: "Only submitted loan applications can receive a credit decision.", statusCode: 409 };
    }
    const validation = validateLoanCreditDecision(body, application);
    if (validation.error) {
      await connection.rollback();
      return { error: validation.error, statusCode: 400 };
    }

    await connection.execute(
      `UPDATE loan_applications
       SET status = ?, credit_assessment_notes = ?, recommended_principal = ?,
           recommended_term_months = ?, decision = ?, decision_remarks = ?,
           decision_date = ?, decided_by = ?, decided_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE application_no = ?`,
      [
        validation.value.decision,
        validation.value.creditAssessmentNotes,
        validation.value.recommendedPrincipal,
        validation.value.recommendedTermMonths,
        validation.value.decision,
        validation.value.decisionRemarks,
        validation.value.decisionDate,
        user.username,
        applicationNo
      ]
    );
    await connection.commit();
    return { application: (await listLoanApplications()).find((item) => item.applicationNo === applicationNo) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function mapLoan(row) {
  return {
    loanNo: row.loanNo,
    applicationNo: row.applicationNo,
    memberNo: row.memberNo,
    memberName: row.memberName,
    productCode: row.productCode,
    productName: row.productName,
    principal: Number(row.principal || 0),
    termMonths: Number(row.termMonths || 0),
    annualInterestRateBps: Number(row.annualInterestRateBps || 0),
    interestMethod: row.interestMethod,
    paymentFrequency: row.paymentFrequency,
    processingFee: Number(row.processingFee || 0),
    totalInterest: Number(row.totalInterest || 0),
    totalPayable: Number(row.totalPayable || 0),
    netProceeds: Number(row.netProceeds || 0),
    installmentCount: Number(row.installmentCount || 0),
    firstPaymentDate: formatDateOnly(row.firstPaymentDate),
    maturityDate: formatDateOnly(row.maturityDate),
    status: row.status,
    computedBy: row.computedBy,
    computedAt: row.computedAt || "",
    installments: Array.isArray(row.installments)
      ? row.installments.map((item) => ({
          installmentNo: Number(item.installmentNo),
          dueDate: formatDateOnly(item.dueDate),
          principalDue: Number(item.principalDue || 0),
          interestDue: Number(item.interestDue || 0),
          totalDue: Number(item.totalDue || 0),
          status: item.status || "Scheduled"
        }))
      : []
  };
}

async function listLoans() {
  const db = await getPool();

  if (!db) {
    return loans.map((loan) => mapLoan({
      ...loan,
      installments: loanInstallments.filter((item) => item.loanNo === loan.loanNo)
    }));
  }

  const [loanRows] = await db.execute(
    `SELECT loan_no AS loanNo, application_no AS applicationNo,
            member_no AS memberNo, member_name AS memberName,
            product_code AS productCode, product_name AS productName,
            principal, term_months AS termMonths,
            annual_interest_rate_bps AS annualInterestRateBps,
            interest_method AS interestMethod, payment_frequency AS paymentFrequency,
            processing_fee AS processingFee, total_interest AS totalInterest,
            total_payable AS totalPayable, net_proceeds AS netProceeds,
            installment_count AS installmentCount, first_payment_date AS firstPaymentDate,
            maturity_date AS maturityDate, status, computed_by AS computedBy,
            computed_at AS computedAt
     FROM loans
     ORDER BY computed_at DESC, id DESC`
  );
  const [installmentRows] = await db.execute(
    `SELECT loan_no AS loanNo, installment_no AS installmentNo, due_date AS dueDate,
            principal_due AS principalDue, interest_due AS interestDue,
            total_due AS totalDue, status
     FROM loan_installments
     ORDER BY loan_no, installment_no`
  );

  return loanRows.map((loan) => mapLoan({
    ...loan,
    installments: installmentRows.filter((item) => item.loanNo === loan.loanNo)
  }));
}

function addUtcDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addUtcMonths(dateString, months) {
  const source = new Date(`${dateString}T00:00:00.000Z`);
  const day = source.getUTCDate();
  const target = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

function installmentCountFor(termMonths, paymentFrequency) {
  if (paymentFrequency === "Monthly") {
    return termMonths;
  }
  if (paymentFrequency === "Semi-monthly") {
    return termMonths * 2;
  }
  if (paymentFrequency === "Weekly") {
    return Math.max(1, Math.round((termMonths * 52) / 12));
  }
  return 0;
}

function installmentDate(firstPaymentDate, paymentFrequency, index) {
  if (paymentFrequency === "Monthly") {
    return addUtcMonths(firstPaymentDate, index);
  }
  if (paymentFrequency === "Semi-monthly") {
    return addUtcDays(firstPaymentDate, index * 15);
  }
  return addUtcDays(firstPaymentDate, index * 7);
}

function allocateMoney(total, count) {
  const totalCents = moneyCents(total);
  const baseCents = Math.floor(totalCents / count);
  return Array.from({ length: count }, (_, index) =>
    (index === count - 1 ? totalCents - baseCents * (count - 1) : baseCents) / MONEY_SCALE
  );
}

function computeFlatLoanSchedule(application, firstPaymentDate) {
  if (application.interestMethod !== "Flat Interest") {
    return { error: "The current loan computation supports Flat Interest only." };
  }

  if (!isValidIsoDate(firstPaymentDate) || !firstPaymentDate) {
    return { error: "First payment date must be a valid YYYY-MM-DD date." };
  }

  if (application.decisionDate && firstPaymentDate <= application.decisionDate) {
    return { error: "First payment date must be after the credit decision date." };
  }

  const principal = Number(application.recommendedPrincipal);
  const termMonths = Number(application.recommendedTermMonths);
  const installmentCount = installmentCountFor(termMonths, application.paymentFrequency);
  if (!installmentCount) {
    return { error: "Payment frequency is not supported." };
  }
  if (Number(application.processingFee) >= principal) {
    return { error: "Processing fee must be less than the approved principal." };
  }

  const totalInterest =
    Math.round(
      (moneyCents(principal) * Number(application.annualInterestRateBps) * termMonths) /
        (10000 * 12)
    ) / MONEY_SCALE;
  const totalPayable = addMoney(principal, totalInterest);
  const principalParts = allocateMoney(principal, installmentCount);
  const interestParts = allocateMoney(totalInterest, installmentCount);
  const installments = principalParts.map((principalDue, index) => {
    const interestDue = interestParts[index];
    return {
      installmentNo: index + 1,
      dueDate: installmentDate(firstPaymentDate, application.paymentFrequency, index),
      principalDue,
      interestDue,
      totalDue: addMoney(principalDue, interestDue),
      status: "Scheduled"
    };
  });

  return {
    value: {
      applicationNo: application.applicationNo,
      memberNo: application.memberNo,
      memberName: application.memberName,
      productCode: application.productCode,
      productName: application.productName,
      principal,
      termMonths,
      annualInterestRateBps: application.annualInterestRateBps,
      interestMethod: application.interestMethod,
      paymentFrequency: application.paymentFrequency,
      processingFee: application.processingFee,
      totalInterest,
      totalPayable,
      netProceeds: Math.max(0, subtractMoney(principal, application.processingFee)),
      installmentCount,
      firstPaymentDate,
      maturityDate: installments[installments.length - 1].dueDate,
      status: "For Release",
      installments
    }
  };
}

async function previewLoanComputation(applicationNo, body, user) {
  const applications = await listLoanApplications();
  const application = applications.find((item) => item.applicationNo === applicationNo);
  if (!application) {
    return { error: "Loan application was not found.", statusCode: 404 };
  }
  if (application.status !== "Approved") {
    return { error: "Only approved applications can be computed.", statusCode: 409 };
  }
  if (application.createdBy !== user.username) {
    return { error: "Loan Officer can compute only their own approved applications.", statusCode: 403 };
  }
  const existingLoans = await listLoans();
  if (existingLoans.some((loan) => loan.applicationNo === applicationNo)) {
    return { error: "A loan computation already exists for this application.", statusCode: 409 };
  }

  const computation = computeFlatLoanSchedule(application, formatDateOnly(body.firstPaymentDate));
  if (computation.error) {
    return { error: computation.error, statusCode: 400 };
  }
  return { computation: computation.value };
}

async function nextLoanNo(connection = null) {
  const db = connection || (await getPool());
  if (!db) {
    return `LN-${new Date().getFullYear()}-${String(loans.length + 1).padStart(4, "0")}`;
  }
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS countValue FROM loans WHERE YEAR(created_at) = YEAR(CURRENT_DATE)`
  );
  return `LN-${new Date().getFullYear()}-${String(Number(rows[0].countValue) + 1).padStart(4, "0")}`;
}

async function saveLoanComputation(applicationNo, body, user) {
  const preview = await previewLoanComputation(applicationNo, body, user);
  if (preview.error) {
    return preview;
  }
  const computation = preview.computation;
  const db = await getPool();
  const loanNo = await nextLoanNo();

  if (!db) {
    const now = new Date().toISOString();
    loans.unshift({
      ...computation,
      loanNo,
      computedBy: user.username,
      computedAt: now
    });
    loanInstallments.push(...computation.installments.map((item) => ({ ...item, loanNo })));
    const application = loanApplications.find((item) => item.applicationNo === applicationNo);
    application.status = "For Release";
    application.updatedAt = now;
    return { loan: mapLoan({ ...loans[0], installments: computation.installments }) };
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [applicationRows] = await connection.execute(
      `SELECT status, created_by AS createdBy
       FROM loan_applications WHERE application_no = ? LIMIT 1 FOR UPDATE`,
      [applicationNo]
    );
    if (!applicationRows[0] || applicationRows[0].status !== "Approved") {
      await connection.rollback();
      return { error: "Only approved applications can be computed.", statusCode: 409 };
    }
    if (applicationRows[0].createdBy !== user.username) {
      await connection.rollback();
      return { error: "Loan Officer can compute only their own approved applications.", statusCode: 403 };
    }

    await connection.execute(
      `INSERT INTO loans (
         loan_no, application_no, member_no, member_name, product_code, product_name,
         principal, term_months, annual_interest_rate_bps, interest_method,
         payment_frequency, processing_fee, total_interest, total_payable,
         net_proceeds, installment_count, first_payment_date, maturity_date,
         status, computed_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'For Release', ?)`,
      [
        loanNo, applicationNo, computation.memberNo, computation.memberName,
        computation.productCode, computation.productName, computation.principal,
        computation.termMonths, computation.annualInterestRateBps, computation.interestMethod,
        computation.paymentFrequency, computation.processingFee, computation.totalInterest,
        computation.totalPayable, computation.netProceeds, computation.installmentCount,
        computation.firstPaymentDate, computation.maturityDate, user.username
      ]
    );
    for (const installment of computation.installments) {
      await connection.execute(
        `INSERT INTO loan_installments (
           loan_no, installment_no, due_date, principal_due, interest_due, total_due, status
         ) VALUES (?, ?, ?, ?, ?, ?, 'Scheduled')`,
        [
          loanNo, installment.installmentNo, installment.dueDate,
          installment.principalDue, installment.interestDue, installment.totalDue
        ]
      );
    }
    await connection.execute(
      `UPDATE loan_applications SET status = 'For Release', updated_at = CURRENT_TIMESTAMP
       WHERE application_no = ?`,
      [applicationNo]
    );
    await connection.commit();
    return { loan: (await listLoans()).find((loan) => loan.loanNo === loanNo) };
  } catch (error) {
    await connection.rollback();
    if (String(error.code) === "23505") {
      return { error: "A loan computation already exists for this application.", statusCode: 409 };
    }
    throw error;
  } finally {
    connection.release();
  }
}

function mapLoanRelease(row) {
  return {
    releaseNo: row.releaseNo || row.id,
    loanNo: row.loanNo,
    batchId: row.batchId,
    memberNo: row.memberNo,
    memberName: row.memberName,
    principal: Number(row.principal || 0),
    processingFee: Number(row.processingFee || 0),
    netProceeds: Number(row.netProceeds || 0),
    cashReleased: Number(row.cashReleased || 0),
    releaseDate: formatDateOnly(row.releaseDate),
    referenceNo: row.referenceNo,
    releasedBy: row.releasedBy,
    status: row.status,
    postedBy: row.postedBy || "",
    postedEntryNo: row.postedEntryNo || "",
    postedAt: row.postedAt || "",
    createdAt: row.createdAt || ""
  };
}

async function listLoanReleases() {
  const db = await getPool();
  if (!db) {
    return loanReleases.map(mapLoanRelease);
  }
  const [rows] = await db.execute(
    `SELECT release_no AS releaseNo, loan_no AS loanNo, batch_no AS batchId,
            member_no AS memberNo, member_name AS memberName, principal,
            processing_fee AS processingFee, net_proceeds AS netProceeds,
            cash_released AS cashReleased, release_date AS releaseDate,
            reference_no AS referenceNo, released_by AS releasedBy, status,
            posted_by AS postedBy, posted_entry_no AS postedEntryNo,
            posted_at AS postedAt, created_at AS createdAt
     FROM loan_releases
     ORDER BY created_at DESC, id DESC`
  );
  return rows.map(mapLoanRelease);
}

function validateLoanReleaseInput(body, loan) {
  const releaseDate = formatDateOnly(body.releaseDate);
  const referenceNo = String(body.referenceNo || "").trim().toUpperCase();
  const cashReleased = Number(body.cashReleased);
  const computedDate = formatDateOnly(loan.computedAt);

  if (!isValidIsoDate(releaseDate) || !releaseDate) {
    return { error: "Release date must be a valid YYYY-MM-DD date." };
  }
  if (computedDate && releaseDate < computedDate) {
    return { error: "Release date cannot precede the loan computation date." };
  }
  if (!referenceNo) {
    return { error: "Release voucher or reference number is required." };
  }
  if (!isMoney(cashReleased) || !moneyEquals(cashReleased, loan.netProceeds)) {
    return { error: "Cash released must exactly match the computed net proceeds." };
  }

  return { value: { releaseDate, referenceNo, cashReleased: moneyValue(cashReleased) } };
}

async function nextLoanReleaseNo(connection = null) {
  const db = connection || (await getPool());
  if (!db) {
    return `LR-${new Date().getFullYear()}-${String(loanReleases.length + 1).padStart(4, "0")}`;
  }
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS countValue FROM loan_releases WHERE YEAR(created_at) = YEAR(CURRENT_DATE)`
  );
  return `LR-${new Date().getFullYear()}-${String(Number(rows[0].countValue) + 1).padStart(4, "0")}`;
}

async function releaseLoan(loanNo, body, user) {
  const currentLoans = await listLoans();
  const loan = currentLoans.find((item) => item.loanNo === loanNo);
  if (!loan) {
    return { error: "Loan was not found.", statusCode: 404 };
  }
  if (loan.status !== "For Release") {
    return { error: "Only loans marked For Release can be released.", statusCode: 409 };
  }
  const validation = validateLoanReleaseInput(body, loan);
  if (validation.error) {
    return { error: validation.error, statusCode: 400 };
  }
  const batchResult = await getOpenTellerBatch(user);
  if (batchResult.error) {
    return batchResult;
  }
  const db = await getPool();

  if (!db) {
    const cashPosition = await getTellerCashPosition(batchResult.batch.id);
    if (moneyCents(cashPosition.availableCash) < moneyCents(validation.value.cashReleased)) {
      const shortage = subtractMoney(validation.value.cashReleased, cashPosition.availableCash);
      return {
        error: `Insufficient teller cash. Available: ${cashPosition.availableCash}; required: ${validation.value.cashReleased}; shortage: ${shortage}.`,
        statusCode: 409
      };
    }
    if (
      loanReleases.some(
        (item) => normalizeReferenceNo(item.referenceNo) === normalizeReferenceNo(validation.value.referenceNo)
      ) ||
      hasWithdrawalReference(validation.value.referenceNo)
    ) {
      return { error: "Release voucher or reference number already exists.", statusCode: 409 };
    }
    const releaseNo = await nextLoanReleaseNo();
    const release = {
      releaseNo,
      loanNo,
      batchId: batchResult.batch.id,
      memberNo: loan.memberNo,
      memberName: loan.memberName,
      principal: loan.principal,
      processingFee: loan.processingFee,
      netProceeds: loan.netProceeds,
      ...validation.value,
      releasedBy: user.username,
      status: "Teller Batch",
      createdAt: new Date().toISOString()
    };
    loanReleases.unshift(release);
    const storedLoan = loans.find((item) => item.loanNo === loanNo);
    storedLoan.status = "Released";
    const application = loanApplications.find((item) => item.applicationNo === loan.applicationNo);
    if (application) {
      application.status = "Released";
      application.updatedAt = release.createdAt;
    }
    return { release: mapLoanRelease(release), loan: mapLoan(storedLoan) };
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [batchRows] = await connection.execute(
      `SELECT batch_no AS id, status
       FROM teller_batches
       WHERE batch_no = ? LIMIT 1 FOR UPDATE`,
      [batchResult.batch.id]
    );
    if (!batchRows[0] || batchRows[0].status !== "Open") {
      await connection.rollback();
      return {
        error: "No open teller batch is available for the loan release.",
        statusCode: 409
      };
    }
    const [loanRows] = await connection.execute(
      `SELECT loan_no AS loanNo, application_no AS applicationNo, member_no AS memberNo,
              member_name AS memberName, principal, processing_fee AS processingFee,
              net_proceeds AS netProceeds, status
       FROM loans WHERE loan_no = ? LIMIT 1 FOR UPDATE`,
      [loanNo]
    );
    const lockedLoan = loanRows[0];
    if (!lockedLoan || lockedLoan.status !== "For Release") {
      await connection.rollback();
      return { error: "Only loans marked For Release can be released.", statusCode: 409 };
    }
    const cashPosition = await getTellerCashPosition(batchResult.batch.id, connection);
    if (moneyCents(cashPosition.availableCash) < moneyCents(validation.value.cashReleased)) {
      await connection.rollback();
      const shortage = subtractMoney(validation.value.cashReleased, cashPosition.availableCash);
      return {
        error: `Insufficient teller cash. Available: ${cashPosition.availableCash}; required: ${validation.value.cashReleased}; shortage: ${shortage}.`,
        statusCode: 409
      };
    }
    const [referenceRows] = await connection.execute(
      `SELECT reference_no FROM loan_releases WHERE UPPER(reference_no) = UPPER(?)
       UNION ALL
       SELECT reference_no FROM savings_withdrawals WHERE UPPER(reference_no) = UPPER(?)
       LIMIT 1`,
      [validation.value.referenceNo, validation.value.referenceNo]
    );
    if (referenceRows.length) {
      await connection.rollback();
      return { error: "Release voucher or reference number already exists.", statusCode: 409 };
    }

    const releaseNo = await nextLoanReleaseNo(connection);
    await connection.execute(
      `INSERT INTO loan_releases (
         release_no, loan_no, batch_no, member_no, member_name, principal,
         processing_fee, net_proceeds, cash_released, release_date,
         reference_no, released_by, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Teller Batch')`,
      [
        releaseNo, loanNo, batchResult.batch.id, lockedLoan.memberNo, lockedLoan.memberName,
        lockedLoan.principal, lockedLoan.processingFee, lockedLoan.netProceeds,
        validation.value.cashReleased, validation.value.releaseDate,
        validation.value.referenceNo, user.username
      ]
    );
    await connection.execute(`UPDATE loans SET status = 'Released' WHERE loan_no = ?`, [loanNo]);
    await connection.execute(
      `UPDATE loan_applications SET status = 'Released', updated_at = CURRENT_TIMESTAMP
       WHERE application_no = ?`,
      [lockedLoan.applicationNo]
    );
    await connection.commit();
    return {
      release: (await listLoanReleases()).find((item) => item.releaseNo === releaseNo),
      loan: (await listLoans()).find((item) => item.loanNo === loanNo)
    };
  } catch (error) {
    await connection.rollback();
    if (String(error.code) === "23505") {
      return { error: "Loan release or reference number already exists.", statusCode: 409 };
    }
    throw error;
  } finally {
    connection.release();
  }
}

function mapLoanCollection(row) {
  return {
    collectionNo: row.collectionNo || row.id,
    loanNo: row.loanNo,
    installmentNo: Number(row.installmentNo || 0),
    batchId: row.batchId,
    memberNo: row.memberNo,
    memberName: row.memberName,
    principalAmount: Number(row.principalAmount || 0),
    interestAmount: Number(row.interestAmount || 0),
    amountReceived: Number(row.amountReceived || 0),
    collectionDate: formatDateOnly(row.collectionDate),
    referenceNo: row.referenceNo,
    receivedBy: row.receivedBy,
    status: row.status,
    postedBy: row.postedBy || "",
    postedEntryNo: row.postedEntryNo || "",
    postedAt: row.postedAt || "",
    createdAt: row.createdAt || ""
  };
}

async function listLoanCollections() {
  const db = await getPool();
  if (!db) {
    return loanCollections.map(mapLoanCollection);
  }
  const [rows] = await db.execute(
    `SELECT collection_no AS collectionNo, loan_no AS loanNo,
            installment_no AS installmentNo, batch_no AS batchId,
            member_no AS memberNo, member_name AS memberName,
            principal_amount AS principalAmount, interest_amount AS interestAmount,
            amount_received AS amountReceived, collection_date AS collectionDate,
            reference_no AS referenceNo, received_by AS receivedBy, status,
            posted_by AS postedBy, posted_entry_no AS postedEntryNo,
            posted_at AS postedAt, created_at AS createdAt
     FROM loan_collections
     ORDER BY created_at DESC, id DESC`
  );
  return rows.map(mapLoanCollection);
}

function validateLoanCollectionInput(body, installment, releaseDate = "") {
  const collectionDate = formatDateOnly(body.collectionDate);
  const referenceNo = String(body.referenceNo || "").trim().toUpperCase();
  const amountReceived = Number(body.amountReceived);

  if (!isValidIsoDate(collectionDate) || !collectionDate) {
    return { error: "Collection date must be a valid YYYY-MM-DD date." };
  }
  if (!referenceNo) {
    return { error: "Official receipt or reference number is required." };
  }
  if (releaseDate && collectionDate < formatDateOnly(releaseDate)) {
    return { error: "Collection date cannot precede the loan release date." };
  }
  if (!isMoney(amountReceived) || !moneyEquals(amountReceived, installment.totalDue)) {
    return { error: "Amount received must exactly match the next scheduled installment." };
  }

  return { value: { collectionDate, referenceNo, amountReceived: moneyValue(amountReceived) } };
}

async function nextLoanCollectionNo(connection = null) {
  const db = connection || (await getPool());
  if (!db) {
    return `LC-${new Date().getFullYear()}-${String(loanCollections.length + 1).padStart(4, "0")}`;
  }
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS countValue FROM loan_collections WHERE YEAR(created_at) = YEAR(CURRENT_DATE)`
  );
  return `LC-${new Date().getFullYear()}-${String(Number(rows[0].countValue) + 1).padStart(4, "0")}`;
}

async function recordLoanCollection(loanNo, body, user) {
  const currentLoans = await listLoans();
  const loan = currentLoans.find((item) => item.loanNo === loanNo);
  if (!loan) {
    return { error: "Loan was not found.", statusCode: 404 };
  }
  if (loan.status !== "Posted") {
    return { error: "Only posted loan releases can receive collections.", statusCode: 409 };
  }
  const release = (await listLoanReleases()).find((item) => item.loanNo === loanNo);
  if (!release || release.status !== "Posted") {
    return { error: "Posted loan release evidence was not found.", statusCode: 409 };
  }
  const installment = loan.installments.find((item) => item.status === "Scheduled");
  if (!installment) {
    return { error: "This loan has no unpaid scheduled installment.", statusCode: 409 };
  }
  const validation = validateLoanCollectionInput(body, installment, release.releaseDate);
  if (validation.error) {
    return { error: validation.error, statusCode: 400 };
  }
  const batchResult = await getOpenTellerBatch(user);
  if (batchResult.error) {
    return batchResult;
  }
  const db = await getPool();

  if (!db) {
    if (hasCashInReference(validation.value.referenceNo)) {
      return { error: "Official receipt or reference number already exists.", statusCode: 409 };
    }
    const collectionNo = await nextLoanCollectionNo();
    const collection = {
      collectionNo,
      loanNo,
      installmentNo: installment.installmentNo,
      batchId: batchResult.batch.id,
      memberNo: loan.memberNo,
      memberName: loan.memberName,
      principalAmount: installment.principalDue,
      interestAmount: installment.interestDue,
      ...validation.value,
      receivedBy: user.username,
      status: "Teller Batch",
      createdAt: new Date().toISOString()
    };
    loanCollections.unshift(collection);
    const storedInstallment = loanInstallments.find(
      (item) => item.loanNo === loanNo && item.installmentNo === installment.installmentNo
    );
    storedInstallment.status = "Paid";
    return {
      collection: mapLoanCollection(collection),
      loan: (await listLoans()).find((item) => item.loanNo === loanNo)
    };
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [batchRows] = await connection.execute(
      `SELECT batch_no AS id, status
       FROM teller_batches
       WHERE batch_no = ? LIMIT 1 FOR UPDATE`,
      [batchResult.batch.id]
    );
    if (!batchRows[0] || batchRows[0].status !== "Open") {
      await connection.rollback();
      return { error: "No open teller batch is available for collection.", statusCode: 409 };
    }
    const [loanRows] = await connection.execute(
      `SELECT loan.loan_no AS loanNo, loan.member_no AS memberNo,
              loan.member_name AS memberName, loan.status,
              lr.release_date AS releaseDate,
              lr.status AS releaseStatus
       FROM loans loan
       JOIN loan_releases lr ON lr.loan_no = loan.loan_no
       WHERE loan.loan_no = ? LIMIT 1
       FOR UPDATE OF loan, lr`,
      [loanNo]
    );
    const lockedLoan = loanRows[0];
    if (
      !lockedLoan ||
      lockedLoan.status !== "Posted" ||
      lockedLoan.releaseStatus !== "Posted"
    ) {
      await connection.rollback();
      return { error: "Only posted loan releases can receive collections.", statusCode: 409 };
    }
    const [installmentRows] = await connection.execute(
      `SELECT installment_no AS installmentNo, due_date AS dueDate,
              principal_due AS principalDue, interest_due AS interestDue,
              total_due AS totalDue, status
       FROM loan_installments
       WHERE loan_no = ? AND status = 'Scheduled'
       ORDER BY installment_no
       LIMIT 1
       FOR UPDATE`,
      [loanNo]
    );
    const lockedInstallment = installmentRows[0];
    if (!lockedInstallment) {
      await connection.rollback();
      return { error: "This loan has no unpaid scheduled installment.", statusCode: 409 };
    }
    const lockedValidation = validateLoanCollectionInput(body, {
      ...lockedInstallment,
      totalDue: Number(lockedInstallment.totalDue)
    }, lockedLoan.releaseDate);
    if (lockedValidation.error) {
      await connection.rollback();
      return { error: lockedValidation.error, statusCode: 400 };
    }
    if (await hasCashInReferenceInDatabase(connection, lockedValidation.value.referenceNo)) {
      await connection.rollback();
      return { error: "Official receipt or reference number already exists.", statusCode: 409 };
    }
    const collectionNo = await nextLoanCollectionNo(connection);
    await connection.execute(
      `INSERT INTO loan_collections (
         collection_no, loan_no, installment_no, batch_no,
         member_no, member_name, principal_amount, interest_amount,
         amount_received, collection_date, reference_no, received_by, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Teller Batch')`,
      [
        collectionNo, loanNo, lockedInstallment.installmentNo, batchResult.batch.id,
        lockedLoan.memberNo, lockedLoan.memberName, lockedInstallment.principalDue,
        lockedInstallment.interestDue, lockedValidation.value.amountReceived,
        lockedValidation.value.collectionDate, lockedValidation.value.referenceNo,
        user.username
      ]
    );
    await connection.execute(
      `UPDATE loan_installments
       SET status = 'Paid'
       WHERE loan_no = ? AND installment_no = ?`,
      [loanNo, lockedInstallment.installmentNo]
    );
    await connection.commit();
    return {
      collection: (await listLoanCollections()).find((item) => item.collectionNo === collectionNo),
      loan: (await listLoans()).find((item) => item.loanNo === loanNo)
    };
  } catch (error) {
    await connection.rollback();
    if (String(error.code) === "23505") {
      return { error: "Installment or official receipt was already collected.", statusCode: 409 };
    }
    throw error;
  } finally {
    connection.release();
  }
}

function mapTellerFunding(row) {
  return {
    fundingNo: row.fundingNo || row.id,
    batchId: row.batchId || "",
    tellerUsername: row.tellerUsername,
    amount: Number(row.amount || 0),
    sourceAccountCode: row.sourceAccountCode,
    sourceAccountName: row.sourceAccountName,
    referenceNo: row.referenceNo,
    fundingDate: formatDateOnly(row.fundingDate),
    status: row.status,
    preparedBy: row.preparedBy,
    preparedAt: row.preparedAt || "",
    approvedBy: row.approvedBy || "",
    approvedAt: row.approvedAt || "",
    acknowledgedBy: row.acknowledgedBy || "",
    acknowledgedAt: row.acknowledgedAt || "",
    postedBy: row.postedBy || "",
    postedEntryNo: row.postedEntryNo || "",
    postedAt: row.postedAt || ""
  };
}

async function listTellerFundings() {
  const db = await getPool();
  if (!db) {
    return tellerFundings.map(mapTellerFunding);
  }
  const [rows] = await db.execute(
    `SELECT funding_no AS fundingNo, batch_no AS batchId,
            teller_username AS tellerUsername, amount,
            source_account_code AS sourceAccountCode,
            source_account_name AS sourceAccountName,
            reference_no AS referenceNo, funding_date AS fundingDate, status,
            prepared_by AS preparedBy, prepared_at AS preparedAt,
            approved_by AS approvedBy, approved_at AS approvedAt,
            acknowledged_by AS acknowledgedBy, acknowledged_at AS acknowledgedAt,
            posted_by AS postedBy, posted_entry_no AS postedEntryNo,
            posted_at AS postedAt
     FROM teller_fundings
     ORDER BY prepared_at DESC, id DESC`
  );
  return rows.map(mapTellerFunding);
}

async function getAcknowledgedFundingTotal(batchId) {
  if (!batchId) {
    return 0;
  }
  const rows = await listTellerFundings();
  return rows
    .filter((funding) => funding.batchId === batchId && funding.status === "Acknowledged")
    .reduce((sum, funding) => addMoney(sum, funding.amount), 0);
}

async function getTellerCashPosition(batchId, connection = null) {
  if (!batchId) {
    return {
      openingFunding: 0,
      cashIn: 0,
      cashOut: 0,
      availableCash: 0
    };
  }

  const db = connection || (await getPool());
  if (!db) {
    const openingFunding = await getAcknowledgedFundingTotal(batchId);
    const summary = buildTellerBatchSummary(await listTellerBatchRows(batchId));
    return {
      openingFunding,
      cashIn: summary.cashIn,
      cashOut: summary.cashOut,
      availableCash: subtractMoney(addMoney(openingFunding, summary.cashIn), summary.cashOut)
    };
  }

  const [rows] = await db.execute(
    `SELECT
       (SELECT COALESCE(SUM(amount), 0)
        FROM teller_fundings
        WHERE batch_no = ? AND status = 'Acknowledged') AS openingFunding,
       (
         (SELECT COALESCE(SUM(cash_received), 0)
          FROM initial_member_payments
          WHERE batch_no = ? AND status = 'Teller Batch')
         +
         (SELECT COALESCE(SUM(cash_received), 0)
          FROM savings_deposits
          WHERE batch_no = ? AND status = 'Teller Batch')
         +
         (SELECT COALESCE(SUM(cash_received), 0)
          FROM share_capital_contributions
          WHERE batch_no = ? AND status = 'Teller Batch')
         +
         (SELECT COALESCE(SUM(amount_received), 0)
          FROM loan_collections
          WHERE batch_no = ? AND status = 'Teller Batch')
       ) AS cashIn,
       (
         (SELECT COALESCE(SUM(amount), 0)
          FROM savings_withdrawals
          WHERE batch_no = ? AND status = 'Teller Batch')
         +
         (SELECT COALESCE(SUM(cash_released), 0)
          FROM loan_releases
          WHERE batch_no = ? AND status = 'Teller Batch')
       ) AS cashOut`,
    [batchId, batchId, batchId, batchId, batchId, batchId, batchId]
  );
  const position = rows[0] || {};
  const openingFunding = Number(position.openingFunding || 0);
  const cashIn = Number(position.cashIn || 0);
  const cashOut = Number(position.cashOut || 0);

  return {
    openingFunding,
    cashIn,
    cashOut,
    availableCash: subtractMoney(addMoney(openingFunding, cashIn), cashOut)
  };
}

async function getTellerFundingPosition() {
  const batches = await listTellerBatches();
  const batch = batches.find((item) => item.status === "Open") || null;
  const releaseQueue = (await listLoans())
    .filter((loan) => loan.status === "For Release")
    .map((loan) => ({
      loanNo: loan.loanNo,
      memberNo: loan.memberNo,
      memberName: loan.memberName,
      netProceeds: loan.netProceeds,
      computedAt: loan.computedAt,
      status: loan.status
    }));
  const cashPosition = await getTellerCashPosition(batch?.id || "");
  const totalReleaseDemand = sumMoney(releaseQueue.map((loan) => loan.netProceeds));

  return {
    batch: batch
      ? {
          id: batch.id,
          tellerUsername: batch.tellerUsername,
          status: batch.status
        }
      : null,
    releaseQueue,
    totalReleaseDemand,
    ...cashPosition,
    fundingShortage: Math.max(0, subtractMoney(totalReleaseDemand, cashPosition.availableCash))
  };
}

async function nextTellerFundingNo(connection = null) {
  const db = connection || (await getPool());
  if (!db) {
    return `TF-${new Date().getFullYear()}-${String(tellerFundings.length + 1).padStart(4, "0")}`;
  }
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS countValue FROM teller_fundings WHERE YEAR(prepared_at) = YEAR(CURRENT_DATE)`
  );
  return `TF-${new Date().getFullYear()}-${String(Number(rows[0].countValue) + 1).padStart(4, "0")}`;
}

async function validateTellerFundingInput(body) {
  const tellerUsername = String(body.tellerUsername || "").trim().toLowerCase();
  const amount = Number(body.amount);
  const sourceAccountCode = String(body.sourceAccountCode || "1020").trim();
  const sourceAccountName = String(body.sourceAccountName || "Cash in Bank").trim();
  const referenceNo = String(body.referenceNo || "").trim().toUpperCase();
  const fundingDate = formatDateOnly(body.fundingDate);
  const systemUsers = await listSystemUsers();
  const teller = systemUsers.find(
    (item) =>
      item.username === tellerUsername &&
      item.role === "Teller / Cashier" &&
      (item.status || "Active") === "Active"
  );

  if (!teller) {
    return { error: "An active Teller / Cashier account is required." };
  }
  if (!isMoney(amount, { positive: true })) {
    return { error: "Funding amount must be positive and have no more than two decimal places." };
  }
  if (!sourceAccountCode || !sourceAccountName) {
    return { error: "Funding source account is required." };
  }
  if (sourceAccountCode === "1010") {
    return { error: "Funding source cannot be the Cash on Hand account." };
  }
  if (!referenceNo) {
    return { error: "Funding reference number is required." };
  }
  if (!isValidIsoDate(fundingDate) || !fundingDate) {
    return { error: "Funding date must be a valid YYYY-MM-DD date." };
  }

  return {
    value: {
      tellerUsername,
      amount: moneyValue(amount),
      sourceAccountCode,
      sourceAccountName,
      referenceNo,
      fundingDate
    }
  };
}

async function prepareTellerFunding(body, user) {
  const validation = await validateTellerFundingInput(body);
  if (validation.error) {
    return { error: validation.error, statusCode: 400 };
  }
  const input = validation.value;
  const db = await getPool();
  const fundingNo = await nextTellerFundingNo();

  if (!db) {
    if (tellerFundings.some((item) => normalizeReferenceNo(item.referenceNo) === input.referenceNo)) {
      return { error: "Funding reference number already exists.", statusCode: 409 };
    }
    const funding = {
      fundingNo,
      batchId: "",
      ...input,
      status: "Prepared",
      preparedBy: user.username,
      preparedAt: new Date().toISOString()
    };
    tellerFundings.unshift(funding);
    return { funding: mapTellerFunding(funding) };
  }

  try {
    await db.execute(
      `INSERT INTO teller_fundings (
         funding_no, teller_username, amount, source_account_code,
         source_account_name, reference_no, funding_date, status, prepared_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Prepared', ?)`,
      [
        fundingNo, input.tellerUsername, input.amount, input.sourceAccountCode,
        input.sourceAccountName, input.referenceNo, input.fundingDate, user.username
      ]
    );
  } catch (error) {
    if (String(error.code) === "23505") {
      return { error: "Funding reference number already exists.", statusCode: 409 };
    }
    throw error;
  }
  return { funding: (await listTellerFundings()).find((item) => item.fundingNo === fundingNo) };
}

async function approveTellerFunding(fundingNo, user) {
  const db = await getPool();
  if (!db) {
    const funding = tellerFundings.find((item) => item.fundingNo === fundingNo);
    if (!funding) {
      return { error: "Teller funding was not found.", statusCode: 404 };
    }
    if (funding.status !== "Prepared") {
      return { error: "Only prepared teller funding can be approved.", statusCode: 409 };
    }
    funding.status = "Approved";
    funding.approvedBy = user.username;
    funding.approvedAt = new Date().toISOString();
    return { funding: mapTellerFunding(funding) };
  }
  const [result] = await db.execute(
    `UPDATE teller_fundings
     SET status = 'Approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP
     WHERE funding_no = ? AND status = 'Prepared'
     RETURNING funding_no AS fundingNo`,
    [user.username, fundingNo]
  );
  if (!result.length) {
    const rows = await listTellerFundings();
    return rows.some((item) => item.fundingNo === fundingNo)
      ? { error: "Only prepared teller funding can be approved.", statusCode: 409 }
      : { error: "Teller funding was not found.", statusCode: 404 };
  }
  return { funding: (await listTellerFundings()).find((item) => item.fundingNo === fundingNo) };
}

async function acknowledgeTellerFunding(fundingNo, user) {
  const batchResult = await getOpenTellerBatch(user);
  if (batchResult.error) {
    return batchResult;
  }
  const db = await getPool();
  if (!db) {
    const funding = tellerFundings.find((item) => item.fundingNo === fundingNo);
    if (!funding) {
      return { error: "Teller funding was not found.", statusCode: 404 };
    }
    if (funding.status !== "Approved") {
      return { error: "Only approved teller funding can be acknowledged.", statusCode: 409 };
    }
    if (funding.tellerUsername !== user.username) {
      return { error: "Teller can acknowledge only funding assigned to their account.", statusCode: 403 };
    }
    funding.status = "Acknowledged";
    funding.batchId = batchResult.batch.id;
    funding.acknowledgedBy = user.username;
    funding.acknowledgedAt = new Date().toISOString();
    return { funding: mapTellerFunding(funding) };
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT funding_no AS fundingNo, teller_username AS tellerUsername, status
       FROM teller_fundings WHERE funding_no = ? LIMIT 1 FOR UPDATE`,
      [fundingNo]
    );
    const funding = rows[0];
    if (!funding) {
      await connection.rollback();
      return { error: "Teller funding was not found.", statusCode: 404 };
    }
    if (funding.status !== "Approved") {
      await connection.rollback();
      return { error: "Only approved teller funding can be acknowledged.", statusCode: 409 };
    }
    if (funding.tellerUsername !== user.username) {
      await connection.rollback();
      return { error: "Teller can acknowledge only funding assigned to their account.", statusCode: 403 };
    }
    await connection.execute(
      `UPDATE teller_fundings
       SET status = 'Acknowledged', batch_no = ?, acknowledged_by = ?,
           acknowledged_at = CURRENT_TIMESTAMP
       WHERE funding_no = ?`,
      [batchResult.batch.id, user.username, fundingNo]
    );
    await connection.commit();
    return { funding: (await listTellerFundings()).find((item) => item.fundingNo === fundingNo) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function validateSystemUserInput(body) {
  const name = String(body.name || "").trim();
  const username = String(body.username || "").trim().toLowerCase();
  const role = String(body.role || "").trim();
  const allowedViews = roleViews[role] || [];
  const requestedDefaultView = String(body.defaultView || "").trim();
  const defaultView = allowedViews.includes(requestedDefaultView) ? requestedDefaultView : allowedViews[0];

  if (name.length < 3) {
    return { error: "Full name is required." };
  }

  if (!/^[a-z][a-z0-9._-]{2,39}$/.test(username)) {
    return { error: "Username must start with a letter and use 3-40 lowercase letters, numbers, dots, dashes, or underscores." };
  }

  if (!roles.includes(role)) {
    return { error: "Valid role is required." };
  }

  if (!defaultView) {
    return { error: "Selected role does not have a valid default screen." };
  }

  return {
    value: {
      name,
      username,
      role,
      defaultView
    }
  };
}

async function createSystemUser(input) {
  const db = await getPool();

  if (!db) {
    if (users.some((user) => user.username === input.username)) {
      return { error: "Username already exists.", statusCode: 409 };
    }

    const nextId = Math.max(...users.map((user) => Number(user.id) || 0), 0) + 1;
    const user = {
      id: nextId,
      name: input.name,
      username: input.username,
      role: input.role,
      defaultView: input.defaultView,
      status: "Active"
    };
    users.push(user);
    return { user };
  }

  try {
    await db.execute(
      `INSERT INTO users (full_name, username, role_name, status, default_view)
       VALUES (?, ?, ?, 'Active', ?)`,
      [input.name, input.username, input.role, input.defaultView]
    );
  } catch (error) {
    if (error.code === "23505") {
      return { error: "Username already exists.", statusCode: 409 };
    }

    throw error;
  }

  const [rows] = await db.execute(
    `SELECT id, full_name AS name, username, role_name AS role, status,
            default_view AS defaultView, created_at AS createdAt
     FROM users
     WHERE username = ?`,
    [input.username]
  );

  return { user: rows[0] };
}

async function updateSystemUser(username, input) {
  const db = await getPool();

  if (username === "admin" && input.status !== "Active") {
    return { error: "The built-in admin account cannot be deactivated.", statusCode: 409 };
  }

  if (!["Active", "Inactive"].includes(input.status)) {
    return { error: "Status must be Active or Inactive.", statusCode: 400 };
  }

  if (!roles.includes(input.role)) {
    return { error: "Valid role is required.", statusCode: 400 };
  }

  const allowedViews = roleViews[input.role] || [];
  const defaultView = allowedViews.includes(input.defaultView) ? input.defaultView : allowedViews[0];

  if (!defaultView) {
    return { error: "Selected role does not have a valid default screen.", statusCode: 400 };
  }

  if (!db) {
    const user = users.find((item) => item.username === username);

    if (!user) {
      return { error: "User was not found.", statusCode: 404 };
    }

    user.role = input.role;
    user.defaultView = defaultView;
    user.status = input.status;

    return {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        status: user.status,
        defaultView: user.defaultView
      }
    };
  }

  const [existingRows] = await db.execute(
    `SELECT username
     FROM users
     WHERE username = ?`,
    [username]
  );

  if (existingRows.length === 0) {
    return { error: "User was not found.", statusCode: 404 };
  }

  await db.execute(
    `UPDATE users
     SET role_name = ?, status = ?, default_view = ?
     WHERE username = ?`,
    [input.role, input.status, defaultView, username]
  );

  const [rows] = await db.execute(
    `SELECT id, full_name AS name, username, role_name AS role, status,
            default_view AS defaultView, created_at AS createdAt
     FROM users
     WHERE username = ?`,
    [username]
  );

  return { user: rows[0] };
}

async function listMembers() {
  const db = await getPool();

  if (!db) {
    return members;
  }

  const [rows] = await db.execute(
    `SELECT member_no AS id, full_name AS name, cluster_name AS \`group\`,
            share_capital AS share, savings_balance AS savings, status,
            contact_number AS contactNumber, address, birthdate,
            civil_status AS civilStatus, occupation, membership_date AS membershipDate
     FROM members
     ORDER BY member_no`
  );

  return rows;
}

async function listLedgerMemberLookup() {
  const db = await getPool();

  if (!db) {
    return members.map((member) => ({
      id: member.id,
      name: member.name,
      status: member.status,
      share: member.share,
      savings: member.savings
    }));
  }

  const [rows] = await db.execute(
    `SELECT member_no AS id, full_name AS name, status,
            share_capital AS share, savings_balance AS savings
     FROM members
     ORDER BY member_no`
  );

  return rows;
}

function normalizeOptionalDate(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function isValidIsoDate(value) {
  if (!value) {
    return true;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

function formatDateOnly(value) {
  if (!value) {
    return "";
  }

  if (!(value instanceof Date)) {
    return String(value).slice(0, 10);
  }

  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0")
  ].join("-");
}

function validateMemberProfileInput(body) {
  const name = String(body.name || "").trim();
  const clusterName = String(body.group || body.clusterName || "").trim();
  const contactNumber = String(body.contactNumber || "").trim();
  const address = String(body.address || "").trim();
  const birthdate = normalizeOptionalDate(body.birthdate);
  const civilStatus = String(body.civilStatus || "").trim();
  const occupation = String(body.occupation || "").trim();
  const membershipDate = normalizeOptionalDate(body.membershipDate);
  const status = String(body.status || "Active").trim();

  if (name.length < 3) {
    return { error: "Member full name is required." };
  }

  if (!clusterName) {
    return { error: "Cluster or group is required." };
  }

  if (!["Active", "Inactive"].includes(status)) {
    return { error: "Member status must be Active or Inactive." };
  }

  return {
    value: {
      name,
      group: clusterName,
      contactNumber,
      address,
      birthdate,
      civilStatus,
      occupation,
      membershipDate,
      status
    }
  };
}

async function updateMemberProfile(memberId, input) {
  const db = await getPool();

  if (!db) {
    const member = members.find((item) => item.id === memberId);

    if (!member) {
      return { error: "Member was not found.", statusCode: 404 };
    }

    Object.assign(member, input);
    return { member };
  }

  const [existingRows] = await db.execute(
    `SELECT member_no AS id
     FROM members
     WHERE member_no = ?
     LIMIT 1`,
    [memberId]
  );

  if (existingRows.length === 0) {
    return { error: "Member was not found.", statusCode: 404 };
  }

  await db.execute(
    `UPDATE members
     SET full_name = ?, cluster_name = ?, contact_number = ?, address = ?,
         birthdate = ?, civil_status = ?, occupation = ?, membership_date = ?, status = ?
     WHERE member_no = ?`,
    [
      input.name,
      input.group,
      input.contactNumber,
      input.address,
      input.birthdate,
      input.civilStatus,
      input.occupation,
      input.membershipDate,
      input.status,
      memberId
    ]
  );

  const [rows] = await db.execute(
    `SELECT member_no AS id, full_name AS name, cluster_name AS \`group\`,
            share_capital AS share, savings_balance AS savings, status,
            contact_number AS contactNumber, address, birthdate,
            civil_status AS civilStatus, occupation, membership_date AS membershipDate
     FROM members
     WHERE member_no = ?
     LIMIT 1`,
    [memberId]
  );

  return { member: rows[0] };
}

function sanitizeMemberImportRow(row) {
  const status = String(row.status || "Active").trim() || "Active";

  return {
    rowNumber: Number(row.rowNumber || row.rowNo || 0),
    memberNo: String(row.memberNo || "").trim(),
    name: String(row.name || row.fullName || "").trim(),
    group: String(row.group || row.clusterName || "").trim(),
    contactNumber: String(row.contactNumber || "").trim(),
    address: String(row.address || "").trim(),
    birthdate: String(row.birthdate || "").trim(),
    civilStatus: String(row.civilStatus || "").trim(),
    occupation: String(row.occupation || "").trim(),
    membershipDate: String(row.membershipDate || "").trim(),
    status
  };
}

async function validateMemberImportRows(inputRows) {
  if (!Array.isArray(inputRows) || inputRows.length === 0) {
    return { error: "At least one import row is required." };
  }

  if (inputRows.length > 250) {
    return { error: "Import batches are limited to 250 rows." };
  }

  const db = await getPool();
  const existingMemberNos = new Set();

  if (!db) {
    members.forEach((member) => existingMemberNos.add(member.id));
  } else {
    const [rows] = await db.execute(`SELECT member_no AS id FROM members`);
    rows.forEach((member) => existingMemberNos.add(member.id));
  }

  const sanitizedRows = inputRows.map(sanitizeMemberImportRow);
  const seenMemberNos = new Set();
  const duplicateMemberNos = new Set();

  sanitizedRows.forEach((row) => {
    if (!row.memberNo) {
      return;
    }

    if (seenMemberNos.has(row.memberNo)) {
      duplicateMemberNos.add(row.memberNo);
    }

    seenMemberNos.add(row.memberNo);
  });

  return {
    rows: sanitizedRows.map((row, index) => {
      const issues = [];
      const rowNumber = Number.isInteger(row.rowNumber) && row.rowNumber > 0 ? row.rowNumber : index + 2;
      const normalizedStatus = row.status.toLowerCase();

      if (!row.name) {
        issues.push("Missing full name");
      }

      if (row.memberNo && duplicateMemberNos.has(row.memberNo)) {
        issues.push("Duplicate member no. in upload");
      }

      if (row.memberNo && existingMemberNos.has(row.memberNo)) {
        issues.push("Member no. already exists");
      }

      const validBirthdate = isValidIsoDate(row.birthdate);
      const validMembershipDate = isValidIsoDate(row.membershipDate);

      if (!validBirthdate) {
        issues.push("Invalid birthdate");
      }

      if (!validMembershipDate) {
        issues.push("Invalid membership date");
      }

      if (row.status && !["active", "inactive"].includes(normalizedStatus)) {
        issues.push("Unknown status");
      }

      return {
        ...row,
        rowNumber,
        birthdate: validBirthdate ? row.birthdate || null : null,
        membershipDate: validMembershipDate ? row.membershipDate || null : null,
        status: ["active", "inactive"].includes(normalizedStatus)
          ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
          : row.status,
        rowStatus: issues.length > 0 ? "Has Issues" : "Ready",
        issues
      };
    })
  };
}

function summarizeMemberImportRows(rows) {
  return {
    totalRows: rows.length,
    readyRows: rows.filter((row) => row.rowStatus === "Ready").length,
    issueRows: rows.filter((row) => row.rowStatus !== "Ready").length
  };
}

function parseIssues(value) {
  if (Array.isArray(value)) {
    return value;
  }

  try {
    return JSON.parse(value || "[]");
  } catch {
    return [];
  }
}

function mapMemberImportBatch(row) {
  return {
    id: row.importNo,
    importNo: row.importNo,
    sourceLabel: row.sourceLabel,
    status: row.status,
    totalRows: row.totalRows,
    readyRows: row.readyRows,
    issueRows: row.issueRows,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    finalizedBy: row.finalizedBy || "",
    finalizedAt: row.finalizedAt || "",
    importedRows: row.importedRows || 0,
    skippedRows: row.skippedRows || 0
  };
}

function mapMemberImportRow(row) {
  return {
    id: row.id,
    rowNumber: row.rowNumber,
    memberNo: row.memberNo,
    name: row.name,
    group: row.group,
    contactNumber: row.contactNumber,
    address: row.address,
    birthdate: row.birthdate,
    civilStatus: row.civilStatus,
    occupation: row.occupation,
    membershipDate: row.membershipDate,
    status: row.status,
    rowStatus: row.rowStatus,
    issues: parseIssues(row.issues)
  };
}

function parseOpeningBalanceAmount(value) {
  const cleanedValue = String(value || "")
    .replace(/[,\s]/g, "")
    .replace(/^PHP/i, "")
    .trim();

  if (!cleanedValue) {
    return { value: 0 };
  }

  const amount = Number(cleanedValue);

  if (!Number.isFinite(amount) || amount < 0) {
    return { value: 0, error: "Invalid amount" };
  }

  if (!isMoney(amount)) {
    return {
      value: 0,
      error:
        amount > MAX_MONEY
          ? "Amount exceeds the supported limit"
          : "Amount must have no more than two decimal places"
    };
  }

  if (amount > MAX_MONEY) {
    return { value: 0, error: "Amount exceeds the supported limit" };
  }

  return { value: moneyValue(amount) };
}

function normalizeImportMemberNo(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

async function listOpeningBalanceStagedMemberNos() {
  const db = await getPool();

  if (!db) {
    const stagedBatchNos = new Set(
      openingBalanceImportBatches
        .filter((batch) => batch.status === "Staged")
        .map((batch) => batch.importNo)
    );

    return [
      ...new Set(
        openingBalanceImportRows
          .filter((row) => stagedBatchNos.has(row.importNo))
          .map((row) => normalizeImportMemberNo(row.memberNo))
          .filter(Boolean)
      )
    ];
  }

  const [rows] = await db.execute(
    `SELECT DISTINCT row.member_no AS memberNo
     FROM opening_balance_import_rows row
     INNER JOIN opening_balance_import_batches batch
       ON batch.import_no = row.import_no
     WHERE batch.status = 'Staged'
       AND row.member_no <> ''`
  );

  return rows.map((row) => normalizeImportMemberNo(row.memberNo)).filter(Boolean);
}

async function listOpeningBalanceFinalizedMemberNos() {
  const db = await getPool();

  if (!db) {
    return [
      ...new Set(
        openingBalanceImportRows
          .filter((row) => row.finalizedAt)
          .map((row) => normalizeImportMemberNo(row.memberNo))
          .filter(Boolean)
      )
    ];
  }

  const [rows] = await db.execute(
    `SELECT DISTINCT member_no AS memberNo
     FROM opening_balance_import_rows
     WHERE finalized_at IS NOT NULL
       AND member_no <> ''`
  );

  return rows.map((row) => normalizeImportMemberNo(row.memberNo)).filter(Boolean);
}

async function validateOpeningBalanceImportRows(inputRows) {
  if (!Array.isArray(inputRows) || inputRows.length === 0) {
    return { error: "At least one opening balance row is required." };
  }

  if (inputRows.length > 500) {
    return { error: "Opening balance import is limited to 500 rows per staged batch." };
  }

  const memberRows = await listLedgerMemberLookup();
  const memberMap = new Map(memberRows.map((member) => [normalizeImportMemberNo(member.id), member]));
  const stagedMemberNos = new Set(await listOpeningBalanceStagedMemberNos());
  const finalizedMemberNos = new Set(await listOpeningBalanceFinalizedMemberNos());
  const seenMemberNos = new Set();
  const duplicateMemberNos = new Set();
  const normalizedRows = inputRows.map((row, index) => {
    const memberNo = String(row.memberNo || "").trim();
    const normalizedMemberNo = normalizeImportMemberNo(memberNo);

    if (normalizedMemberNo) {
      if (seenMemberNos.has(normalizedMemberNo)) {
        duplicateMemberNos.add(normalizedMemberNo);
      }
      seenMemberNos.add(normalizedMemberNo);
    }

    return {
      rowNumber: Number(row.rowNumber || index + 2),
      memberNo,
      normalizedMemberNo,
      memberName: String(row.memberName || "").trim(),
      shareCapitalOpeningBalance: row.shareCapitalOpeningBalance ?? row.shareCapitalAmount ?? "",
      savingsOpeningBalance: row.savingsOpeningBalance ?? row.savingsAmount ?? "",
      cutoverDate: String(row.cutoverDate || "").trim(),
      sourceReference: String(row.sourceReference || "").trim().slice(0, 120),
      rawData: row.rawData && typeof row.rawData === "object" ? row.rawData : {}
    };
  });

  return {
    rows: normalizedRows.map((row) => {
      const issues = [];
      const member = memberMap.get(row.normalizedMemberNo);
      const shareCapital = parseOpeningBalanceAmount(row.shareCapitalOpeningBalance);
      const savings = parseOpeningBalanceAmount(row.savingsOpeningBalance);
      const cutoverDate = normalizeOptionalDate(row.cutoverDate);

      if (!row.memberNo) {
        issues.push("Missing member no.");
      } else if (!member) {
        issues.push("Member no. was not found");
      }

      if (row.normalizedMemberNo && duplicateMemberNos.has(row.normalizedMemberNo)) {
        issues.push("Duplicate member no. in upload");
      }

      if (row.normalizedMemberNo && stagedMemberNos.has(row.normalizedMemberNo)) {
        issues.push("Member already has a staged opening balance");
      }

      if (row.normalizedMemberNo && finalizedMemberNos.has(row.normalizedMemberNo)) {
        issues.push("Opening balance already finalized for member");
      }

      if (shareCapital.error) {
        issues.push(`Share capital: ${shareCapital.error}`);
      }

      if (savings.error) {
        issues.push(`Savings: ${savings.error}`);
      }

      if (!cutoverDate || !isValidIsoDate(cutoverDate)) {
        issues.push("Invalid cutover date");
      }

      if (!row.sourceReference) {
        issues.push("Missing source reference");
      }

      return {
        ...row,
        memberNo: member?.id || row.memberNo,
        memberName: row.memberName || member?.name || "",
        shareCapitalAmount: shareCapital.value,
        savingsAmount: savings.value,
        cutoverDate,
        rowStatus: issues.length > 0 ? "Has Issues" : "Ready",
        issues
      };
    })
  };
}

function summarizeOpeningBalanceImportRows(rows) {
  const readyRows = rows.filter((row) => row.rowStatus === "Ready");

  return {
    totalRows: rows.length,
    readyRows: readyRows.length,
    issueRows: rows.length - readyRows.length,
    totalShareCapital: sumMoney(readyRows.map((row) => row.shareCapitalAmount)),
    totalSavings: sumMoney(readyRows.map((row) => row.savingsAmount))
  };
}

function mapOpeningBalanceImportBatch(row) {
  return {
    id: row.importNo,
    importNo: row.importNo,
    sourceLabel: row.sourceLabel,
    status: row.status,
    totalRows: row.totalRows,
    readyRows: row.readyRows,
    issueRows: row.issueRows,
    totalShareCapital: row.totalShareCapital,
    totalSavings: row.totalSavings,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    finalizedBy: row.finalizedBy || "",
    finalizedAt: row.finalizedAt || "",
    finalizedRows: row.finalizedRows || 0,
    skippedRows: row.skippedRows || 0,
    postedEntryNo: row.postedEntryNo || ""
  };
}

function mapOpeningBalanceImportRow(row) {
  return {
    id: row.id,
    rowNumber: row.rowNumber,
    memberNo: row.memberNo,
    memberName: row.memberName,
    shareCapitalAmount: row.shareCapitalAmount,
    savingsAmount: row.savingsAmount,
    cutoverDate: row.cutoverDate,
    sourceReference: row.sourceReference,
    rowStatus: row.rowStatus,
    issues: parseIssues(row.issues),
    rawData: typeof row.rawData === "string" ? JSON.parse(row.rawData || "{}") : row.rawData || {},
    finalizedAt: row.finalizedAt || ""
  };
}

async function nextOpeningBalanceImportNo(connection = null) {
  const db = connection || (await getPool());

  if (!db) {
    return `OB-${new Date().getFullYear()}-${String(openingBalanceImportBatches.length + 1).padStart(4, "0")}`;
  }

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS countValue
     FROM opening_balance_import_batches
     WHERE YEAR(created_at) = YEAR(CURRENT_DATE)`
  );

  return `OB-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;
}

async function listOpeningBalanceImportBatches() {
  const db = await getPool();

  if (!db) {
    return openingBalanceImportBatches.map((batch) =>
      mapOpeningBalanceImportBatch({
        ...batch,
        postedEntryNo:
          journalEntries.find(
            (entry) => entry.sourceType === "Opening Balance Import" && entry.sourceNo === batch.importNo
          )?.id || ""
      })
    );
  }

  const [rows] = await db.execute(
    `SELECT import_no AS importNo, source_label AS sourceLabel, status,
            total_rows AS totalRows, ready_rows AS readyRows, issue_rows AS issueRows,
            total_share_capital AS totalShareCapital, total_savings AS totalSavings,
            created_by AS createdBy, created_at AS createdAt,
            finalized_by AS finalizedBy, finalized_at AS finalizedAt,
            finalized_rows AS finalizedRows, skipped_rows AS skippedRows,
            journal.entry_no AS postedEntryNo
     FROM opening_balance_import_batches batch
     LEFT JOIN journal_entries journal
       ON journal.source_type = 'Opening Balance Import'
      AND journal.source_no = batch.import_no
     ORDER BY batch.created_at DESC, batch.id DESC`
  );

  return rows.map(mapOpeningBalanceImportBatch);
}

async function getOpeningBalanceImportBatch(importNo) {
  const db = await getPool();

  if (!db) {
    const batch = openingBalanceImportBatches.find((item) => item.importNo === importNo || item.id === importNo);

    if (!batch) {
      return { error: "Opening balance import batch was not found.", statusCode: 404 };
    }

    const rows = openingBalanceImportRows.filter((row) => row.importNo === batch.importNo);
    const postedEntryNo =
      journalEntries.find(
        (entry) => entry.sourceType === "Opening Balance Import" && entry.sourceNo === batch.importNo
      )?.id || "";
    return {
      batch: mapOpeningBalanceImportBatch({ ...batch, postedEntryNo }),
      rows: rows.map(mapOpeningBalanceImportRow)
    };
  }

  const [batchRows] = await db.execute(
    `SELECT import_no AS importNo, source_label AS sourceLabel, status,
            total_rows AS totalRows, ready_rows AS readyRows, issue_rows AS issueRows,
            total_share_capital AS totalShareCapital, total_savings AS totalSavings,
            created_by AS createdBy, created_at AS createdAt,
            finalized_by AS finalizedBy, finalized_at AS finalizedAt,
            finalized_rows AS finalizedRows, skipped_rows AS skippedRows,
            journal.entry_no AS postedEntryNo
     FROM opening_balance_import_batches batch
     LEFT JOIN journal_entries journal
       ON journal.source_type = 'Opening Balance Import'
      AND journal.source_no = batch.import_no
     WHERE batch.import_no = ?
     LIMIT 1`,
    [importNo]
  );

  if (batchRows.length === 0) {
    return { error: "Opening balance import batch was not found.", statusCode: 404 };
  }

  const [rows] = await db.execute(
    `SELECT id, row_no AS rowNumber, member_no AS memberNo, member_name AS memberName,
            share_capital_opening_balance AS shareCapitalAmount,
            savings_opening_balance AS savingsAmount,
            cutover_date AS cutoverDate, source_reference AS sourceReference,
            row_status AS rowStatus, issues, raw_data AS rawData, finalized_at AS finalizedAt
     FROM opening_balance_import_rows
     WHERE import_no = ?
     ORDER BY row_no`,
    [importNo]
  );

  return {
    batch: mapOpeningBalanceImportBatch(batchRows[0]),
    rows: rows.map(mapOpeningBalanceImportRow)
  };
}

async function createOpeningBalanceImportBatch(input, user) {
  const validation = await validateOpeningBalanceImportRows(input.rows);

  if (validation.error) {
    return { error: validation.error, statusCode: 400 };
  }

  const sourceLabel = String(input.sourceLabel || "CSV Paste").trim().slice(0, 160) || "CSV Paste";
  const rows = validation.rows;
  const summary = summarizeOpeningBalanceImportRows(rows);
  const db = await getPool();

  if (!db) {
    const importNo = await nextOpeningBalanceImportNo();
    const batch = {
      id: importNo,
      importNo,
      sourceLabel,
      status: "Staged",
      ...summary,
      createdBy: user.username,
      createdAt: new Date().toISOString()
    };

    openingBalanceImportBatches.unshift(batch);
    rows.forEach((row, index) => {
      openingBalanceImportRows.push({
        id: `${importNo}-${index + 1}`,
        importNo,
        ...row
      });
    });

    return { batch: mapOpeningBalanceImportBatch(batch), rows: openingBalanceImportRows.filter((row) => row.importNo === importNo).map(mapOpeningBalanceImportRow) };
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const importNo = await nextOpeningBalanceImportNo(connection);

    await connection.execute(
      `INSERT INTO opening_balance_import_batches (
         import_no, source_label, status, total_rows, ready_rows, issue_rows,
         total_share_capital, total_savings, created_by
       )
       VALUES (?, ?, 'Staged', ?, ?, ?, ?, ?, ?)`,
      [
        importNo,
        sourceLabel,
        summary.totalRows,
        summary.readyRows,
        summary.issueRows,
        summary.totalShareCapital,
        summary.totalSavings,
        user.username
      ]
    );

    for (const row of rows) {
      await connection.execute(
        `INSERT INTO opening_balance_import_rows (
           import_no, row_no, member_no, member_name, share_capital_opening_balance,
           savings_opening_balance, cutover_date, source_reference, row_status,
           issues, raw_data
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          importNo,
          row.rowNumber,
          row.memberNo,
          row.memberName,
          row.shareCapitalAmount,
          row.savingsAmount,
          row.cutoverDate,
          row.sourceReference,
          row.rowStatus,
          JSON.stringify(row.issues),
          JSON.stringify(row.rawData)
        ]
      );
    }

    await connection.commit();
    return await getOpeningBalanceImportBatch(importNo);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function rejectOpeningBalanceImportBatch(importNo, user) {
  const db = await getPool();

  if (!db) {
    const batch = openingBalanceImportBatches.find((item) => item.importNo === importNo || item.id === importNo);

    if (!batch) {
      return { error: "Opening balance import batch was not found.", statusCode: 404 };
    }

    if (batch.status !== "Staged") {
      return { error: "Only staged opening balance batches can be rejected.", statusCode: 409 };
    }

    batch.status = "Rejected";
    batch.finalizedBy = user.username;
    batch.finalizedAt = new Date().toISOString();
    return { batch: mapOpeningBalanceImportBatch(batch) };
  }

  const [existingRows] = await db.execute(
    `SELECT import_no AS importNo, status
     FROM opening_balance_import_batches
     WHERE import_no = ?
     LIMIT 1`,
    [importNo]
  );

  if (existingRows.length === 0) {
    return { error: "Opening balance import batch was not found.", statusCode: 404 };
  }

  if (existingRows[0].status !== "Staged") {
    return { error: "Only staged opening balance batches can be rejected.", statusCode: 409 };
  }

  await db.execute(
    `UPDATE opening_balance_import_batches
     SET status = 'Rejected', finalized_by = ?, finalized_at = CURRENT_TIMESTAMP
     WHERE import_no = ?`,
    [user.username, importNo]
  );

  const result = await getOpeningBalanceImportBatch(importNo);
  return { batch: result.batch };
}

function buildOpeningBalanceJournalLines(shareCapitalAmount, savingsAmount) {
  const total = addMoney(shareCapitalAmount, savingsAmount);

  return [
    {
      accountCode: "1090",
      accountName: "Opening Balance Clearing",
      debit: total,
      credit: 0
    },
    {
      accountCode: "3010",
      accountName: "Share Capital",
      debit: 0,
      credit: moneyValue(shareCapitalAmount)
    },
    {
      accountCode: "2020",
      accountName: "Savings Deposits Payable",
      debit: 0,
      credit: moneyValue(savingsAmount)
    }
  ].filter((line) => line.debit > 0 || line.credit > 0);
}

function createOpeningBalanceJournalInMemory(batch, rows, user) {
  const existingEntry = journalEntries.find(
    (entry) => entry.sourceType === "Opening Balance Import" && entry.sourceNo === batch.importNo
  );

  if (existingEntry) {
    return existingEntry;
  }

  const finalizedRows = rows.filter((row) => row.rowStatus === "Finalized" && row.finalizedAt);
  const shareCapitalAmount = sumMoney(finalizedRows.map((row) => row.shareCapitalAmount));
  const savingsAmount = sumMoney(finalizedRows.map((row) => row.savingsAmount));

  if (addMoney(shareCapitalAmount, savingsAmount) <= 0) {
    return null;
  }

  const cutoverDate = finalizedRows.map((row) => row.cutoverDate).filter(Boolean).sort()[0] || new Date().toISOString();
  const entry = {
    id: nextJournalEntryNumber(),
    sourceType: "Opening Balance Import",
    sourceNo: batch.importNo,
    description: `Opening balances - ${batch.importNo}`,
    postedBy: user.username,
    postedAt: cutoverDate,
    lines: buildOpeningBalanceJournalLines(shareCapitalAmount, savingsAmount)
  };
  journalEntries.unshift(entry);
  return entry;
}

async function createOpeningBalanceJournalInDatabase(connection, importNo, user) {
  const [existingRows] = await connection.execute(
    `SELECT entry_no AS id
     FROM journal_entries
     WHERE source_type = 'Opening Balance Import'
       AND source_no = ?
     LIMIT 1`,
    [importNo]
  );

  if (existingRows.length > 0) {
    return existingRows[0].id;
  }

  const [totalsRows] = await connection.execute(
    `SELECT COALESCE(SUM(share_capital_opening_balance), 0) AS shareCapitalAmount,
            COALESCE(SUM(savings_opening_balance), 0) AS savingsAmount,
            MIN(cutover_date) AS cutoverDate
     FROM opening_balance_import_rows
     WHERE import_no = ?
       AND row_status = 'Finalized'
       AND finalized_at IS NOT NULL`,
    [importNo]
  );
  const totals = totalsRows[0];
  const totalAmount = addMoney(totals.shareCapitalAmount, totals.savingsAmount);

  if (totalAmount <= 0) {
    return "";
  }

  const [countRows] = await connection.execute(
    `SELECT COUNT(*) AS countValue
     FROM journal_entries
     WHERE YEAR(posted_at) = YEAR(CURRENT_DATE)`
  );
  const entryNo = `JE-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;
  const cutoverDate = formatDateOnly(totals.cutoverDate);
  const postedAt = cutoverDate ? `${cutoverDate} 00:00:00+08` : new Date();

  await connection.execute(
    `INSERT INTO journal_entries (
       entry_no, source_type, source_no, description, posted_by, posted_at
     )
     VALUES (?, 'Opening Balance Import', ?, ?, ?, ?)`,
    [entryNo, importNo, `Opening balances - ${importNo}`, user.username, postedAt]
  );

  const lines = buildOpeningBalanceJournalLines(totals.shareCapitalAmount, totals.savingsAmount);

  for (const line of lines) {
    await connection.execute(
      `INSERT INTO journal_entry_lines (
         entry_no, account_code, account_name, debit, credit
       )
       VALUES (?, ?, ?, ?, ?)`,
      [entryNo, line.accountCode, line.accountName, line.debit, line.credit]
    );
  }

  return entryNo;
}

async function finalizeOpeningBalanceImportBatch(importNo, user) {
  const db = await getPool();

  if (!db) {
    const batch = openingBalanceImportBatches.find((item) => item.importNo === importNo || item.id === importNo);

    if (!batch) {
      return { error: "Opening balance import batch was not found.", statusCode: 404 };
    }

    if (batch.status !== "Staged") {
      return { error: "Only staged opening balance batches can be finalized.", statusCode: 409 };
    }

    const rows = openingBalanceImportRows.filter((row) => row.importNo === batch.importNo);
    const finalizedMemberNos = new Set(
      openingBalanceImportRows
        .filter((row) => row.importNo !== batch.importNo && row.finalizedAt)
        .map((row) => normalizeImportMemberNo(row.memberNo))
    );
    let finalizedRows = 0;
    let skippedRows = rows.filter((row) => row.rowStatus !== "Ready").length;
    const finalizedAt = new Date().toISOString();

    for (const row of rows.filter((item) => item.rowStatus === "Ready")) {
      const member = members.find(
        (item) => normalizeImportMemberNo(item.id) === normalizeImportMemberNo(row.memberNo)
      );

      if (!member) {
        row.rowStatus = "Skipped";
        row.issues = [...parseIssues(row.issues), "Member no. was not found during finalization"];
        skippedRows += 1;
        continue;
      }

      if (finalizedMemberNos.has(normalizeImportMemberNo(member.id))) {
        row.rowStatus = "Skipped";
        row.issues = [...parseIssues(row.issues), "Opening balance already finalized for member"];
        skippedRows += 1;
        continue;
      }

      member.share = addMoney(member.share, row.shareCapitalAmount);
      member.savings = addMoney(member.savings, row.savingsAmount);
      row.memberNo = member.id;
      row.rowStatus = "Finalized";
      row.finalizedAt = finalizedAt;
      finalizedMemberNos.add(normalizeImportMemberNo(member.id));
      finalizedRows += 1;
    }

    if (finalizedRows === 0) {
      return { error: "No ready opening balance rows could be finalized.", statusCode: 409 };
    }

    batch.status = "Finalized";
    batch.finalizedRows = finalizedRows;
    batch.skippedRows = skippedRows;
    batch.finalizedBy = user.username;
    batch.finalizedAt = finalizedAt;
    createOpeningBalanceJournalInMemory(batch, rows, user);
    return await getOpeningBalanceImportBatch(batch.importNo);
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [batchRows] = await connection.execute(
      `SELECT import_no AS importNo, status
       FROM opening_balance_import_batches
       WHERE import_no = ?
       LIMIT 1
       FOR UPDATE`,
      [importNo]
    );

    if (batchRows.length === 0) {
      await connection.rollback();
      return { error: "Opening balance import batch was not found.", statusCode: 404 };
    }

    if (batchRows[0].status !== "Staged") {
      await connection.rollback();
      return { error: "Only staged opening balance batches can be finalized.", statusCode: 409 };
    }

    const [rows] = await connection.execute(
      `SELECT id, row_no AS rowNumber, member_no AS memberNo,
              share_capital_opening_balance AS shareCapitalAmount,
              savings_opening_balance AS savingsAmount,
              row_status AS rowStatus, issues
       FROM opening_balance_import_rows
       WHERE import_no = ?
       ORDER BY row_no, id`,
      [importNo]
    );
    const [memberRows] = await connection.execute(
      `SELECT member_no AS id
       FROM members`
    );
    const memberMap = new Map(
      memberRows.map((member) => [normalizeImportMemberNo(member.id), member.id])
    );
    const [previouslyFinalizedRows] = await connection.execute(
      `SELECT row.member_no AS memberNo
       FROM opening_balance_import_rows row
       INNER JOIN opening_balance_import_batches batch
         ON batch.import_no = row.import_no
       WHERE row.finalized_at IS NOT NULL
         AND batch.import_no <> ?`,
      [importNo]
    );
    const finalizedMemberNos = new Set(
      previouslyFinalizedRows.map((row) => normalizeImportMemberNo(row.memberNo))
    );
    let finalizedRows = 0;
    let skippedRows = rows.filter((row) => row.rowStatus !== "Ready").length;

    for (const row of rows.filter((item) => item.rowStatus === "Ready")) {
      const normalizedMemberNo = normalizeImportMemberNo(row.memberNo);
      const memberNo = memberMap.get(normalizedMemberNo);

      if (!memberNo) {
        const issues = [...parseIssues(row.issues), "Member no. was not found during finalization"];
        await connection.execute(
          `UPDATE opening_balance_import_rows
           SET row_status = 'Skipped', issues = ?
           WHERE id = ?`,
          [JSON.stringify(issues), row.id]
        );
        skippedRows += 1;
        continue;
      }

      if (finalizedMemberNos.has(normalizedMemberNo)) {
        const issues = [...parseIssues(row.issues), "Opening balance already finalized for member"];
        await connection.execute(
          `UPDATE opening_balance_import_rows
           SET row_status = 'Skipped', issues = ?
           WHERE id = ?`,
          [JSON.stringify(issues), row.id]
        );
        skippedRows += 1;
        continue;
      }

      await connection.execute(
        `UPDATE members
         SET share_capital = share_capital + ?, savings_balance = savings_balance + ?
         WHERE member_no = ?`,
        [row.shareCapitalAmount, row.savingsAmount, memberNo]
      );
      await connection.execute(
        `UPDATE opening_balance_import_rows
         SET member_no = ?, row_status = 'Finalized', finalized_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [memberNo, row.id]
      );
      finalizedMemberNos.add(normalizedMemberNo);
      finalizedRows += 1;
    }

    if (finalizedRows === 0) {
      await connection.rollback();
      return { error: "No ready opening balance rows could be finalized.", statusCode: 409 };
    }

    await connection.execute(
      `UPDATE opening_balance_import_batches
       SET status = 'Finalized', finalized_rows = ?, skipped_rows = ?,
           finalized_by = ?, finalized_at = CURRENT_TIMESTAMP
       WHERE import_no = ?`,
      [finalizedRows, skippedRows, user.username, importNo]
    );
    await createOpeningBalanceJournalInDatabase(connection, importNo, user);

    await connection.commit();
    return await getOpeningBalanceImportBatch(importNo);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function repairOpeningBalanceJournal(importNo, user) {
  const db = await getPool();

  if (!db) {
    const batch = openingBalanceImportBatches.find((item) => item.importNo === importNo || item.id === importNo);

    if (!batch) {
      return { error: "Opening balance import batch was not found.", statusCode: 404 };
    }

    if (batch.status !== "Finalized") {
      return { error: "Only finalized opening balance batches can post a repair journal.", statusCode: 409 };
    }

    if (
      journalEntries.some(
        (entry) => entry.sourceType === "Opening Balance Import" && entry.sourceNo === batch.importNo
      )
    ) {
      return { error: "Opening balance journal already exists.", statusCode: 409 };
    }

    const rows = openingBalanceImportRows.filter((row) => row.importNo === batch.importNo);
    const entry = createOpeningBalanceJournalInMemory(batch, rows, user);

    if (!entry) {
      return { error: "No finalized opening balance amounts are available to post.", statusCode: 409 };
    }

    return { batch: (await getOpeningBalanceImportBatch(importNo)).batch, entry };
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const [batchRows] = await connection.execute(
      `SELECT import_no AS importNo, status
       FROM opening_balance_import_batches
       WHERE import_no = ?
       LIMIT 1
       FOR UPDATE`,
      [importNo]
    );

    if (batchRows.length === 0) {
      await connection.rollback();
      return { error: "Opening balance import batch was not found.", statusCode: 404 };
    }

    if (batchRows[0].status !== "Finalized") {
      await connection.rollback();
      return { error: "Only finalized opening balance batches can post a repair journal.", statusCode: 409 };
    }

    const [existingJournalRows] = await connection.execute(
      `SELECT entry_no AS entryNo
       FROM journal_entries
       WHERE source_type = 'Opening Balance Import'
         AND source_no = ?
       LIMIT 1`,
      [importNo]
    );

    if (existingJournalRows.length > 0) {
      await connection.rollback();
      return { error: "Opening balance journal already exists.", statusCode: 409 };
    }

    const entryNo = await createOpeningBalanceJournalInDatabase(connection, importNo, user);

    if (!entryNo) {
      await connection.rollback();
      return { error: "No finalized opening balance amounts are available to post.", statusCode: 409 };
    }

    await connection.commit();
    const entries = await listJournalEntries();
    return {
      batch: (await getOpeningBalanceImportBatch(importNo)).batch,
      entry: entries.find((entry) => entry.id === entryNo)
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function nextMemberImportNo(connection = null) {
  const db = connection || (await getPool());

  if (!db) {
    return `MI-${new Date().getFullYear()}-${String(memberImportBatches.length + 1).padStart(4, "0")}`;
  }

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS countValue
     FROM member_import_batches
     WHERE YEAR(created_at) = YEAR(CURRENT_DATE)`
  );

  return `MI-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;
}

async function createMemberImportBatch(input, user) {
  const validation = await validateMemberImportRows(input.rows);

  if (validation.error) {
    return { error: validation.error, statusCode: 400 };
  }

  const sourceLabel = String(input.sourceLabel || "CSV Paste").trim().slice(0, 160) || "CSV Paste";
  const rows = validation.rows;
  const summary = summarizeMemberImportRows(rows);
  const db = await getPool();

  if (!db) {
    const importNo = await nextMemberImportNo();
    const batch = {
      id: importNo,
      importNo,
      sourceLabel,
      status: "Staged",
      ...summary,
      createdBy: user.username,
      createdAt: new Date().toISOString()
    };

    memberImportBatches.unshift(batch);
    rows.forEach((row, index) => {
      memberImportRows.push({
        id: `${importNo}-${index + 1}`,
        importNo,
        ...row
      });
    });

    return { batch, rows: memberImportRows.filter((row) => row.importNo === importNo) };
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const importNo = await nextMemberImportNo(connection);

    await connection.execute(
      `INSERT INTO member_import_batches (
         import_no, source_label, status, total_rows, ready_rows, issue_rows, created_by
       )
       VALUES (?, ?, 'Staged', ?, ?, ?, ?)`,
      [importNo, sourceLabel, summary.totalRows, summary.readyRows, summary.issueRows, user.username]
    );

    for (const row of rows) {
      await connection.execute(
        `INSERT INTO member_import_rows (
           import_no, row_no, member_no, full_name, cluster_name, contact_number,
           address, birthdate, civil_status, occupation, membership_date, member_status,
           row_status, issues
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          importNo,
          row.rowNumber,
          row.memberNo,
          row.name,
          row.group,
          row.contactNumber,
          row.address,
          row.birthdate,
          row.civilStatus,
          row.occupation,
          row.membershipDate,
          row.status,
          row.rowStatus,
          JSON.stringify(row.issues)
        ]
      );
    }

    await connection.commit();
    return await getMemberImportBatch(importNo);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listMemberImportBatches() {
  const db = await getPool();

  if (!db) {
    return memberImportBatches.map(mapMemberImportBatch);
  }

  const [rows] = await db.execute(
    `SELECT import_no AS importNo, source_label AS sourceLabel, status,
            total_rows AS totalRows, ready_rows AS readyRows, issue_rows AS issueRows,
            created_by AS createdBy, created_at AS createdAt,
            finalized_by AS finalizedBy, finalized_at AS finalizedAt,
            imported_rows AS importedRows, skipped_rows AS skippedRows
     FROM member_import_batches
     ORDER BY created_at DESC, id DESC`
  );

  return rows.map(mapMemberImportBatch);
}

async function getMemberImportBatch(importNo) {
  const db = await getPool();

  if (!db) {
    const batch = memberImportBatches.find((item) => item.importNo === importNo || item.id === importNo);

    if (!batch) {
      return { error: "Member import batch was not found.", statusCode: 404 };
    }

    return {
      batch: mapMemberImportBatch(batch),
      rows: memberImportRows
        .filter((row) => row.importNo === batch.importNo)
        .map(mapMemberImportRow)
    };
  }

  const [batchRows] = await db.execute(
    `SELECT import_no AS importNo, source_label AS sourceLabel, status,
            total_rows AS totalRows, ready_rows AS readyRows, issue_rows AS issueRows,
            created_by AS createdBy, created_at AS createdAt,
            finalized_by AS finalizedBy, finalized_at AS finalizedAt,
            imported_rows AS importedRows, skipped_rows AS skippedRows
     FROM member_import_batches
     WHERE import_no = ?
     LIMIT 1`,
    [importNo]
  );

  if (batchRows.length === 0) {
    return { error: "Member import batch was not found.", statusCode: 404 };
  }

  const [rows] = await db.execute(
    `SELECT id, row_no AS rowNumber, member_no AS memberNo, full_name AS name,
            cluster_name AS \`group\`, contact_number AS contactNumber, address,
            birthdate, civil_status AS civilStatus, occupation,
            membership_date AS membershipDate, member_status AS status,
            row_status AS rowStatus, issues
     FROM member_import_rows
     WHERE import_no = ?
     ORDER BY row_no, id`,
    [importNo]
  );

  return {
    batch: mapMemberImportBatch(batchRows[0]),
    rows: rows.map(mapMemberImportRow)
  };
}

async function finalizeMemberImportBatch(importNo, user) {
  const db = await getPool();

  if (!db) {
    const batch = memberImportBatches.find((item) => item.importNo === importNo || item.id === importNo);

    if (!batch) {
      return { error: "Member import batch was not found.", statusCode: 404 };
    }

    if (batch.status === "Finalized") {
      return { error: "Member import batch is already finalized.", statusCode: 409 };
    }

    const rows = memberImportRows.filter((row) => row.importNo === batch.importNo);
    const readyRows = rows.filter((row) => row.rowStatus === "Ready");
    let importedRows = 0;
    let skippedRows = rows.length - readyRows.length;

    for (const row of readyRows) {
      if (!row.memberNo || members.some((member) => member.id === row.memberNo)) {
        row.rowStatus = "Skipped";
        row.issues = [...parseIssues(row.issues), "Member no. already exists"];
        skippedRows += 1;
        continue;
      }

      members.push({
        id: row.memberNo,
        name: row.name,
        group: row.group || "General Membership",
        share: 0,
        savings: 0,
        status: row.status || "Active",
        contactNumber: row.contactNumber || "",
        address: row.address || "",
        birthdate: row.birthdate || "",
        civilStatus: row.civilStatus || "",
        occupation: row.occupation || "",
        membershipDate: row.membershipDate || new Date().toISOString().slice(0, 10)
      });
      row.rowStatus = "Imported";
      importedRows += 1;
    }

    batch.status = "Finalized";
    batch.importedRows = importedRows;
    batch.skippedRows = skippedRows;
    batch.finalizedBy = user.username;
    batch.finalizedAt = new Date().toISOString();

    return await getMemberImportBatch(batch.importNo);
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [batchRows] = await connection.execute(
      `SELECT import_no AS importNo, status
       FROM member_import_batches
       WHERE import_no = ?
       LIMIT 1`,
      [importNo]
    );

    if (batchRows.length === 0) {
      await connection.rollback();
      return { error: "Member import batch was not found.", statusCode: 404 };
    }

    if (batchRows[0].status === "Finalized") {
      await connection.rollback();
      return { error: "Member import batch is already finalized.", statusCode: 409 };
    }

    const [rows] = await connection.execute(
      `SELECT id, row_no AS rowNumber, member_no AS memberNo, full_name AS name,
              cluster_name AS \`group\`, contact_number AS contactNumber, address,
              birthdate, civil_status AS civilStatus, occupation,
              membership_date AS membershipDate, member_status AS status,
              row_status AS rowStatus, issues
       FROM member_import_rows
       WHERE import_no = ?
       ORDER BY row_no, id`,
      [importNo]
    );

    let importedRows = 0;
    let skippedRows = rows.filter((row) => row.rowStatus !== "Ready").length;

    for (const row of rows.filter((item) => item.rowStatus === "Ready")) {
      const [existingRows] = await connection.execute(
        `SELECT member_no AS id
         FROM members
         WHERE member_no = ?
         LIMIT 1`,
        [row.memberNo]
      );

      if (!row.memberNo || existingRows.length > 0) {
        const issues = [...parseIssues(row.issues), "Member no. already exists"];
        await connection.execute(
          `UPDATE member_import_rows
           SET row_status = 'Skipped', issues = ?
           WHERE id = ?`,
          [JSON.stringify(issues), row.id]
        );
        skippedRows += 1;
        continue;
      }

      await connection.execute(
        `INSERT INTO members (
           member_no, full_name, cluster_name, status, share_capital, savings_balance,
           contact_number, address, birthdate, civil_status, occupation, membership_date
         )
         VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?)`,
        [
          row.memberNo,
          row.name,
          row.group || "General Membership",
          row.status || "Active",
          row.contactNumber || "",
          row.address || "",
          row.birthdate || null,
          row.civilStatus || "",
          row.occupation || "",
          row.membershipDate || new Date().toISOString().slice(0, 10)
        ]
      );

      await connection.execute(
        `UPDATE member_import_rows
         SET row_status = 'Imported'
         WHERE id = ?`,
        [row.id]
      );
      importedRows += 1;
    }

    await connection.execute(
      `UPDATE member_import_batches
       SET status = 'Finalized', imported_rows = ?, skipped_rows = ?,
           finalized_by = ?, finalized_at = CURRENT_TIMESTAMP
       WHERE import_no = ?`,
      [importedRows, skippedRows, user.username, importNo]
    );

    await connection.commit();
    return await getMemberImportBatch(importNo);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listMemberApplications() {
  const db = await getPool();

  if (!db) {
    return memberApplications;
  }

  const [rows] = await db.execute(
    `SELECT application_no AS id, full_name AS fullName, cluster_name AS clusterName,
            contact_number AS contactNumber, initial_share_capital AS initialShareCapital,
            status, created_by AS createdBy, created_at AS createdAt
     FROM member_applications
     ORDER BY created_at DESC, id DESC`
  );

  return rows;
}

async function createMemberApplication(input, user) {
  const db = await getPool();
  const application = {
    id: `MA-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
    fullName: input.fullName,
    clusterName: input.clusterName,
    contactNumber: input.contactNumber,
    initialShareCapital: input.initialShareCapital,
    status: "Pending Approval",
    createdBy: user.username
  };

  if (!db) {
    memberApplications.unshift(application);
    return application;
  }

  await db.execute(
    `INSERT INTO member_applications (
       application_no, full_name, cluster_name, contact_number,
       initial_share_capital, status, created_by
     )
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      application.id,
      application.fullName,
      application.clusterName,
      application.contactNumber,
      application.initialShareCapital,
      application.status,
      application.createdBy
    ]
  );

  return application;
}

function nextMemberNumber() {
  const numericIds = members
    .map((member) => Number(String(member.id).replace("M-", "")))
    .filter((value) => Number.isInteger(value));
  const next = Math.max(...numericIds, 0) + 1;
  return `M-${String(next).padStart(6, "0")}`;
}

function nextInitialPaymentNumber() {
  const next = initialPayments.length + 1;
  return `IP-${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
}

function nextSavingsDepositNumber() {
  const next = savingsDeposits.length + 1;
  return `SD-${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
}

function nextShareCapitalContributionNumber() {
  const next = shareCapitalContributions.length + 1;
  return `SC-${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
}

function nextSavingsWithdrawalNumber() {
  const next = savingsWithdrawals.length + 1;
  return `SW-${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
}

function nextTellerCashCountNumber() {
  const next = tellerCashCounts.length + 1;
  return `TC-${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
}

function nextTellerBatchNumber() {
  const next = tellerBatches.length + 1;
  return `TB-${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
}

function buildTellerBatchSummary(rows) {
  return rows.reduce(
    (summary, row) => {
      const cashIn = moneyValue(row.cashReceived);
      const cashOut = moneyValue(row.cashOut);

      return {
        cashIn: addMoney(summary.cashIn, cashIn),
        cashOut: addMoney(summary.cashOut, cashOut),
        netCash: addMoney(summary.netCash, cashIn, -cashOut),
        transactionCount: summary.transactionCount + 1,
        initialPaymentCount: summary.initialPaymentCount + (row.batchType === "Initial Payment" ? 1 : 0),
        shareCapitalContributionCount:
          summary.shareCapitalContributionCount + (row.batchType === "Share Capital Contribution" ? 1 : 0),
        savingsDepositCount: summary.savingsDepositCount + (row.batchType === "Savings Deposit" ? 1 : 0),
        savingsWithdrawalCount: summary.savingsWithdrawalCount + (row.batchType === "Savings Withdrawal" ? 1 : 0),
        loanReleaseCount: summary.loanReleaseCount + (row.batchType === "Loan Release" ? 1 : 0),
        loanCollectionCount: summary.loanCollectionCount + (row.batchType === "Loan Collection" ? 1 : 0)
      };
    },
    {
      cashIn: 0,
      cashOut: 0,
      netCash: 0,
      transactionCount: 0,
      initialPaymentCount: 0,
      shareCapitalContributionCount: 0,
      savingsDepositCount: 0,
      savingsWithdrawalCount: 0,
      loanReleaseCount: 0,
      loanCollectionCount: 0
    }
  );
}

function normalizeReferenceNo(referenceNo) {
  return String(referenceNo || "").trim().toUpperCase();
}

function hasCashInReference(referenceNo) {
  const normalizedReferenceNo = normalizeReferenceNo(referenceNo);
  return [...initialPayments, ...savingsDeposits, ...shareCapitalContributions, ...loanCollections].some(
    (transaction) => normalizeReferenceNo(transaction.referenceNo) === normalizedReferenceNo
  );
}

function hasWithdrawalReference(referenceNo) {
  const normalizedReferenceNo = normalizeReferenceNo(referenceNo);
  return [...savingsWithdrawals, ...loanReleases].some(
    (transaction) => normalizeReferenceNo(transaction.referenceNo) === normalizedReferenceNo
  );
}

async function hasCashInReferenceInDatabase(connection, referenceNo) {
  const [rows] = await connection.execute(
    `SELECT reference_no AS referenceNo
     FROM initial_member_payments
     WHERE UPPER(reference_no) = UPPER(?)
     UNION ALL
     SELECT reference_no AS referenceNo
     FROM savings_deposits
     WHERE UPPER(reference_no) = UPPER(?)
     UNION ALL
     SELECT reference_no AS referenceNo
     FROM share_capital_contributions
     WHERE UPPER(reference_no) = UPPER(?)
     UNION ALL
     SELECT reference_no AS referenceNo
     FROM loan_collections
     WHERE UPPER(reference_no) = UPPER(?)
     LIMIT 1`,
    [referenceNo, referenceNo, referenceNo, referenceNo]
  );

  return rows.length > 0;
}

async function hasWithdrawalReferenceInDatabase(connection, referenceNo) {
  const [rows] = await connection.execute(
    `SELECT reference_no AS referenceNo
     FROM savings_withdrawals
     WHERE UPPER(reference_no) = UPPER(?)
     UNION ALL
     SELECT reference_no AS referenceNo
     FROM loan_releases
     WHERE UPPER(reference_no) = UPPER(?)
     LIMIT 1`,
    [referenceNo, referenceNo]
  );

  return rows.length > 0;
}

function nextJournalEntryNumber() {
  const next = journalEntries.length + 1;
  return `JE-${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
}

function buildInitialPaymentJournalLines(payment) {
  return [
    {
      accountCode: "1010",
      accountName: "Cash on Hand",
      debit: payment.cashReceived,
      credit: 0
    },
    {
      accountCode: "3010",
      accountName: "Share Capital",
      debit: 0,
      credit: payment.shareCapitalAmount
    },
    {
      accountCode: "4020",
      accountName: "Membership Fee Income",
      debit: 0,
      credit: payment.membershipFeeAmount
    },
    {
      accountCode: "2020",
      accountName: "Savings Deposits Payable",
      debit: 0,
      credit: payment.savingsDepositAmount
    }
  ].filter((line) => line.debit > 0 || line.credit > 0);
}

function buildSavingsDepositJournalLines(deposit) {
  return [
    {
      accountCode: "1010",
      accountName: "Cash on Hand",
      debit: deposit.cashReceived,
      credit: 0
    },
    {
      accountCode: "2020",
      accountName: "Savings Deposits Payable",
      debit: 0,
      credit: deposit.amount
    }
  ].filter((line) => line.debit > 0 || line.credit > 0);
}

function buildShareCapitalContributionJournalLines(contribution) {
  return [
    {
      accountCode: "1010",
      accountName: "Cash on Hand",
      debit: contribution.cashReceived,
      credit: 0
    },
    {
      accountCode: "3010",
      accountName: "Share Capital",
      debit: 0,
      credit: contribution.amount
    }
  ].filter((line) => line.debit > 0 || line.credit > 0);
}

function buildSavingsWithdrawalJournalLines(withdrawal) {
  return [
    {
      accountCode: "2020",
      accountName: "Savings Deposits Payable",
      debit: withdrawal.amount,
      credit: 0
    },
    {
      accountCode: "1010",
      accountName: "Cash on Hand",
      debit: 0,
      credit: withdrawal.amount
    }
  ].filter((line) => line.debit > 0 || line.credit > 0);
}

function buildLoanReleaseJournalLines(release) {
  return [
    {
      accountCode: release.loansReceivableAccount,
      accountName: "Loans Receivable",
      debit: release.principal,
      credit: 0
    },
    {
      accountCode: release.cashAccount,
      accountName: "Cash on Hand",
      debit: 0,
      credit: release.netProceeds
    },
    {
      accountCode: release.processingFeeAccount,
      accountName: "Processing Fee Income",
      debit: 0,
      credit: release.processingFee
    }
  ].filter((line) => line.debit > 0 || line.credit > 0);
}

function buildTellerFundingJournalLines(funding) {
  return [
    {
      accountCode: "1010",
      accountName: "Cash on Hand",
      debit: funding.amount,
      credit: 0
    },
    {
      accountCode: funding.sourceAccountCode,
      accountName: funding.sourceAccountName,
      debit: 0,
      credit: funding.amount
    }
  ];
}

function buildLoanCollectionJournalLines(collection) {
  return [
    {
      accountCode: collection.cashAccount,
      accountName: "Cash on Hand",
      debit: collection.amountReceived,
      credit: 0
    },
    {
      accountCode: collection.loansReceivableAccount,
      accountName: "Loans Receivable",
      debit: 0,
      credit: collection.principalAmount
    },
    {
      accountCode: collection.interestIncomeAccount,
      accountName: "Interest Income",
      debit: 0,
      credit: collection.interestAmount
    }
  ].filter((line) => line.debit > 0 || line.credit > 0);
}

async function approveMemberApplication(applicationId, user) {
  const db = await getPool();

  if (!db) {
    const application = memberApplications.find((item) => item.id === applicationId);

    if (!application) {
      return { error: "Member application was not found.", statusCode: 404 };
    }

    if (application.status !== "Pending Approval") {
      return { error: "Only pending applications can be approved.", statusCode: 409 };
    }

    const member = {
      id: nextMemberNumber(),
      name: application.fullName,
      group: application.clusterName,
      share: 0,
      savings: 0,
      status: "Active",
      contactNumber: application.contactNumber || "",
      address: "",
      birthdate: "",
      civilStatus: "",
      occupation: "",
      membershipDate: new Date().toISOString().slice(0, 10)
    };

    application.status = "Approved";
    application.approvedBy = user.username;
    application.approvedMemberNo = member.id;
    members.push(member);

    return { application, member };
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT application_no AS id, full_name AS fullName, cluster_name AS clusterName,
              contact_number AS contactNumber, initial_share_capital AS initialShareCapital,
              status
       FROM member_applications
       WHERE application_no = ?
       FOR UPDATE`,
      [applicationId]
    );

    const application = rows[0];

    if (!application) {
      await connection.rollback();
      return { error: "Member application was not found.", statusCode: 404 };
    }

    if (application.status !== "Pending Approval") {
      await connection.rollback();
      return { error: "Only pending applications can be approved.", statusCode: 409 };
    }

    const [lastMemberRows] = await connection.execute(
      `SELECT member_no AS id
       FROM members
       WHERE member_no ~ '^M-[0-9]+$'`
    );
    const lastNumber = lastMemberRows.reduce(
      (maximum, row) => Math.max(maximum, Number(String(row.id).replace("M-", "")) || 0),
      0
    );
    const memberNo = `M-${String(lastNumber + 1).padStart(6, "0")}`;

    await connection.execute(
      `INSERT INTO members (
         member_no, full_name, cluster_name, status, share_capital, savings_balance,
         contact_number, membership_date
       )
       VALUES (?, ?, ?, 'Active', ?, 0, ?, CURRENT_DATE)`,
      [memberNo, application.fullName, application.clusterName, 0, application.contactNumber || ""]
    );

    await connection.execute(
      `UPDATE member_applications
       SET status = 'Approved', approved_by = ?, approved_member_no = ?, approved_at = CURRENT_TIMESTAMP
       WHERE application_no = ?`,
      [user.username, memberNo, applicationId]
    );

    await connection.commit();

    return {
      application: {
        ...application,
        status: "Approved",
        approvedBy: user.username,
        approvedMemberNo: memberNo
      },
      member: {
        id: memberNo,
        name: application.fullName,
        group: application.clusterName,
        share: 0,
        savings: 0,
        status: "Active",
        contactNumber: application.contactNumber || "",
        address: "",
        birthdate: "",
        civilStatus: "",
        occupation: "",
        membershipDate: new Date().toISOString().slice(0, 10)
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listInitialPayments() {
  const db = await getPool();

  if (!db) {
    return initialPayments;
  }

  const [rows] = await db.execute(
    `SELECT payment_no AS id, batch_no AS batchId, member_no AS memberId, member_name AS memberName,
            share_capital_amount AS shareCapitalAmount, membership_fee_amount AS membershipFeeAmount,
            savings_deposit_amount AS savingsDepositAmount, cash_received AS cashReceived, reference_no AS referenceNo,
            received_by AS receivedBy, status, posted_by AS postedBy,
            posted_entry_no AS postedEntryNo, posted_at AS postedAt, created_at AS createdAt
     FROM initial_member_payments
     ORDER BY created_at DESC, id DESC`
  );

  return rows;
}

async function listSavingsDeposits() {
  const db = await getPool();

  if (!db) {
    return savingsDeposits;
  }

  const [rows] = await db.execute(
    `SELECT deposit_no AS id, batch_no AS batchId, member_no AS memberId, member_name AS memberName,
            amount, cash_received AS cashReceived, reference_no AS referenceNo,
            received_by AS receivedBy, status, posted_by AS postedBy,
            posted_entry_no AS postedEntryNo, posted_at AS postedAt, created_at AS createdAt
     FROM savings_deposits
     ORDER BY created_at DESC, id DESC`
  );

  return rows;
}

async function listShareCapitalContributions() {
  const db = await getPool();

  if (!db) {
    return shareCapitalContributions;
  }

  const [rows] = await db.execute(
    `SELECT contribution_no AS id, batch_no AS batchId, member_no AS memberId, member_name AS memberName,
            amount, cash_received AS cashReceived, reference_no AS referenceNo,
            received_by AS receivedBy, status, posted_by AS postedBy,
            posted_entry_no AS postedEntryNo, posted_at AS postedAt, created_at AS createdAt
     FROM share_capital_contributions
     ORDER BY created_at DESC, id DESC`
  );

  return rows;
}

async function listSavingsWithdrawals() {
  const db = await getPool();

  if (!db) {
    return savingsWithdrawals;
  }

  const [rows] = await db.execute(
    `SELECT withdrawal_no AS id, batch_no AS batchId, member_no AS memberId, member_name AS memberName,
            amount, reference_no AS referenceNo, released_by AS releasedBy,
            status, posted_by AS postedBy, posted_entry_no AS postedEntryNo,
            posted_at AS postedAt, created_at AS createdAt
     FROM savings_withdrawals
     ORDER BY created_at DESC, id DESC`
  );

  return rows;
}

async function listJournalEntries() {
  const db = await getPool();

  if (!db) {
    return journalEntries;
  }

  const [entries] = await db.execute(
    `SELECT entry_no AS id, source_type AS sourceType, source_no AS sourceNo,
            description, posted_by AS postedBy, posted_at AS postedAt
     FROM journal_entries
     ORDER BY posted_at DESC, id DESC`
  );

  if (entries.length === 0) {
    return [];
  }

  const [lines] = await db.execute(
    `SELECT entry_no AS entryId, account_code AS accountCode, account_name AS accountName,
            debit, credit
     FROM journal_entry_lines
     ORDER BY id`
  );

  return entries.map((entry) => ({
    ...entry,
    lines: lines.filter((line) => line.entryId === entry.id)
  }));
}

async function listFinalizedOpeningBalanceRows() {
  const db = await getPool();

  if (!db) {
    return openingBalanceImportRows
      .filter((row) => row.rowStatus === "Finalized" && row.finalizedAt)
      .map((row) => ({
        ...row,
        importNo: row.importNo,
        journalEntryNo:
          journalEntries.find(
            (entry) => entry.sourceType === "Opening Balance Import" && entry.sourceNo === row.importNo
          )?.id || ""
      }));
  }

  const [rows] = await db.execute(
    `SELECT row.id, row.import_no AS importNo, row.row_no AS rowNumber,
            row.member_no AS memberNo, row.member_name AS memberName,
            row.share_capital_opening_balance AS shareCapitalAmount,
            row.savings_opening_balance AS savingsAmount,
            row.cutover_date AS cutoverDate, row.source_reference AS sourceReference,
            row.row_status AS rowStatus, row.finalized_at AS finalizedAt,
            COALESCE(journal.entry_no, '') AS journalEntryNo
     FROM opening_balance_import_rows row
     LEFT JOIN journal_entries journal
       ON journal.source_type = 'Opening Balance Import'
      AND journal.source_no = row.import_no
     WHERE row.row_status = 'Finalized'
       AND row.finalized_at IS NOT NULL
     ORDER BY row.finalized_at DESC, row.id DESC`
  );

  return rows.map((row) => ({
    ...row,
    cutoverDate: formatDateOnly(row.cutoverDate)
  }));
}

async function listTellerBatchRows(batchId = "") {
  const rows = [
    ...(await listInitialPayments())
      .filter((payment) => payment.status === "Teller Batch")
      .map((payment) => ({ ...payment, batchType: "Initial Payment", cashOut: 0 })),
    ...(await listSavingsDeposits())
      .filter((deposit) => deposit.status === "Teller Batch")
      .map((deposit) => ({
        ...deposit,
        batchType: "Savings Deposit",
        cashOut: 0,
        shareCapitalAmount: 0,
        membershipFeeAmount: 0,
        savingsDepositAmount: deposit.amount
      })),
    ...(await listShareCapitalContributions())
      .filter((contribution) => contribution.status === "Teller Batch")
      .map((contribution) => ({
        ...contribution,
        batchType: "Share Capital Contribution",
        cashOut: 0,
        shareCapitalAmount: contribution.amount,
        membershipFeeAmount: 0,
        savingsDepositAmount: 0
      })),
    ...(await listSavingsWithdrawals())
      .filter((withdrawal) => withdrawal.status === "Teller Batch")
      .map((withdrawal) => ({
        ...withdrawal,
        batchType: "Savings Withdrawal",
        cashReceived: 0,
        cashOut: withdrawal.amount,
        shareCapitalAmount: 0,
        membershipFeeAmount: 0,
        savingsDepositAmount: -withdrawal.amount
      })),
    ...(await listLoanReleases())
      .filter((release) => release.status === "Teller Batch")
      .map((release) => ({
        ...release,
        id: release.releaseNo,
        batchType: "Loan Release",
        receivedBy: release.releasedBy,
        cashReceived: 0,
        cashOut: release.cashReleased,
        shareCapitalAmount: 0,
        membershipFeeAmount: 0,
        savingsDepositAmount: 0
      })),
    ...(await listLoanCollections())
      .filter((collection) => collection.status === "Teller Batch")
      .map((collection) => ({
        ...collection,
        id: collection.collectionNo,
        batchType: "Loan Collection",
        cashReceived: collection.amountReceived,
        cashOut: 0,
        shareCapitalAmount: 0,
        membershipFeeAmount: 0,
        savingsDepositAmount: 0
      }))
  ];

  if (!batchId) {
    return rows;
  }

  return rows.filter((row) => row.batchId === batchId);
}

async function listTellerBatchTransactions(batchId) {
  return [
    ...(await listInitialPayments()).map((payment) => ({
      ...payment,
      batchType: "Initial Payment",
      cashOut: 0
    })),
    ...(await listSavingsDeposits()).map((deposit) => ({
      ...deposit,
      batchType: "Savings Deposit",
      cashOut: 0,
      shareCapitalAmount: 0,
      membershipFeeAmount: 0,
      savingsDepositAmount: deposit.amount
    })),
    ...(await listShareCapitalContributions()).map((contribution) => ({
      ...contribution,
      batchType: "Share Capital Contribution",
      cashOut: 0,
      shareCapitalAmount: contribution.amount,
      membershipFeeAmount: 0,
      savingsDepositAmount: 0
    })),
    ...(await listSavingsWithdrawals()).map((withdrawal) => ({
      ...withdrawal,
      batchType: "Savings Withdrawal",
      receivedBy: withdrawal.releasedBy,
      cashReceived: 0,
      cashOut: withdrawal.amount,
      shareCapitalAmount: 0,
      membershipFeeAmount: 0,
      savingsDepositAmount: -withdrawal.amount
    })),
    ...(await listLoanReleases()).map((release) => ({
      ...release,
      id: release.releaseNo,
      batchType: "Loan Release",
      receivedBy: release.releasedBy,
      cashReceived: 0,
      cashOut: release.cashReleased,
      shareCapitalAmount: 0,
      membershipFeeAmount: 0,
      savingsDepositAmount: 0
    })),
    ...(await listLoanCollections()).map((collection) => ({
      ...collection,
      id: collection.collectionNo,
      batchType: "Loan Collection",
      cashReceived: collection.amountReceived,
      cashOut: 0,
      shareCapitalAmount: 0,
      membershipFeeAmount: 0,
      savingsDepositAmount: 0
    }))
  ].filter((row) => row.batchId === batchId);
}

async function listTellerCashCounts() {
  const db = await getPool();

  if (!db) {
    return tellerCashCounts;
  }

  const [rows] = await db.execute(
    `SELECT count_no AS id, batch_no AS batchId, expected_cash AS expectedCash, actual_cash AS actualCash,
            variance, transaction_count AS transactionCount, submitted_by AS submittedBy,
            status, submitted_at AS submittedAt
     FROM teller_cash_counts
     ORDER BY submitted_at DESC, id DESC`
  );

  return rows;
}

function countBatchTransactions(batchId) {
  const rows = [
    ...initialPayments,
    ...savingsDeposits,
    ...shareCapitalContributions,
    ...savingsWithdrawals,
    ...loanReleases,
    ...loanCollections
  ].filter((row) => row.batchId === batchId);

  return {
    postedEntryCount: rows.filter((row) => row.status === "Posted" && row.postedEntryNo).length,
    unpostedTransactionCount: rows.filter((row) => row.status === "Teller Batch").length
  };
}

async function listTellerBatches() {
  const db = await getPool();

  if (!db) {
    return tellerBatches
      .map((batch) => ({
        ...batch,
        ...countBatchTransactions(batch.id)
      }))
      .sort((left, right) => String(right.openedAt).localeCompare(String(left.openedAt)));
  }

  const [rows] = await db.execute(
    `SELECT batch_no AS id, teller_username AS tellerUsername, status,
            opened_at AS openedAt, submitted_at AS submittedAt,
            reviewed_at AS reviewedAt, COALESCE(reviewed_by, '') AS reviewedBy,
            closed_at AS closedAt, COALESCE(closed_by, '') AS closedBy,
            COALESCE(closing_note, '') AS closingNote,
            expected_cash AS expectedCash, actual_cash AS actualCash,
            variance, transaction_count AS transactionCount,
            COALESCE(variance_note, '') AS varianceNote,
            COALESCE(variance_noted_by, '') AS varianceNotedBy,
            variance_noted_at AS varianceNotedAt,
            (
              SELECT COUNT(*)
              FROM (
                SELECT batch_no, status, posted_entry_no FROM initial_member_payments
                UNION ALL
                SELECT batch_no, status, posted_entry_no FROM savings_deposits
                UNION ALL
                SELECT batch_no, status, posted_entry_no FROM share_capital_contributions
                UNION ALL
                SELECT batch_no, status, posted_entry_no FROM savings_withdrawals
                UNION ALL
                SELECT batch_no, status, posted_entry_no FROM loan_releases
                UNION ALL
                SELECT batch_no, status, posted_entry_no FROM loan_collections
              ) posted_rows
              WHERE posted_rows.batch_no = teller_batches.batch_no
                AND posted_rows.status = 'Posted'
                AND posted_rows.posted_entry_no IS NOT NULL
            ) AS postedEntryCount,
            (
              SELECT COUNT(*)
              FROM (
                SELECT batch_no, status FROM initial_member_payments
                UNION ALL
                SELECT batch_no, status FROM savings_deposits
                UNION ALL
                SELECT batch_no, status FROM share_capital_contributions
                UNION ALL
                SELECT batch_no, status FROM savings_withdrawals
                UNION ALL
                SELECT batch_no, status FROM loan_releases
                UNION ALL
                SELECT batch_no, status FROM loan_collections
              ) unposted_rows
              WHERE unposted_rows.batch_no = teller_batches.batch_no
                AND unposted_rows.status = 'Teller Batch'
            ) AS unpostedTransactionCount
     FROM teller_batches
     ORDER BY opened_at DESC, id DESC
     LIMIT 25`
  );

  return rows;
}

async function getTellerBatchDetails(batchId) {
  const batches = await listTellerBatches();
  const batch = batches.find((item) => item.id === batchId);

  if (!batch) {
    return { error: "Teller batch was not found.", statusCode: 404 };
  }

  const cashCounts = (await listTellerCashCounts()).filter((cashCount) => cashCount.batchId === batchId);
  const transactions = await listTellerBatchTransactions(batchId);
  const fundings = (await listTellerFundings()).filter(
    (funding) => funding.batchId === batchId && funding.status === "Acknowledged"
  );
  const postedEntryNos = new Set(
    [
      ...transactions.map((transaction) => transaction.postedEntryNo),
      ...fundings.map((funding) => funding.postedEntryNo)
    ].filter((entryNo) => Boolean(entryNo))
  );
  const linkedJournalEntries = (await listJournalEntries()).filter((entry) => postedEntryNos.has(entry.id));

  return {
    batch,
    cashCounts,
    latestCashCount: cashCounts[0] || null,
    fundings,
    openingFunding: sumMoney(fundings.map((funding) => funding.amount)),
    transactions,
    journalEntries: linkedJournalEntries
  };
}

async function getDailyCashPositionReport() {
  const batches = await listTellerBatches();
  const batchRows = [];

  for (const batch of batches) {
    const transactions = await listTellerBatchTransactions(batch.id);
    const summary = buildTellerBatchSummary(transactions);

    batchRows.push({
      ...batch,
      cashIn: summary.cashIn,
      cashOut: summary.cashOut,
      netCash: summary.netCash
    });
  }

  const summary = batchRows.reduce(
    (totals, batch) => ({
      batchCount: totals.batchCount + 1,
      closedBatchCount: totals.closedBatchCount + (batch.status === "Closed" ? 1 : 0),
      cashIn: addMoney(totals.cashIn, batch.cashIn),
      cashOut: addMoney(totals.cashOut, batch.cashOut),
      netCash: addMoney(totals.netCash, batch.netCash),
      expectedCash: addMoney(totals.expectedCash, batch.expectedCash),
      actualCash: addMoney(totals.actualCash, batch.actualCash),
      variance: addMoney(totals.variance, batch.variance),
      postedEntryCount: totals.postedEntryCount + Number(batch.postedEntryCount || 0),
      unpostedTransactionCount: totals.unpostedTransactionCount + Number(batch.unpostedTransactionCount || 0)
    }),
    {
      batchCount: 0,
      closedBatchCount: 0,
      cashIn: 0,
      cashOut: 0,
      netCash: 0,
      expectedCash: 0,
      actualCash: 0,
      variance: 0,
      postedEntryCount: 0,
      unpostedTransactionCount: 0
    }
  );

  return {
    date: new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    summary,
    batches: batchRows
  };
}

async function getMemberSubsidiaryLedgerReport() {
  const memberRows = await listMembers();
  const initialPaymentRows = await listInitialPayments();
  const shareCapitalContributionRows = await listShareCapitalContributions();
  const savingsDepositRows = await listSavingsDeposits();
  const savingsWithdrawalRows = await listSavingsWithdrawals();
  const openingBalanceRows = await listFinalizedOpeningBalanceRows();

  const membersWithSubsidiary = memberRows.map((member) => {
    const memberOpeningBalanceRows = openingBalanceRows.filter(
      (row) => normalizeImportMemberNo(row.memberNo) === normalizeImportMemberNo(member.id)
    );
    const memberInitialPayments = initialPaymentRows.filter((payment) => payment.memberId === member.id);
    const memberShareCapitalContributions = shareCapitalContributionRows.filter(
      (contribution) => contribution.memberId === member.id
    );
    const memberSavingsDeposits = savingsDepositRows.filter((deposit) => deposit.memberId === member.id);
    const memberSavingsWithdrawals = savingsWithdrawalRows.filter((withdrawal) => withdrawal.memberId === member.id);
    const transactions = [
      ...memberOpeningBalanceRows,
      ...memberInitialPayments,
      ...memberShareCapitalContributions,
      ...memberSavingsDeposits,
      ...memberSavingsWithdrawals
    ];

    return {
      id: member.id,
      name: member.name,
      status: member.status,
      shareCapitalBalance: Number(member.share || 0),
      savingsBalance: Number(member.savings || 0),
      openingShareCapitalTotal: sumMoney(memberOpeningBalanceRows.map((row) => row.shareCapitalAmount)),
      openingSavingsTotal: sumMoney(memberOpeningBalanceRows.map((row) => row.savingsAmount)),
      initialPaymentTotal: sumMoney(memberInitialPayments.map((payment) => payment.shareCapitalAmount)),
      shareCapitalContributionTotal: sumMoney(
        memberShareCapitalContributions.map((contribution) => contribution.amount)
      ),
      savingsDepositTotal: addMoney(
        sumMoney(memberInitialPayments.map((payment) => payment.savingsDepositAmount)),
        sumMoney(memberSavingsDeposits.map((deposit) => deposit.amount))
      ),
      savingsWithdrawalTotal: sumMoney(memberSavingsWithdrawals.map((withdrawal) => withdrawal.amount)),
      postedTransactionCount: transactions.filter(
        (transaction) => transaction.status === "Posted" || transaction.rowStatus === "Finalized"
      ).length,
      unpostedTransactionCount: transactions.filter((transaction) => transaction.status === "Teller Batch").length
    };
  });

  const summary = membersWithSubsidiary.reduce(
    (totals, member) => ({
      totalMembers: totals.totalMembers + 1,
      totalShareCapital: addMoney(totals.totalShareCapital, member.shareCapitalBalance),
      totalSavings: addMoney(totals.totalSavings, member.savingsBalance),
      totalOpeningShareCapital: addMoney(totals.totalOpeningShareCapital, member.openingShareCapitalTotal),
      totalOpeningSavings: addMoney(totals.totalOpeningSavings, member.openingSavingsTotal),
      totalPostedTransactions: totals.totalPostedTransactions + member.postedTransactionCount,
      totalUnpostedTransactions: totals.totalUnpostedTransactions + member.unpostedTransactionCount
    }),
    {
      totalMembers: 0,
      totalShareCapital: 0,
      totalSavings: 0,
      totalOpeningShareCapital: 0,
      totalOpeningSavings: 0,
      totalPostedTransactions: 0,
      totalUnpostedTransactions: 0
    }
  );

  return {
    generatedAt: new Date().toISOString(),
    summary,
    members: membersWithSubsidiary
  };
}

async function getControlAccountReconciliationReport() {
  const initialPaymentRows = (await listInitialPayments()).filter((payment) => payment.status === "Posted");
  const shareCapitalContributionRows = (await listShareCapitalContributions()).filter(
    (contribution) => contribution.status === "Posted"
  );
  const savingsDepositRows = (await listSavingsDeposits()).filter((deposit) => deposit.status === "Posted");
  const savingsWithdrawalRows = (await listSavingsWithdrawals()).filter((withdrawal) => withdrawal.status === "Posted");
  const openingBalanceRows = await listFinalizedOpeningBalanceRows();
  const entries = await listJournalEntries();

  const glBalance = (accountCode) =>
    sumMoney(
      entries.flatMap((entry) =>
        entry.lines
          .filter((line) => line.accountCode === accountCode)
          .map((line) => subtractMoney(line.credit, line.debit))
      )
    );

  const shareCapitalSubsidiaryTotal = sumMoney([
    ...openingBalanceRows.map((row) => row.shareCapitalAmount),
    ...initialPaymentRows.map((payment) => payment.shareCapitalAmount),
    ...shareCapitalContributionRows.map((contribution) => contribution.amount)
  ]);

  const savingsSubsidiaryTotal = subtractMoney(
    sumMoney([
      ...openingBalanceRows.map((row) => row.savingsAmount),
      ...initialPaymentRows.map((payment) => payment.savingsDepositAmount),
      ...savingsDepositRows.map((deposit) => deposit.amount)
    ]),
    sumMoney(savingsWithdrawalRows.map((withdrawal) => withdrawal.amount))
  );

  const rows = [
    {
      accountCode: "3010",
      accountName: "Share Capital",
      subsidiaryTotal: shareCapitalSubsidiaryTotal,
      generalLedgerTotal: glBalance("3010")
    },
    {
      accountCode: "2020",
      accountName: "Savings Deposits Payable",
      subsidiaryTotal: savingsSubsidiaryTotal,
      generalLedgerTotal: glBalance("2020")
    }
  ].map((row) => {
    const difference = subtractMoney(row.subsidiaryTotal, row.generalLedgerTotal);

    return {
      ...row,
      difference,
      status: moneyCents(difference) === 0 ? "Reconciled" : "Difference"
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    basis: "Recorded system activity",
    rows,
    summary: {
      accountCount: rows.length,
      reconciledCount: rows.filter((row) => row.status === "Reconciled").length,
      differenceCount: rows.filter((row) => row.status === "Difference").length
    }
  };
}

async function getTrialBalanceReport() {
  const entries = await listJournalEntries();
  const accountRows = new Map();

  entries.forEach((entry) => {
    entry.lines.forEach((line) => {
      const existingRow = accountRows.get(line.accountCode) || {
        accountCode: line.accountCode,
        accountName: line.accountName,
        totalDebit: 0,
        totalCredit: 0
      };

      existingRow.totalDebit = addMoney(existingRow.totalDebit, line.debit);
      existingRow.totalCredit = addMoney(existingRow.totalCredit, line.credit);
      accountRows.set(line.accountCode, existingRow);
    });
  });

  const rows = Array.from(accountRows.values())
    .map((row) => {
      const netBalance = subtractMoney(row.totalDebit, row.totalCredit);

      return {
        ...row,
        endingDebitBalance: netBalance > 0 ? netBalance : 0,
        endingCreditBalance: netBalance < 0 ? Math.abs(netBalance) : 0
      };
    })
    .sort((firstRow, secondRow) => firstRow.accountCode.localeCompare(secondRow.accountCode));

  const totalDebits = sumMoney(rows.map((row) => row.totalDebit));
  const totalCredits = sumMoney(rows.map((row) => row.totalCredit));
  const difference = subtractMoney(totalDebits, totalCredits);

  return {
    generatedAt: new Date().toISOString(),
    basis: "Posted journal entries",
    rows,
    summary: {
      accountCount: rows.length,
      totalDebits,
      totalCredits,
      difference,
      status: moneyCents(difference) === 0 ? "Balanced" : "Out of Balance"
    }
  };
}

async function getStatementOfFinancialConditionReport() {
  const trialBalance = await getTrialBalanceReport();

  const accountBalance = (row, normalSide) => {
    if (normalSide === "debit") {
      return subtractMoney(row.endingDebitBalance, row.endingCreditBalance);
    }

    return subtractMoney(row.endingCreditBalance, row.endingDebitBalance);
  };

  const assets = trialBalance.rows
    .filter((row) => row.accountCode.startsWith("1"))
    .map((row) => ({
      accountCode: row.accountCode,
      accountName: row.accountName,
      amount: accountBalance(row, "debit")
    }));

  const liabilities = trialBalance.rows
    .filter((row) => row.accountCode.startsWith("2"))
    .map((row) => ({
      accountCode: row.accountCode,
      accountName: row.accountName,
      amount: accountBalance(row, "credit")
    }));

  const equity = trialBalance.rows
    .filter((row) => row.accountCode.startsWith("3"))
    .map((row) => ({
      accountCode: row.accountCode,
      accountName: row.accountName,
      amount: accountBalance(row, "credit")
    }));

  const revenueTotal = sumMoney(
    trialBalance.rows
      .filter((row) => row.accountCode.startsWith("4"))
      .map((row) => accountBalance(row, "credit"))
  );
  const expenseTotal = sumMoney(
    trialBalance.rows
      .filter((row) => row.accountCode.startsWith("5"))
      .map((row) => accountBalance(row, "debit"))
  );
  const currentPeriodSurplus = subtractMoney(revenueTotal, expenseTotal);

  if (currentPeriodSurplus !== 0) {
    equity.push({
      accountCode: "3999",
      accountName: currentPeriodSurplus > 0 ? "Current Period Surplus" : "Current Period Deficit",
      amount: currentPeriodSurplus
    });
  }

  const totalAssets = sumMoney(assets.map((row) => row.amount));
  const totalLiabilities = sumMoney(liabilities.map((row) => row.amount));
  const totalEquity = sumMoney(equity.map((row) => row.amount));
  const totalLiabilitiesAndEquity = addMoney(totalLiabilities, totalEquity);
  const difference = subtractMoney(totalAssets, totalLiabilitiesAndEquity);

  return {
    generatedAt: new Date().toISOString(),
    basis: "Posted journal entries; income and expense accounts are presented as current period surplus or deficit until formal closing entries exist.",
    sections: {
      assets,
      liabilities,
      equity
    },
    summary: {
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity,
      currentPeriodSurplus,
      difference,
      status: moneyCents(difference) === 0 ? "Balanced" : "Out of Balance"
    }
  };
}

async function getLatestTellerCashCount() {
  const rows = await listTellerCashCounts();
  return rows[0] || null;
}

async function getCurrentTellerBatch(user) {
  const db = await getPool();

  if (!db) {
    let batch = tellerBatches.find((item) => ["Open", "Submitted", "Reviewed"].includes(item.status));

    if (!batch) {
      batch = {
        id: nextTellerBatchNumber(),
        tellerUsername: user?.username || "teller01",
        status: "Open",
        openedAt: new Date().toISOString(),
        submittedAt: "",
        reviewedAt: "",
        reviewedBy: "",
        expectedCash: 0,
        actualCash: 0,
        variance: 0,
        transactionCount: 0,
        varianceNote: "",
        varianceNotedBy: "",
        varianceNotedAt: "",
        closedBy: "",
        closingNote: ""
      };
      tellerBatches.unshift(batch);
    }

    return batch;
  }

  const [rows] = await db.execute(
    `SELECT batch_no AS id, teller_username AS tellerUsername, status,
            opened_at AS openedAt, submitted_at AS submittedAt,
            reviewed_at AS reviewedAt, COALESCE(reviewed_by, '') AS reviewedBy,
            closed_at AS closedAt, COALESCE(closed_by, '') AS closedBy,
            COALESCE(closing_note, '') AS closingNote,
            expected_cash AS expectedCash, actual_cash AS actualCash,
            variance, transaction_count AS transactionCount,
            COALESCE(variance_note, '') AS varianceNote,
            COALESCE(variance_noted_by, '') AS varianceNotedBy,
            variance_noted_at AS varianceNotedAt
     FROM teller_batches
     WHERE status IN ('Open', 'Submitted', 'Reviewed')
     ORDER BY opened_at DESC, id DESC
     LIMIT 1`
  );

  if (rows[0]) {
    return rows[0];
  }

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS countValue
     FROM teller_batches
     WHERE YEAR(opened_at) = YEAR(CURRENT_DATE)`
  );
  const batchNo = `TB-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;

  await db.execute(
    `INSERT INTO teller_batches (batch_no, teller_username, status)
     VALUES (?, ?, 'Open')`,
    [batchNo, user?.username || "teller01"]
  );

  return {
    id: batchNo,
    tellerUsername: user?.username || "teller01",
    status: "Open",
    openedAt: new Date().toISOString(),
    submittedAt: "",
    reviewedAt: "",
    reviewedBy: "",
    expectedCash: 0,
    actualCash: 0,
    variance: 0,
    transactionCount: 0,
    varianceNote: "",
    varianceNotedBy: "",
    varianceNotedAt: "",
    closedBy: "",
    closingNote: ""
  };
}

async function getOpenTellerBatch(user) {
  const batch = await getCurrentTellerBatch(user);

  if (batch.status !== "Open") {
    return { error: "No open teller batch is available. Close the reviewed batch before recording new teller transactions.", statusCode: 409 };
  }

  return { batch };
}

async function ensureTellerBatchReviewedForPosting(batchId, connection = null) {
  if (!batchId) {
    return { error: "Teller transaction is not assigned to a batch.", statusCode: 409 };
  }

  if (!connection) {
    const db = await getPool();

    if (db) {
      const [rows] = await db.execute(
        `SELECT batch_no AS id, status
         FROM teller_batches
         WHERE batch_no = ?
         LIMIT 1`,
        [batchId]
      );
      const batch = rows[0];

      if (!batch) {
        return { error: "Teller batch was not found.", statusCode: 404 };
      }

      if (batch.status !== "Reviewed") {
        return { error: "Teller batch must be reviewed before posting transactions.", statusCode: 409 };
      }

      return { batch };
    }

    const batch = tellerBatches.find((item) => item.id === batchId);

    if (!batch) {
      return { error: "Teller batch was not found.", statusCode: 404 };
    }

    if (batch.status !== "Reviewed") {
      return { error: "Teller batch must be reviewed before posting transactions.", statusCode: 409 };
    }

    return { batch };
  }

  const [rows] = await connection.execute(
    `SELECT batch_no AS id, status
     FROM teller_batches
     WHERE batch_no = ?
     LIMIT 1`,
    [batchId]
  );
  const batch = rows[0];

  if (!batch) {
    return { error: "Teller batch was not found.", statusCode: 404 };
  }

  if (batch.status !== "Reviewed") {
    return { error: "Teller batch must be reviewed before posting transactions.", statusCode: 409 };
  }

  return { batch };
}

async function getMemberStatement(memberId) {
  const db = await getPool();

  if (!db) {
    const member = members.find((item) => item.id === memberId);

    if (!member) {
      return { error: "Member was not found.", statusCode: 404 };
    }

    const openingTransactions = (await listFinalizedOpeningBalanceRows())
      .filter((row) => normalizeImportMemberNo(row.memberNo) === normalizeImportMemberNo(member.id))
      .map((row) => ({
        id: `${row.importNo}-${row.id}`,
        type: "Opening Balance",
        referenceNo: row.sourceReference || row.importNo,
        shareCapitalAmount: row.shareCapitalAmount,
        membershipFeeAmount: 0,
        savingsDepositAmount: row.savingsAmount,
        cashReceived: 0,
        status: "Posted",
        journalEntryNo: row.journalEntryNo || "",
        receivedBy: "Opening Balance Import",
        batchNo: row.importNo,
        cutoverDate: row.cutoverDate,
        sourceReference: row.sourceReference,
        createdAt: row.finalizedAt
      }));
    const transactions = openingTransactions.concat(initialPayments
      .filter((payment) => payment.memberId === member.id)
      .map((payment) => ({
        id: payment.id,
        type: "Initial Payment",
        referenceNo: payment.referenceNo,
        shareCapitalAmount: payment.shareCapitalAmount,
        membershipFeeAmount: payment.membershipFeeAmount,
        savingsDepositAmount: payment.savingsDepositAmount,
        cashReceived: payment.cashReceived,
        status: payment.status,
        journalEntryNo: payment.postedEntryNo || "",
        receivedBy: payment.receivedBy
      }))
      .concat(
        shareCapitalContributions
          .filter((contribution) => contribution.memberId === member.id)
          .map((contribution) => ({
            id: contribution.id,
            type: "Share Capital Contribution",
            referenceNo: contribution.referenceNo,
            shareCapitalAmount: contribution.amount,
            membershipFeeAmount: 0,
            savingsDepositAmount: 0,
            cashReceived: contribution.cashReceived,
            status: contribution.status,
            journalEntryNo: contribution.postedEntryNo || "",
            receivedBy: contribution.receivedBy
          }))
      )
      .concat(
        savingsDeposits
          .filter((deposit) => deposit.memberId === member.id)
          .map((deposit) => ({
            id: deposit.id,
            type: "Savings Deposit",
            referenceNo: deposit.referenceNo,
            shareCapitalAmount: 0,
            membershipFeeAmount: 0,
            savingsDepositAmount: deposit.amount,
            cashReceived: deposit.cashReceived,
            status: deposit.status,
            journalEntryNo: deposit.postedEntryNo || "",
            receivedBy: deposit.receivedBy
          }))
      )
      .concat(
        savingsWithdrawals
          .filter((withdrawal) => withdrawal.memberId === member.id)
          .map((withdrawal) => ({
            id: withdrawal.id,
            type: "Savings Withdrawal",
            referenceNo: withdrawal.referenceNo,
            shareCapitalAmount: 0,
            membershipFeeAmount: 0,
            savingsDepositAmount: -withdrawal.amount,
            cashReceived: 0,
            status: withdrawal.status,
            journalEntryNo: withdrawal.postedEntryNo || "",
            receivedBy: withdrawal.releasedBy
          }))
      ));

    return { member, transactions };
  }

  const [memberRows] = await db.execute(
    `SELECT member_no AS id, full_name AS name, cluster_name AS \`group\`,
            share_capital AS share, savings_balance AS savings, status,
            contact_number AS contactNumber, address, birthdate,
            civil_status AS civilStatus, occupation, membership_date AS membershipDate
     FROM members
     WHERE member_no = ?
     LIMIT 1`,
    [memberId]
  );
  const member = memberRows[0];

  if (!member) {
    return { error: "Member was not found.", statusCode: 404 };
  }

  const [initialPaymentRows] = await db.execute(
    `SELECT payment_no AS id, 'Initial Payment' AS type, reference_no AS referenceNo,
            share_capital_amount AS shareCapitalAmount,
            membership_fee_amount AS membershipFeeAmount,
            savings_deposit_amount AS savingsDepositAmount,
            cash_received AS cashReceived, status,
            COALESCE(posted_entry_no, '') AS journalEntryNo,
            received_by AS receivedBy, created_at AS createdAt
     FROM initial_member_payments
     WHERE member_no = ?
     ORDER BY created_at DESC, id DESC`,
    [memberId]
  );

  const [savingsDepositRows] = await db.execute(
    `SELECT deposit_no AS id, 'Savings Deposit' AS type, reference_no AS referenceNo,
            0 AS shareCapitalAmount, 0 AS membershipFeeAmount,
            amount AS savingsDepositAmount, cash_received AS cashReceived,
            status, COALESCE(posted_entry_no, '') AS journalEntryNo,
            received_by AS receivedBy, created_at AS createdAt
     FROM savings_deposits
     WHERE member_no = ?
     ORDER BY created_at DESC, id DESC`,
    [memberId]
  );

  const [shareCapitalContributionRows] = await db.execute(
    `SELECT contribution_no AS id, 'Share Capital Contribution' AS type, reference_no AS referenceNo,
            amount AS shareCapitalAmount, 0 AS membershipFeeAmount,
            0 AS savingsDepositAmount, cash_received AS cashReceived,
            status, COALESCE(posted_entry_no, '') AS journalEntryNo,
            received_by AS receivedBy, created_at AS createdAt
     FROM share_capital_contributions
     WHERE member_no = ?
     ORDER BY created_at DESC, id DESC`,
    [memberId]
  );

  const [savingsWithdrawalRows] = await db.execute(
    `SELECT withdrawal_no AS id, 'Savings Withdrawal' AS type, reference_no AS referenceNo,
            0 AS shareCapitalAmount, 0 AS membershipFeeAmount,
            -amount AS savingsDepositAmount, 0 AS cashReceived,
            status, COALESCE(posted_entry_no, '') AS journalEntryNo,
            released_by AS receivedBy, created_at AS createdAt
     FROM savings_withdrawals
     WHERE member_no = ?
     ORDER BY created_at DESC, id DESC`,
    [memberId]
  );
  const openingBalanceRows = (await listFinalizedOpeningBalanceRows())
    .filter((row) => normalizeImportMemberNo(row.memberNo) === normalizeImportMemberNo(member.id))
    .map((row) => ({
      id: `${row.importNo}-${row.id}`,
      type: "Opening Balance",
      referenceNo: row.sourceReference || row.importNo,
      shareCapitalAmount: row.shareCapitalAmount,
      membershipFeeAmount: 0,
      savingsDepositAmount: row.savingsAmount,
      cashReceived: 0,
      status: "Posted",
      journalEntryNo: row.journalEntryNo || "",
      receivedBy: "Opening Balance Import",
      batchNo: row.importNo,
      cutoverDate: row.cutoverDate,
      sourceReference: row.sourceReference,
      createdAt: row.finalizedAt
    }));

  return {
    member,
    transactions: [
      ...openingBalanceRows,
      ...initialPaymentRows,
      ...shareCapitalContributionRows,
      ...savingsDepositRows,
      ...savingsWithdrawalRows
    ]
  };
}

async function recordInitialPayment(input, user) {
  const db = await getPool();

  if (!db) {
    const member = members.find((item) => item.id === input.memberId && item.status === "Active");
    const batchResult = await getOpenTellerBatch(user);

    if (batchResult.error) {
      return batchResult;
    }

    if (!member) {
      return { error: "Active member was not found.", statusCode: 404 };
    }

    if (initialPayments.some((payment) => payment.memberId === member.id)) {
      return { error: "Initial member payment already exists for this member.", statusCode: 409 };
    }

    if (hasCashInReference(input.referenceNo)) {
      return { error: "OR/reference number already exists.", statusCode: 409 };
    }

    member.share = addMoney(member.share, input.shareCapitalAmount);
    member.savings = addMoney(member.savings, input.savingsDepositAmount);

    const payment = {
      id: nextInitialPaymentNumber(),
      memberId: member.id,
      memberName: member.name,
      shareCapitalAmount: input.shareCapitalAmount,
      membershipFeeAmount: input.membershipFeeAmount,
      savingsDepositAmount: input.savingsDepositAmount,
      cashReceived: input.cashReceived,
      referenceNo: input.referenceNo,
      receivedBy: user.username,
      status: "Teller Batch",
      batchId: batchResult.batch.id
    };

    initialPayments.unshift(payment);
    return { payment, member };
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [memberRows] = await connection.execute(
      `SELECT member_no AS id, full_name AS name, cluster_name AS \`group\`,
              share_capital AS share, savings_balance AS savings, status
       FROM members
       WHERE member_no = ? AND status = 'Active'
       FOR UPDATE`,
      [input.memberId]
    );
    const member = memberRows[0];

    if (!member) {
      await connection.rollback();
      return { error: "Active member was not found.", statusCode: 404 };
    }

    const [existingPaymentRows] = await connection.execute(
      `SELECT payment_no AS id
       FROM initial_member_payments
       WHERE member_no = ?
       LIMIT 1`,
      [member.id]
    );

    if (existingPaymentRows.length > 0) {
      await connection.rollback();
      return { error: "Initial member payment already exists for this member.", statusCode: 409 };
    }

    if (await hasCashInReferenceInDatabase(connection, input.referenceNo)) {
      await connection.rollback();
      return { error: "OR/reference number already exists.", statusCode: 409 };
    }

    const batchResult = await getOpenTellerBatch(user);

    if (batchResult.error) {
      await connection.rollback();
      return batchResult;
    }

    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS countValue
       FROM initial_member_payments
       WHERE YEAR(created_at) = YEAR(CURRENT_DATE)`
    );
    const paymentNo = `IP-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;

    await connection.execute(
      `INSERT INTO initial_member_payments (
         payment_no, batch_no, member_no, member_name, share_capital_amount,
         membership_fee_amount, savings_deposit_amount, cash_received, reference_no, received_by, status
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Teller Batch')`,
      [
        paymentNo,
        batchResult.batch.id,
        member.id,
        member.name,
        input.shareCapitalAmount,
        input.membershipFeeAmount,
        input.savingsDepositAmount,
        input.cashReceived,
        input.referenceNo,
        user.username
      ]
    );

    await connection.execute(
      `UPDATE members
       SET share_capital = share_capital + ?, savings_balance = savings_balance + ?
       WHERE member_no = ?`,
      [input.shareCapitalAmount, input.savingsDepositAmount, member.id]
    );

    await connection.commit();

    return {
      payment: {
        id: paymentNo,
        memberId: member.id,
        memberName: member.name,
        shareCapitalAmount: input.shareCapitalAmount,
        membershipFeeAmount: input.membershipFeeAmount,
        savingsDepositAmount: input.savingsDepositAmount,
        cashReceived: input.cashReceived,
        referenceNo: input.referenceNo,
        receivedBy: user.username,
        status: "Teller Batch",
        batchId: batchResult.batch.id
      },
      member: {
        ...member,
        share: addMoney(member.share, input.shareCapitalAmount),
        savings: addMoney(member.savings, input.savingsDepositAmount)
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function recordSavingsDeposit(input, user) {
  const db = await getPool();

  if (!db) {
    const member = members.find((item) => item.id === input.memberId && item.status === "Active");
    const batchResult = await getOpenTellerBatch(user);

    if (batchResult.error) {
      return batchResult;
    }

    if (!member) {
      return { error: "Active member was not found.", statusCode: 404 };
    }

    if (hasCashInReference(input.referenceNo)) {
      return { error: "OR/reference number already exists.", statusCode: 409 };
    }

    member.savings = addMoney(member.savings, input.amount);

    const deposit = {
      id: nextSavingsDepositNumber(),
      memberId: member.id,
      memberName: member.name,
      amount: input.amount,
      cashReceived: input.cashReceived,
      referenceNo: input.referenceNo,
      receivedBy: user.username,
      status: "Teller Batch",
      batchId: batchResult.batch.id
    };

    savingsDeposits.unshift(deposit);
    return { deposit, member };
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [memberRows] = await connection.execute(
      `SELECT member_no AS id, full_name AS name, cluster_name AS \`group\`,
              share_capital AS share, savings_balance AS savings, status
       FROM members
       WHERE member_no = ? AND status = 'Active'
       FOR UPDATE`,
      [input.memberId]
    );
    const member = memberRows[0];

    if (!member) {
      await connection.rollback();
      return { error: "Active member was not found.", statusCode: 404 };
    }

    if (await hasCashInReferenceInDatabase(connection, input.referenceNo)) {
      await connection.rollback();
      return { error: "OR/reference number already exists.", statusCode: 409 };
    }

    const batchResult = await getOpenTellerBatch(user);

    if (batchResult.error) {
      await connection.rollback();
      return batchResult;
    }

    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS countValue
       FROM savings_deposits
       WHERE YEAR(created_at) = YEAR(CURRENT_DATE)`
    );
    const depositNo = `SD-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;

    await connection.execute(
      `INSERT INTO savings_deposits (
         deposit_no, batch_no, member_no, member_name, amount, cash_received, reference_no, received_by, status
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Teller Batch')`,
      [
        depositNo,
        batchResult.batch.id,
        member.id,
        member.name,
        input.amount,
        input.cashReceived,
        input.referenceNo,
        user.username
      ]
    );

    await connection.execute(
      `UPDATE members
       SET savings_balance = savings_balance + ?
       WHERE member_no = ?`,
      [input.amount, member.id]
    );

    await connection.commit();

    return {
      deposit: {
        id: depositNo,
        memberId: member.id,
        memberName: member.name,
        amount: input.amount,
        cashReceived: input.cashReceived,
        referenceNo: input.referenceNo,
        receivedBy: user.username,
        status: "Teller Batch",
        batchId: batchResult.batch.id
      },
      member: {
        ...member,
        savings: addMoney(member.savings, input.amount)
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function recordShareCapitalContribution(input, user) {
  const db = await getPool();

  if (!db) {
    const member = members.find((item) => item.id === input.memberId && item.status === "Active");
    const batchResult = await getOpenTellerBatch(user);

    if (batchResult.error) {
      return batchResult;
    }

    if (!member) {
      return { error: "Active member was not found.", statusCode: 404 };
    }

    if (hasCashInReference(input.referenceNo)) {
      return { error: "OR/reference number already exists.", statusCode: 409 };
    }

    member.share = addMoney(member.share, input.amount);

    const contribution = {
      id: nextShareCapitalContributionNumber(),
      memberId: member.id,
      memberName: member.name,
      amount: input.amount,
      cashReceived: input.cashReceived,
      referenceNo: input.referenceNo,
      receivedBy: user.username,
      status: "Teller Batch",
      batchId: batchResult.batch.id
    };

    shareCapitalContributions.unshift(contribution);
    return { contribution, member };
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [memberRows] = await connection.execute(
      `SELECT member_no AS id, full_name AS name, cluster_name AS \`group\`,
              share_capital AS share, savings_balance AS savings, status
       FROM members
       WHERE member_no = ? AND status = 'Active'
       FOR UPDATE`,
      [input.memberId]
    );
    const member = memberRows[0];

    if (!member) {
      await connection.rollback();
      return { error: "Active member was not found.", statusCode: 404 };
    }

    if (await hasCashInReferenceInDatabase(connection, input.referenceNo)) {
      await connection.rollback();
      return { error: "OR/reference number already exists.", statusCode: 409 };
    }

    const batchResult = await getOpenTellerBatch(user);

    if (batchResult.error) {
      await connection.rollback();
      return batchResult;
    }

    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS countValue
       FROM share_capital_contributions
       WHERE YEAR(created_at) = YEAR(CURRENT_DATE)`
    );
    const contributionNo = `SC-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;

    await connection.execute(
      `INSERT INTO share_capital_contributions (
         contribution_no, batch_no, member_no, member_name, amount, cash_received, reference_no, received_by, status
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Teller Batch')`,
      [
        contributionNo,
        batchResult.batch.id,
        member.id,
        member.name,
        input.amount,
        input.cashReceived,
        input.referenceNo,
        user.username
      ]
    );

    await connection.execute(
      `UPDATE members
       SET share_capital = share_capital + ?
       WHERE member_no = ?`,
      [input.amount, member.id]
    );

    await connection.commit();

    return {
      contribution: {
        id: contributionNo,
        memberId: member.id,
        memberName: member.name,
        amount: input.amount,
        cashReceived: input.cashReceived,
        referenceNo: input.referenceNo,
        receivedBy: user.username,
        status: "Teller Batch",
        batchId: batchResult.batch.id
      },
      member: {
        ...member,
        share: addMoney(member.share, input.amount)
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function recordSavingsWithdrawal(input, user) {
  const db = await getPool();

  if (!db) {
    const member = members.find((item) => item.id === input.memberId && item.status === "Active");
    const batchResult = await getOpenTellerBatch(user);

    if (batchResult.error) {
      return batchResult;
    }

    if (!member) {
      return { error: "Active member was not found.", statusCode: 404 };
    }

    if (input.amount > member.savings) {
      return { error: "Withdrawal amount exceeds available savings.", statusCode: 400 };
    }

    if (hasWithdrawalReference(input.referenceNo)) {
      return { error: "Withdrawal voucher/reference number already exists.", statusCode: 409 };
    }

    member.savings = subtractMoney(member.savings, input.amount);

    const withdrawal = {
      id: nextSavingsWithdrawalNumber(),
      memberId: member.id,
      memberName: member.name,
      amount: input.amount,
      referenceNo: input.referenceNo,
      releasedBy: user.username,
      status: "Teller Batch",
      batchId: batchResult.batch.id
    };

    savingsWithdrawals.unshift(withdrawal);
    return { withdrawal, member };
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [memberRows] = await connection.execute(
      `SELECT member_no AS id, full_name AS name, cluster_name AS \`group\`,
              share_capital AS share, savings_balance AS savings, status
       FROM members
       WHERE member_no = ? AND status = 'Active'
       FOR UPDATE`,
      [input.memberId]
    );
    const member = memberRows[0];

    if (!member) {
      await connection.rollback();
      return { error: "Active member was not found.", statusCode: 404 };
    }

    if (input.amount > member.savings) {
      await connection.rollback();
      return { error: "Withdrawal amount exceeds available savings.", statusCode: 400 };
    }

    if (await hasWithdrawalReferenceInDatabase(connection, input.referenceNo)) {
      await connection.rollback();
      return { error: "Withdrawal voucher/reference number already exists.", statusCode: 409 };
    }

    const batchResult = await getOpenTellerBatch(user);

    if (batchResult.error) {
      await connection.rollback();
      return batchResult;
    }

    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS countValue
       FROM savings_withdrawals
       WHERE YEAR(created_at) = YEAR(CURRENT_DATE)`
    );
    const withdrawalNo = `SW-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;

    await connection.execute(
      `INSERT INTO savings_withdrawals (
         withdrawal_no, batch_no, member_no, member_name, amount, reference_no, released_by, status
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Teller Batch')`,
      [withdrawalNo, batchResult.batch.id, member.id, member.name, input.amount, input.referenceNo, user.username]
    );

    await connection.execute(
      `UPDATE members
       SET savings_balance = savings_balance - ?
       WHERE member_no = ?`,
      [input.amount, member.id]
    );

    await connection.commit();

    return {
      withdrawal: {
        id: withdrawalNo,
        memberId: member.id,
        memberName: member.name,
        amount: input.amount,
        referenceNo: input.referenceNo,
        releasedBy: user.username,
        status: "Teller Batch",
        batchId: batchResult.batch.id
      },
      member: {
        ...member,
        savings: subtractMoney(member.savings, input.amount)
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function postInitialPayment(paymentId, user) {
  const db = await getPool();

  if (!db) {
    const payment = initialPayments.find((item) => item.id === paymentId);

    if (!payment) {
      return { error: "Initial payment was not found.", statusCode: 404 };
    }

    if (payment.status !== "Teller Batch") {
      return { error: "Only teller batch payments can be posted.", statusCode: 409 };
    }

    const batchResult = await ensureTellerBatchReviewedForPosting(payment.batchId);

    if (batchResult.error) {
      return batchResult;
    }

    const entry = {
      id: nextJournalEntryNumber(),
      sourceType: "Initial Member Payment",
      sourceNo: payment.id,
      description: `Initial member payment - ${payment.memberName}`,
      postedBy: user.username,
      postedAt: new Date().toISOString(),
      lines: buildInitialPaymentJournalLines(payment)
    };

    payment.status = "Posted";
    payment.postedBy = user.username;
    payment.postedEntryNo = entry.id;
    journalEntries.unshift(entry);

    return { payment, entry };
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [paymentRows] = await connection.execute(
      `SELECT payment_no AS id, batch_no AS batchId, member_no AS memberId, member_name AS memberName,
              share_capital_amount AS shareCapitalAmount, membership_fee_amount AS membershipFeeAmount,
              savings_deposit_amount AS savingsDepositAmount, cash_received AS cashReceived,
              reference_no AS referenceNo, received_by AS receivedBy, status
       FROM initial_member_payments
       WHERE payment_no = ?
       FOR UPDATE`,
      [paymentId]
    );
    const payment = paymentRows[0];

    if (!payment) {
      await connection.rollback();
      return { error: "Initial payment was not found.", statusCode: 404 };
    }

    if (payment.status !== "Teller Batch") {
      await connection.rollback();
      return { error: "Only teller batch payments can be posted.", statusCode: 409 };
    }

    const batchResult = await ensureTellerBatchReviewedForPosting(payment.batchId, connection);

    if (batchResult.error) {
      await connection.rollback();
      return batchResult;
    }

    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS countValue
       FROM journal_entries
       WHERE YEAR(posted_at) = YEAR(CURRENT_DATE)`
    );
    const entryNo = `JE-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;

    await connection.execute(
      `INSERT INTO journal_entries (
         entry_no, source_type, source_no, description, posted_by
       )
       VALUES (?, 'Initial Member Payment', ?, ?, ?)`,
      [entryNo, payment.id, `Initial member payment - ${payment.memberName}`, user.username]
    );

    const lines = buildInitialPaymentJournalLines(payment);

    for (const line of lines) {
      await connection.execute(
        `INSERT INTO journal_entry_lines (
           entry_no, account_code, account_name, debit, credit
         )
         VALUES (?, ?, ?, ?, ?)`,
        [entryNo, line.accountCode, line.accountName, line.debit, line.credit]
      );
    }

    await connection.execute(
      `UPDATE initial_member_payments
       SET status = 'Posted', posted_by = ?, posted_entry_no = ?, posted_at = CURRENT_TIMESTAMP
       WHERE payment_no = ?`,
      [user.username, entryNo, payment.id]
    );

    await connection.commit();

    return {
      payment: {
        ...payment,
        status: "Posted",
        postedBy: user.username,
        postedEntryNo: entryNo
      },
      entry: {
        id: entryNo,
        sourceType: "Initial Member Payment",
        sourceNo: payment.id,
        description: `Initial member payment - ${payment.memberName}`,
        postedBy: user.username,
        postedAt: new Date().toISOString(),
        lines
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function postSavingsDeposit(depositId, user) {
  const db = await getPool();

  if (!db) {
    const deposit = savingsDeposits.find((item) => item.id === depositId);

    if (!deposit) {
      return { error: "Savings deposit was not found.", statusCode: 404 };
    }

    if (deposit.status !== "Teller Batch") {
      return { error: "Only teller batch savings deposits can be posted.", statusCode: 409 };
    }

    const batchResult = await ensureTellerBatchReviewedForPosting(deposit.batchId);

    if (batchResult.error) {
      return batchResult;
    }

    const entry = {
      id: nextJournalEntryNumber(),
      sourceType: "Savings Deposit",
      sourceNo: deposit.id,
      description: `Savings deposit - ${deposit.memberName}`,
      postedBy: user.username,
      postedAt: new Date().toISOString(),
      lines: buildSavingsDepositJournalLines(deposit)
    };

    deposit.status = "Posted";
    deposit.postedBy = user.username;
    deposit.postedEntryNo = entry.id;
    journalEntries.unshift(entry);

    return { deposit, entry };
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [depositRows] = await connection.execute(
      `SELECT deposit_no AS id, batch_no AS batchId, member_no AS memberId, member_name AS memberName,
              amount, cash_received AS cashReceived, reference_no AS referenceNo,
              received_by AS receivedBy, status
       FROM savings_deposits
       WHERE deposit_no = ?
       FOR UPDATE`,
      [depositId]
    );
    const deposit = depositRows[0];

    if (!deposit) {
      await connection.rollback();
      return { error: "Savings deposit was not found.", statusCode: 404 };
    }

    if (deposit.status !== "Teller Batch") {
      await connection.rollback();
      return { error: "Only teller batch savings deposits can be posted.", statusCode: 409 };
    }

    const batchResult = await ensureTellerBatchReviewedForPosting(deposit.batchId, connection);

    if (batchResult.error) {
      await connection.rollback();
      return batchResult;
    }

    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS countValue
       FROM journal_entries
       WHERE YEAR(posted_at) = YEAR(CURRENT_DATE)`
    );
    const entryNo = `JE-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;

    await connection.execute(
      `INSERT INTO journal_entries (
         entry_no, source_type, source_no, description, posted_by
       )
       VALUES (?, 'Savings Deposit', ?, ?, ?)`,
      [entryNo, deposit.id, `Savings deposit - ${deposit.memberName}`, user.username]
    );

    const lines = buildSavingsDepositJournalLines(deposit);

    for (const line of lines) {
      await connection.execute(
        `INSERT INTO journal_entry_lines (
           entry_no, account_code, account_name, debit, credit
         )
         VALUES (?, ?, ?, ?, ?)`,
        [entryNo, line.accountCode, line.accountName, line.debit, line.credit]
      );
    }

    await connection.execute(
      `UPDATE savings_deposits
       SET status = 'Posted', posted_by = ?, posted_entry_no = ?, posted_at = CURRENT_TIMESTAMP
       WHERE deposit_no = ?`,
      [user.username, entryNo, deposit.id]
    );

    await connection.commit();

    return {
      deposit: {
        ...deposit,
        status: "Posted",
        postedBy: user.username,
        postedEntryNo: entryNo
      },
      entry: {
        id: entryNo,
        sourceType: "Savings Deposit",
        sourceNo: deposit.id,
        description: `Savings deposit - ${deposit.memberName}`,
        postedBy: user.username,
        postedAt: new Date().toISOString(),
        lines
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function postShareCapitalContribution(contributionId, user) {
  const db = await getPool();

  if (!db) {
    const contribution = shareCapitalContributions.find((item) => item.id === contributionId);

    if (!contribution) {
      return { error: "Share capital contribution was not found.", statusCode: 404 };
    }

    if (contribution.status !== "Teller Batch") {
      return { error: "Only teller batch share capital contributions can be posted.", statusCode: 409 };
    }

    const batchResult = await ensureTellerBatchReviewedForPosting(contribution.batchId);

    if (batchResult.error) {
      return batchResult;
    }

    const entry = {
      id: nextJournalEntryNumber(),
      sourceType: "Share Capital Contribution",
      sourceNo: contribution.id,
      description: `Share capital contribution - ${contribution.memberName}`,
      postedBy: user.username,
      postedAt: new Date().toISOString(),
      lines: buildShareCapitalContributionJournalLines(contribution)
    };

    contribution.status = "Posted";
    contribution.postedBy = user.username;
    contribution.postedEntryNo = entry.id;
    journalEntries.unshift(entry);

    return { contribution, entry };
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [contributionRows] = await connection.execute(
      `SELECT contribution_no AS id, batch_no AS batchId, member_no AS memberId, member_name AS memberName,
              amount, cash_received AS cashReceived, reference_no AS referenceNo,
              received_by AS receivedBy, status
       FROM share_capital_contributions
       WHERE contribution_no = ?
       FOR UPDATE`,
      [contributionId]
    );
    const contribution = contributionRows[0];

    if (!contribution) {
      await connection.rollback();
      return { error: "Share capital contribution was not found.", statusCode: 404 };
    }

    if (contribution.status !== "Teller Batch") {
      await connection.rollback();
      return { error: "Only teller batch share capital contributions can be posted.", statusCode: 409 };
    }

    const batchResult = await ensureTellerBatchReviewedForPosting(contribution.batchId, connection);

    if (batchResult.error) {
      await connection.rollback();
      return batchResult;
    }

    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS countValue
       FROM journal_entries
       WHERE YEAR(posted_at) = YEAR(CURRENT_DATE)`
    );
    const entryNo = `JE-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;

    await connection.execute(
      `INSERT INTO journal_entries (
         entry_no, source_type, source_no, description, posted_by
       )
       VALUES (?, 'Share Capital Contribution', ?, ?, ?)`,
      [entryNo, contribution.id, `Share capital contribution - ${contribution.memberName}`, user.username]
    );

    const lines = buildShareCapitalContributionJournalLines(contribution);

    for (const line of lines) {
      await connection.execute(
        `INSERT INTO journal_entry_lines (
           entry_no, account_code, account_name, debit, credit
         )
         VALUES (?, ?, ?, ?, ?)`,
        [entryNo, line.accountCode, line.accountName, line.debit, line.credit]
      );
    }

    await connection.execute(
      `UPDATE share_capital_contributions
       SET status = 'Posted', posted_by = ?, posted_entry_no = ?, posted_at = CURRENT_TIMESTAMP
       WHERE contribution_no = ?`,
      [user.username, entryNo, contribution.id]
    );

    await connection.commit();

    return {
      contribution: {
        ...contribution,
        status: "Posted",
        postedBy: user.username,
        postedEntryNo: entryNo
      },
      entry: {
        id: entryNo,
        sourceType: "Share Capital Contribution",
        sourceNo: contribution.id,
        description: `Share capital contribution - ${contribution.memberName}`,
        postedBy: user.username,
        postedAt: new Date().toISOString(),
        lines
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function postSavingsWithdrawal(withdrawalId, user) {
  const db = await getPool();

  if (!db) {
    const withdrawal = savingsWithdrawals.find((item) => item.id === withdrawalId);

    if (!withdrawal) {
      return { error: "Savings withdrawal was not found.", statusCode: 404 };
    }

    if (withdrawal.status !== "Teller Batch") {
      return { error: "Only teller batch savings withdrawals can be posted.", statusCode: 409 };
    }

    const batchResult = await ensureTellerBatchReviewedForPosting(withdrawal.batchId);

    if (batchResult.error) {
      return batchResult;
    }

    const entry = {
      id: nextJournalEntryNumber(),
      sourceType: "Savings Withdrawal",
      sourceNo: withdrawal.id,
      description: `Savings withdrawal - ${withdrawal.memberName}`,
      postedBy: user.username,
      postedAt: new Date().toISOString(),
      lines: buildSavingsWithdrawalJournalLines(withdrawal)
    };

    withdrawal.status = "Posted";
    withdrawal.postedBy = user.username;
    withdrawal.postedEntryNo = entry.id;
    journalEntries.unshift(entry);

    return { withdrawal, entry };
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [withdrawalRows] = await connection.execute(
      `SELECT withdrawal_no AS id, batch_no AS batchId, member_no AS memberId, member_name AS memberName,
              amount, reference_no AS referenceNo, released_by AS releasedBy, status
       FROM savings_withdrawals
       WHERE withdrawal_no = ?
       FOR UPDATE`,
      [withdrawalId]
    );
    const withdrawal = withdrawalRows[0];

    if (!withdrawal) {
      await connection.rollback();
      return { error: "Savings withdrawal was not found.", statusCode: 404 };
    }

    if (withdrawal.status !== "Teller Batch") {
      await connection.rollback();
      return { error: "Only teller batch savings withdrawals can be posted.", statusCode: 409 };
    }

    const batchResult = await ensureTellerBatchReviewedForPosting(withdrawal.batchId, connection);

    if (batchResult.error) {
      await connection.rollback();
      return batchResult;
    }

    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS countValue
       FROM journal_entries
       WHERE YEAR(posted_at) = YEAR(CURRENT_DATE)`
    );
    const entryNo = `JE-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;

    await connection.execute(
      `INSERT INTO journal_entries (
         entry_no, source_type, source_no, description, posted_by
       )
       VALUES (?, 'Savings Withdrawal', ?, ?, ?)`,
      [entryNo, withdrawal.id, `Savings withdrawal - ${withdrawal.memberName}`, user.username]
    );

    const lines = buildSavingsWithdrawalJournalLines(withdrawal);

    for (const line of lines) {
      await connection.execute(
        `INSERT INTO journal_entry_lines (
           entry_no, account_code, account_name, debit, credit
         )
         VALUES (?, ?, ?, ?, ?)`,
        [entryNo, line.accountCode, line.accountName, line.debit, line.credit]
      );
    }

    await connection.execute(
      `UPDATE savings_withdrawals
       SET status = 'Posted', posted_by = ?, posted_entry_no = ?, posted_at = CURRENT_TIMESTAMP
       WHERE withdrawal_no = ?`,
      [user.username, entryNo, withdrawal.id]
    );

    await connection.commit();

    return {
      withdrawal: {
        ...withdrawal,
        status: "Posted",
        postedBy: user.username,
        postedEntryNo: entryNo
      },
      entry: {
        id: entryNo,
        sourceType: "Savings Withdrawal",
        sourceNo: withdrawal.id,
        description: `Savings withdrawal - ${withdrawal.memberName}`,
        postedBy: user.username,
        postedAt: new Date().toISOString(),
        lines
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function postLoanRelease(releaseId, user) {
  const db = await getPool();

  if (!db) {
    const release = loanReleases.find((item) => item.releaseNo === releaseId);
    if (!release) {
      return { error: "Loan release was not found.", statusCode: 404 };
    }
    if (release.status !== "Teller Batch") {
      return { error: "Only teller batch loan releases can be posted.", statusCode: 409 };
    }
    const batchResult = await ensureTellerBatchReviewedForPosting(release.batchId);
    if (batchResult.error) {
      return batchResult;
    }
    const loan = loans.find((item) => item.loanNo === release.loanNo);
    const application = loanApplications.find((item) => item.applicationNo === loan?.applicationNo);
    if (!loan || !application) {
      return { error: "Loan accounting snapshot was not found.", statusCode: 409 };
    }
    const accountingRelease = {
      ...release,
      loansReceivableAccount: application.loansReceivableAccount,
      processingFeeAccount: application.processingFeeAccount,
      cashAccount: application.cashAccount
    };
    const entry = {
      id: nextJournalEntryNumber(),
      sourceType: "Loan Release",
      sourceNo: release.releaseNo,
      description: `Loan release - ${release.memberName} (${release.loanNo})`,
      postedBy: user.username,
      postedAt: new Date().toISOString(),
      lines: buildLoanReleaseJournalLines(accountingRelease)
    };
    release.status = "Posted";
    release.postedBy = user.username;
    release.postedEntryNo = entry.id;
    release.postedAt = entry.postedAt;
    loan.status = "Posted";
    application.status = "Posted";
    application.updatedAt = entry.postedAt;
    journalEntries.unshift(entry);
    return { release: mapLoanRelease(release), entry };
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [releaseRows] = await connection.execute(
      `SELECT lr.release_no AS releaseNo, lr.loan_no AS loanNo,
              lr.batch_no AS batchId, lr.member_no AS memberNo,
              lr.member_name AS memberName, lr.principal,
              lr.processing_fee AS processingFee,
              lr.net_proceeds AS netProceeds,
              lr.cash_released AS cashReleased, lr.reference_no AS referenceNo,
              lr.status, loan.application_no AS applicationNo,
              application.loans_receivable_account AS loansReceivableAccount,
              application.processing_fee_account AS processingFeeAccount,
              application.cash_account AS cashAccount
       FROM loan_releases lr
       JOIN loans loan ON loan.loan_no = lr.loan_no
       JOIN loan_applications application ON application.application_no = loan.application_no
       WHERE lr.release_no = ?
       LIMIT 1
       FOR UPDATE OF lr`,
      [releaseId]
    );
    const release = releaseRows[0];
    if (!release) {
      await connection.rollback();
      return { error: "Loan release was not found.", statusCode: 404 };
    }
    if (release.status !== "Teller Batch") {
      await connection.rollback();
      return { error: "Only teller batch loan releases can be posted.", statusCode: 409 };
    }
    const batchResult = await ensureTellerBatchReviewedForPosting(release.batchId, connection);
    if (batchResult.error) {
      await connection.rollback();
      return batchResult;
    }
    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS countValue
       FROM journal_entries
       WHERE YEAR(posted_at) = YEAR(CURRENT_DATE)`
    );
    const entryNo = `JE-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;
    await connection.execute(
      `INSERT INTO journal_entries (
         entry_no, source_type, source_no, description, posted_by
       ) VALUES (?, 'Loan Release', ?, ?, ?)`,
      [entryNo, release.releaseNo, `Loan release - ${release.memberName} (${release.loanNo})`, user.username]
    );
    const lines = buildLoanReleaseJournalLines(release);
    for (const line of lines) {
      await connection.execute(
        `INSERT INTO journal_entry_lines (
           entry_no, account_code, account_name, debit, credit
         ) VALUES (?, ?, ?, ?, ?)`,
        [entryNo, line.accountCode, line.accountName, line.debit, line.credit]
      );
    }
    await connection.execute(
      `UPDATE loan_releases
       SET status = 'Posted', posted_by = ?, posted_entry_no = ?, posted_at = CURRENT_TIMESTAMP
       WHERE release_no = ?`,
      [user.username, entryNo, release.releaseNo]
    );
    await connection.execute(`UPDATE loans SET status = 'Posted' WHERE loan_no = ?`, [release.loanNo]);
    await connection.execute(
      `UPDATE loan_applications SET status = 'Posted', updated_at = CURRENT_TIMESTAMP
       WHERE application_no = ?`,
      [release.applicationNo]
    );
    await connection.commit();
    return {
      release: {
        ...mapLoanRelease(release),
        status: "Posted",
        postedBy: user.username,
        postedEntryNo: entryNo,
        postedAt: new Date().toISOString()
      },
      entry: {
        id: entryNo,
        sourceType: "Loan Release",
        sourceNo: release.releaseNo,
        description: `Loan release - ${release.memberName} (${release.loanNo})`,
        postedBy: user.username,
        postedAt: new Date().toISOString(),
        lines
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function postLoanCollection(collectionNo, user) {
  const db = await getPool();

  if (!db) {
    const collection = loanCollections.find((item) => item.collectionNo === collectionNo);
    if (!collection) {
      return { error: "Loan collection was not found.", statusCode: 404 };
    }
    if (collection.status !== "Teller Batch") {
      return { error: "Only teller batch loan collections can be posted.", statusCode: 409 };
    }
    const batchResult = await ensureTellerBatchReviewedForPosting(collection.batchId);
    if (batchResult.error) {
      return batchResult;
    }
    const loan = loans.find((item) => item.loanNo === collection.loanNo);
    const application = loanApplications.find((item) => item.applicationNo === loan?.applicationNo);
    if (!loan || !application) {
      return { error: "Loan accounting snapshot was not found.", statusCode: 409 };
    }
    const accountingCollection = {
      ...collection,
      loansReceivableAccount: application.loansReceivableAccount,
      interestIncomeAccount: application.interestIncomeAccount,
      cashAccount: application.cashAccount
    };
    const entry = {
      id: nextJournalEntryNumber(),
      sourceType: "Loan Collection",
      sourceNo: collection.collectionNo,
      description: `Loan collection - ${collection.memberName} (${collection.loanNo})`,
      postedBy: user.username,
      postedAt: new Date().toISOString(),
      lines: buildLoanCollectionJournalLines(accountingCollection)
    };
    collection.status = "Posted";
    collection.postedBy = user.username;
    collection.postedEntryNo = entry.id;
    collection.postedAt = entry.postedAt;
    journalEntries.unshift(entry);
    return { collection: mapLoanCollection(collection), entry };
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [collectionRows] = await connection.execute(
      `SELECT collection.collection_no AS collectionNo,
              collection.loan_no AS loanNo,
              collection.installment_no AS installmentNo,
              collection.batch_no AS batchId,
              collection.member_no AS memberNo,
              collection.member_name AS memberName,
              collection.principal_amount AS principalAmount,
              collection.interest_amount AS interestAmount,
              collection.amount_received AS amountReceived,
              collection.status,
              application.loans_receivable_account AS loansReceivableAccount,
              application.interest_income_account AS interestIncomeAccount,
              application.cash_account AS cashAccount
       FROM loan_collections collection
       JOIN loans loan ON loan.loan_no = collection.loan_no
       JOIN loan_applications application ON application.application_no = loan.application_no
       WHERE collection.collection_no = ?
       LIMIT 1
       FOR UPDATE OF collection`,
      [collectionNo]
    );
    const collection = collectionRows[0];
    if (!collection) {
      await connection.rollback();
      return { error: "Loan collection was not found.", statusCode: 404 };
    }
    if (collection.status !== "Teller Batch") {
      await connection.rollback();
      return { error: "Only teller batch loan collections can be posted.", statusCode: 409 };
    }
    const batchResult = await ensureTellerBatchReviewedForPosting(collection.batchId, connection);
    if (batchResult.error) {
      await connection.rollback();
      return batchResult;
    }
    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS countValue
       FROM journal_entries
       WHERE YEAR(posted_at) = YEAR(CURRENT_DATE)`
    );
    const entryNo = `JE-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;
    await connection.execute(
      `INSERT INTO journal_entries (
         entry_no, source_type, source_no, description, posted_by
       ) VALUES (?, 'Loan Collection', ?, ?, ?)`,
      [
        entryNo,
        collection.collectionNo,
        `Loan collection - ${collection.memberName} (${collection.loanNo})`,
        user.username
      ]
    );
    const lines = buildLoanCollectionJournalLines(collection);
    for (const line of lines) {
      await connection.execute(
        `INSERT INTO journal_entry_lines (
           entry_no, account_code, account_name, debit, credit
         ) VALUES (?, ?, ?, ?, ?)`,
        [entryNo, line.accountCode, line.accountName, line.debit, line.credit]
      );
    }
    await connection.execute(
      `UPDATE loan_collections
       SET status = 'Posted', posted_by = ?, posted_entry_no = ?, posted_at = CURRENT_TIMESTAMP
       WHERE collection_no = ?`,
      [user.username, entryNo, collection.collectionNo]
    );
    await connection.commit();
    return {
      collection: {
        ...mapLoanCollection(collection),
        status: "Posted",
        postedBy: user.username,
        postedEntryNo: entryNo,
        postedAt: new Date().toISOString()
      },
      entry: {
        id: entryNo,
        sourceType: "Loan Collection",
        sourceNo: collection.collectionNo,
        description: `Loan collection - ${collection.memberName} (${collection.loanNo})`,
        postedBy: user.username,
        postedAt: new Date().toISOString(),
        lines
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function postTellerFunding(fundingNo, user) {
  const db = await getPool();

  if (!db) {
    const funding = tellerFundings.find((item) => item.fundingNo === fundingNo);
    if (!funding) {
      return { error: "Teller funding was not found.", statusCode: 404 };
    }
    if (funding.status !== "Acknowledged" || funding.postedEntryNo) {
      return { error: "Only unposted acknowledged teller funding can be posted.", statusCode: 409 };
    }
    if (funding.sourceAccountCode === "1010") {
      return { error: "Funding source cannot be the Cash on Hand account.", statusCode: 409 };
    }
    const batchResult = await ensureTellerBatchReviewedForPosting(funding.batchId);
    if (batchResult.error) {
      return batchResult;
    }
    const entry = {
      id: nextJournalEntryNumber(),
      sourceType: "Teller Cash Funding",
      sourceNo: funding.fundingNo,
      description: `Teller cash funding - ${funding.tellerUsername}`,
      postedBy: user.username,
      postedAt: new Date().toISOString(),
      lines: buildTellerFundingJournalLines(funding)
    };
    funding.postedBy = user.username;
    funding.postedEntryNo = entry.id;
    funding.postedAt = entry.postedAt;
    journalEntries.unshift(entry);
    return { funding: mapTellerFunding(funding), entry };
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [fundingRows] = await connection.execute(
      `SELECT funding_no AS fundingNo, batch_no AS batchId,
              teller_username AS tellerUsername, amount,
              source_account_code AS sourceAccountCode,
              source_account_name AS sourceAccountName, status,
              COALESCE(posted_entry_no, '') AS postedEntryNo
       FROM teller_fundings
       WHERE funding_no = ?
       LIMIT 1
       FOR UPDATE`,
      [fundingNo]
    );
    const funding = fundingRows[0];
    if (!funding) {
      await connection.rollback();
      return { error: "Teller funding was not found.", statusCode: 404 };
    }
    if (funding.status !== "Acknowledged" || funding.postedEntryNo) {
      await connection.rollback();
      return { error: "Only unposted acknowledged teller funding can be posted.", statusCode: 409 };
    }
    if (funding.sourceAccountCode === "1010") {
      await connection.rollback();
      return { error: "Funding source cannot be the Cash on Hand account.", statusCode: 409 };
    }
    const batchResult = await ensureTellerBatchReviewedForPosting(funding.batchId, connection);
    if (batchResult.error) {
      await connection.rollback();
      return batchResult;
    }
    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS countValue
       FROM journal_entries
       WHERE YEAR(posted_at) = YEAR(CURRENT_DATE)`
    );
    const entryNo = `JE-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;
    await connection.execute(
      `INSERT INTO journal_entries (
         entry_no, source_type, source_no, description, posted_by
       ) VALUES (?, 'Teller Cash Funding', ?, ?, ?)`,
      [entryNo, funding.fundingNo, `Teller cash funding - ${funding.tellerUsername}`, user.username]
    );
    const lines = buildTellerFundingJournalLines(funding);
    for (const line of lines) {
      await connection.execute(
        `INSERT INTO journal_entry_lines (
           entry_no, account_code, account_name, debit, credit
         ) VALUES (?, ?, ?, ?, ?)`,
        [entryNo, line.accountCode, line.accountName, line.debit, line.credit]
      );
    }
    await connection.execute(
      `UPDATE teller_fundings
       SET posted_by = ?, posted_entry_no = ?, posted_at = CURRENT_TIMESTAMP
       WHERE funding_no = ?`,
      [user.username, entryNo, funding.fundingNo]
    );
    await connection.commit();
    return {
      funding: {
        ...mapTellerFunding(funding),
        postedBy: user.username,
        postedEntryNo: entryNo,
        postedAt: new Date().toISOString()
      },
      entry: {
        id: entryNo,
        sourceType: "Teller Cash Funding",
        sourceNo: funding.fundingNo,
        description: `Teller cash funding - ${funding.tellerUsername}`,
        postedBy: user.username,
        postedAt: new Date().toISOString(),
        lines
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function postTellerBatchRow(row, user) {
  if (row.batchType === "Savings Deposit") {
    return postSavingsDeposit(row.id, user);
  }

  if (row.batchType === "Share Capital Contribution") {
    return postShareCapitalContribution(row.id, user);
  }

  if (row.batchType === "Savings Withdrawal") {
    return postSavingsWithdrawal(row.id, user);
  }

  if (row.batchType === "Loan Release") {
    return postLoanRelease(row.id, user);
  }

  if (row.batchType === "Loan Collection") {
    return postLoanCollection(row.id, user);
  }

  return postInitialPayment(row.id, user);
}

async function postReviewedTellerBatch(batchId, user) {
  const batchResult = await ensureTellerBatchReviewedForPosting(batchId);

  if (batchResult.error) {
    return batchResult;
  }

  const fundings = (await listTellerFundings()).filter(
    (funding) =>
      funding.batchId === batchId &&
      funding.status === "Acknowledged" &&
      !funding.postedEntryNo
  );
  const rows = await listTellerBatchRows(batchId);

  if (rows.length === 0 && fundings.length === 0) {
    return {
      batch: batchResult.batch,
      postedCount: 0,
      fundingPostedCount: 0,
      transactionPostedCount: 0,
      entries: [],
      results: [],
      message: "All transactions and acknowledged funding in this batch are already posted."
    };
  }

  const results = [];

  for (const funding of fundings) {
    const result = await postTellerFunding(funding.fundingNo, user);
    if (result.error) {
      return result;
    }
    results.push({
      id: funding.fundingNo,
      batchType: "Teller Cash Funding",
      memberName: funding.tellerUsername,
      entry: result.entry
    });
  }

  for (const row of rows) {
    const result = await postTellerBatchRow(row, user);

    if (result.error) {
      return result;
    }

    const entry = result.entry;
    results.push({
      id: row.id,
      batchType: row.batchType,
      memberName: row.memberName,
      entry
    });
  }

  return {
    batch: batchResult.batch,
    postedCount: results.length,
    fundingPostedCount: fundings.length,
    transactionPostedCount: rows.length,
    entries: results.map((result) => result.entry),
    results
  };
}

async function submitTellerCashCount(input, user) {
  const batch = await getCurrentTellerBatch(user);
  const tellerBatchRows = await listTellerBatchRows(batch.id);
  const summary = buildTellerBatchSummary(tellerBatchRows);
  const openingFunding = await getAcknowledgedFundingTotal(batch.id);

  if (summary.transactionCount === 0) {
    return { error: "There are no unposted teller transactions to count.", statusCode: 409 };
  }

  if (batch.status !== "Open") {
    return { error: "Only an open teller batch can be submitted for cash count.", statusCode: 409 };
  }

  const cashCount = {
    id: nextTellerCashCountNumber(),
    batchId: batch.id,
    expectedCash: addMoney(openingFunding, summary.netCash),
    actualCash: input.actualCash,
    variance: subtractMoney(input.actualCash, addMoney(openingFunding, summary.netCash)),
    transactionCount: summary.transactionCount,
    submittedBy: user.username,
    status: "Submitted",
    submittedAt: new Date().toISOString()
  };

  const db = await getPool();

  if (!db) {
    batch.status = "Submitted";
    batch.submittedAt = cashCount.submittedAt;
    batch.expectedCash = cashCount.expectedCash;
    batch.actualCash = cashCount.actualCash;
    batch.variance = cashCount.variance;
    batch.transactionCount = cashCount.transactionCount;
    tellerCashCounts.unshift(cashCount);
    return { cashCount, batch };
  }

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS countValue
     FROM teller_cash_counts
     WHERE YEAR(submitted_at) = YEAR(CURRENT_DATE)`
  );
  const countNo = `TC-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;

  await db.execute(
    `INSERT INTO teller_cash_counts (
       count_no, batch_no, expected_cash, actual_cash, variance, transaction_count, submitted_by, status
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Submitted')`,
    [
      countNo,
      batch.id,
      cashCount.expectedCash,
      cashCount.actualCash,
      cashCount.variance,
      cashCount.transactionCount,
      user.username
    ]
  );

  await db.execute(
    `UPDATE teller_batches
     SET status = 'Submitted', submitted_at = CURRENT_TIMESTAMP,
         expected_cash = ?, actual_cash = ?, variance = ?, transaction_count = ?
     WHERE batch_no = ?`,
    [cashCount.expectedCash, cashCount.actualCash, cashCount.variance, cashCount.transactionCount, batch.id]
  );

  return {
    cashCount: {
      ...cashCount,
      id: countNo
    },
    batch: {
      ...batch,
      status: "Submitted",
      expectedCash: cashCount.expectedCash,
      actualCash: cashCount.actualCash,
      variance: cashCount.variance,
      transactionCount: cashCount.transactionCount,
      submittedAt: new Date().toISOString()
    }
  };
}

function validateVarianceNote(body) {
  const varianceNote = String(body?.varianceNote || "").trim();

  if (varianceNote.length > 500) {
    return { error: "Variance note must be 500 characters or fewer." };
  }

  return { value: { varianceNote } };
}

function validateClosingNote(body) {
  const closingNote = String(body?.closingNote || "").trim();

  if (closingNote.length > 500) {
    return { error: "Closing note must be 500 characters or fewer." };
  }

  return { value: { closingNote } };
}

async function reviewTellerBatch(batchId, input, user) {
  const db = await getPool();

  if (!db) {
    const batch = tellerBatches.find((item) => item.id === batchId);

    if (!batch) {
      return { error: "Teller batch was not found.", statusCode: 404 };
    }

    if (batch.status !== "Submitted") {
      return { error: "Only submitted teller batches can be reviewed.", statusCode: 409 };
    }

    if (batch.variance !== 0 && !input.varianceNote) {
      return { error: "Variance note is required before reviewing a batch with cash variance.", statusCode: 400 };
    }

    batch.status = "Reviewed";
    batch.reviewedBy = user.username;
    batch.reviewedAt = new Date().toISOString();
    batch.varianceNote = input.varianceNote || "";
    batch.varianceNotedBy = input.varianceNote ? user.username : "";
    batch.varianceNotedAt = input.varianceNote ? batch.reviewedAt : "";

    return { batch };
  }

  const [rows] = await db.execute(
    `SELECT batch_no AS id, teller_username AS tellerUsername, status,
            opened_at AS openedAt, submitted_at AS submittedAt,
            reviewed_at AS reviewedAt, COALESCE(reviewed_by, '') AS reviewedBy,
            closed_at AS closedAt, COALESCE(closed_by, '') AS closedBy,
            COALESCE(closing_note, '') AS closingNote,
            expected_cash AS expectedCash, actual_cash AS actualCash,
            variance, transaction_count AS transactionCount,
            COALESCE(variance_note, '') AS varianceNote,
            COALESCE(variance_noted_by, '') AS varianceNotedBy,
            variance_noted_at AS varianceNotedAt
     FROM teller_batches
     WHERE batch_no = ?
     LIMIT 1`,
    [batchId]
  );
  const batch = rows[0];

  if (!batch) {
    return { error: "Teller batch was not found.", statusCode: 404 };
  }

  if (batch.status !== "Submitted") {
    return { error: "Only submitted teller batches can be reviewed.", statusCode: 409 };
  }

  if (batch.variance !== 0 && !input.varianceNote) {
    return { error: "Variance note is required before reviewing a batch with cash variance.", statusCode: 400 };
  }

  await db.execute(
    `UPDATE teller_batches
     SET status = 'Reviewed', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP,
         variance_note = ?, variance_noted_by = ?, variance_noted_at = ?
     WHERE batch_no = ?`,
    [
      user.username,
      input.varianceNote || "",
      input.varianceNote ? user.username : null,
      input.varianceNote ? new Date() : null,
      batchId
    ]
  );

  return {
    batch: {
      ...batch,
      status: "Reviewed",
      reviewedBy: user.username,
      reviewedAt: new Date().toISOString(),
      varianceNote: input.varianceNote || "",
      varianceNotedBy: input.varianceNote ? user.username : "",
      varianceNotedAt: input.varianceNote ? new Date().toISOString() : "",
      closedBy: batch.closedBy || "",
      closingNote: batch.closingNote || ""
    }
  };
}

async function closeTellerBatch(batchId, input, user) {
  const unpostedRows = await listTellerBatchRows(batchId);
  const unpostedFundings = (await listTellerFundings()).filter(
    (funding) =>
      funding.batchId === batchId &&
      funding.status === "Acknowledged" &&
      !funding.postedEntryNo
  );

  if (unpostedRows.length > 0 || unpostedFundings.length > 0) {
    return {
      error: "Post all teller batch transactions and acknowledged funding before closing the batch.",
      statusCode: 409
    };
  }

  const db = await getPool();

  if (!db) {
    const batch = tellerBatches.find((item) => item.id === batchId);

    if (!batch) {
      return { error: "Teller batch was not found.", statusCode: 404 };
    }

    if (batch.status !== "Reviewed") {
      return { error: "Only reviewed teller batches can be closed.", statusCode: 409 };
    }

    batch.status = "Closed";
    batch.closedAt = new Date().toISOString();
    batch.closedBy = user.username;
    batch.closingNote = input.closingNote || "";

    const nextBatch = {
      id: nextTellerBatchNumber(),
      tellerUsername: "teller01",
      status: "Open",
      openedAt: new Date().toISOString(),
      submittedAt: "",
      reviewedAt: "",
      reviewedBy: "",
      expectedCash: 0,
      actualCash: 0,
      variance: 0,
      transactionCount: 0,
      varianceNote: "",
      varianceNotedBy: "",
      varianceNotedAt: "",
      closedBy: "",
      closingNote: ""
    };
    tellerBatches.unshift(nextBatch);

    return { batch, nextBatch };
  }

  const [rows] = await db.execute(
    `SELECT batch_no AS id, teller_username AS tellerUsername, status,
            opened_at AS openedAt, submitted_at AS submittedAt,
            reviewed_at AS reviewedAt, COALESCE(reviewed_by, '') AS reviewedBy,
            closed_at AS closedAt, COALESCE(closed_by, '') AS closedBy,
            COALESCE(closing_note, '') AS closingNote,
            expected_cash AS expectedCash, actual_cash AS actualCash,
            variance, transaction_count AS transactionCount,
            COALESCE(variance_note, '') AS varianceNote,
            COALESCE(variance_noted_by, '') AS varianceNotedBy,
            variance_noted_at AS varianceNotedAt
     FROM teller_batches
     WHERE batch_no = ?
     LIMIT 1`,
    [batchId]
  );
  const batch = rows[0];

  if (!batch) {
    return { error: "Teller batch was not found.", statusCode: 404 };
  }

  if (batch.status !== "Reviewed") {
    return { error: "Only reviewed teller batches can be closed.", statusCode: 409 };
  }

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS countValue
     FROM teller_batches
     WHERE YEAR(opened_at) = YEAR(CURRENT_DATE)`
  );
  const nextBatchNo = `TB-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;

  await db.execute(
    `UPDATE teller_batches
     SET status = 'Closed', closed_at = CURRENT_TIMESTAMP, closed_by = ?, closing_note = ?
     WHERE batch_no = ?`,
    [user.username, input.closingNote || "", batchId]
  );

  await db.execute(
    `INSERT INTO teller_batches (batch_no, teller_username, status)
     VALUES (?, ?, 'Open')`,
    [nextBatchNo, batch.tellerUsername || "teller01"]
  );

  return {
    batch: {
      ...batch,
      status: "Closed",
      closedBy: user.username,
      closingNote: input.closingNote || "",
      closedAt: new Date().toISOString()
    },
    nextBatch: {
      id: nextBatchNo,
      tellerUsername: batch.tellerUsername || "teller01",
      status: "Open",
      openedAt: new Date().toISOString(),
      submittedAt: "",
      reviewedAt: "",
      reviewedBy: "",
      expectedCash: 0,
      actualCash: 0,
      variance: 0,
      transactionCount: 0,
      varianceNote: "",
      varianceNotedBy: "",
      varianceNotedAt: "",
      closedBy: "",
      closingNote: ""
    }
  };
}

function validateMemberApplication(body) {
  const fullName = String(body.fullName || "").trim();
  const clusterName = String(body.clusterName || "").trim();
  const contactNumber = String(body.contactNumber || "").trim();
  const initialShareCapital = Number(body.initialShareCapital || 0);

  if (!fullName) {
    return { error: "Full name is required." };
  }

  if (!clusterName) {
    return { error: "Cluster is required." };
  }

  if (!contactNumber) {
    return { error: "Contact number is required." };
  }

  if (!isMoney(initialShareCapital)) {
    return { error: "Initial share capital must have no more than two decimal places." };
  }

  return {
    value: {
      fullName,
      clusterName,
      contactNumber,
      initialShareCapital: moneyValue(initialShareCapital)
    }
  };
}

function validateInitialPayment(body) {
  const memberId = String(body.memberId || "").trim();
  const shareCapitalAmount = Number(body.shareCapitalAmount || 0);
  const membershipFeeAmount = Number(body.membershipFeeAmount || 0);
  const savingsDepositAmount = Number(body.savingsDepositAmount || 0);
  const cashReceived = Number(body.cashReceived || 0);
  const referenceNo = String(body.referenceNo || "").trim();

  if (!memberId) {
    return { error: "Member is required." };
  }

  if (!isMoney(shareCapitalAmount)) {
    return { error: "Share capital amount must have no more than two decimal places." };
  }

  if (!isMoney(membershipFeeAmount)) {
    return { error: "Membership fee must have no more than two decimal places." };
  }

  if (!isMoney(savingsDepositAmount)) {
    return { error: "Savings deposit must have no more than two decimal places." };
  }

  const totalPayment = addMoney(shareCapitalAmount, membershipFeeAmount, savingsDepositAmount);
  if (totalPayment <= 0) {
    return { error: "Payment must include share capital, membership fee, or savings." };
  }

  if (
    !isMoney(cashReceived) ||
    moneyCents(cashReceived) < moneyCents(totalPayment)
  ) {
    return { error: "Cash received must cover the total payment." };
  }

  if (!referenceNo) {
    return { error: "Official receipt or reference number is required." };
  }

  return {
    value: {
      memberId,
      shareCapitalAmount: moneyValue(shareCapitalAmount),
      membershipFeeAmount: moneyValue(membershipFeeAmount),
      savingsDepositAmount: moneyValue(savingsDepositAmount),
      cashReceived: moneyValue(cashReceived),
      referenceNo
    }
  };
}

function validateSavingsDeposit(body) {
  const memberId = String(body.memberId || "").trim();
  const amount = Number(body.amount || 0);
  const cashReceived = Number(body.cashReceived || 0);
  const referenceNo = String(body.referenceNo || "").trim();

  if (!memberId) {
    return { error: "Member is required." };
  }

  if (!isMoney(amount, { positive: true })) {
    return { error: "Savings deposit amount must be positive and have no more than two decimal places." };
  }

  if (!isMoney(cashReceived) || moneyCents(cashReceived) < moneyCents(amount)) {
    return { error: "Cash received must cover the savings deposit." };
  }

  if (!referenceNo) {
    return { error: "Official receipt or reference number is required." };
  }

  return {
    value: {
      memberId,
      amount: moneyValue(amount),
      cashReceived: moneyValue(cashReceived),
      referenceNo
    }
  };
}

function validateShareCapitalContribution(body) {
  const memberId = String(body.memberId || "").trim();
  const amount = Number(body.amount || 0);
  const cashReceived = Number(body.cashReceived || 0);
  const referenceNo = String(body.referenceNo || "").trim();

  if (!memberId) {
    return { error: "Member is required." };
  }

  if (!isMoney(amount, { positive: true })) {
    return { error: "Share capital contribution must be positive and have no more than two decimal places." };
  }

  if (!isMoney(cashReceived) || moneyCents(cashReceived) < moneyCents(amount)) {
    return { error: "Cash received must cover the share capital contribution." };
  }

  if (!referenceNo) {
    return { error: "Official receipt or reference number is required." };
  }

  return {
    value: {
      memberId,
      amount: moneyValue(amount),
      cashReceived: moneyValue(cashReceived),
      referenceNo
    }
  };
}

function validateSavingsWithdrawal(body) {
  const memberId = String(body.memberId || "").trim();
  const amount = Number(body.amount || 0);
  const referenceNo = String(body.referenceNo || "").trim();

  if (!memberId) {
    return { error: "Member is required." };
  }

  if (!isMoney(amount, { positive: true })) {
    return { error: "Savings withdrawal amount must be positive and have no more than two decimal places." };
  }

  if (!referenceNo) {
    return { error: "Withdrawal voucher or reference number is required." };
  }

  return {
    value: {
      memberId,
      amount: moneyValue(amount),
      referenceNo
    }
  };
}

function validateTellerCashCount(body) {
  const actualCash = Number(body.actualCash || 0);

  if (!isMoney(actualCash)) {
    return { error: "Actual cash counted must have no more than two decimal places." };
  }

  return {
    value: {
      actualCash: moneyValue(actualCash)
    }
  };
}

function hasPermission(user, permission) {
  return Array.isArray(user?.permissions) && user.permissions.includes(permission);
}

function isAdminUser(user) {
  return user?.username === "admin" && user?.role === "System Administrator";
}

async function requireAdminDatabase(user) {
  if (!user) {
    return { error: "Login required", statusCode: 401 };
  }

  if (!isAdminUser(user)) {
    return { error: "Admin access required", statusCode: 403 };
  }

  const db = await getPool();

  if (!db) {
    return { error: "Demo maintenance requires Postgres mode.", statusCode: 409 };
  }

  return { db };
}

async function getDemoMaintenanceStatus() {
  const db = await getPool();

  if (!db) {
    return {
      database: "seed-memory",
      resetAvailable: false,
      tables: []
    };
  }

  const tables = [];

  for (const table of persistedTables) {
    const [rows] = await db.execute(`SELECT COUNT(*) AS countValue FROM ${table}`);
    tables.push({ name: table, count: rows[0]?.countValue || 0 });
  }

  return {
    database: "postgres",
    resetAvailable: true,
    tables
  };
}

async function buildDemoBackup() {
  const db = await getPool();
  const backup = {
    app: "TASETEMCO",
    engine: db ? "postgres" : "seed-memory",
    backedUpAt: new Date().toISOString(),
    tables: {}
  };

  if (!db) {
    return backup;
  }

  for (const table of persistedTables) {
    const [rows] = await db.execute(`SELECT * FROM ${table}`);
    backup.tables[table] = rows;
  }

  return backup;
}

async function resetDemoDatabase() {
  const db = await getPool();

  if (!db || !schemaSqlPath || !seedSqlPath) {
    return { error: "Demo reset is not available in this environment.", statusCode: 409 };
  }

  await db.query(fs.readFileSync(schemaSqlPath, "utf8"));
  await db.query(`TRUNCATE TABLE ${persistedTables.join(", ")} RESTART IDENTITY CASCADE`);
  await db.query(fs.readFileSync(seedSqlPath, "utf8"));

  return { ok: true, resetAt: new Date().toISOString() };
}

async function checkSchemaStatus(db) {
  if (!db) {
    return { status: "not-applicable", missing: [] };
  }

  const missing = [];

  for (const [tableName, columns] of Object.entries(requiredSchemaColumns)) {
    const [rows] = await db.execute(
      `SELECT column_name AS columnName
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = ?`,
      [tableName]
    );
    const existingColumns = new Set(rows.map((row) => row.columnName));

    for (const column of columns) {
      if (!existingColumns.has(column)) {
        missing.push(`${tableName}.${column}`);
      }
    }
  }

  return {
    status: missing.length === 0 ? "ok" : "missing-columns",
    missing
  };
}

app.get("/api/health", async (request, response) => {
  const db = await getPool();
  let database = "seed-memory";
  let schema = { status: "not-applicable", missing: [] };

  if (db) {
    await db.query("SELECT 1 AS ok");
    database = "postgres";
    schema = await checkSchemaStatus(db);
  }

  response.json({
    ok: schema.status !== "missing-columns",
    app: "TASETEMCO",
    stack: "react-chakra-postgres-spike",
    database,
    schema: schema.status,
    missingSchema: schema.missing
  });
});

app.post("/api/login", async (request, response) => {
  const username = String(request.body.username || "").trim();
  const password = String(request.body.password || "");
  const user = await findUser(username);

  if (!user || password !== defaultPassword) {
    response.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const signedInUser = publicUser(user);
  setSession(response, signedInUser);
  response.json({ user: signedInUser });
});

app.post("/api/logout", (request, response) => {
  clearSession(request, response);
  response.json({ ok: true });
});

app.get("/api/me", (request, response) => {
  response.json({ user: parseSession(request) });
});

app.get("/api/dashboard", (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  response.json(dashboard);
});

app.get("/api/loan-products", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "loans:products:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listLoanProducts());
});

app.post("/api/loan-products", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "loans:products:manage")) {
    response.status(403).json({ error: "Admin access required" });
    return;
  }

  const validation = validateLoanProductInput(request.body);
  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  const result = await createLoanProduct(validation.value);
  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.status(201).json(result);
});

app.patch("/api/loan-products/:code", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "loans:products:manage")) {
    response.status(403).json({ error: "Admin access required" });
    return;
  }

  const validation = validateLoanProductInput({
    ...request.body,
    code: request.params.code
  });
  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  const result = await updateLoanProduct(request.params.code, validation.value);
  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.get("/api/loan-applications", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "loans:applications:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listLoanApplications());
});

app.post("/api/loan-applications", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "loans:applications:create")) {
    response.status(403).json({ error: "Loan Officer access required" });
    return;
  }

  const validation = await validateLoanApplicationInput(request.body);
  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  const result = await createLoanApplication(validation.value, user);
  response.status(201).json(result);
});

app.patch("/api/loan-applications/:applicationNo", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "loans:applications:edit")) {
    response.status(403).json({ error: "Loan Officer access required" });
    return;
  }

  const validation = await validateLoanApplicationInput(request.body);
  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  const result = await updateLoanApplication(request.params.applicationNo, validation.value, user);
  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.post("/api/loan-applications/:applicationNo/submit", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "loans:applications:submit")) {
    response.status(403).json({ error: "Loan Officer access required" });
    return;
  }

  const result = await submitLoanApplication(request.params.applicationNo, user);
  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.post("/api/loan-applications/:applicationNo/decision", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "loans:applications:decide")) {
    response.status(403).json({ error: "Credit Committee / Approver access required" });
    return;
  }

  const result = await decideLoanApplication(request.params.applicationNo, request.body, user);
  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.get("/api/loans", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (
    !hasPermission(user, "loans:computations:view") &&
    !hasPermission(user, "loans:releases:view") &&
    !hasPermission(user, "loans:collections:view")
  ) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listLoans());
});

app.post("/api/loan-applications/:applicationNo/computation-preview", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "loans:computations:create")) {
    response.status(403).json({ error: "Loan Officer access required" });
    return;
  }

  const result = await previewLoanComputation(request.params.applicationNo, request.body, user);
  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.post("/api/loan-applications/:applicationNo/computation", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "loans:computations:create")) {
    response.status(403).json({ error: "Loan Officer access required" });
    return;
  }

  const result = await saveLoanComputation(request.params.applicationNo, request.body, user);
  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.status(201).json(result);
});

app.get("/api/loan-releases", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "loans:releases:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listLoanReleases());
});

app.post("/api/loans/:loanNo/release", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "loans:releases:create")) {
    response.status(403).json({ error: "Teller / Cashier access required" });
    return;
  }

  const result = await releaseLoan(request.params.loanNo, request.body, user);
  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.status(201).json(result);
});

app.get("/api/loan-collections", async (request, response) => {
  const user = parseSession(request);
  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }
  if (!hasPermission(user, "loans:collections:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }
  response.json(await listLoanCollections());
});

app.post("/api/loans/:loanNo/collections", async (request, response) => {
  const user = parseSession(request);
  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }
  if (!hasPermission(user, "loans:collections:create")) {
    response.status(403).json({ error: "Teller / Cashier access required" });
    return;
  }
  const result = await recordLoanCollection(request.params.loanNo, request.body, user);
  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }
  response.status(201).json(result);
});

app.get("/api/teller-fundings", async (request, response) => {
  const user = parseSession(request);
  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }
  if (!hasPermission(user, "teller-fundings:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }
  const systemUsers = await listSystemUsers();
  response.json({
    fundings: await listTellerFundings(),
    tellers: systemUsers
      .filter(
        (item) =>
          item.role === "Teller / Cashier" &&
          (item.status || "Active") === "Active"
      )
      .map((item) => ({ username: item.username, name: item.name }))
  });
});

app.get("/api/teller-funding-position", async (request, response) => {
  const user = parseSession(request);
  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }
  if (!hasPermission(user, "teller-fundings:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }
  response.json(await getTellerFundingPosition());
});

app.post("/api/teller-fundings", async (request, response) => {
  const user = parseSession(request);
  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }
  if (!hasPermission(user, "teller-fundings:prepare")) {
    response.status(403).json({ error: "Bookkeeper access required" });
    return;
  }
  const result = await prepareTellerFunding(request.body, user);
  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }
  response.status(201).json(result);
});

app.post("/api/teller-fundings/:fundingNo/approve", async (request, response) => {
  const user = parseSession(request);
  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }
  if (!hasPermission(user, "teller-fundings:approve")) {
    response.status(403).json({ error: "General Manager access required" });
    return;
  }
  const result = await approveTellerFunding(request.params.fundingNo, user);
  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }
  response.json(result);
});

app.post("/api/teller-fundings/:fundingNo/acknowledge", async (request, response) => {
  const user = parseSession(request);
  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }
  if (!hasPermission(user, "teller-fundings:acknowledge")) {
    response.status(403).json({ error: "Teller / Cashier access required" });
    return;
  }
  const result = await acknowledgeTellerFunding(request.params.fundingNo, user);
  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }
  response.json(result);
});

app.get("/api/admin/users", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!isAdminUser(user) && !hasPermission(user, "users:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json({
    users: await listSystemUsers(),
    roles: roles.map((role) => ({
      name: role,
      defaultViews: roleViews[role] || []
    })),
    defaultPassword: isAdminUser(user) ? defaultPassword : ""
  });
});

app.post("/api/admin/users", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!isAdminUser(user)) {
    response.status(403).json({ error: "Admin access required" });
    return;
  }

  const validation = validateSystemUserInput(request.body);

  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  const result = await createSystemUser(validation.value);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.status(201).json(result);
});

app.patch("/api/admin/users/:username", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!isAdminUser(user)) {
    response.status(403).json({ error: "Admin access required" });
    return;
  }

  const result = await updateSystemUser(request.params.username, {
    role: String(request.body.role || "").trim(),
    status: String(request.body.status || "").trim(),
    defaultView: String(request.body.defaultView || "").trim()
  });

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.get("/api/admin/demo-maintenance", async (request, response) => {
  const user = parseSession(request);
  const access = await requireAdminDatabase(user);

  if (access.error) {
    response.status(access.statusCode).json({ error: access.error });
    return;
  }

  response.json(await getDemoMaintenanceStatus());
});

app.post("/api/admin/demo-maintenance/backup", async (request, response) => {
  const user = parseSession(request);
  const access = await requireAdminDatabase(user);

  if (access.error) {
    response.status(access.statusCode).json({ error: access.error });
    return;
  }

  response.json(await buildDemoBackup());
});

app.post("/api/admin/demo-maintenance/reset", async (request, response) => {
  const user = parseSession(request);
  const access = await requireAdminDatabase(user);
  const confirmation = String(request.body.confirmation || "").trim();

  if (access.error) {
    response.status(access.statusCode).json({ error: access.error });
    return;
  }

  if (confirmation !== "RESET TASETEMCO") {
    response.status(400).json({ error: "Type RESET TASETEMCO to confirm demo reset." });
    return;
  }

  const backup = await buildDemoBackup();
  const result = await resetDemoDatabase();

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json({ ...result, backup });
});

app.get("/api/members", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "members:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listMembers());
});

app.get("/api/members/:memberId/statement", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "members:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await getMemberStatement(request.params.memberId);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.patch("/api/members/:memberId/profile", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "members:profile:edit")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const validation = validateMemberProfileInput(request.body);

  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  const result = await updateMemberProfile(request.params.memberId, validation.value);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.get("/api/member-import-batches", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "members:profile:edit")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listMemberImportBatches());
});

app.post("/api/member-import-batches", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "members:profile:edit")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await createMemberImportBatch(request.body, user);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.status(201).json(result);
});

app.get("/api/member-import-batches/:importNo", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "members:profile:edit")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await getMemberImportBatch(request.params.importNo);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.post("/api/member-import-batches/:importNo/finalize", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!isAdminUser(user)) {
    response.status(403).json({ error: "Admin access required" });
    return;
  }

  const result = await finalizeMemberImportBatch(request.params.importNo, user);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.get("/api/member-applications", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "members:applications:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listMemberApplications());
});

app.post("/api/member-applications", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "members:applications:create")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = validateMemberApplication(request.body);

  if (result.error) {
    response.status(400).json({ error: result.error });
    return;
  }

  const application = await createMemberApplication(result.value, user);
  response.status(201).json({ application });
});

app.post("/api/member-applications/:applicationId/approve", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "members:applications:approve")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await approveMemberApplication(request.params.applicationId, user);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.get("/api/initial-member-payments", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "members:initial-payments:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listInitialPayments());
});

app.post("/api/initial-member-payments", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "members:initial-payments:create")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = validateInitialPayment(request.body);

  if (result.error) {
    response.status(400).json({ error: result.error });
    return;
  }

  const paymentResult = await recordInitialPayment(result.value, user);

  if (paymentResult.error) {
    response.status(paymentResult.statusCode).json({ error: paymentResult.error });
    return;
  }

  response.status(201).json(paymentResult);
});

app.get("/api/savings-deposits", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "members:savings-deposits:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listSavingsDeposits());
});

app.post("/api/savings-deposits", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "members:savings-deposits:create")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = validateSavingsDeposit(request.body);

  if (result.error) {
    response.status(400).json({ error: result.error });
    return;
  }

  const depositResult = await recordSavingsDeposit(result.value, user);

  if (depositResult.error) {
    response.status(depositResult.statusCode).json({ error: depositResult.error });
    return;
  }

  response.status(201).json(depositResult);
});

app.get("/api/share-capital-contributions", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "members:share-capital-contributions:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listShareCapitalContributions());
});

app.post("/api/share-capital-contributions", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "members:share-capital-contributions:create")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = validateShareCapitalContribution(request.body);

  if (result.error) {
    response.status(400).json({ error: result.error });
    return;
  }

  const contributionResult = await recordShareCapitalContribution(result.value, user);

  if (contributionResult.error) {
    response.status(contributionResult.statusCode).json({ error: contributionResult.error });
    return;
  }

  response.status(201).json(contributionResult);
});

app.get("/api/savings-withdrawals", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "members:savings-withdrawals:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listSavingsWithdrawals());
});

app.post("/api/savings-withdrawals", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "members:savings-withdrawals:create")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = validateSavingsWithdrawal(request.body);

  if (result.error) {
    response.status(400).json({ error: result.error });
    return;
  }

  const withdrawalResult = await recordSavingsWithdrawal(result.value, user);

  if (withdrawalResult.error) {
    response.status(withdrawalResult.statusCode).json({ error: withdrawalResult.error });
    return;
  }

  response.status(201).json(withdrawalResult);
});

app.get("/api/teller-cash-count", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "teller-cash-counts:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const activeBatch = await getCurrentTellerBatch(user);
  const tellerBatch = await listTellerBatchRows(activeBatch.id);
  const openingFunding = await getAcknowledgedFundingTotal(activeBatch.id);
  response.json({
    activeBatch,
    expected: {
      ...buildTellerBatchSummary(tellerBatch),
      openingFunding,
      expectedEndingCash: addMoney(openingFunding, buildTellerBatchSummary(tellerBatch).netCash)
    },
    latestCashCount: await getLatestTellerCashCount()
  });
});

app.post("/api/teller-cash-count", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "teller-cash-counts:create")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = validateTellerCashCount(request.body);

  if (result.error) {
    response.status(400).json({ error: result.error });
    return;
  }

  const cashCountResult = await submitTellerCashCount(result.value, user);

  if (cashCountResult.error) {
    response.status(cashCountResult.statusCode).json({ error: cashCountResult.error });
    return;
  }

  response.status(201).json(cashCountResult);
});

app.post("/api/teller-batches/:batchId/review", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "ledger:teller-batches:review")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const validation = validateVarianceNote(request.body);

  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  const result = await reviewTellerBatch(request.params.batchId, validation.value, user);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.post("/api/teller-batches/:batchId/close", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "ledger:teller-batches:close")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const validation = validateClosingNote(request.body);

  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  const result = await closeTellerBatch(request.params.batchId, validation.value, user);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.get("/api/teller-batches", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "teller-batches:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listTellerBatches());
});

app.get("/api/teller-batches/:batchId", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "teller-batches:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await getTellerBatchDetails(request.params.batchId);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.get("/api/ledger", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "ledger:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const activeBatch = hasPermission(user, "teller-batches:view") ? await getCurrentTellerBatch(user) : null;
  const openingFunding = activeBatch ? await getAcknowledgedFundingTotal(activeBatch.id) : 0;
  const activeBatchFundings = activeBatch
    ? (await listTellerFundings()).filter(
        (funding) => funding.batchId === activeBatch.id && funding.status === "Acknowledged"
      )
    : [];
  response.json({
    activeBatch,
    openingFunding,
    unpostedFundingCount: activeBatchFundings.filter((funding) => !funding.postedEntryNo).length,
    tellerBatch: activeBatch ? await listTellerBatchRows(activeBatch.id) : await listTellerBatchRows(),
    tellerBatches: hasPermission(user, "teller-batches:view") ? await listTellerBatches() : [],
    latestCashCount: hasPermission(user, "teller-cash-counts:view") ? await getLatestTellerCashCount() : null,
    journalEntries: await listJournalEntries()
  });
});

app.get("/api/ledger/member-lookup", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!isAdminUser(user) && !hasPermission(user, "ledger:teller-batches:review")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listLedgerMemberLookup());
});

app.get("/api/ledger/opening-balance-import-batches", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!isAdminUser(user) && !hasPermission(user, "ledger:teller-batches:review")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listOpeningBalanceImportBatches());
});

app.get("/api/ledger/opening-balance-staged-member-nos", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!isAdminUser(user) && !hasPermission(user, "ledger:teller-batches:review")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listOpeningBalanceStagedMemberNos());
});

app.get("/api/ledger/opening-balance-finalized-member-nos", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!isAdminUser(user) && !hasPermission(user, "ledger:teller-batches:review")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listOpeningBalanceFinalizedMemberNos());
});

app.post("/api/ledger/opening-balance-import-batches", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!isAdminUser(user) && !hasPermission(user, "ledger:teller-batches:review")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  try {
    const result = await createOpeningBalanceImportBatch(request.body, user);

    if (result.error) {
      response.status(result.statusCode).json({ error: result.error });
      return;
    }

    response.status(201).json(result);
  } catch (error) {
    console.error("Opening balance import failed:", error);
    response.status(500).json({
      error: "Opening balance import could not be saved. Review the mapped balance columns and row issues."
    });
  }
});

app.get("/api/ledger/opening-balance-import-batches/:importNo", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!isAdminUser(user) && !hasPermission(user, "ledger:teller-batches:review")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await getOpeningBalanceImportBatch(request.params.importNo);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.post("/api/ledger/opening-balance-import-batches/:importNo/reject", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!isAdminUser(user)) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await rejectOpeningBalanceImportBatch(request.params.importNo, user);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.post("/api/ledger/opening-balance-import-batches/:importNo/finalize", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!isAdminUser(user)) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await finalizeOpeningBalanceImportBatch(request.params.importNo, user);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.post("/api/ledger/opening-balance-import-batches/:importNo/post-journal", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!isAdminUser(user)) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await repairOpeningBalanceJournal(request.params.importNo, user);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.get("/api/reports/daily-cash-position", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "reports:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await getDailyCashPositionReport());
});

app.get("/api/reports/member-subsidiary-ledger", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "reports:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await getMemberSubsidiaryLedgerReport());
});

app.get("/api/reports/control-account-reconciliation", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "reports:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await getControlAccountReconciliationReport());
});

app.get("/api/reports/trial-balance", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "reports:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await getTrialBalanceReport());
});

app.get("/api/reports/statement-of-financial-condition", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "reports:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await getStatementOfFinancialConditionReport());
});

app.post("/api/ledger/teller-batches/:paymentId/post", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "ledger:teller-batches:post")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await postInitialPayment(request.params.paymentId, user);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.post("/api/ledger/teller-batches/:batchId/post-reviewed", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "ledger:teller-batches:post")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await postReviewedTellerBatch(request.params.batchId, user);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.post("/api/ledger/savings-deposits/:depositId/post", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "ledger:teller-batches:post")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await postSavingsDeposit(request.params.depositId, user);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.post("/api/ledger/share-capital-contributions/:contributionId/post", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "ledger:teller-batches:post")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await postShareCapitalContribution(request.params.contributionId, user);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.post("/api/ledger/savings-withdrawals/:withdrawalId/post", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!hasPermission(user, "ledger:teller-batches:post")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await postSavingsWithdrawal(request.params.withdrawalId, user);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.json(result);
});

app.get("/api/roles", (request, response) => {
  response.json(roles);
});

if (frontendDistPath) {
  app.use(express.static(frontendDistPath));
  app.get("*", (request, response, next) => {
    if (request.path.startsWith("/api")) {
      next();
      return;
    }

    response.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

app.listen(port, host, () => {
  console.log(`TASETEMCO spike API running at http://${host}:${port}`);
});
