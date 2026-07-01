const fs = require("node:fs");
const path = require("node:path");
const process = require("node:process");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config({ path: path.join(process.cwd(), "backend", ".env") });
dotenv.config();

const command = process.argv[2];
const schemaPath = path.join(process.cwd(), "backend", "database", "schema.postgres.sql");
const seedPath = path.join(process.cwd(), "backend", "database", "seed.postgres.sql");
const loanProductSeedPath = path.join(process.cwd(), "backend", "database", "seed.loan-products.postgres.sql");
const backupDir = path.join(process.cwd(), "data", "backups");
const connectionTimeoutMillis = Number(process.env.PGCONNECT_TIMEOUT_MS || 8000);

const tables = [
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
  "loan_document_forms",
  "loan_applications",
  "loan_products",
  "member_import_rows",
  "member_import_batches",
  "member_applications",
  "members",
  "users"
];

function requireCommand() {
  const commands = ["schema", "seed", "seed-loan-products", "backup", "reset-demo"];

  if (!commands.includes(command)) {
    console.error(`Usage: node scripts/pg-maintenance.js <${commands.join("|")}>`);
    process.exit(1);
  }
}

function hasPostgresConfig() {
  return Boolean(
    process.env.DATABASE_URL ||
      (process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE)
  );
}

function requireDatabaseConfig() {
  if (hasPostgresConfig()) {
    return;
  }

  console.error("Missing Postgres settings.");
  console.error("Set DATABASE_URL, or set PGHOST, PGUSER, and PGDATABASE in backend/.env.");
  process.exit(1);
}

function createPool() {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
      max: 2,
      connectionTimeoutMillis
    });
  }

  return new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    max: 2,
    connectionTimeoutMillis
  });
}

function getConnectionLabel() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return `${url.hostname}:${url.port || 5432}${url.pathname}`;
  }

  return `${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}`;
}

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  const pool = createPool();

  try {
    await pool.query(sql);
  } finally {
    await pool.end();
  }
}

async function backupDatabase() {
  const pool = createPool();
  const databaseName = process.env.PGDATABASE || new URL(process.env.DATABASE_URL).pathname.slice(1);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `${databaseName}-${stamp}.postgres.json`);
  const backup = {
    database: databaseName,
    engine: "postgres",
    backedUpAt: new Date().toISOString(),
    tables: {}
  };

  fs.mkdirSync(backupDir, { recursive: true });

  try {
    for (const table of tables) {
      const result = await pool.query(`SELECT * FROM ${table}`);
      backup.tables[table] = result.rows;
    }
  } finally {
    await pool.end();
  }

  fs.writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`);
  console.log(`Backup written to ${backupPath}`);
}

async function clearDatabase() {
  const pool = createPool();

  try {
    await pool.query(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`);
  } finally {
    await pool.end();
  }
}

async function main() {
  requireCommand();
  requireDatabaseConfig();
  console.log(`Using Postgres at ${getConnectionLabel()}`);

  if (command === "schema") {
    await runSqlFile(schemaPath);
    console.log("Postgres schema applied.");
    return;
  }

  if (command === "seed") {
    await runSqlFile(seedPath);
    console.log("Postgres demo seed applied.");
    return;
  }

  if (command === "seed-loan-products") {
    await runSqlFile(loanProductSeedPath);
    console.log("Postgres loan product seed applied.");
    return;
  }

  if (command === "backup") {
    await backupDatabase();
    return;
  }

  await runSqlFile(schemaPath);
  await backupDatabase();
  await clearDatabase();
  await runSqlFile(seedPath);
  console.log("Postgres database reset to demo seed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
