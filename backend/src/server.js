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
  loanProducts,
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
  users
} from "./data.js";

dotenv.config();

pg.types.setTypeParser(20, (value) => Number(value));

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

  if (!Number.isInteger(minimumPrincipal) || minimumPrincipal < 0) {
    return { error: "Minimum principal must be a non-negative whole peso amount." };
  }

  if (!Number.isInteger(maximumPrincipal) || maximumPrincipal < minimumPrincipal || maximumPrincipal <= 0) {
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

  if (!Number.isInteger(processingFee) || processingFee < 0) {
    return { error: "Processing fee must be a non-negative whole peso amount." };
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
      minimumPrincipal,
      maximumPrincipal,
      minimumTermMonths,
      maximumTermMonths,
      annualInterestRateBps,
      interestMethod,
      paymentFrequency,
      processingFee,
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
    !Number.isInteger(requestedPrincipal) ||
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
      requestedPrincipal,
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
      !Number.isInteger(recommendedPrincipal) ||
      recommendedPrincipal <= 0 ||
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
      recommendedPrincipal: decision === "Approved" ? recommendedPrincipal : 0,
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
    return { error: "Prototype import batches are limited to 250 rows." };
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

  return { value: amount };
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
        issues.push("Invalid share capital amount");
      }

      if (savings.error) {
        issues.push("Invalid savings amount");
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
    totalShareCapital: readyRows.reduce((total, row) => total + row.shareCapitalAmount, 0),
    totalSavings: readyRows.reduce((total, row) => total + row.savingsAmount, 0)
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
  const total = Number(shareCapitalAmount || 0) + Number(savingsAmount || 0);

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
      credit: Number(shareCapitalAmount || 0)
    },
    {
      accountCode: "2020",
      accountName: "Savings Deposits Payable",
      debit: 0,
      credit: Number(savingsAmount || 0)
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
  const shareCapitalAmount = finalizedRows.reduce(
    (total, row) => total + Number(row.shareCapitalAmount || 0),
    0
  );
  const savingsAmount = finalizedRows.reduce((total, row) => total + Number(row.savingsAmount || 0), 0);

  if (shareCapitalAmount + savingsAmount <= 0) {
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
  const totalAmount = Number(totals.shareCapitalAmount || 0) + Number(totals.savingsAmount || 0);

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

      member.share += row.shareCapitalAmount;
      member.savings += row.savingsAmount;
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
      const cashIn = Number(row.cashReceived || 0);
      const cashOut = Number(row.cashOut || 0);

      return {
        cashIn: summary.cashIn + cashIn,
        cashOut: summary.cashOut + cashOut,
        netCash: summary.netCash + cashIn - cashOut,
        transactionCount: summary.transactionCount + 1,
        initialPaymentCount: summary.initialPaymentCount + (row.batchType === "Initial Payment" ? 1 : 0),
        shareCapitalContributionCount:
          summary.shareCapitalContributionCount + (row.batchType === "Share Capital Contribution" ? 1 : 0),
        savingsDepositCount: summary.savingsDepositCount + (row.batchType === "Savings Deposit" ? 1 : 0),
        savingsWithdrawalCount: summary.savingsWithdrawalCount + (row.batchType === "Savings Withdrawal" ? 1 : 0)
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
      savingsWithdrawalCount: 0
    }
  );
}

function normalizeReferenceNo(referenceNo) {
  return String(referenceNo || "").trim().toUpperCase();
}

function hasCashInReference(referenceNo) {
  const normalizedReferenceNo = normalizeReferenceNo(referenceNo);
  return [...initialPayments, ...savingsDeposits, ...shareCapitalContributions].some(
    (transaction) => normalizeReferenceNo(transaction.referenceNo) === normalizedReferenceNo
  );
}

function hasWithdrawalReference(referenceNo) {
  const normalizedReferenceNo = normalizeReferenceNo(referenceNo);
  return savingsWithdrawals.some(
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
     LIMIT 1`,
    [referenceNo, referenceNo, referenceNo]
  );

  return rows.length > 0;
}

async function hasWithdrawalReferenceInDatabase(connection, referenceNo) {
  const [rows] = await connection.execute(
    `SELECT reference_no AS referenceNo
     FROM savings_withdrawals
     WHERE UPPER(reference_no) = UPPER(?)
     LIMIT 1`,
    [referenceNo]
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
       ORDER BY CAST(REPLACE(member_no, 'M-', '') AS UNSIGNED) DESC
       LIMIT 1`
    );
    const lastNumber = lastMemberRows[0]?.id ? Number(lastMemberRows[0].id.replace("M-", "")) : 0;
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
    ...savingsWithdrawals
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
  const postedEntryNos = new Set(
    transactions.map((transaction) => transaction.postedEntryNo).filter((entryNo) => Boolean(entryNo))
  );
  const linkedJournalEntries = (await listJournalEntries()).filter((entry) => postedEntryNos.has(entry.id));

  return {
    batch,
    cashCounts,
    latestCashCount: cashCounts[0] || null,
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
      cashIn: totals.cashIn + Number(batch.cashIn || 0),
      cashOut: totals.cashOut + Number(batch.cashOut || 0),
      netCash: totals.netCash + Number(batch.netCash || 0),
      expectedCash: totals.expectedCash + Number(batch.expectedCash || 0),
      actualCash: totals.actualCash + Number(batch.actualCash || 0),
      variance: totals.variance + Number(batch.variance || 0),
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
      openingShareCapitalTotal: memberOpeningBalanceRows.reduce(
        (sum, row) => sum + Number(row.shareCapitalAmount || 0),
        0
      ),
      openingSavingsTotal: memberOpeningBalanceRows.reduce(
        (sum, row) => sum + Number(row.savingsAmount || 0),
        0
      ),
      initialPaymentTotal: memberInitialPayments.reduce(
        (sum, payment) => sum + Number(payment.shareCapitalAmount || 0),
        0
      ),
      shareCapitalContributionTotal: memberShareCapitalContributions.reduce(
        (sum, contribution) => sum + Number(contribution.amount || 0),
        0
      ),
      savingsDepositTotal:
        memberInitialPayments.reduce((sum, payment) => sum + Number(payment.savingsDepositAmount || 0), 0) +
        memberSavingsDeposits.reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0),
      savingsWithdrawalTotal: memberSavingsWithdrawals.reduce(
        (sum, withdrawal) => sum + Number(withdrawal.amount || 0),
        0
      ),
      postedTransactionCount: transactions.filter(
        (transaction) => transaction.status === "Posted" || transaction.rowStatus === "Finalized"
      ).length,
      unpostedTransactionCount: transactions.filter((transaction) => transaction.status === "Teller Batch").length
    };
  });

  const summary = membersWithSubsidiary.reduce(
    (totals, member) => ({
      totalMembers: totals.totalMembers + 1,
      totalShareCapital: totals.totalShareCapital + member.shareCapitalBalance,
      totalSavings: totals.totalSavings + member.savingsBalance,
      totalOpeningShareCapital: totals.totalOpeningShareCapital + member.openingShareCapitalTotal,
      totalOpeningSavings: totals.totalOpeningSavings + member.openingSavingsTotal,
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
    entries.reduce(
      (sum, entry) =>
        sum +
        entry.lines
          .filter((line) => line.accountCode === accountCode)
          .reduce((lineSum, line) => lineSum + Number(line.credit || 0) - Number(line.debit || 0), 0),
      0
    );

  const shareCapitalSubsidiaryTotal =
    openingBalanceRows.reduce((sum, row) => sum + Number(row.shareCapitalAmount || 0), 0) +
    initialPaymentRows.reduce((sum, payment) => sum + Number(payment.shareCapitalAmount || 0), 0) +
    shareCapitalContributionRows.reduce((sum, contribution) => sum + Number(contribution.amount || 0), 0);

  const savingsSubsidiaryTotal =
    openingBalanceRows.reduce((sum, row) => sum + Number(row.savingsAmount || 0), 0) +
    initialPaymentRows.reduce((sum, payment) => sum + Number(payment.savingsDepositAmount || 0), 0) +
    savingsDepositRows.reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0) -
    savingsWithdrawalRows.reduce((sum, withdrawal) => sum + Number(withdrawal.amount || 0), 0);

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
    const difference = row.subsidiaryTotal - row.generalLedgerTotal;

    return {
      ...row,
      difference,
      status: difference === 0 ? "Reconciled" : "Difference"
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    basis: "Prototype activity only",
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

      existingRow.totalDebit += Number(line.debit || 0);
      existingRow.totalCredit += Number(line.credit || 0);
      accountRows.set(line.accountCode, existingRow);
    });
  });

  const rows = Array.from(accountRows.values())
    .map((row) => {
      const netBalance = row.totalDebit - row.totalCredit;

      return {
        ...row,
        endingDebitBalance: netBalance > 0 ? netBalance : 0,
        endingCreditBalance: netBalance < 0 ? Math.abs(netBalance) : 0
      };
    })
    .sort((firstRow, secondRow) => firstRow.accountCode.localeCompare(secondRow.accountCode));

  const totalDebits = rows.reduce((sum, row) => sum + row.totalDebit, 0);
  const totalCredits = rows.reduce((sum, row) => sum + row.totalCredit, 0);
  const difference = totalDebits - totalCredits;

  return {
    generatedAt: new Date().toISOString(),
    basis: "Prototype posted journal entries only",
    rows,
    summary: {
      accountCount: rows.length,
      totalDebits,
      totalCredits,
      difference,
      status: difference === 0 ? "Balanced" : "Out of Balance"
    }
  };
}

