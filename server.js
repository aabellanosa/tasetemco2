const { createServer } = require("node:http");
const { randomUUID } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const { extname, join, normalize } = require("node:path");
const { all, authenticateUser, get, initDatabase } = require("./src/db");

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const publicRoot = __dirname;
const sessions = new Map();

const roleViews = {
  "System Administrator": ["dashboard", "workflow", "members", "accounts", "loans", "ledger", "reports", "users"],
  "General Manager": ["dashboard", "workflow", "members", "accounts", "loans", "ledger", "reports"],
  "Accountant / Bookkeeper": ["dashboard", "workflow", "accounts", "ledger", "reports"],
  "Loan Officer": ["dashboard", "workflow", "members", "loans"],
  "Credit Committee / Approver": ["dashboard", "workflow", "members", "loans", "reports"],
  "Teller / Cashier": ["dashboard", "workflow", "members", "accounts", "loans"],
  "Membership Officer": ["dashboard", "workflow", "members"],
  "Auditor / Compliance Officer": ["dashboard", "workflow", "members", "accounts", "loans", "ledger", "reports", "users"],
  "Board / Read-Only Executive": ["dashboard", "workflow", "reports"]
};

const endpointViews = {
  "/api/dashboard": "dashboard",
  "/api/members": "members",
  "/api/products": "accounts",
  "/api/loans": "loans",
  "/api/transactions": "dashboard",
  "/api/ledger": "ledger",
  "/api/reports": "reports",
  "/api/users": "users",
  "/api/roles": "users"
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendSessionCookie(response, sessionId) {
  response.setHeader("Set-Cookie", `tasetemco_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`);
}

function clearSessionCookie(response) {
  response.setHeader("Set-Cookie", "tasetemco_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([name, value]) => name && value)
  );
}

function getSessionUser(request) {
  const cookies = parseCookies(request.headers.cookie);
  return sessions.get(cookies.tasetemco_session) || null;
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function clientUser(user) {
  if (!user) {
    return null;
  }

  const allowedViews = roleViews[user.role] || ["dashboard"];

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    defaultView: allowedViews.includes(user.defaultView) ? user.defaultView : allowedViews[0],
    allowedViews,
    mustChangePassword: user.mustChangePassword
  };
}

function notFound(response) {
  sendJson(response, 404, { error: "Not found" });
}

function getDashboardPayload() {
  const ledger = all("SELECT account_type, debit, credit FROM chart_of_accounts");
  const members = get("SELECT COUNT(*) AS count FROM members WHERE status = 'Active'");
  const assets = ledger
    .filter((row) => row.account_type === "Asset")
    .reduce((sum, row) => sum + row.debit - row.credit, 0);
  const deposits = ledger
    .filter((row) => row.account_type === "Liability")
    .reduce((sum, row) => sum + row.credit - row.debit, 0);
  const loans = get("SELECT COALESCE(SUM(outstanding), 0) AS outstanding FROM loans");
  const revenue = ledger
    .filter((row) => row.account_type === "Revenue")
    .reduce((sum, row) => sum + row.credit - row.debit, 0);
  const expenses = ledger
    .filter((row) => row.account_type === "Expense")
    .reduce((sum, row) => sum + row.debit - row.credit, 0);

  return {
    metrics: [
      { label: "Total assets", value: assets, note: "+4.8% vs April" },
      { label: "Member deposits", value: deposits, note: `${members.count.toLocaleString("en-PH")} active members` },
      { label: "Loan portfolio", value: loans.outstanding, note: "96.4% current" },
      { label: "Net surplus", value: revenue - expenses, note: "Before allocations" }
    ],
    chart: all("SELECT label, activity_value AS value, color FROM teller_activity ORDER BY id"),
    watchItems: all("SELECT title, detail AS value FROM watch_items ORDER BY id")
  };
}

function getReportsPayload() {
  const ledger = all("SELECT account_type, debit, credit FROM chart_of_accounts");
  const sumByType = (type) =>
    ledger
      .filter((row) => row.account_type === type)
      .reduce((sum, row) => sum + row.debit - row.credit, 0);
  const creditSumByType = (type) =>
    ledger
      .filter((row) => row.account_type === type)
      .reduce((sum, row) => sum + row.credit - row.debit, 0);

  const assets = sumByType("Asset");
  const liabilities = creditSumByType("Liability");
  const equity = creditSumByType("Equity");
  const revenue = creditSumByType("Revenue");
  const expenses = sumByType("Expense");
  const surplus = revenue - expenses;

  return {
    balanceSheet: [
      { label: "Assets", value: assets },
      { label: "Liabilities", value: liabilities },
      { label: "Members' Equity", value: equity },
      { label: "Current Net Surplus", value: surplus },
      { label: "Liabilities, Equity and Surplus", value: liabilities + equity + surplus, type: "total" }
    ],
    incomeStatement: [
      { label: "Revenue", value: revenue },
      { label: "Operating Expenses", value: expenses },
      { label: "Net Surplus Before Allocation", value: surplus, type: "total" }
    ]
  };
}

async function handleApi(pathname, request, response) {
  if (pathname === "/api/health") {
    sendJson(response, 200, { ok: true, app: "TASETEMCO" });
    return;
  }

  if (pathname === "/api/login" && request.method === "POST") {
    const body = await readJsonBody(request);
    const user = authenticateUser(String(body.username || "").trim(), String(body.password || ""));

    if (!user) {
      sendJson(response, 401, { error: "Invalid username or password" });
      return;
    }

    const sessionId = randomUUID();
    sessions.set(sessionId, user);
    sendSessionCookie(response, sessionId);
    sendJson(response, 200, { user: clientUser(user) });
    return;
  }

  if (pathname === "/api/logout" && request.method === "POST") {
    const cookies = parseCookies(request.headers.cookie);
    sessions.delete(cookies.tasetemco_session);
    clearSessionCookie(response);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (pathname === "/api/me") {
    const user = getSessionUser(request);
    sendJson(response, 200, { user: clientUser(user) });
    return;
  }

  const currentUser = getSessionUser(request);

  if (!currentUser) {
    sendJson(response, 401, { error: "Login required" });
    return;
  }

  const requiredView = endpointViews[pathname];
  const allowedViews = roleViews[currentUser.role] || ["dashboard"];

  if (requiredView && !allowedViews.includes(requiredView)) {
    sendJson(response, 403, { error: "Access denied" });
    return;
  }

  if (pathname === "/api/dashboard") {
    sendJson(response, 200, getDashboardPayload());
    return;
  }

  if (pathname === "/api/members") {
    sendJson(
      response,
      200,
      all(`SELECT member_no AS id, full_name AS name, cluster_name AS "group", share_capital AS share,
                  savings_balance AS savings, status
           FROM members
           ORDER BY member_no`)
    );
    return;
  }

  if (pathname === "/api/products") {
    sendJson(
      response,
      200,
      all(`SELECT category, name, account_count AS count, balance FROM products ORDER BY id`)
    );
    return;
  }

  if (pathname === "/api/loans") {
    sendJson(
      response,
      200,
      all(`SELECT loan_no AS no, borrower_name AS borrower, product_name AS product,
                  principal, outstanding, due_date AS due, status
           FROM loans
           ORDER BY due_date`)
    );
    return;
  }

  if (pathname === "/api/transactions") {
    sendJson(
      response,
      200,
      all(`SELECT transaction_date AS date, reference_no AS ref, member_name AS member,
                  transaction_type AS type, amount, status
           FROM transactions
           ORDER BY transaction_date DESC, id DESC`)
    );
    return;
  }

  if (pathname === "/api/ledger") {
    sendJson(
      response,
      200,
      all(`SELECT code, title, account_type AS type, debit, credit
           FROM chart_of_accounts
           ORDER BY code`)
    );
    return;
  }

  if (pathname === "/api/reports") {
    sendJson(response, 200, getReportsPayload());
    return;
  }

  if (pathname === "/api/users") {
    sendJson(
      response,
      200,
      all(`SELECT users.full_name AS name, users.username, roles.name AS role,
                  users.status, users.default_view AS defaultView, users.last_login AS lastLogin
           FROM users
           JOIN roles ON roles.id = users.role_id
           ORDER BY roles.id, users.full_name`)
    );
    return;
  }

  if (pathname === "/api/roles") {
    sendJson(response, 200, all("SELECT name, description FROM roles ORDER BY id"));
    return;
  }

  notFound(response);
}

async function serveStatic(pathname, response) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicRoot, safePath);

  if (!filePath.startsWith(publicRoot)) {
    notFound(response);
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream"
    });
    response.end(body);
  } catch (error) {
    notFound(response);
  }
}

initDatabase();

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(url.pathname, request, response);
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    sendJson(response, 500, { error: "Server error", detail: error.message });
  }
}).listen(port, host, () => {
  console.log(`TASETEMCO running at http://${host}:${port}`);
});
