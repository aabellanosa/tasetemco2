const { mkdirSync } = require("node:fs");
const { pbkdf2Sync, randomBytes, timingSafeEqual } = require("node:crypto");
const { dirname, join } = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const dbPath = join(__dirname, "..", "data", "tasetemco.db");

mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");

const defaultPassword = "p@55@LL";
const seededUsers = [
  {
    fullName: "Elena D. Ramos",
    username: "admin",
    role: "System Administrator",
    status: "Active",
    defaultView: "users",
    lastLogin: "2026-05-30 08:15"
  },
  {
    fullName: "Victor M. Lim",
    username: "manager",
    role: "General Manager",
    status: "Active",
    defaultView: "dashboard",
    lastLogin: "2026-05-30 07:48"
  },
  {
    fullName: "Grace P. Uy",
    username: "bookkeeper",
    role: "Accountant / Bookkeeper",
    status: "Active",
    defaultView: "ledger",
    lastLogin: "2026-05-29 17:22"
  },
  {
    fullName: "Paolo C. Mendoza",
    username: "loanofficer",
    role: "Loan Officer",
    status: "Active",
    defaultView: "loans",
    lastLogin: "2026-05-29 16:40"
  },
  {
    fullName: "Lorna B. Aquino",
    username: "approver",
    role: "Credit Committee / Approver",
    status: "Active",
    defaultView: "loans",
    lastLogin: "2026-05-29 15:05"
  },
  {
    fullName: "Nora S. Angeles",
    username: "teller01",
    role: "Teller / Cashier",
    status: "Active",
    defaultView: "dashboard",
    lastLogin: "2026-05-30 08:04"
  },
  {
    fullName: "Arnel V. Bautista",
    username: "membership",
    role: "Membership Officer",
    status: "Active",
    defaultView: "members",
    lastLogin: "2026-05-29 14:18"
  },
  {
    fullName: "Celia T. Abad",
    username: "auditor",
    role: "Auditor / Compliance Officer",
    status: "Active",
    defaultView: "reports",
    lastLogin: "2026-05-28 13:10"
  },
  {
    fullName: "Roberto J. Villanueva",
    username: "board",
    role: "Board / Read-Only Executive",
    status: "Active",
    defaultView: "reports",
    lastLogin: "2026-05-28 10:30"
  }
];

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expectedHash, "hex"));
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      role_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      password_salt TEXT,
      password_hash TEXT,
      must_change_password INTEGER NOT NULL DEFAULT 1,
      default_view TEXT NOT NULL DEFAULT 'dashboard',
      last_login TEXT,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_no TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      cluster_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      share_capital INTEGER NOT NULL DEFAULT 0,
      savings_balance INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      account_count TEXT NOT NULL,
      balance INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_no TEXT NOT NULL UNIQUE,
      borrower_name TEXT NOT NULL,
      product_name TEXT NOT NULL,
      principal INTEGER NOT NULL,
      outstanding INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_date TEXT NOT NULL,
      reference_no TEXT NOT NULL UNIQUE,
      member_name TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      account_type TEXT NOT NULL,
      debit INTEGER NOT NULL DEFAULT 0,
      credit INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS teller_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      activity_value INTEGER NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watch_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      detail TEXT NOT NULL
    );
  `);
}

function columnExists(tableName, columnName) {
  return db.prepare(`PRAGMA table_info(${tableName})`).all().some((column) => column.name === columnName);
}

function migrateSchema() {
  const userColumns = [
    ["password_salt", "TEXT"],
    ["password_hash", "TEXT"],
    ["must_change_password", "INTEGER NOT NULL DEFAULT 1"],
    ["default_view", "TEXT NOT NULL DEFAULT 'dashboard'"]
  ];

  for (const [name, definition] of userColumns) {
    if (!columnExists("users", name)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition};`);
    }
  }
}

function tableIsEmpty(tableName) {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get();
  return row.count === 0;
}

