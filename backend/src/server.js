import crypto from "node:crypto";
import cookie from "cookie";
import dotenv from "dotenv";
import express from "express";
import mysql from "mysql2/promise";
import { dashboard, defaultPassword, members, publicUser, roles, users } from "./data.js";

dotenv.config();

const app = express();
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4000);
const sessions = new Map();
let pool = null;

app.use(express.json());

function wantsMySql() {
  return Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);
}

async function getPool() {
  if (!wantsMySql()) {
    return null;
  }

  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5
    });
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
    return users.find((user) => user.username === username) || null;
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

async function listMembers() {
  const db = await getPool();

  if (!db) {
    return members;
  }

  const [rows] = await db.execute(
    `SELECT member_no AS id, full_name AS name, cluster_name AS \`group\`,
            share_capital AS share, savings_balance AS savings, status
     FROM members
     ORDER BY member_no`
  );

  return rows;
}

app.get("/api/health", async (request, response) => {
  const db = await getPool();
  let database = "seed-memory";

  if (db) {
    await db.query("SELECT 1");
    database = "mysql";
  }

  response.json({ ok: true, app: "TASETEMCO", stack: "react-chakra-mysql-spike", database });
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

app.get("/api/members", async (request, response) => {
  const user = parseSession(request);

  if (!user) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  if (!user.allowedViews.includes("members")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listMembers());
});

app.get("/api/roles", (request, response) => {
  response.json(roles);
});

app.listen(port, host, () => {
  console.log(`TASETEMCO spike API running at http://${host}:${port}`);
});
