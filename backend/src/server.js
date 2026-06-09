import crypto from "node:crypto";
import cookie from "cookie";
import dotenv from "dotenv";
import express from "express";
import mysql from "mysql2/promise";
import {
  dashboard,
  defaultPassword,
  initialPayments,
  journalEntries,
  memberApplications,
  members,
  publicUser,
  roles,
  savingsDeposits,
  savingsWithdrawals,
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

function nextInitialPaymentNumber() {
  const next = initialPayments.length + 1;
  return `IP-${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
}

function nextSavingsDepositNumber() {
  const next = savingsDeposits.length + 1;
  return `SD-${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
}

function nextSavingsWithdrawalNumber() {
  const next = savingsWithdrawals.length + 1;
  return `SW-${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
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
      [memberNo, application.fullName, application.clusterName, 0]
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

async function listInitialPayments() {
  const db = await getPool();

  if (!db) {
    return initialPayments;
  }

  const [rows] = await db.execute(
    `SELECT payment_no AS id, member_no AS memberId, member_name AS memberName,
            share_capital_amount AS shareCapitalAmount, membership_fee_amount AS membershipFeeAmount,
            savings_deposit_amount AS savingsDepositAmount, cash_received AS cashReceived, reference_no AS referenceNo,
            received_by AS receivedBy, status, created_at AS createdAt
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
    `SELECT deposit_no AS id, member_no AS memberId, member_name AS memberName,
            amount, cash_received AS cashReceived, reference_no AS referenceNo,
            received_by AS receivedBy, status, posted_by AS postedBy,
            posted_entry_no AS postedEntryNo, created_at AS createdAt
     FROM savings_deposits
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
    `SELECT withdrawal_no AS id, member_no AS memberId, member_name AS memberName,
            amount, reference_no AS referenceNo, released_by AS releasedBy,
            status, posted_by AS postedBy, posted_entry_no AS postedEntryNo,
            created_at AS createdAt
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

async function getMemberStatement(memberId) {
  const db = await getPool();

  if (!db) {
    const member = members.find((item) => item.id === memberId);

    if (!member) {
      return { error: "Member was not found.", statusCode: 404 };
    }

    const transactions = initialPayments
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
      );

    return { member, transactions };
  }

  const [memberRows] = await db.execute(
    `SELECT member_no AS id, full_name AS name, cluster_name AS \`group\`,
            share_capital AS share, savings_balance AS savings, status
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

  return { member, transactions: [...initialPaymentRows, ...savingsDepositRows, ...savingsWithdrawalRows] };
}

async function recordInitialPayment(input, user) {
  const db = await getPool();

  if (!db) {
    const member = members.find((item) => item.id === input.memberId && item.status === "Active");

    if (!member) {
      return { error: "Active member was not found.", statusCode: 404 };
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
      status: "Teller Batch"
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

    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS countValue
       FROM initial_member_payments
       WHERE YEAR(created_at) = YEAR(CURRENT_DATE)`
    );
    const paymentNo = `IP-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;

    await connection.execute(
      `INSERT INTO initial_member_payments (
         payment_no, member_no, member_name, share_capital_amount,
         membership_fee_amount, savings_deposit_amount, cash_received, reference_no, received_by, status
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Teller Batch')`,
      [
        paymentNo,
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
        status: "Teller Batch"
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

    if (!member) {
      return { error: "Active member was not found.", statusCode: 404 };
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
      status: "Teller Batch"
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

    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS countValue
       FROM savings_deposits
       WHERE YEAR(created_at) = YEAR(CURRENT_DATE)`
    );
    const depositNo = `SD-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;

    await connection.execute(
      `INSERT INTO savings_deposits (
         deposit_no, member_no, member_name, amount, cash_received, reference_no, received_by, status
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Teller Batch')`,
      [depositNo, member.id, member.name, input.amount, input.cashReceived, input.referenceNo, user.username]
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
        status: "Teller Batch"
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

async function recordSavingsWithdrawal(input, user) {
  const db = await getPool();

  if (!db) {
    const member = members.find((item) => item.id === input.memberId && item.status === "Active");

    if (!member) {
      return { error: "Active member was not found.", statusCode: 404 };
    }

    if (input.amount > member.savings) {
      return { error: "Withdrawal amount exceeds available savings.", statusCode: 400 };
    }

    member.savings -= input.amount;

    const withdrawal = {
      id: nextSavingsWithdrawalNumber(),
      memberId: member.id,
      memberName: member.name,
      amount: input.amount,
      referenceNo: input.referenceNo,
      releasedBy: user.username,
      status: "Teller Batch"
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

    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS countValue
       FROM savings_withdrawals
       WHERE YEAR(created_at) = YEAR(CURRENT_DATE)`
    );
    const withdrawalNo = `SW-${new Date().getFullYear()}-${String(Number(countRows[0].countValue) + 1).padStart(4, "0")}`;

    await connection.execute(
      `INSERT INTO savings_withdrawals (
         withdrawal_no, member_no, member_name, amount, reference_no, released_by, status
       )
       VALUES (?, ?, ?, ?, ?, ?, 'Teller Batch')`,
      [withdrawalNo, member.id, member.name, input.amount, input.referenceNo, user.username]
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
        status: "Teller Batch"
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
      `SELECT payment_no AS id, member_no AS memberId, member_name AS memberName,
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
      `SELECT deposit_no AS id, member_no AS memberId, member_name AS memberName,
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
      `SELECT withdrawal_no AS id, member_no AS memberId, member_name AS memberName,
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

  response.json({
    tellerBatch: [
      ...(await listInitialPayments())
        .filter((payment) => payment.status === "Teller Batch")
        .map((payment) => ({ ...payment, batchType: "Initial Payment" })),
      ...(await listSavingsDeposits())
        .filter((deposit) => deposit.status === "Teller Batch")
        .map((deposit) => ({
          ...deposit,
          batchType: "Savings Deposit",
          shareCapitalAmount: 0,
          membershipFeeAmount: 0,
          savingsDepositAmount: deposit.amount
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
    ],
    journalEntries: await listJournalEntries()
  });
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

app.listen(port, host, () => {
  console.log(`TASETEMCO spike API running at http://${host}:${port}`);
});