function insertMany(sql, rows) {
  const insert = db.prepare(sql);
  db.exec("BEGIN;");

  try {
    for (const item of rows) {
      insert.run(...item);
    }
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

function seedData() {
  if (tableIsEmpty("roles")) {
    insertMany(
      "INSERT INTO roles (name, description) VALUES (?, ?)",
      [
        ["System Administrator", "Manages users, roles, settings, backups, and audit visibility."],
        ["General Manager", "Views organization-wide operations and approves selected exceptions."],
        ["Accountant / Bookkeeper", "Posts accounting entries and generates financial reports."],
        ["Loan Officer", "Encodes loan applications and monitors portfolio performance."],
        ["Credit Committee / Approver", "Reviews and approves loan applications."],
        ["Teller / Cashier", "Processes deposits, withdrawals, collections, and teller batches."],
        ["Membership Officer", "Manages member applications and profile updates."],
        ["Auditor / Compliance Officer", "Reviews records, audit trail, and compliance reports."],
        ["Board / Read-Only Executive", "Views selected governance and financial reports."]
      ]
    );
  }

  if (tableIsEmpty("users")) {
    insertMany(
      `INSERT INTO users (
          full_name, username, role_id, status, password_salt, password_hash,
          must_change_password, default_view, last_login
       )
       VALUES (?, ?, (SELECT id FROM roles WHERE name = ?), ?, ?, ?, ?, ?, ?)`,
      seededUsers.map((user) =>
        buildUserSeed(user.fullName, user.username, user.role, user.status, user.defaultView, user.lastLogin)
      )
    );
  }

  ensureSeededUsers();
  ensureUserCredentials();

  if (tableIsEmpty("members")) {
    insertMany(
      `INSERT INTO members (member_no, full_name, cluster_name, status, share_capital, savings_balance)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        ["M-000482", "Maria L. Santos", "Market Vendors Cluster", "Active", 62000, 184500],
        ["M-000517", "Benito P. Cruz", "Rice Farmers Cluster", "Active", 44000, 76800],
        ["M-000621", "Alma R. Dizon", "Teachers Cluster", "Active", 83000, 221400],
        ["M-000706", "Joey T. Mercado", "Tricycle Operators Cluster", "Active", 35500, 48200],
        ["M-000744", "Luzviminda F. Reyes", "General Membership", "Active", 51000, 93400],
        ["M-000811", "Ramon G. Flores", "Small Enterprise Cluster", "Active", 77000, 305200]
      ]
    );
  }

  if (tableIsEmpty("products")) {
    insertMany(
      "INSERT INTO products (category, name, account_count, balance) VALUES (?, ?, ?, ?)",
      [
        ["deposit", "Regular Savings", "1,084 accounts", 6453800],
        ["deposit", "Time Deposit", "126 placements", 3000000],
        ["deposit", "Youth Savers", "74 accounts", 482600],
        ["capital", "Common Share Capital", "834 members", 3450000],
        ["capital", "Subscribed Share Capital", "61 plans", 628000],
        ["capital", "Statutory Reserve Fund", "Current year", 412500]
      ]
    );
  }

  if (tableIsEmpty("loans")) {
    insertMany(
      `INSERT INTO loans (loan_no, borrower_name, product_name, principal, outstanding, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        ["LN-2026-0184", "Maria L. Santos", "Providential Loan", 180000, 124300, "2026-06-15", "Current"],
        ["LN-2026-0201", "Benito P. Cruz", "Agricultural Production", 150000, 150000, "2026-07-30", "Review"],
        ["LN-2026-0157", "Alma R. Dizon", "Salary Loan", 240000, 187200, "2026-06-05", "Current"],
        ["LN-2025-0449", "Joey T. Mercado", "Motor Repair Loan", 95000, 28600, "2026-05-20", "Past Due"]
      ]
    );
  }

  if (tableIsEmpty("transactions")) {
    insertMany(
      `INSERT INTO transactions (transaction_date, reference_no, member_name, transaction_type, amount, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        ["2026-05-30", "OR-0526-1842", "Maria L. Santos", "Loan amortization", 12800, "Posted"],
        ["2026-05-30", "SV-0526-0991", "Ramon G. Flores", "Savings deposit", 45000, "Posted"],
        ["2026-05-29", "SC-0526-0438", "Alma R. Dizon", "Share capital", 8000, "Posted"],
        ["2026-05-29", "LN-0526-0126", "Benito P. Cruz", "Loan release", 150000, "Review"],
        ["2026-05-28", "TD-0526-0039", "Luzviminda F. Reyes", "Time deposit placement", 100000, "Posted"]
      ]
    );
  }

  if (tableIsEmpty("chart_of_accounts")) {
    insertMany(
      `INSERT INTO chart_of_accounts (code, title, account_type, debit, credit)
       VALUES (?, ?, ?, ?, ?)`,
      [
        ["101000", "Cash on Hand", "Asset", 1186500, 0],
        ["102000", "Cash in Bank", "Asset", 4342800, 0],
        ["103000", "Loans Receivable - Current", "Asset", 7116200, 0],
        ["105000", "Interest Receivable", "Asset", 228000, 0],
        ["106000", "Property and Equipment", "Asset", 1205700, 0],
        ["201000", "Savings Deposits Payable", "Liability", 0, 6453800],
        ["202000", "Time Deposits Payable", "Liability", 0, 3000000],
        ["301000", "Share Capital", "Equity", 0, 3450000],
        ["302000", "Statutory Funds", "Equity", 0, 736900],
        ["401000", "Interest Income from Loans", "Revenue", 0, 786400],
        ["402000", "Service Fees", "Revenue", 0, 98200],
        ["501000", "Interest Expense on Deposits", "Expense", 162500, 0],
        ["502000", "Personnel Expenses", "Expense", 198000, 0],
        ["503000", "Administrative Expenses", "Expense", 85600, 0]
      ]
    );
  }

  if (tableIsEmpty("teller_activity")) {
    insertMany(
      "INSERT INTO teller_activity (label, activity_value, color) VALUES (?, ?, ?)",
      [
        ["Savings", 88, "#1f7a4c"],
        ["Loans", 72, "#287a80"],
        ["Capital", 54, "#b98716"],
        ["Expenses", 36, "#416f9f"],
        ["Fees", 28, "#7a5b92"]
      ]
    );
  }

  if (tableIsEmpty("watch_items")) {
    insertMany(
      "INSERT INTO watch_items (title, detail) VALUES (?, ?)",
      [
        ["Past due loans", "4 accounts over 10 days"],
        ["Unposted teller batch", "1 branch batch pending review"],
        ["Dormant savings", "18 accounts flagged"],
        ["Cash limit alert", "Main cashier above threshold"]
      ]
    );
  }
}

function buildUserSeed(fullName, username, role, status, defaultView, lastLogin) {
  const { salt, hash } = hashPassword(defaultPassword);
  return [fullName, username, role, status, salt, hash, 1, defaultView, lastLogin];
}

function ensureUserCredentials() {
  const defaults = Object.fromEntries(seededUsers.map((user) => [user.username, user.defaultView]));

  const users = db.prepare("SELECT id, username, password_salt, password_hash FROM users").all();
  const updateCredentials = db.prepare(
    `UPDATE users
     SET password_salt = ?, password_hash = ?, must_change_password = 1, default_view = ?
     WHERE id = ?`
  );
  const updateDefaultView = db.prepare("UPDATE users SET default_view = ? WHERE id = ?");

  db.exec("BEGIN;");
  try {
    for (const user of users) {
      const defaultView = defaults[user.username] || "dashboard";

      if (!user.password_salt || !user.password_hash) {
        const { salt, hash } = hashPassword(defaultPassword);
        updateCredentials.run(salt, hash, defaultView, user.id);
      } else {
        updateDefaultView.run(defaultView, user.id);
      }
    }
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

function ensureSeededUsers() {
  const existingUsers = new Set(db.prepare("SELECT username FROM users").all().map((user) => user.username));
  const insertUser = db.prepare(
    `INSERT INTO users (
        full_name, username, role_id, status, password_salt, password_hash,
        must_change_password, default_view, last_login
     )
     VALUES (?, ?, (SELECT id FROM roles WHERE name = ?), ?, ?, ?, ?, ?, ?)`
  );

  db.exec("BEGIN;");
  try {
    for (const user of seededUsers) {
      if (!existingUsers.has(user.username)) {
        insertUser.run(
          ...buildUserSeed(user.fullName, user.username, user.role, user.status, user.defaultView, user.lastLogin)
        );
      }
    }
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

function authenticateUser(username, password) {
  const user = get(
    `SELECT users.id, users.full_name AS name, users.username, users.status,
            users.password_salt, users.password_hash, users.must_change_password AS mustChangePassword,
            users.default_view AS defaultView, roles.name AS role
     FROM users
     JOIN roles ON roles.id = users.role_id
     WHERE users.username = ?`,
    [username]
  );

  if (!user || user.status !== "Active") {
    return null;
  }

  const passwordOk = verifyPassword(password, user.password_salt, user.password_hash);

  if (!passwordOk) {
    return null;
  }

  run("UPDATE users SET last_login = datetime('now', 'localtime') WHERE id = ?", [user.id]);

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    defaultView: user.defaultView,
    mustChangePassword: Boolean(user.mustChangePassword)
  };
}

function initDatabase() {
  createSchema();
  migrateSchema();
  seedData();
}

module.exports = {
  authenticateUser,
  all,
  get,
  initDatabase,
  run
};