async function getStatementOfFinancialConditionReport() {
  const trialBalance = await getTrialBalanceReport();

  const accountBalance = (row, normalSide) => {
    if (normalSide === "debit") {
      return row.endingDebitBalance - row.endingCreditBalance;
    }

    return row.endingCreditBalance - row.endingDebitBalance;
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

  const revenueTotal = trialBalance.rows
    .filter((row) => row.accountCode.startsWith("4"))
    .reduce((sum, row) => sum + accountBalance(row, "credit"), 0);
  const expenseTotal = trialBalance.rows
    .filter((row) => row.accountCode.startsWith("5"))
    .reduce((sum, row) => sum + accountBalance(row, "debit"), 0);
  const currentPeriodSurplus = revenueTotal - expenseTotal;

  if (currentPeriodSurplus !== 0) {
    equity.push({
      accountCode: "3999",
      accountName: currentPeriodSurplus > 0 ? "Current Period Surplus" : "Current Period Deficit",
      amount: currentPeriodSurplus
    });
  }

  const totalAssets = assets.reduce((sum, row) => sum + row.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, row) => sum + row.amount, 0);
  const totalEquity = equity.reduce((sum, row) => sum + row.amount, 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const difference = totalAssets - totalLiabilitiesAndEquity;

  return {
    generatedAt: new Date().toISOString(),
    basis: "Prototype posted journal entries only; income and expense accounts are presented as current period surplus or deficit until formal closing entries exist.",
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
      status: difference === 0 ? "Balanced" : "Out of Balance"
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

    member.share += input.shareCapitalAmount;
    member.savings += input.savingsDepositAmount;

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
        share: member.share + input.shareCapitalAmount,
        savings: member.savings + input.savingsDepositAmount
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

    member.savings += input.amount;

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
        savings: member.savings + input.amount
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

    member.share += input.amount;

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
        share: member.share + input.amount
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

    member.savings -= input.amount;

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
        savings: member.savings - input.amount
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

  return postInitialPayment(row.id, user);
}

async function postReviewedTellerBatch(batchId, user) {
  const batchResult = await ensureTellerBatchReviewedForPosting(batchId);

  if (batchResult.error) {
    return batchResult;
  }

  const rows = await listTellerBatchRows(batchId);

  if (rows.length === 0) {
    return {
      batch: batchResult.batch,
      postedCount: 0,
      entries: [],
      results: [],
      message: "All transactions in this batch are already posted."
    };
  }

  const results = [];

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
    entries: results.map((result) => result.entry),
    results
  };
}

async function submitTellerCashCount(input, user) {
  const batch = await getCurrentTellerBatch(user);
  const tellerBatchRows = await listTellerBatchRows(batch.id);
  const summary = buildTellerBatchSummary(tellerBatchRows);

  if (summary.transactionCount === 0) {
    return { error: "There are no unposted teller transactions to count.", statusCode: 409 };
  }

  if (batch.status !== "Open") {
    return { error: "Only an open teller batch can be submitted for cash count.", statusCode: 409 };
  }

  const cashCount = {
    id: nextTellerCashCountNumber(),
    batchId: batch.id,
    expectedCash: summary.netCash,
    actualCash: input.actualCash,
    variance: input.actualCash - summary.netCash,
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

  if (unpostedRows.length > 0) {
    return { error: "Post all teller batch transactions before closing the batch.", statusCode: 409 };
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

  if (!Number.isInteger(initialShareCapital) || initialShareCapital < 0) {
    return { error: "Initial share capital must be a whole peso amount." };
  }

  return {
    value: {
      fullName,
      clusterName,
      contactNumber,
      initialShareCapital
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

  if (!Number.isInteger(shareCapitalAmount) || shareCapitalAmount < 0) {
    return { error: "Share capital amount must be a whole peso amount." };
  }

  if (!Number.isInteger(membershipFeeAmount) || membershipFeeAmount < 0) {
    return { error: "Membership fee must be a whole peso amount." };
  }

  if (!Number.isInteger(savingsDepositAmount) || savingsDepositAmount < 0) {
    return { error: "Savings deposit must be a whole peso amount." };
  }

  if (shareCapitalAmount + membershipFeeAmount + savingsDepositAmount <= 0) {
    return { error: "Payment must include share capital, membership fee, or savings." };
  }

  if (
    !Number.isInteger(cashReceived) ||
    cashReceived < shareCapitalAmount + membershipFeeAmount + savingsDepositAmount
  ) {
    return { error: "Cash received must cover the total payment." };
  }

  if (!referenceNo) {
    return { error: "Official receipt or reference number is required." };
  }

  return {
    value: {
      memberId,
      shareCapitalAmount,
      membershipFeeAmount,
      savingsDepositAmount,
      cashReceived,
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

  if (!Number.isInteger(amount) || amount <= 0) {
    return { error: "Savings deposit amount must be a positive whole peso amount." };
  }

  if (!Number.isInteger(cashReceived) || cashReceived < amount) {
    return { error: "Cash received must cover the savings deposit." };
  }

  if (!referenceNo) {
    return { error: "Official receipt or reference number is required." };
  }

  return {
    value: {
      memberId,
      amount,
      cashReceived,
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

  if (!Number.isInteger(amount) || amount <= 0) {
    return { error: "Share capital contribution must be a positive whole peso amount." };
  }

  if (!Number.isInteger(cashReceived) || cashReceived < amount) {
    return { error: "Cash received must cover the share capital contribution." };
  }

  if (!referenceNo) {
    return { error: "Official receipt or reference number is required." };
  }

  return {
    value: {
      memberId,
      amount,
      cashReceived,
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

  if (!Number.isInteger(amount) || amount <= 0) {
    return { error: "Savings withdrawal amount must be a positive whole peso amount." };
  }

  if (!referenceNo) {
    return { error: "Withdrawal voucher or reference number is required." };
  }

  return {
    value: {
      memberId,
      amount,
      referenceNo
    }
  };
}

function validateTellerCashCount(body) {
  const actualCash = Number(body.actualCash || 0);

  if (!Number.isInteger(actualCash) || actualCash < 0) {
    return { error: "Actual cash counted must be a whole peso amount." };
  }

  return {
    value: {
      actualCash
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
  response.json({
    activeBatch,
    expected: buildTellerBatchSummary(tellerBatch),
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
  response.json({
    activeBatch,
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

  const result = await createOpeningBalanceImportBatch(request.body, user);

  if (result.error) {
    response.status(result.statusCode).json({ error: result.error });
    return;
  }

  response.status(201).json(result);
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
