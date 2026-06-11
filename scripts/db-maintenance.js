const fs = require("node:fs");
const path = require("node:path");
const process = require("node:process");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

dotenv.config({ path: path.join(process.cwd(), "backend", ".env") });
dotenv.config();

const command = process.argv[2];
const schemaPath = path.join(process.cwd(), "backend", "database", "schema.sql");
const seedPath = path.join(process.cwd(), "backend", "database", "seed.sql");
const backupDir = path.join(process.cwd(), "data", "backups");

const tables = [
  "journal_entry_lines",
  "journal_entries",
  "teller_cash_counts",
  "initial_member_payments",
  "savings_deposits",
  "share_capital_contributions",
  "savings_withdrawals",
  "teller_batches",
  "member_applications",
  "members",
  "users"
];

function requireCommand() {
  const commands = ["schema", "seed", "backup", "reset-demo"];

  if (!commands.includes(command)) {
    console.error(`Usage: node scripts/db-maintenance.js <${commands.join("|")}>`);
    process.exit(1);
  }
}

function requireDatabaseConfig() {
  const required = ["DB_HOST", "DB_USER", "DB_NAME"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Missing database settings: ${missing.join(", ")}.`);
    console.error("Copy backend/.env.example to backend/.env and fill in MySQL/MariaDB settings first.");
    process.exit(1);
  }
}

function createPool({ multipleStatements = false } = {}) {
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 2,
    multipleStatements
  });
}

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  const pool = createPool({ multipleStatements: true });

  try {
    await pool.query(sql);
  } finally {
    await pool.end();
  }
}

async function backupDatabase() {
  const pool = createPool();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `${process.env.DB_NAME}-${stamp}.json`);
  const backup = {
    database: process.env.DB_NAME,
    backedUpAt: new Date().toISOString(),
    tables: {}
  };

  fs.mkdirSync(backupDir, { recursive: true });

  try {
    for (const table of tables) {
      const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
      backup.tables[table] = rows;
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
    await pool.query("SET FOREIGN_KEY_CHECKS = 0");

    for (const table of tables) {
      await pool.query(`DELETE FROM \`${table}\``);
      await pool.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
    }

    await pool.query("SET FOREIGN_KEY_CHECKS = 1");
  } finally {
    await pool.end();
  }
}

async function main() {
  requireCommand();
  requireDatabaseConfig();

  if (command === "schema") {
    await runSqlFile(schemaPath);
    console.log("Schema applied.");
    return;
  }

  if (command === "seed") {
    await runSqlFile(seedPath);
    console.log("Demo seed applied.");
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
  console.log("Database reset to demo seed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
