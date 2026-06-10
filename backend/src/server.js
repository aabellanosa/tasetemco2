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
  shareCapitalContributions,
  tellerBatches,
  tellerCashCounts,
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
            closed_at AS closedAt, expected_cash AS expectedCash, actual_cash AS actualCash,
            variance, transaction_count AS transactionCount,
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
        transactionCount: 0
      };
      tellerBatches.unshift(batch);
    }

    return batch;
  }

  const [rows] = await db.execute(
    `SELECT batch_no AS id, teller_username AS tellerUsername, status,
            opened_at AS openedAt, submitted_at AS submittedAt,
            reviewed_at AS reviewedAt, COALESCE(reviewed_by, '') AS reviewedBy,
            closed_at AS closedAt, expected_cash AS expectedCash, actual_cash AS actualCash,
            variance, transaction_count AS transactionCount
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
    transactionCount: 0
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

  return {
    member,
    transactions: [
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

async function reviewTellerBatch(batchId, user) {
  const db = await getPool();

  if (!db) {
    const batch = tellerBatches.find((item) => item.id === batchId);

    if (!batch) {
      return { error: "Teller batch was not found.", statusCode: 404 };
    }

    if (batch.status !== "Submitted") {
      return { error: "Only submitted teller batches can be reviewed.", statusCode: 409 };
    }

    batch.status = "Reviewed";
    batch.reviewedBy = user.username;
    batch.reviewedAt = new Date().toISOString();

    return { batch };
  }

  const [rows] = await db.execute(
    `SELECT batch_no AS id, teller_username AS tellerUsername, status,
            opened_at AS openedAt, submitted_at AS submittedAt,
            reviewed_at AS reviewedAt, COALESCE(reviewed_by, '') AS reviewedBy,
            closed_at AS closedAt, expected_cash AS expectedCash, actual_cash AS actualCash,
            variance, transaction_count AS transactionCount
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

  await db.execute(
    `UPDATE teller_batches
     SET status = 'Reviewed', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
     WHERE batch_no = ?`,
    [user.username, batchId]
  );

  return {
    batch: {
      ...batch,
      status: "Reviewed",
      reviewedBy: user.username,
      reviewedAt: new Date().toISOString()
    }
  };
}

async function closeTellerBatch(batchId, user) {
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
      transactionCount: 0
    };
    tellerBatches.unshift(nextBatch);

    return { batch, nextBatch };
  }

  const [rows] = await db.execute(
    `SELECT batch_no AS id, teller_username AS tellerUsername, status,
            opened_at AS openedAt, submitted_at AS submittedAt,
            reviewed_at AS reviewedAt, COALESCE(reviewed_by, '') AS reviewedBy,
            closed_at AS closedAt, expected_cash AS expectedCash, actual_cash AS actualCash,
            variance, transaction_count AS transactionCount
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
     SET status = 'Closed', closed_at = CURRENT_TIMESTAMP
     WHERE batch_no = ?`,
    [batchId]
  );

  await db.execute(
    `INSERT INTO teller_batches (batch_no, teller_username, status)
     VALUES (?, ?, 'Open')`,
    [nextBatchNo, batch.tellerUsername || "teller01"]
  );

  return {
    batch: {
      ...batch,
      status: "Closed"
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
      transactionCount: 0
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

  const result = await reviewTellerBatch(request.params.batchId, user);

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

  const result = await closeTellerBatch(request.params.batchId, user);

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

app.listen(port, host, () => {
  console.log(`TASETEMCO spike API running at http://${host}:${port}`);
});
