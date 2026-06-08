import crypto from "node:crypto";
import cookie from "cookie";
import dotenv from "dotenv";
import express from "express";
import mysql from "mysql2/promise";
import {
  dashboard,
  defaultPassword,
  memberApplications,
  members,
  publicUser,
  roles,
  users
} from "./data.js";

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
      share: application.initialShareCapital,
      savings: 0,
      status: "Active"
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
      `INSERT INTO members (member_no, full_name, cluster_name, status, share_capital, savings_balance)
       VALUES (?, ?, ?, 'Active', ?, 0)`,
      [memberNo, application.fullName, application.clusterName, application.initialShareCapital]
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
        share: application.initialShareCapital,
        savings: 0,
        status: "Active"
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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

function hasPermission(user, permission) {
  return Array.isArray(user?.permissions) && user.permissions.includes(permission);
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

  if (!hasPermission(user, "members:view")) {
    response.status(403).json({ error: "Access denied" });
    return;
  }

  response.json(await listMembers());
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

app.get("/api/roles", (request, response) => {
  response.json(roles);
});

app.listen(port, host, () => {
  console.log(`TASETEMCO spike API running at http://${host}:${port}`);
});
