const { spawn } = require("node:child_process");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const dotenv = require("dotenv");

const port = String(4300 + Math.floor(Math.random() * 500));
const baseUrl = `http://127.0.0.1:${port}`;
const smokeMode = process.env.SMOKE_DB_MODE || "memory";

if (smokeMode === "postgres") {
  dotenv.config({ path: path.join(process.cwd(), "backend", ".env") });
  dotenv.config();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      const body = await response.json();

      if (response.ok && body.ok && body.app === "TASETEMCO") {
        return body;
      }
    } catch (error) {
      await wait(300);
    }
  }

  throw new Error("Spike API did not become healthy.");
}

async function run() {
  if (!["memory", "postgres"].includes(smokeMode)) {
    throw new Error("SMOKE_DB_MODE must be memory or postgres.");
  }

  if (smokeMode === "postgres") {
    if (
      !process.env.DATABASE_URL &&
      !(process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE)
    ) {
      throw new Error("Postgres smoke test requires DATABASE_URL or PGHOST, PGUSER, and PGDATABASE.");
    }

    const reset = spawnSync(process.execPath, ["scripts/pg-maintenance.js", "reset-demo"], {
      cwd: process.cwd(),
      env: process.env,
      encoding: "utf8"
    });

    if (reset.status !== 0) {
      throw new Error(`Postgres demo reset failed.\n${reset.stdout}${reset.stderr}`);
    }
  }

  const server = spawn(process.execPath, ["backend/src/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: port,
      ...(smokeMode === "memory"
        ? {
            DATABASE_URL: "",
            PGHOST: "",
            PGUSER: "",
            PGDATABASE: ""
          }
        : {})
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  server.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  try {
    const health = await waitForHealth();

    if (smokeMode === "memory" && health.database !== "seed-memory") {
      throw new Error("Memory smoke test expected the API to use seed-memory mode.");
    }

    if (smokeMode === "postgres" && health.database !== "postgres") {
      throw new Error("Postgres smoke test expected the API to use postgres mode.");
    }

    if (smokeMode === "postgres" && health.schema !== "ok") {
      throw new Error(`Postgres smoke test expected schema ok, got ${health.schema}.`);
    }

    const login = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "membership", password: "p@55@LL" })
    });
    const loginBody = await login.json();
    const cookie = login.headers.get("set-cookie")?.split(";")[0];

    if (!login.ok || loginBody.user.defaultView !== "members") {
      throw new Error("Membership login did not return the expected default view.");
    }

    if (!cookie) {
      throw new Error("Login did not set a session cookie.");
    }

    const createApplication = await fetch(`${baseUrl}/api/member-applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({
        fullName: "Smoke Test Applicant",
        clusterName: "General Membership",
        contactNumber: "0999-000-0000",
        initialShareCapital: 5000
      })
    });
    const createBody = await createApplication.json();

    if (!createApplication.ok || createBody.application.status !== "Pending Approval") {
      throw new Error("Member application was not created as Pending Approval.");
    }

    const listApplications = await fetch(`${baseUrl}/api/member-applications`, {
      headers: { Cookie: cookie }
    });
    const applications = await listApplications.json();

    if (!applications.some((application) => application.id === createBody.application.id)) {
      throw new Error("Created member application was not returned by the list endpoint.");
    }

    const managerLogin = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "manager", password: "p@55@LL" })
    });
    const managerBody = await managerLogin.json();
    const managerCookie = managerLogin.headers.get("set-cookie")?.split(";")[0];

    if (managerBody.user.permissions.includes("members:applications:approve")) {
      throw new Error("Manager should not have member application approval permission in this spike.");
    }

    const forbiddenApproval = await fetch(
      `${baseUrl}/api/member-applications/${createBody.application.id}/approve`,
      {
        method: "POST",
        headers: { Cookie: managerCookie }
      }
    );

    if (forbiddenApproval.status !== 403) {
      throw new Error("Manager should be denied member application approval.");
    }

    const forbiddenOpeningBalanceLookup = await fetch(`${baseUrl}/api/ledger/member-lookup`, {
      headers: { Cookie: managerCookie }
    });

    if (forbiddenOpeningBalanceLookup.status !== 403) {
      throw new Error("Manager should be denied opening balance member lookup.");
    }

    const adminLogin = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "p@55@LL" })
    });
    const adminBody = await adminLogin.json();
    const adminCookie = adminLogin.headers.get("set-cookie")?.split(";")[0];

    if (!adminBody.user.permissions.includes("members:applications:approve")) {
      throw new Error("Admin should have member application approval permission.");
    }

    const forbiddenUsers = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Cookie: managerCookie }
    });

    if (forbiddenUsers.status !== 403) {
      throw new Error("User management should be restricted to admin users.");
    }

    const adminUsers = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Cookie: adminCookie }
    });
    const adminUsersBody = await adminUsers.json();

    if (!adminUsers.ok || !adminUsersBody.users.some((item) => item.username === "admin")) {
      throw new Error("Admin should be able to list system users.");
    }

    const smokeUsername = `smokeuser${Date.now().toString().slice(-6)}`;
    const createSystemUser = await fetch(`${baseUrl}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie
      },
      body: JSON.stringify({
        name: "Smoke Test Staff",
        username: smokeUsername,
        role: "Membership Officer",
        defaultView: "members"
      })
    });
    const createSystemUserBody = await createSystemUser.json();

    if (
      !createSystemUser.ok ||
      createSystemUserBody.user.username !== smokeUsername ||
      createSystemUserBody.user.status !== "Active"
    ) {
      throw new Error("Admin should be able to create a system user.");
    }

    const duplicateSystemUser = await fetch(`${baseUrl}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie
      },
      body: JSON.stringify({
        name: "Smoke Test Staff",
        username: smokeUsername,
        role: "Membership Officer",
        defaultView: "members"
      })
    });

    if (duplicateSystemUser.status !== 409) {
      throw new Error("Duplicate system usernames should be rejected.");
    }

    const deactivateSystemUser = await fetch(`${baseUrl}/api/admin/users/${smokeUsername}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie
      },
      body: JSON.stringify({
        role: "Membership Officer",
        status: "Inactive",
        defaultView: "members"
      })
    });
    const deactivateSystemUserBody = await deactivateSystemUser.json();

    if (!deactivateSystemUser.ok || deactivateSystemUserBody.user.status !== "Inactive") {
      throw new Error("Admin should be able to deactivate a non-admin system user.");
    }

    const inactiveLogin = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: smokeUsername, password: "p@55@LL" })
    });

    if (inactiveLogin.status !== 401) {
      throw new Error("Inactive users should not be able to log in.");
    }

    const forbiddenMaintenance = await fetch(`${baseUrl}/api/admin/demo-maintenance`, {
      headers: { Cookie: managerCookie }
    });

    if (forbiddenMaintenance.status !== 403) {
      throw new Error("Demo maintenance should be restricted to admin users.");
    }

    const demoMaintenance = await fetch(`${baseUrl}/api/admin/demo-maintenance`, {
      headers: { Cookie: adminCookie }
    });
    const demoMaintenanceBody = await demoMaintenance.json();

    if (smokeMode === "postgres") {
      if (!demoMaintenance.ok || demoMaintenanceBody.database !== "postgres" || !demoMaintenanceBody.resetAvailable) {
        throw new Error("Admin demo maintenance status should report postgres reset availability.");
      }

      const demoBackup = await fetch(`${baseUrl}/api/admin/demo-maintenance/backup`, {
        method: "POST",
        headers: { Cookie: adminCookie }
      });
      const demoBackupBody = await demoBackup.json();

      if (!demoBackup.ok || demoBackupBody.engine !== "postgres" || !demoBackupBody.tables?.users?.length) {
        throw new Error("Admin demo maintenance backup should include persisted user rows.");
      }
    } else if (demoMaintenance.status !== 409) {
      throw new Error("Memory mode should not allow demo database maintenance.");
    }

    const approval = await fetch(`${baseUrl}/api/member-applications/${createBody.application.id}/approve`, {
      method: "POST",
      headers: { Cookie: adminCookie }
    });
    const approvalBody = await approval.json();

    if (!approval.ok || approvalBody.application.status !== "Approved") {
      throw new Error("Admin approval did not approve the member application.");
    }

    const activeMembers = await fetch(`${baseUrl}/api/members`, {
      headers: { Cookie: adminCookie }
    });
    const memberRows = await activeMembers.json();

    if (!memberRows.some((member) => member.id === approvalBody.member.id)) {
      throw new Error("Approved application was not converted into an active member.");
    }

    const approvedMember = memberRows.find((member) => member.id === approvalBody.member.id);

    if (approvedMember.share !== 0) {
      throw new Error("Approved member should not have paid share capital until Teller records payment.");
    }

    const managerProfileUpdate = await fetch(`${baseUrl}/api/members/${approvalBody.member.id}/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: managerCookie
      },
      body: JSON.stringify({
        name: approvalBody.member.name,
        group: approvalBody.member.group,
        contactNumber: "0999-111-2222",
        address: "Manager should not update",
        birthdate: "1990-01-01",
        civilStatus: "Single",
        occupation: "Blocked update",
        membershipDate: "2026-01-01",
        status: "Active"
      })
    });

    if (managerProfileUpdate.status !== 403) {
      throw new Error("Manager should not be allowed to update member profile.");
    }

    const memberProfileUpdate = await fetch(`${baseUrl}/api/members/${approvalBody.member.id}/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({
        name: approvalBody.member.name,
        group: "Updated Smoke Cluster",
        contactNumber: "0999-111-2222",
        address: "Smoke Test Address",
        birthdate: "1990-01-01",
        civilStatus: "Single",
        occupation: "Prototype tester",
        membershipDate: "2026-06-14",
        status: "Active",
        share: 999999,
        savings: 999999
      })
    });
    const memberProfileUpdateBody = await memberProfileUpdate.json();

    if (
      !memberProfileUpdate.ok ||
      memberProfileUpdateBody.member.group !== "Updated Smoke Cluster" ||
      memberProfileUpdateBody.member.contactNumber !== "0999-111-2222" ||
      memberProfileUpdateBody.member.share !== 0 ||
      memberProfileUpdateBody.member.savings !== 0
    ) {
      throw new Error("Membership should update profile fields without changing balances.");
    }

    const managerImportCreate = await fetch(`${baseUrl}/api/member-import-batches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: managerCookie
      },
      body: JSON.stringify({
        sourceLabel: "Forbidden manager import",
        rows: [{ rowNumber: 2, memberNo: "M-SMOKE-IMPORT-001", name: "Blocked Import" }]
      })
    });

    if (managerImportCreate.status !== 403) {
      throw new Error("Manager should not be allowed to stage member imports.");
    }

    const memberImportCreate = await fetch(`${baseUrl}/api/member-import-batches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({
        sourceLabel: "Smoke CSV Paste",
        rows: [
          {
            rowNumber: 2,
            memberNo: "M-SMOKE-IMPORT-001",
            name: "Import Ready Member",
            group: "General Membership",
            contactNumber: "0999-222-3333",
            address: "Smoke Import Address",
            birthdate: "1991-02-03",
            civilStatus: "Married",
            occupation: "Tester",
            membershipDate: "2026-06-15",
            status: "Active"
          },
          {
            rowNumber: 3,
            memberNo: approvedMember.id,
            name: "",
            group: "General Membership",
            membershipDate: "2026-99-99",
            status: "Dormant"
          }
        ]
      })
    });
    const memberImportCreateBody = await memberImportCreate.json();

    if (
      !memberImportCreate.ok ||
      memberImportCreateBody.batch.status !== "Staged" ||
      memberImportCreateBody.batch.readyRows !== 1 ||
      memberImportCreateBody.batch.issueRows !== 1
    ) {
      throw new Error("Membership should stage import batches with ready and issue row counts.");
    }

    const memberImportDetail = await fetch(
      `${baseUrl}/api/member-import-batches/${memberImportCreateBody.batch.importNo}`,
      { headers: { Cookie: cookie } }
    );
    const memberImportDetailBody = await memberImportDetail.json();

    if (
      !memberImportDetail.ok ||
      memberImportDetailBody.rows.length !== 2 ||
      !memberImportDetailBody.rows.some((row) => row.rowStatus === "Has Issues" && row.issues.length >= 3)
    ) {
      throw new Error("Staged import details should return validated row issues.");
    }

    const membershipFinalizeImport = await fetch(
      `${baseUrl}/api/member-import-batches/${memberImportCreateBody.batch.importNo}/finalize`,
      {
        method: "POST",
        headers: { Cookie: cookie }
      }
    );

    if (membershipFinalizeImport.status !== 403) {
      throw new Error("Membership Officer should not finalize member import batches.");
    }

    const adminFinalizeImport = await fetch(
      `${baseUrl}/api/member-import-batches/${memberImportCreateBody.batch.importNo}/finalize`,
      {
        method: "POST",
        headers: { Cookie: adminCookie }
      }
    );
    const adminFinalizeImportBody = await adminFinalizeImport.json();

    if (
      !adminFinalizeImport.ok ||
      adminFinalizeImportBody.batch.status !== "Finalized" ||
      adminFinalizeImportBody.batch.importedRows !== 1 ||
      adminFinalizeImportBody.batch.skippedRows !== 1 ||
      !adminFinalizeImportBody.rows.some((row) => row.rowStatus === "Imported") ||
      !adminFinalizeImportBody.rows.some((row) => row.rowStatus === "Has Issues")
    ) {
      throw new Error("Admin should finalize ready import rows while leaving issue rows unresolved.");
    }

    const membersAfterImport = await fetch(`${baseUrl}/api/members`, {
      headers: { Cookie: adminCookie }
    });
    const membersAfterImportBody = await membersAfterImport.json();
    const importedMember = membersAfterImportBody.find((member) => member.id === "M-SMOKE-IMPORT-001");

    if (
      !importedMember ||
      importedMember.share !== 0 ||
      importedMember.savings !== 0 ||
      importedMember.name !== "Import Ready Member"
    ) {
      throw new Error("Finalized import should create active member profile with zero financial balances.");
    }

    const tellerLogin = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "teller01", password: "p@55@LL" })
    });
    const tellerBody = await tellerLogin.json();
    const tellerCookie = tellerLogin.headers.get("set-cookie")?.split(";")[0];

    if (!tellerLogin.ok || !tellerBody.user.permissions.includes("members:initial-payments:create")) {
      throw new Error("Teller should be allowed to record initial member payments.");
    }

    const initialPayment = await fetch(`${baseUrl}/api/initial-member-payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({
        memberId: approvalBody.member.id,
        shareCapitalAmount: 5000,
        membershipFeeAmount: 100,
        savingsDepositAmount: 1000,
        cashReceived: 6100,
        referenceNo: "OR-SMOKE-001"
      })
    });
    const initialPaymentBody = await initialPayment.json();

    if (!initialPayment.ok || initialPaymentBody.payment.status !== "Teller Batch") {
      throw new Error("Teller initial member payment was not recorded in teller batch.");
    }

    const duplicateInitialPayment = await fetch(`${baseUrl}/api/initial-member-payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({
        memberId: approvalBody.member.id,
        shareCapitalAmount: 5000,
        membershipFeeAmount: 100,
        savingsDepositAmount: 1000,
        cashReceived: 6100,
        referenceNo: "OR-SMOKE-DUPLICATE"
      })
    });

    if (duplicateInitialPayment.status !== 409) {
      throw new Error("Duplicate initial member payment should be rejected.");
    }

    const activeMembersAfterPayment = await fetch(`${baseUrl}/api/members`, {
      headers: { Cookie: tellerCookie }
    });
    const memberRowsAfterPayment = await activeMembersAfterPayment.json();
    const paidMember = memberRowsAfterPayment.find((member) => member.id === approvalBody.member.id);

    if (!paidMember || paidMember.share !== 5000 || paidMember.savings !== 1000) {
      throw new Error("Initial payment did not update the member share capital and savings balances.");
    }

    const paymentHistory = await fetch(`${baseUrl}/api/initial-member-payments`, {
      headers: { Cookie: tellerCookie }
    });
    const paymentRows = await paymentHistory.json();

    if (!paymentRows.some((payment) => payment.id === initialPaymentBody.payment.id)) {
      throw new Error("Initial payment was not returned by the payment history endpoint.");
    }

    const bookkeeperLogin = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "bookkeeper", password: "p@55@LL" })
    });
    const bookkeeperBody = await bookkeeperLogin.json();
    const bookkeeperCookie = bookkeeperLogin.headers.get("set-cookie")?.split(";")[0];

    if (!bookkeeperLogin.ok || !bookkeeperBody.user.permissions.includes("ledger:teller-batches:post")) {
      throw new Error("Bookkeeper should be allowed to post teller batches.");
    }

    const bookkeeperOpeningBalanceLookup = await fetch(`${baseUrl}/api/ledger/member-lookup`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const bookkeeperOpeningBalanceLookupBody = await bookkeeperOpeningBalanceLookup.json();

    if (
      !bookkeeperOpeningBalanceLookup.ok ||
      !bookkeeperOpeningBalanceLookupBody.some((member) => member.id === approvalBody.member.id)
    ) {
      throw new Error("Bookkeeper should access member lookup for opening balance preview.");
    }

    const ledgerBeforePosting = await fetch(`${baseUrl}/api/ledger`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const ledgerBeforePostingBody = await ledgerBeforePosting.json();

    if (!ledgerBeforePostingBody.tellerBatch.some((payment) => payment.id === initialPaymentBody.payment.id)) {
      throw new Error("Bookkeeper ledger view should show the unposted teller payment.");
    }

    const earlyPostedPayment = await fetch(
      `${baseUrl}/api/ledger/teller-batches/${initialPaymentBody.payment.id}/post`,
      {
        method: "POST",
        headers: { Cookie: bookkeeperCookie }
      }
    );

    if (earlyPostedPayment.status !== 409) {
      throw new Error("Bookkeeper should not post teller transactions before batch review.");
    }

    const earlyPostedBatch = await fetch(
      `${baseUrl}/api/ledger/teller-batches/${ledgerBeforePostingBody.activeBatch.id}/post-reviewed`,
      {
        method: "POST",
        headers: { Cookie: bookkeeperCookie }
      }
    );

    if (earlyPostedBatch.status !== 409) {
      throw new Error("Bookkeeper should not post a teller batch before review.");
    }

    const memberStatement = await fetch(`${baseUrl}/api/members/${approvalBody.member.id}/statement`, {
      headers: { Cookie: tellerCookie }
    });
    const memberStatementBody = await memberStatement.json();

    if (!memberStatement.ok || memberStatementBody.member.share !== 5000 || memberStatementBody.member.savings !== 1000) {
      throw new Error("Member statement did not return the expected member balances.");
    }

    const statementPayment = memberStatementBody.transactions.find(
      (transaction) => transaction.id === initialPaymentBody.payment.id
    );

    if (!statementPayment || statementPayment.status !== "Teller Batch") {
      throw new Error("Member statement should show initial payment as unposted before batch review.");
    }

    const duplicateCashInReference = await fetch(`${baseUrl}/api/savings-deposits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({
        memberId: approvalBody.member.id,
        amount: 500,
        cashReceived: 500,
        referenceNo: "OR-SMOKE-001"
      })
    });

    if (duplicateCashInReference.status !== 409) {
      throw new Error("Duplicate cash-in OR/reference number should be rejected.");
    }

    const savingsDeposit = await fetch(`${baseUrl}/api/savings-deposits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({
        memberId: approvalBody.member.id,
        amount: 1500,
        cashReceived: 1500,
        referenceNo: "OR-SMOKE-SD-001"
      })
    });
    const savingsDepositBody = await savingsDeposit.json();

    if (!savingsDeposit.ok || savingsDepositBody.deposit.status !== "Teller Batch") {
      throw new Error("Teller savings deposit was not recorded in teller batch.");
    }

    const membersAfterSavingsDeposit = await fetch(`${baseUrl}/api/members`, {
      headers: { Cookie: tellerCookie }
    });
    const membersAfterSavingsDepositBody = await membersAfterSavingsDeposit.json();
    const memberAfterSavingsDeposit = membersAfterSavingsDepositBody.find(
      (member) => member.id === approvalBody.member.id
    );

    if (!memberAfterSavingsDeposit || memberAfterSavingsDeposit.savings !== 2500) {
      throw new Error("Savings deposit did not update the member savings balance.");
    }

    const ledgerBeforeSavingsPosting = await fetch(`${baseUrl}/api/ledger`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const ledgerBeforeSavingsPostingBody = await ledgerBeforeSavingsPosting.json();

    if (
      !ledgerBeforeSavingsPostingBody.tellerBatch.some(
        (payment) => payment.id === savingsDepositBody.deposit.id && payment.batchType === "Savings Deposit"
      )
    ) {
      throw new Error("Bookkeeper ledger view should show the unposted savings deposit.");
    }

    const expectedCashCount = ledgerBeforeSavingsPostingBody.tellerBatch.reduce(
      (sum, payment) => sum + Number(payment.cashReceived || 0) - Number(payment.cashOut || 0),
      0
    );

    const tellerCashCount = await fetch(`${baseUrl}/api/teller-cash-count`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({
        actualCash: expectedCashCount
      })
    });
    const tellerCashCountBody = await tellerCashCount.json();

    if (
      !tellerCashCount.ok ||
      tellerCashCountBody.batch.status !== "Submitted" ||
      tellerCashCountBody.cashCount.expectedCash !== expectedCashCount ||
      tellerCashCountBody.cashCount.variance !== 0
    ) {
      throw new Error("Teller cash count should submit the active batch and store cash variance.");
    }

    const ledgerAfterCashCount = await fetch(`${baseUrl}/api/ledger`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const ledgerAfterCashCountBody = await ledgerAfterCashCount.json();

    if (
      !ledgerAfterCashCountBody.latestCashCount ||
      ledgerAfterCashCountBody.latestCashCount.id !== tellerCashCountBody.cashCount.id
    ) {
      throw new Error("Bookkeeper ledger view should show the latest teller cash count.");
    }

    if (
      !ledgerAfterCashCountBody.activeBatch ||
      ledgerAfterCashCountBody.activeBatch.status !== "Submitted"
    ) {
      throw new Error("Bookkeeper ledger view should show the submitted teller batch.");
    }

    const firstBatchTransactionCount = ledgerAfterCashCountBody.tellerBatch.length;

    const reviewedBatch = await fetch(
      `${baseUrl}/api/teller-batches/${ledgerAfterCashCountBody.activeBatch.id}/review`,
      {
        method: "POST",
        headers: { Cookie: bookkeeperCookie }
      }
    );
    const reviewedBatchBody = await reviewedBatch.json();

    if (!reviewedBatch.ok || reviewedBatchBody.batch.status !== "Reviewed") {
      throw new Error("Bookkeeper should be able to mark a submitted teller batch as reviewed.");
    }

    const postedFirstBatch = await fetch(
      `${baseUrl}/api/ledger/teller-batches/${reviewedBatchBody.batch.id}/post-reviewed`,
      {
        method: "POST",
        headers: { Cookie: bookkeeperCookie }
      }
    );
    const postedFirstBatchBody = await postedFirstBatch.json();

    if (!postedFirstBatch.ok || postedFirstBatchBody.postedCount !== firstBatchTransactionCount) {
      throw new Error("Bookkeeper did not post all reviewed first-batch transactions.");
    }

    const postedSavingsDepositResult = postedFirstBatchBody.results.find(
      (result) => result.id === savingsDepositBody.deposit.id && result.batchType === "Savings Deposit"
    );

    if (!postedSavingsDepositResult) {
      throw new Error("Batch posting result did not include the savings deposit.");
    }

    const savingsDebitTotal = postedSavingsDepositResult.entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const savingsCreditTotal = postedSavingsDepositResult.entry.lines.reduce((sum, line) => sum + line.credit, 0);

    if (savingsDebitTotal !== 1500 || savingsCreditTotal !== 1500) {
      throw new Error("Posted savings deposit journal entry should be balanced.");
    }

    const memberStatementAfterSavings = await fetch(`${baseUrl}/api/members/${approvalBody.member.id}/statement`, {
      headers: { Cookie: tellerCookie }
    });
    const memberStatementAfterSavingsBody = await memberStatementAfterSavings.json();
    const statementDeposit = memberStatementAfterSavingsBody.transactions.find(
      (transaction) => transaction.id === savingsDepositBody.deposit.id
    );

    if (!statementDeposit || statementDeposit.status !== "Posted") {
      throw new Error("Member statement did not show the posted savings deposit.");
    }

    if (statementDeposit.journalEntryNo !== postedSavingsDepositResult.entry.id) {
      throw new Error("Member statement did not link the savings deposit to its journal entry.");
    }

    const ledgerBeforeBatchClose = await fetch(`${baseUrl}/api/ledger`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const ledgerBeforeBatchCloseBody = await ledgerBeforeBatchClose.json();

    if (ledgerBeforeBatchCloseBody.tellerBatch.length !== 0) {
      throw new Error("Reviewed first batch should have no unposted rows after batch posting.");
    }

    const closedBatch = await fetch(`${baseUrl}/api/teller-batches/${reviewedBatchBody.batch.id}/close`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: bookkeeperCookie
      },
      body: JSON.stringify({
        closingNote: "Smoke test EOD close completed."
      })
    });
    const closedBatchBody = await closedBatch.json();

    if (
      !closedBatch.ok ||
      closedBatchBody.batch.status !== "Closed" ||
      closedBatchBody.batch.closedBy !== "bookkeeper" ||
      closedBatchBody.batch.closingNote !== "Smoke test EOD close completed." ||
      closedBatchBody.nextBatch.status !== "Open"
    ) {
      throw new Error("Bookkeeper should close a reviewed empty batch and open the next teller batch.");
    }

    const batchHistoryAfterClose = await fetch(`${baseUrl}/api/teller-batches`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const batchHistoryAfterCloseBody = await batchHistoryAfterClose.json();
    const closedHistoryRow = batchHistoryAfterCloseBody.find((batch) => batch.id === closedBatchBody.batch.id);

    if (
      !batchHistoryAfterClose.ok ||
      !closedHistoryRow ||
      closedHistoryRow.status !== "Closed" ||
      closedHistoryRow.postedEntryCount !== firstBatchTransactionCount ||
      closedHistoryRow.unpostedTransactionCount !== 0 ||
      closedHistoryRow.closedBy !== "bookkeeper" ||
      closedHistoryRow.closingNote !== "Smoke test EOD close completed."
    ) {
      throw new Error("Teller batch history should show closed first batch evidence.");
    }

    const closedBatchDetails = await fetch(`${baseUrl}/api/teller-batches/${closedBatchBody.batch.id}`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const closedBatchDetailsBody = await closedBatchDetails.json();

    if (
      !closedBatchDetails.ok ||
      closedBatchDetailsBody.batch.status !== "Closed" ||
      closedBatchDetailsBody.batch.closedBy !== "bookkeeper" ||
      closedBatchDetailsBody.batch.closingNote !== "Smoke test EOD close completed." ||
      closedBatchDetailsBody.cashCounts.length !== 1 ||
      closedBatchDetailsBody.transactions.length !== firstBatchTransactionCount ||
      closedBatchDetailsBody.journalEntries.length !== firstBatchTransactionCount
    ) {
      throw new Error("Closed batch detail should include cash count, transactions, and linked journals.");
    }

    const dailyCashPosition = await fetch(`${baseUrl}/api/reports/daily-cash-position`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const dailyCashPositionBody = await dailyCashPosition.json();
    const closedReportBatch = dailyCashPositionBody.batches.find((batch) => batch.id === closedBatchBody.batch.id);

    if (
      !dailyCashPosition.ok ||
      dailyCashPositionBody.summary.closedBatchCount < 1 ||
      dailyCashPositionBody.summary.postedEntryCount < firstBatchTransactionCount ||
      !closedReportBatch ||
      closedReportBatch.status !== "Closed" ||
      closedReportBatch.closedBy !== "bookkeeper" ||
      closedReportBatch.netCash !== expectedCashCount
    ) {
      throw new Error("Daily cash position report should include closed batch cash evidence.");
    }

    const duplicateContributionReference = await fetch(`${baseUrl}/api/share-capital-contributions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({
        memberId: approvalBody.member.id,
        amount: 500,
        cashReceived: 500,
        referenceNo: "OR-SMOKE-SD-001"
      })
    });

    if (duplicateContributionReference.status !== 409) {
      throw new Error("Duplicate cash-in OR/reference number should be rejected for share capital contributions.");
    }

    const shareCapitalContribution = await fetch(`${baseUrl}/api/share-capital-contributions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({
        memberId: approvalBody.member.id,
        amount: 2000,
        cashReceived: 2000,
        referenceNo: "OR-SMOKE-SC-001"
      })
    });
    const shareCapitalContributionBody = await shareCapitalContribution.json();

    if (!shareCapitalContribution.ok || shareCapitalContributionBody.contribution.status !== "Teller Batch") {
      throw new Error("Teller share capital contribution was not recorded in teller batch.");
    }

    const membersAfterShareCapital = await fetch(`${baseUrl}/api/members`, {
      headers: { Cookie: tellerCookie }
    });
    const membersAfterShareCapitalBody = await membersAfterShareCapital.json();
    const memberAfterShareCapital = membersAfterShareCapitalBody.find((member) => member.id === approvalBody.member.id);

    if (!memberAfterShareCapital || memberAfterShareCapital.share !== 7000) {
      throw new Error("Share capital contribution did not update the member share capital balance.");
    }

    const ledgerBeforeShareCapitalPosting = await fetch(`${baseUrl}/api/ledger`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const ledgerBeforeShareCapitalPostingBody = await ledgerBeforeShareCapitalPosting.json();

    if (
      !ledgerBeforeShareCapitalPostingBody.tellerBatch.some(
        (payment) =>
          payment.id === shareCapitalContributionBody.contribution.id &&
          payment.batchType === "Share Capital Contribution"
      )
    ) {
      throw new Error("Bookkeeper ledger view should show the unposted share capital contribution.");
    }

    const earlyShareCapitalContributionPost = await fetch(
      `${baseUrl}/api/ledger/share-capital-contributions/${shareCapitalContributionBody.contribution.id}/post`,
      {
        method: "POST",
        headers: { Cookie: bookkeeperCookie }
      }
    );

    if (earlyShareCapitalContributionPost.status !== 409) {
      throw new Error("Bookkeeper should not post next-batch transactions before batch review.");
    }

    const excessiveWithdrawal = await fetch(`${baseUrl}/api/savings-withdrawals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({
        memberId: approvalBody.member.id,
        amount: 999999,
        referenceNo: "WV-SMOKE-TOO-MUCH"
      })
    });

    if (excessiveWithdrawal.status !== 400) {
      throw new Error("Savings withdrawal above available balance should be rejected.");
    }

    const savingsWithdrawal = await fetch(`${baseUrl}/api/savings-withdrawals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({
        memberId: approvalBody.member.id,
        amount: 700,
        referenceNo: "WV-SMOKE-001"
      })
    });
    const savingsWithdrawalBody = await savingsWithdrawal.json();

    if (!savingsWithdrawal.ok || savingsWithdrawalBody.withdrawal.status !== "Teller Batch") {
      throw new Error("Teller savings withdrawal was not recorded in teller batch.");
    }

    const duplicateWithdrawalReference = await fetch(`${baseUrl}/api/savings-withdrawals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({
        memberId: approvalBody.member.id,
        amount: 100,
        referenceNo: "WV-SMOKE-001"
      })
    });

    if (duplicateWithdrawalReference.status !== 409) {
      throw new Error("Duplicate withdrawal voucher/reference number should be rejected.");
    }

    const membersAfterSavingsWithdrawal = await fetch(`${baseUrl}/api/members`, {
      headers: { Cookie: tellerCookie }
    });
    const membersAfterSavingsWithdrawalBody = await membersAfterSavingsWithdrawal.json();
    const memberAfterSavingsWithdrawal = membersAfterSavingsWithdrawalBody.find(
      (member) => member.id === approvalBody.member.id
    );

    if (!memberAfterSavingsWithdrawal || memberAfterSavingsWithdrawal.savings !== 1800) {
      throw new Error("Savings withdrawal did not reduce the member savings balance.");
    }

    const ledgerBeforeWithdrawalPosting = await fetch(`${baseUrl}/api/ledger`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const ledgerBeforeWithdrawalPostingBody = await ledgerBeforeWithdrawalPosting.json();

    if (
      !ledgerBeforeWithdrawalPostingBody.tellerBatch.some(
        (payment) => payment.id === savingsWithdrawalBody.withdrawal.id && payment.batchType === "Savings Withdrawal"
      )
    ) {
      throw new Error("Bookkeeper ledger view should show the unposted savings withdrawal.");
    }

    const secondExpectedCashCount = ledgerBeforeWithdrawalPostingBody.tellerBatch.reduce(
      (sum, payment) => sum + Number(payment.cashReceived || 0) - Number(payment.cashOut || 0),
      0
    );

    const secondTellerCashCount = await fetch(`${baseUrl}/api/teller-cash-count`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({
        actualCash: secondExpectedCashCount - 10
      })
    });
    const secondTellerCashCountBody = await secondTellerCashCount.json();

    if (
      !secondTellerCashCount.ok ||
      secondTellerCashCountBody.batch.status !== "Submitted" ||
      secondTellerCashCountBody.cashCount.variance !== -10
    ) {
      throw new Error("Teller should submit the second active batch before posting.");
    }

    const secondReviewWithoutNote = await fetch(
      `${baseUrl}/api/teller-batches/${secondTellerCashCountBody.batch.id}/review`,
      {
        method: "POST",
        headers: { Cookie: bookkeeperCookie }
      }
    );

    if (secondReviewWithoutNote.status !== 400) {
      throw new Error("Bookkeeper should not review a variance batch without a variance note.");
    }

    const secondReviewedBatch = await fetch(
      `${baseUrl}/api/teller-batches/${secondTellerCashCountBody.batch.id}/review`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: bookkeeperCookie
        },
        body: JSON.stringify({
          varianceNote: "Cash count short by PHP 10. Teller will recheck drawer after batch review."
        })
      }
    );
    const secondReviewedBatchBody = await secondReviewedBatch.json();

    if (!secondReviewedBatch.ok || secondReviewedBatchBody.batch.status !== "Reviewed") {
      throw new Error("Bookkeeper should review the second teller batch before posting.");
    }

    if (!secondReviewedBatchBody.batch.varianceNote) {
      throw new Error("Reviewed variance batch should store the Bookkeeper variance note.");
    }

    const postedSecondBatch = await fetch(
      `${baseUrl}/api/ledger/teller-batches/${secondReviewedBatchBody.batch.id}/post-reviewed`,
      {
        method: "POST",
        headers: { Cookie: bookkeeperCookie }
      }
    );
    const postedSecondBatchBody = await postedSecondBatch.json();

    if (!postedSecondBatch.ok || postedSecondBatchBody.postedCount !== 2) {
      throw new Error("Bookkeeper did not post all reviewed second-batch transactions.");
    }

    const ledgerAfterSecondBatchPosting = await fetch(`${baseUrl}/api/ledger`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const ledgerAfterSecondBatchPostingBody = await ledgerAfterSecondBatchPosting.json();
    const secondBatchHistoryRow = ledgerAfterSecondBatchPostingBody.tellerBatches.find(
      (batch) => batch.id === secondReviewedBatchBody.batch.id
    );

    if (
      !secondBatchHistoryRow ||
      secondBatchHistoryRow.status !== "Reviewed" ||
      secondBatchHistoryRow.postedEntryCount !== 2 ||
      secondBatchHistoryRow.unpostedTransactionCount !== 0 ||
      !secondBatchHistoryRow.varianceNote
    ) {
      throw new Error("Ledger should include reviewed second batch posting evidence.");
    }

    const secondBatchDetails = await fetch(`${baseUrl}/api/teller-batches/${secondReviewedBatchBody.batch.id}`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const secondBatchDetailsBody = await secondBatchDetails.json();

    if (
      !secondBatchDetails.ok ||
      secondBatchDetailsBody.batch.status !== "Reviewed" ||
      !secondBatchDetailsBody.batch.varianceNote ||
      secondBatchDetailsBody.transactions.length !== 2 ||
      secondBatchDetailsBody.journalEntries.length !== 2
    ) {
      throw new Error("Reviewed batch detail should include posted transactions and linked journals.");
    }

    const postedShareCapitalContributionResult = postedSecondBatchBody.results.find(
      (result) =>
        result.id === shareCapitalContributionBody.contribution.id &&
        result.batchType === "Share Capital Contribution"
    );

    if (!postedShareCapitalContributionResult) {
      throw new Error("Batch posting result did not include the share capital contribution.");
    }

    const shareCapitalDebitTotal = postedShareCapitalContributionResult.entry.lines.reduce(
      (sum, line) => sum + line.debit,
      0
    );
    const shareCapitalCreditTotal = postedShareCapitalContributionResult.entry.lines.reduce(
      (sum, line) => sum + line.credit,
      0
    );

    if (shareCapitalDebitTotal !== 2000 || shareCapitalCreditTotal !== 2000) {
      throw new Error("Posted share capital contribution journal entry should be balanced.");
    }

    const memberStatementAfterShareCapital = await fetch(
      `${baseUrl}/api/members/${approvalBody.member.id}/statement`,
      {
        headers: { Cookie: tellerCookie }
      }
    );
    const memberStatementAfterShareCapitalBody = await memberStatementAfterShareCapital.json();
    const statementContribution = memberStatementAfterShareCapitalBody.transactions.find(
      (transaction) => transaction.id === shareCapitalContributionBody.contribution.id
    );

    if (!statementContribution || statementContribution.status !== "Posted") {
      throw new Error("Member statement did not show the posted share capital contribution.");
    }

    if (statementContribution.journalEntryNo !== postedShareCapitalContributionResult.entry.id) {
      throw new Error("Member statement did not link the share capital contribution to its journal entry.");
    }

    const postedSavingsWithdrawalResult = postedSecondBatchBody.results.find(
      (result) => result.id === savingsWithdrawalBody.withdrawal.id && result.batchType === "Savings Withdrawal"
    );

    if (!postedSavingsWithdrawalResult) {
      throw new Error("Batch posting result did not include the savings withdrawal.");
    }

    const withdrawalDebitTotal = postedSavingsWithdrawalResult.entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const withdrawalCreditTotal = postedSavingsWithdrawalResult.entry.lines.reduce((sum, line) => sum + line.credit, 0);

    if (withdrawalDebitTotal !== 700 || withdrawalCreditTotal !== 700) {
      throw new Error("Posted savings withdrawal journal entry should be balanced.");
    }

    const memberStatementAfterWithdrawal = await fetch(`${baseUrl}/api/members/${approvalBody.member.id}/statement`, {
      headers: { Cookie: tellerCookie }
    });
    const memberStatementAfterWithdrawalBody = await memberStatementAfterWithdrawal.json();
    const statementWithdrawal = memberStatementAfterWithdrawalBody.transactions.find(
      (transaction) => transaction.id === savingsWithdrawalBody.withdrawal.id
    );

    if (!statementWithdrawal || statementWithdrawal.status !== "Posted") {
      throw new Error("Member statement did not show the posted savings withdrawal.");
    }

    if (statementWithdrawal.journalEntryNo !== postedSavingsWithdrawalResult.entry.id) {
      throw new Error("Member statement did not link the savings withdrawal to its journal entry.");
    }

    const memberSubsidiaryLedger = await fetch(`${baseUrl}/api/reports/member-subsidiary-ledger`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const memberSubsidiaryLedgerBody = await memberSubsidiaryLedger.json();
    const reportMember = memberSubsidiaryLedgerBody.members.find((member) => member.id === approvalBody.member.id);

    if (
      !memberSubsidiaryLedger.ok ||
      !reportMember ||
      reportMember.shareCapitalBalance !== 7000 ||
      reportMember.savingsBalance !== 1800 ||
      reportMember.initialPaymentTotal !== 5000 ||
      reportMember.shareCapitalContributionTotal !== 2000 ||
      reportMember.savingsDepositTotal !== 2500 ||
      reportMember.savingsWithdrawalTotal !== 700 ||
      reportMember.postedTransactionCount !== 4 ||
      reportMember.unpostedTransactionCount !== 0
    ) {
      throw new Error("Member subsidiary ledger report should match posted member transactions.");
    }

    const controlReconciliation = await fetch(`${baseUrl}/api/reports/control-account-reconciliation`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const controlReconciliationBody = await controlReconciliation.json();
    const shareCapitalReconciliation = controlReconciliationBody.rows.find((row) => row.accountCode === "3010");
    const savingsReconciliation = controlReconciliationBody.rows.find((row) => row.accountCode === "2020");

    if (
      !controlReconciliation.ok ||
      !shareCapitalReconciliation ||
      !savingsReconciliation ||
      shareCapitalReconciliation.subsidiaryTotal !== shareCapitalReconciliation.generalLedgerTotal ||
      shareCapitalReconciliation.difference !== 0 ||
      shareCapitalReconciliation.status !== "Reconciled" ||
      savingsReconciliation.subsidiaryTotal !== savingsReconciliation.generalLedgerTotal ||
      savingsReconciliation.difference !== 0 ||
      savingsReconciliation.status !== "Reconciled"
    ) {
      throw new Error("Control account reconciliation should match subsidiary activity to GL controls.");
    }

    const trialBalance = await fetch(`${baseUrl}/api/reports/trial-balance`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const trialBalanceBody = await trialBalance.json();
    const cashAccount = trialBalanceBody.rows.find((row) => row.accountCode === "1010");
    const savingsAccount = trialBalanceBody.rows.find((row) => row.accountCode === "2020");
    const shareCapitalAccount = trialBalanceBody.rows.find((row) => row.accountCode === "3010");
    const membershipFeeAccount = trialBalanceBody.rows.find((row) => row.accountCode === "4020");

    if (
      !trialBalance.ok ||
      !cashAccount ||
      !savingsAccount ||
      !shareCapitalAccount ||
      !membershipFeeAccount ||
      cashAccount.accountName !== "Cash on Hand" ||
      savingsAccount.accountName !== "Savings Deposits Payable" ||
      shareCapitalAccount.accountName !== "Share Capital" ||
      membershipFeeAccount.accountName !== "Membership Fee Income" ||
      trialBalanceBody.summary.totalDebits !== trialBalanceBody.summary.totalCredits ||
      trialBalanceBody.summary.difference !== 0 ||
      trialBalanceBody.summary.status !== "Balanced"
    ) {
      throw new Error("Trial balance should include known GL accounts and balance posted debit/credit totals.");
    }

    const statementOfFinancialCondition = await fetch(
      `${baseUrl}/api/reports/statement-of-financial-condition`,
      {
        headers: { Cookie: bookkeeperCookie }
      }
    );
    const statementOfFinancialConditionBody = await statementOfFinancialCondition.json();
    const statementCashAccount = statementOfFinancialConditionBody.sections.assets.find(
      (row) => row.accountCode === "1010"
    );
    const statementSavingsAccount = statementOfFinancialConditionBody.sections.liabilities.find(
      (row) => row.accountCode === "2020"
    );
    const statementShareCapitalAccount = statementOfFinancialConditionBody.sections.equity.find(
      (row) => row.accountCode === "3010"
    );
    const currentPeriodSurplus = statementOfFinancialConditionBody.sections.equity.find(
      (row) => row.accountCode === "3999"
    );

    if (
      !statementOfFinancialCondition.ok ||
      !statementCashAccount ||
      !statementSavingsAccount ||
      !statementShareCapitalAccount ||
      !currentPeriodSurplus ||
      statementOfFinancialConditionBody.summary.totalAssets !== 15000 ||
      statementOfFinancialConditionBody.summary.totalLiabilities !== 2800 ||
      statementOfFinancialConditionBody.summary.totalEquity !== 12200 ||
      statementOfFinancialConditionBody.summary.totalLiabilitiesAndEquity !== 15000 ||
      statementOfFinancialConditionBody.summary.currentPeriodSurplus !== 200 ||
      statementOfFinancialConditionBody.summary.difference !== 0 ||
      statementOfFinancialConditionBody.summary.status !== "Balanced"
    ) {
      throw new Error("Statement of Financial Condition should balance posted assets against liabilities and equity.");
    }

    const forbiddenPayment = await fetch(`${baseUrl}/api/initial-member-payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie
      },
      body: JSON.stringify({
        memberId: approvalBody.member.id,
        shareCapitalAmount: 5000,
        membershipFeeAmount: 100,
        savingsDepositAmount: 1000,
        cashReceived: 6100,
        referenceNo: "OR-SMOKE-ADMIN"
      })
    });

    if (forbiddenPayment.status !== 403) {
      throw new Error("Admin should not record teller initial member payments in this spike.");
    }

    const loanOfficerLogin = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "loanofficer", password: "p@55@LL" })
    });
    const loanOfficerCookie = loanOfficerLogin.headers.get("set-cookie")?.split(";")[0];
    const loanOfficerBody = await loanOfficerLogin.json();

    if (!loanOfficerLogin.ok || !loanOfficerBody.user.allowedViews.includes("members")) {
      throw new Error("Loan officer should still be allowed to view members.");
    }

    if (loanOfficerBody.user.permissions.includes("members:applications:create")) {
      throw new Error("Loan officer should not have member application create permission.");
    }

    const forbiddenCreate = await fetch(`${baseUrl}/api/member-applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: loanOfficerCookie
      },
      body: JSON.stringify({
        fullName: "Forbidden Applicant",
        clusterName: "General Membership",
        contactNumber: "0999-111-1111",
        initialShareCapital: 5000
      })
    });

    if (forbiddenCreate.status !== 403) {
      throw new Error("Loan officer should be denied member application creation.");
    }

    console.log(`TASETEMCO API ${smokeMode} smoke test passed.`);
  } catch (error) {
    error.message = `${error.message}\n\nServer output:\n${output}`;
    throw error;
  } finally {
    server.kill();
    await wait(200);
  }

  if (server.exitCode && server.exitCode !== 0) {
    throw new Error(`Spike API exited unexpectedly.\n${output}`);
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
