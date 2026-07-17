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
        clusterName: "COMMUNITY A MEMBERS",
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

    const managerDashboard = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Cookie: managerCookie }
    });
    const managerDashboardBody = await managerDashboard.json();

    if (!managerDashboard.ok || Object.hasOwn(managerDashboardBody, "outstandingBatch")) {
      throw new Error("Outstanding teller batch dashboard data should be restricted to admin.");
    }

    if (
      !managerDashboardBody.loanAlerts?.canViewDetails ||
      managerDashboardBody.loanAlerts.overdueCount < 1 ||
      managerDashboardBody.loanAlerts.dueSoonCount < 1 ||
      !managerDashboardBody.loanAlerts.items.some((item) => item.loanNo === "LN-DEMO-PASTDUE")
    ) {
      throw new Error("Manager dashboard should include role-gated overdue loan alert details.");
    }

    const adminDashboard = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Cookie: adminCookie }
    });
    const adminDashboardBody = await adminDashboard.json();

    if (
      !adminDashboard.ok ||
      !adminDashboardBody.outstandingBatch?.activeBatch?.id ||
      !Array.isArray(adminDashboardBody.outstandingBatch.rows) ||
      typeof adminDashboardBody.outstandingBatch.openingFunding !== "number"
    ) {
      throw new Error("Admin dashboard should include the current outstanding teller batch summary.");
    }

    const dashboardTellerLogin = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "teller01", password: "p@55@LL" })
    });
    const dashboardTellerCookie = dashboardTellerLogin.headers.get("set-cookie")?.split(";")[0];
    const tellerDashboard = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Cookie: dashboardTellerCookie }
    });
    const tellerDashboardBody = await tellerDashboard.json();

    if (!tellerDashboard.ok || tellerDashboardBody.loanAlerts?.canViewDetails) {
      throw new Error("Teller dashboard should not expose portfolio-wide overdue loan details.");
    }

    const forbiddenUsers = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Cookie: managerCookie }
    });

    if (forbiddenUsers.status !== 403) {
      throw new Error("User management should be restricted to admin users.");
    }

    const auditorLogin = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "auditor", password: "p@55@LL" })
    });
    const auditorBody = await auditorLogin.json();
    const auditorCookie = auditorLogin.headers.get("set-cookie")?.split(";")[0];

    if (
      !auditorLogin.ok ||
      !auditorBody.user.permissions.includes("users:view") ||
      !auditorBody.user.allowedViews.includes("users")
    ) {
      throw new Error("Auditor should receive read-only User / Security access.");
    }

    const auditorUsers = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Cookie: auditorCookie }
    });
    const auditorUsersBody = await auditorUsers.json();

    if (
      !auditorUsers.ok ||
      !auditorUsersBody.users.some((item) => item.username === "admin") ||
      auditorUsersBody.defaultPassword
    ) {
      throw new Error("Auditor should list users without receiving the shared prototype password.");
    }

    const forbiddenAuditorCreate = await fetch(`${baseUrl}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: auditorCookie
      },
      body: JSON.stringify({
        name: "Blocked Auditor Staff",
        username: "auditblocked",
        role: "Membership Officer",
        defaultView: "members"
      })
    });

    if (forbiddenAuditorCreate.status !== 403) {
      throw new Error("Auditor should not create or maintain system users.");
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
        additionalRoles: ["Teller / Cashier"],
        defaultView: "dashboard"
      })
    });
    const createSystemUserBody = await createSystemUser.json();

    if (
      !createSystemUser.ok ||
      createSystemUserBody.user.username !== smokeUsername ||
      createSystemUserBody.user.status !== "Active" ||
      !createSystemUserBody.user.additionalRoles.includes("Teller / Cashier")
    ) {
      throw new Error("Admin should be able to create a system user with additional roles.");
    }

    const combinedRoleLogin = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: smokeUsername, password: "p@55@LL" })
    });
    const combinedRoleBody = await combinedRoleLogin.json();

    if (
      !combinedRoleLogin.ok ||
      !combinedRoleBody.user.permissions.includes("members:applications:create") ||
      !combinedRoleBody.user.permissions.includes("members:savings-deposits:create") ||
      !combinedRoleBody.user.allowedViews.includes("members") ||
      !combinedRoleBody.user.allowedViews.includes("loans")
    ) {
      throw new Error("Additional roles should extend login permissions and screens.");
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
        additionalRoles: ["Teller / Cashier"],
        status: "Inactive",
        defaultView: "dashboard"
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
        group: "RETIREES",
        contactNumber: "0999-111-2222",
        address: "Smoke Test Address",
        birthdate: "1990-01-01",
        civilStatus: "Single",
        occupation: "Prototype tester",
        membershipDate: "2026-06-14",
        previousLoanBalance: 1250.75,
        status: "Active",
        share: 999999,
        savings: 999999
      })
    });
    const memberProfileUpdateBody = await memberProfileUpdate.json();

    if (
      !memberProfileUpdate.ok ||
      memberProfileUpdateBody.member.group !== "RETIREES" ||
      memberProfileUpdateBody.member.contactNumber !== "0999-111-2222" ||
      memberProfileUpdateBody.member.previousLoanBalance !== 1250.75 ||
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
            group: "COMMUNITY A MEMBERS",
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
            group: "COMMUNITY A MEMBERS",
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

    const postImportApplication = await fetch(`${baseUrl}/api/member-applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({
        fullName: "Post Import Approval Member",
        clusterName: "COMMUNITY A MEMBERS",
        contactNumber: "0999-333-4444",
        initialShareCapital: 5000
      })
    });
    const postImportApplicationBody = await postImportApplication.json();
    const postImportApproval = await fetch(
      `${baseUrl}/api/member-applications/${postImportApplicationBody.application?.id}/approve`,
      {
        method: "POST",
        headers: { Cookie: adminCookie }
      }
    );
    const postImportApprovalBody = await postImportApproval.json();

    if (
      !postImportApplication.ok ||
      !postImportApproval.ok ||
      !/^M-\d{6}$/.test(postImportApprovalBody.member?.id || "")
    ) {
      throw new Error("Admin approval should ignore nonnumeric imported member IDs when assigning the next member number.");
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

    const forbiddenOpeningBalanceBatches = await fetch(`${baseUrl}/api/ledger/opening-balance-import-batches`, {
      headers: { Cookie: managerCookie }
    });

    if (forbiddenOpeningBalanceBatches.status !== 403) {
      throw new Error("Manager should be denied opening balance staged batches.");
    }

    const decimalOpeningBalance = await fetch(`${baseUrl}/api/ledger/opening-balance-import-batches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: bookkeeperCookie
      },
      body: JSON.stringify({
        sourceLabel: "Invalid Decimal Opening Balance",
        rows: [
          {
            rowNumber: 2,
            memberNo: "M-NOT-FOUND",
            memberName: "Incorrectly Mapped Row",
            shareCapitalOpeningBalance: "199613.22533",
            savingsOpeningBalance: 0,
            cutoverDate: "2026-06-30",
            sourceReference: "Wrong CSV Layout"
          }
        ]
      })
    });
    const decimalOpeningBalanceBody = await decimalOpeningBalance.json();

    if (
      !decimalOpeningBalance.ok ||
      decimalOpeningBalanceBody.batch.readyRows !== 0 ||
      decimalOpeningBalanceBody.batch.issueRows !== 1 ||
      !decimalOpeningBalanceBody.rows[0].issues.includes(
        "Share capital: Amount must have no more than two decimal places"
      )
    ) {
      throw new Error("Decimal or incorrectly mapped opening balances should become row issues without terminating the API.");
    }

    const stagedOpeningBalance = await fetch(`${baseUrl}/api/ledger/opening-balance-import-batches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: bookkeeperCookie
      },
      body: JSON.stringify({
        sourceLabel: "Smoke Opening Balances",
        rows: [
          {
            rowNumber: 2,
            memberNo: approvalBody.member.id,
            memberName: approvalBody.member.name,
            shareCapitalOpeningBalance: 1000.25,
            savingsOpeningBalance: 500.75,
            cutoverDate: "2026-06-30",
            sourceReference: "Smoke CSV",
            rawData: {
              "Member No.": approvalBody.member.id,
              "Member Name": approvalBody.member.name
            }
          }
        ]
      })
    });
    const stagedOpeningBalanceBody = await stagedOpeningBalance.json();

    if (
      !stagedOpeningBalance.ok ||
      stagedOpeningBalanceBody.batch.status !== "Staged" ||
      stagedOpeningBalanceBody.batch.readyRows !== 1 ||
      stagedOpeningBalanceBody.batch.totalShareCapital !== 1000.25 ||
      stagedOpeningBalanceBody.batch.totalSavings !== 500.75
    ) {
      throw new Error("Bookkeeper should be able to stage opening balance imports.");
    }

    const openingBalanceBatchList = await fetch(`${baseUrl}/api/ledger/opening-balance-import-batches`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const openingBalanceBatchRows = await openingBalanceBatchList.json();

    if (!openingBalanceBatchRows.some((batch) => batch.importNo === stagedOpeningBalanceBody.batch.importNo)) {
      throw new Error("Staged opening balance import should be returned by the batch list.");
    }

    const stagedOpeningBalanceMembers = await fetch(`${baseUrl}/api/ledger/opening-balance-staged-member-nos`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const stagedOpeningBalanceMemberNos = await stagedOpeningBalanceMembers.json();

    if (!stagedOpeningBalanceMemberNos.includes(approvalBody.member.id)) {
      throw new Error("Staged opening balance member numbers should include saved staged rows.");
    }

    const alreadyStagedOpeningBalance = await fetch(`${baseUrl}/api/ledger/opening-balance-import-batches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: bookkeeperCookie
      },
      body: JSON.stringify({
        sourceLabel: "Smoke Already Staged Opening Balance",
        rows: [
          {
            rowNumber: 2,
            memberNo: approvalBody.member.id,
            memberName: approvalBody.member.name,
            shareCapitalOpeningBalance: 1000,
            savingsOpeningBalance: 500,
            cutoverDate: "2026-06-30",
            sourceReference: "Smoke CSV"
          }
        ]
      })
    });
    const alreadyStagedOpeningBalanceBody = await alreadyStagedOpeningBalance.json();

    if (
      !alreadyStagedOpeningBalance.ok ||
      alreadyStagedOpeningBalanceBody.batch.readyRows !== 0 ||
      alreadyStagedOpeningBalanceBody.batch.issueRows !== 1 ||
      !alreadyStagedOpeningBalanceBody.rows[0].issues.includes("Member already has a staged opening balance")
    ) {
      throw new Error("Members already in staged opening balance batches should be issue rows.");
    }

    const duplicateOpeningBalance = await fetch(`${baseUrl}/api/ledger/opening-balance-import-batches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: bookkeeperCookie
      },
      body: JSON.stringify({
        sourceLabel: "Smoke Duplicate Opening Balances",
        rows: [
          {
            rowNumber: 2,
            memberNo: approvalBody.member.id,
            memberName: approvalBody.member.name,
            shareCapitalOpeningBalance: 1000,
            savingsOpeningBalance: 500,
            cutoverDate: "2026-06-30",
            sourceReference: "Smoke CSV"
          },
          {
            rowNumber: 3,
            memberNo: approvalBody.member.id.toLowerCase(),
            memberName: approvalBody.member.name,
            shareCapitalOpeningBalance: 2000,
            savingsOpeningBalance: 750,
            cutoverDate: "2026-06-30",
            sourceReference: "Smoke CSV"
          }
        ]
      })
    });
    const duplicateOpeningBalanceBody = await duplicateOpeningBalance.json();

    if (
      !duplicateOpeningBalance.ok ||
      duplicateOpeningBalanceBody.batch.readyRows !== 0 ||
      duplicateOpeningBalanceBody.batch.issueRows !== 2 ||
      !duplicateOpeningBalanceBody.rows.every((row) => row.issues.includes("Duplicate member no. in upload"))
    ) {
      throw new Error("Duplicate opening balance member numbers should be staged as issue rows.");
    }

    const openingBalanceDetails = await fetch(
      `${baseUrl}/api/ledger/opening-balance-import-batches/${stagedOpeningBalanceBody.batch.importNo}`,
      {
        headers: { Cookie: bookkeeperCookie }
      }
    );
    const openingBalanceDetailsBody = await openingBalanceDetails.json();

    if (
      !openingBalanceDetails.ok ||
      openingBalanceDetailsBody.batch.importNo !== stagedOpeningBalanceBody.batch.importNo ||
      openingBalanceDetailsBody.rows.length !== 1
    ) {
      throw new Error("Bookkeeper should be able to view opening balance batch details.");
    }

    const forbiddenOpeningBalanceReject = await fetch(
      `${baseUrl}/api/ledger/opening-balance-import-batches/${stagedOpeningBalanceBody.batch.importNo}/reject`,
      {
        method: "POST",
        headers: { Cookie: bookkeeperCookie }
      }
    );

    if (forbiddenOpeningBalanceReject.status !== 403) {
      throw new Error("Opening balance batch rejection should be restricted to admin.");
    }

    const adminOpeningBalanceReject = await fetch(
      `${baseUrl}/api/ledger/opening-balance-import-batches/${duplicateOpeningBalanceBody.batch.importNo}/reject`,
      {
        method: "POST",
        headers: { Cookie: adminCookie }
      }
    );
    const adminOpeningBalanceRejectBody = await adminOpeningBalanceReject.json();

    if (!adminOpeningBalanceReject.ok || adminOpeningBalanceRejectBody.batch.status !== "Rejected") {
      throw new Error("Admin should be able to reject staged opening balance batches.");
    }

    const membersBeforeOpeningBalance = await fetch(`${baseUrl}/api/members`, {
      headers: { Cookie: adminCookie }
    });
    const membersBeforeOpeningBalanceBody = await membersBeforeOpeningBalance.json();
    const openingBalanceMemberBefore = membersBeforeOpeningBalanceBody.find((member) => member.id === "M-000482");

    const finalizableOpeningBalance = await fetch(`${baseUrl}/api/ledger/opening-balance-import-batches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: bookkeeperCookie
      },
      body: JSON.stringify({
        sourceLabel: "Smoke Finalizable Opening Balance",
        rows: [
          {
            rowNumber: 2,
            memberNo: "M-000482",
            memberName: "Maria L. Santos",
            shareCapitalOpeningBalance: 1000,
            savingsOpeningBalance: 500,
            cutoverDate: "2026-06-30",
            sourceReference: "Smoke Finalization"
          },
          {
            rowNumber: 3,
            memberNo: "M-UNKNOWN",
            memberName: "Unknown Member",
            shareCapitalOpeningBalance: 200,
            savingsOpeningBalance: 100,
            cutoverDate: "2026-06-30",
            sourceReference: "Smoke Finalization"
          }
        ]
      })
    });
    const finalizableOpeningBalanceBody = await finalizableOpeningBalance.json();

    if (
      !finalizableOpeningBalance.ok ||
      finalizableOpeningBalanceBody.batch.readyRows !== 1 ||
      finalizableOpeningBalanceBody.batch.issueRows !== 1
    ) {
      throw new Error("Opening balance finalization test batch should contain one ready and one issue row.");
    }

    const forbiddenOpeningBalanceFinalize = await fetch(
      `${baseUrl}/api/ledger/opening-balance-import-batches/${finalizableOpeningBalanceBody.batch.importNo}/finalize`,
      {
        method: "POST",
        headers: { Cookie: bookkeeperCookie }
      }
    );

    if (forbiddenOpeningBalanceFinalize.status !== 403) {
      throw new Error("Opening balance finalization should be restricted to admin.");
    }

    const finalizedOpeningBalance = await fetch(
      `${baseUrl}/api/ledger/opening-balance-import-batches/${finalizableOpeningBalanceBody.batch.importNo}/finalize`,
      {
        method: "POST",
        headers: { Cookie: adminCookie }
      }
    );
    const finalizedOpeningBalanceBody = await finalizedOpeningBalance.json();

    if (
      !finalizedOpeningBalance.ok ||
      finalizedOpeningBalanceBody.batch.status !== "Finalized" ||
      finalizedOpeningBalanceBody.batch.finalizedRows !== 1 ||
      finalizedOpeningBalanceBody.batch.skippedRows !== 1 ||
      !finalizedOpeningBalanceBody.batch.postedEntryNo ||
      finalizedOpeningBalanceBody.rows.find((row) => row.memberNo === "M-000482")?.rowStatus !== "Finalized"
    ) {
      throw new Error("Admin should finalize ready rows, skip issue rows, and create an opening journal.");
    }

    const ledgerAfterOpeningBalance = await fetch(`${baseUrl}/api/ledger`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const ledgerAfterOpeningBalanceBody = await ledgerAfterOpeningBalance.json();
    const openingJournal = ledgerAfterOpeningBalanceBody.journalEntries.find(
      (entry) => entry.id === finalizedOpeningBalanceBody.batch.postedEntryNo
    );
    const openingJournalDebit = openingJournal?.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
    const openingJournalCredit = openingJournal?.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);

    if (
      !openingJournal ||
      openingJournal.sourceType !== "Opening Balance Import" ||
      openingJournalDebit !== 1500 ||
      openingJournalCredit !== 1500 ||
      !openingJournal.lines.some(
        (line) => line.accountCode === "1090" && line.accountName === "Opening Balance Clearing" && line.debit === 1500
      ) ||
      !openingJournal.lines.some((line) => line.accountCode === "3010" && line.credit === 1000) ||
      !openingJournal.lines.some((line) => line.accountCode === "2020" && line.credit === 500)
    ) {
      throw new Error("Opening balance finalization should create the expected balanced journal entry.");
    }

    const openingBalanceMemberStatement = await fetch(`${baseUrl}/api/members/M-000482/statement`, {
      headers: { Cookie: adminCookie }
    });
    const openingBalanceMemberStatementBody = await openingBalanceMemberStatement.json();
    const openingBalanceStatementRow = openingBalanceMemberStatementBody.transactions.find(
      (transaction) => transaction.type === "Opening Balance"
    );

    if (
      !openingBalanceMemberStatement.ok ||
      !openingBalanceStatementRow ||
      openingBalanceStatementRow.batchNo !== finalizableOpeningBalanceBody.batch.importNo ||
      openingBalanceStatementRow.cutoverDate !== "2026-06-30" ||
      openingBalanceStatementRow.sourceReference !== "Smoke Finalization" ||
      openingBalanceStatementRow.shareCapitalAmount !== 1000 ||
      openingBalanceStatementRow.savingsDepositAmount !== 500 ||
      openingBalanceStatementRow.journalEntryNo !== finalizedOpeningBalanceBody.batch.postedEntryNo ||
      openingBalanceStatementRow.status !== "Posted"
    ) {
      throw new Error(
        `Member statement should expose finalized opening balance audit evidence. Received: ${JSON.stringify(openingBalanceStatementRow)}`
      );
    }

    const duplicateOpeningJournal = await fetch(
      `${baseUrl}/api/ledger/opening-balance-import-batches/${finalizableOpeningBalanceBody.batch.importNo}/post-journal`,
      {
        method: "POST",
        headers: { Cookie: adminCookie }
      }
    );

    if (duplicateOpeningJournal.status !== 409) {
      throw new Error("Opening balance batches should not post more than one opening journal.");
    }

    const membersAfterOpeningBalance = await fetch(`${baseUrl}/api/members`, {
      headers: { Cookie: adminCookie }
    });
    const membersAfterOpeningBalanceBody = await membersAfterOpeningBalance.json();
    const openingBalanceMemberAfter = membersAfterOpeningBalanceBody.find((member) => member.id === "M-000482");

    if (
      !openingBalanceMemberBefore ||
      !openingBalanceMemberAfter ||
      openingBalanceMemberAfter.share !== openingBalanceMemberBefore.share + 1000 ||
      openingBalanceMemberAfter.savings !== openingBalanceMemberBefore.savings + 500
    ) {
      throw new Error("Finalized opening balances should update member share capital and savings.");
    }

    const repeatedOpeningBalanceFinalize = await fetch(
      `${baseUrl}/api/ledger/opening-balance-import-batches/${finalizableOpeningBalanceBody.batch.importNo}/finalize`,
      {
        method: "POST",
        headers: { Cookie: adminCookie }
      }
    );

    if (repeatedOpeningBalanceFinalize.status !== 409) {
      throw new Error("Finalized opening balance batches should not finalize twice.");
    }

    const finalizedOpeningBalanceMembers = await fetch(
      `${baseUrl}/api/ledger/opening-balance-finalized-member-nos`,
      {
        headers: { Cookie: bookkeeperCookie }
      }
    );
    const finalizedOpeningBalanceMemberNos = await finalizedOpeningBalanceMembers.json();

    if (!finalizedOpeningBalanceMemberNos.includes("M-000482")) {
      throw new Error("Finalized opening balance member numbers should be available for preview validation.");
    }

    const alreadyFinalizedOpeningBalance = await fetch(`${baseUrl}/api/ledger/opening-balance-import-batches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: bookkeeperCookie
      },
      body: JSON.stringify({
        sourceLabel: "Smoke Already Finalized Opening Balance",
        rows: [
          {
            rowNumber: 2,
            memberNo: "M-000482",
            memberName: "Maria L. Santos",
            shareCapitalOpeningBalance: 1000,
            savingsOpeningBalance: 500,
            cutoverDate: "2026-06-30",
            sourceReference: "Smoke Finalization"
          }
        ]
      })
    });
    const alreadyFinalizedOpeningBalanceBody = await alreadyFinalizedOpeningBalance.json();

    if (
      !alreadyFinalizedOpeningBalance.ok ||
      alreadyFinalizedOpeningBalanceBody.batch.readyRows !== 0 ||
      !alreadyFinalizedOpeningBalanceBody.rows[0].issues.includes("Opening balance already finalized for member")
    ) {
      throw new Error("Members with finalized opening balances should be staged as issue rows.");
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
    const openingBalanceReportMember = memberSubsidiaryLedgerBody.members.find((member) => member.id === "M-000482");

    if (
      !memberSubsidiaryLedger.ok ||
      !reportMember ||
      !openingBalanceReportMember ||
      openingBalanceReportMember.openingShareCapitalTotal !== 1000 ||
      openingBalanceReportMember.openingSavingsTotal !== 500 ||
      memberSubsidiaryLedgerBody.summary.totalOpeningShareCapital !== 1000 ||
      memberSubsidiaryLedgerBody.summary.totalOpeningSavings !== 500 ||
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
    const statementOpeningClearingAccount = statementOfFinancialConditionBody.sections.assets.find(
      (row) => row.accountCode === "1090"
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
      !statementOpeningClearingAccount ||
      !statementSavingsAccount ||
      !statementShareCapitalAccount ||
      !currentPeriodSurplus ||
      statementOfFinancialConditionBody.summary.totalAssets !== 16500 ||
      statementOfFinancialConditionBody.summary.totalLiabilities !== 3300 ||
      statementOfFinancialConditionBody.summary.totalEquity !== 13200 ||
      statementOfFinancialConditionBody.summary.totalLiabilitiesAndEquity !== 16500 ||
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

    const adminLoanProducts = await fetch(`${baseUrl}/api/loan-products`, {
      headers: { Cookie: adminCookie }
    });
    const adminLoanProductRows = await adminLoanProducts.json();

    if (
      !adminLoanProducts.ok ||
      !adminLoanProductRows.some((product) => product.code === "SALARY") ||
      !adminLoanProductRows.some((product) => product.code === "EMERGENCY") ||
      !adminLoanProductRows.some(
        (product) =>
          product.code === "PETTY-CASH" &&
          product.minimumPrincipal === 1000 &&
          product.maximumPrincipal === 2000 &&
          product.serviceFeeRateBps === 0
      ) ||
      !adminLoanProductRows.some(
        (product) =>
          product.code === "SMALL-BUSINESS" &&
          product.minimumPrincipal === 5000 &&
          product.maximumPrincipal === 100000 &&
          product.minimumTermMonths === 6 &&
          product.maximumTermMonths === 60
      )
    ) {
      throw new Error("Admin should see seeded loan products.");
    }

    const smokeLoanProductInput = {
      code: "SMOKE-LOAN",
      name: "Smoke Test Loan",
      description: "Loan product created by the smoke test.",
      minimumPrincipal: 2000,
      maximumPrincipal: 30000,
      minimumTermMonths: 2,
      maximumTermMonths: 12,
      annualInterestRateBps: 3000,
      interestMethod: "Diminishing Balance",
      paymentFrequency: "Monthly",
      processingFee: 0,
      serviceFeeRateBps: 450,
      insuranceFeeRateBps: 150,
      cbuRateBps: 200,
      savingsRetentionRateBps: 100,
      cbuOptional: true,
      penaltyRateBps: 200,
      loansReceivableAccount: "1050",
      interestIncomeAccount: "4010",
      processingFeeAccount: "4030",
      insuranceIncomeAccount: "4050",
      shareCapitalAccount: "3010",
      savingsAccount: "2020",
      penaltyIncomeAccount: "4040",
      cashAccount: "1010",
      status: "Active"
    };
    const createLoanProduct = await fetch(`${baseUrl}/api/loan-products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie
      },
      body: JSON.stringify(smokeLoanProductInput)
    });
    const createLoanProductBody = await createLoanProduct.json();

    if (
      !createLoanProduct.ok ||
      createLoanProductBody.product.code !== "SMOKE-LOAN" ||
      createLoanProductBody.product.serviceFeeRateBps !== 450
    ) {
      throw new Error("Admin should create validated loan products.");
    }

    const duplicateLoanProduct = await fetch(`${baseUrl}/api/loan-products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie
      },
      body: JSON.stringify(smokeLoanProductInput)
    });

    if (duplicateLoanProduct.status !== 409) {
      throw new Error("Duplicate loan product codes should be rejected.");
    }

    const updateLoanProduct = await fetch(`${baseUrl}/api/loan-products/SMOKE-LOAN`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie
      },
      body: JSON.stringify({
        ...smokeLoanProductInput,
        maximumPrincipal: 40000,
        status: "Inactive"
      })
    });
    const updateLoanProductBody = await updateLoanProduct.json();

    if (
      !updateLoanProduct.ok ||
      updateLoanProductBody.product.maximumPrincipal !== 40000 ||
      updateLoanProductBody.product.status !== "Inactive"
    ) {
      throw new Error("Admin should update loan product rules and status.");
    }

    const forbiddenMembershipLoanProducts = await fetch(`${baseUrl}/api/loan-products`, {
      headers: { Cookie: cookie }
    });

    if (forbiddenMembershipLoanProducts.status !== 403) {
      throw new Error("Membership Officer should not receive loan product access.");
    }

    const forbiddenMembershipLoanApplications = await fetch(`${baseUrl}/api/loan-applications`, {
      headers: { Cookie: cookie }
    });

    if (forbiddenMembershipLoanApplications.status !== 403) {
      throw new Error("Membership Officer should not receive loan application access.");
    }

    const adminLoanApplications = await fetch(`${baseUrl}/api/loan-applications`, {
      headers: { Cookie: adminCookie }
    });
    const adminLoanApplicationRows = await adminLoanApplications.json();

    if (
      !adminLoanApplications.ok ||
      !adminLoanApplicationRows.some((application) => application.applicationNo === "LA-2026-0001")
    ) {
      throw new Error("Admin should have read-only access to submitted loan applications.");
    }

    const forbiddenAdminLoanApplicationCreate = await fetch(`${baseUrl}/api/loan-applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie
      },
      body: JSON.stringify({
        memberNo: "M-000517",
        productCode: "SALARY",
        requestedPrincipal: 10000,
        requestedTermMonths: 6,
        purpose: "Admin must not originate loans",
        applicationDate: "2026-06-19"
      })
    });

    if (forbiddenAdminLoanApplicationCreate.status !== 403) {
      throw new Error("Admin should not create loan applications.");
    }

    const loanOfficerLogin = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "loanofficer", password: "p@55@LL" })
    });
    const loanOfficerCookie = loanOfficerLogin.headers.get("set-cookie")?.split(";")[0];
    const loanOfficerBody = await loanOfficerLogin.json();

    if (
      !loanOfficerLogin.ok ||
      !loanOfficerBody.user.allowedViews.includes("members") ||
      !loanOfficerBody.user.permissions.includes("loans:products:view") ||
      !loanOfficerBody.user.permissions.includes("loans:applications:create") ||
      !loanOfficerBody.user.permissions.includes("loans:applications:edit") ||
      !loanOfficerBody.user.permissions.includes("loans:applications:submit") ||
      loanOfficerBody.user.permissions.includes("loans:products:manage")
    ) {
      throw new Error("Loan Officer should own loan application drafting and submission.");
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
        clusterName: "COMMUNITY A MEMBERS",
        contactNumber: "0999-111-1111",
        initialShareCapital: 5000
      })
    });

    if (forbiddenCreate.status !== 403) {
      throw new Error("Loan officer should be denied member application creation.");
    }

    const loanOfficerProducts = await fetch(`${baseUrl}/api/loan-products`, {
      headers: { Cookie: loanOfficerCookie }
    });
    const loanOfficerProductRows = await loanOfficerProducts.json();

    if (!loanOfficerProducts.ok || !loanOfficerProductRows.some((product) => product.code === "SALARY")) {
      throw new Error("Loan Officer should see loan product rules.");
    }

    const forbiddenLoanProductCreate = await fetch(`${baseUrl}/api/loan-products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: loanOfficerCookie
      },
      body: JSON.stringify({
        ...smokeLoanProductInput,
        code: "OFFICER-BLOCKED"
      })
    });

    if (forbiddenLoanProductCreate.status !== 403) {
      throw new Error("Loan Officer should not create loan products.");
    }

    const invalidLoanApplication = await fetch(`${baseUrl}/api/loan-applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: loanOfficerCookie
      },
      body: JSON.stringify({
        memberNo: "M-000517",
        productCode: "SALARY",
        requestedPrincipal: 100,
        requestedTermMonths: 6,
        purpose: "Amount below the configured product minimum",
        applicationDate: "2026-06-19"
      })
    });

    if (invalidLoanApplication.status !== 400) {
      throw new Error("Loan applications outside product amount limits should be rejected.");
    }

    const createLoanApplication = await fetch(`${baseUrl}/api/loan-applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: loanOfficerCookie
      },
      body: JSON.stringify({
        memberNo: "M-000517",
        productCode: "SALARY",
        requestedPrincipal: 12000,
        requestedTermMonths: 6,
        purpose: "Smoke test livelihood supplies",
        collateralType: "ATM Cards",
        applicationDate: "2026-06-19"
      })
    });
    const createLoanApplicationBody = await createLoanApplication.json();
    const smokeApplicationNo = createLoanApplicationBody.application?.applicationNo;

    if (
      !createLoanApplication.ok ||
      !smokeApplicationNo ||
      createLoanApplicationBody.application.status !== "Draft" ||
      createLoanApplicationBody.application.collateralType !== "ATM Cards" ||
      createLoanApplicationBody.application.annualInterestRateBps !== 3000 ||
      createLoanApplicationBody.application.serviceFeeRateBps !== 450
    ) {
      throw new Error("Loan Officer should create a draft with snapshotted product terms.");
    }

    const saveLoanDocumentForm = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}/document-form`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: loanOfficerCookie
        },
        body: JSON.stringify({
          formData: {
            borrowerAddress: "Smoke borrower address",
            spouseName: "Smoke Spouse",
            coMakerName: "Manual Co Maker",
            promissoryNoteNo: "PN-SMOKE-001",
            placeSigned: "Bislig City"
          }
        })
      }
    );
    const saveLoanDocumentFormBody = await saveLoanDocumentForm.json();

    if (
      !saveLoanDocumentForm.ok ||
      saveLoanDocumentFormBody.form.coMakerName !== "Manual Co Maker" ||
      saveLoanDocumentFormBody.form.spouseName !== "Smoke Spouse"
    ) {
      throw new Error("Loan Officer should save manual loan document form fields.");
    }

    const getLoanDocumentForm = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}/document-form`,
      { headers: { Cookie: loanOfficerCookie } }
    );
    const getLoanDocumentFormBody = await getLoanDocumentForm.json();

    if (
      !getLoanDocumentForm.ok ||
      getLoanDocumentFormBody.form.coMakerName !== "Manual Co Maker" ||
      getLoanDocumentFormBody.form.loanCategory !== "Providential" ||
      Object.hasOwn(getLoanDocumentFormBody.form, "collateralType") ||
      getLoanDocumentFormBody.application.applicationNo !== smokeApplicationNo
    ) {
      throw new Error("Loan document form should be returned with its loan application.");
    }

    const updateLoanApplication = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: loanOfficerCookie
        },
        body: JSON.stringify({
          memberNo: "M-000517",
          productCode: "SALARY",
          requestedPrincipal: 15000,
          requestedTermMonths: 9,
          purpose: "Updated smoke test livelihood supplies",
          collateralType: "PDC",
          applicationDate: "2026-06-19"
        })
      }
    );
    const updateLoanApplicationBody = await updateLoanApplication.json();

    if (
      !updateLoanApplication.ok ||
      updateLoanApplicationBody.application.requestedPrincipal !== 15000 ||
      updateLoanApplicationBody.application.collateralType !== "PDC" ||
      updateLoanApplicationBody.application.status !== "Draft"
    ) {
      throw new Error("Loan Officer should edit their own draft application.");
    }

    const submitLoanApplication = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}/submit`,
      {
        method: "POST",
        headers: { Cookie: loanOfficerCookie }
      }
    );
    const submitLoanApplicationBody = await submitLoanApplication.json();

    if (
      !submitLoanApplication.ok ||
      submitLoanApplicationBody.application.status !== "Submitted" ||
      submitLoanApplicationBody.application.submittedBy !== "loanofficer"
    ) {
      throw new Error("Loan Officer should submit their own validated draft.");
    }

    const duplicateLoanApplicationSubmit = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}/submit`,
      {
        method: "POST",
        headers: { Cookie: loanOfficerCookie }
      }
    );

    if (duplicateLoanApplicationSubmit.status !== 409) {
      throw new Error("Submitted loan applications should not be submitted twice.");
    }

    const immutableSubmittedApplication = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: loanOfficerCookie
        },
        body: JSON.stringify({
          memberNo: "M-000517",
          productCode: "SALARY",
          requestedPrincipal: 16000,
          requestedTermMonths: 9,
          purpose: "Submitted records must be immutable",
          collateralType: "PDC",
          applicationDate: "2026-06-19"
        })
      }
    );

    if (immutableSubmittedApplication.status !== 409) {
      throw new Error("Submitted loan applications should be immutable.");
    }

    const retiredApproverLogin = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "approver", password: "p@55@LL" })
    });

    if (retiredApproverLogin.status !== 401) {
      throw new Error("Retired approver demo account should no longer be able to log in.");
    }

    const adminLoanApplicationsForDecision = await fetch(`${baseUrl}/api/loan-applications`, {
      headers: { Cookie: adminCookie }
    });
    const adminDecisionApplicationRows = await adminLoanApplicationsForDecision.json();

    if (
      !adminBody.user.permissions.includes("loans:applications:decide") ||
      !adminLoanApplicationsForDecision.ok ||
      !adminDecisionApplicationRows.length ||
      !adminDecisionApplicationRows.some(
        (application) => application.applicationNo === smokeApplicationNo && application.status === "Submitted"
      )
    ) {
      throw new Error("Admin should see and decide the submitted loan application queue.");
    }

    const invalidReturnDecision = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}/decision`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookie
        },
        body: JSON.stringify({
          decision: "Returned",
          creditAssessmentNotes: "Income evidence needs clarification.",
          recommendedPrincipal: 0,
          recommendedTermMonths: 0,
          decisionRemarks: "",
          decisionDate: "2026-06-19"
        })
      }
    );

    if (invalidReturnDecision.status !== 400) {
      throw new Error("Returned applications should require decision remarks.");
    }

    const returnLoanApplication = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}/decision`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookie
        },
        body: JSON.stringify({
          decision: "Returned",
          creditAssessmentNotes: "Income evidence needs clarification.",
          recommendedPrincipal: 0,
          recommendedTermMonths: 0,
          decisionRemarks: "Add the latest livelihood income details.",
          decisionDate: "2026-06-19"
        })
      }
    );
    const returnLoanApplicationBody = await returnLoanApplication.json();

    if (
      !returnLoanApplication.ok ||
      returnLoanApplicationBody.application.status !== "Returned" ||
      returnLoanApplicationBody.application.decidedBy !== "admin"
    ) {
      throw new Error("Admin should return a submitted application with recorded review evidence.");
    }

    const editReturnedApplication = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: loanOfficerCookie
        },
        body: JSON.stringify({
          memberNo: "M-000517",
          productCode: "SALARY",
          requestedPrincipal: 14000,
          requestedTermMonths: 8,
          purpose: "Livelihood supplies with updated income details",
          collateralType: "ATM Cards",
          applicationDate: "2026-06-19"
        })
      }
    );
    const editReturnedApplicationBody = await editReturnedApplication.json();

    if (
      !editReturnedApplication.ok ||
      editReturnedApplicationBody.application.status !== "Draft" ||
      editReturnedApplicationBody.application.decision !== "Returned"
    ) {
      throw new Error("Loan Officer should revise a returned application back into Draft while retaining review evidence.");
    }

    const resubmitLoanApplication = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}/submit`,
      {
        method: "POST",
        headers: { Cookie: loanOfficerCookie }
      }
    );
    const resubmitLoanApplicationBody = await resubmitLoanApplication.json();

    if (!resubmitLoanApplication.ok || resubmitLoanApplicationBody.application.status !== "Submitted") {
      throw new Error("Loan Officer should resubmit a revised returned application.");
    }

    const excessiveApproval = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}/decision`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookie
        },
        body: JSON.stringify({
          decision: "Approved",
          creditAssessmentNotes: "Updated income details are acceptable.",
          recommendedPrincipal: 15000,
          recommendedTermMonths: 8,
          decisionRemarks: "Recommended within repayment capacity.",
          decisionDate: "2026-06-19"
        })
      }
    );

    if (excessiveApproval.status !== 400) {
      throw new Error("Approved principal should not exceed the revised requested principal.");
    }

    const approveLoanApplication = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}/decision`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookie
        },
        body: JSON.stringify({
          decision: "Approved",
          creditAssessmentNotes: "Updated income details support the requested repayment plan.",
          recommendedPrincipal: 13000,
          recommendedTermMonths: 8,
          decisionRemarks: "Recommended for the next computation stage.",
          decisionDate: "2026-06-19"
        })
      }
    );
    const approveLoanApplicationBody = await approveLoanApplication.json();

    if (
      !approveLoanApplication.ok ||
      approveLoanApplicationBody.application.status !== "Approved" ||
      approveLoanApplicationBody.application.recommendedPrincipal !== 13000 ||
      approveLoanApplicationBody.application.recommendedTermMonths !== 8
    ) {
      throw new Error("Admin should approve a resubmitted application within requested limits.");
    }

    const duplicateCreditDecision = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}/decision`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookie
        },
        body: JSON.stringify({
          decision: "Rejected",
          creditAssessmentNotes: "This second decision must not be accepted.",
          decisionRemarks: "Already decided.",
          decisionDate: "2026-06-19"
        })
      }
    );

    if (duplicateCreditDecision.status !== 409) {
      throw new Error("Approved applications should not receive another credit decision.");
    }

    const forbiddenLoanOfficerDecision = await fetch(
      `${baseUrl}/api/loan-applications/LA-2026-0001/decision`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: loanOfficerCookie
        },
        body: JSON.stringify({
          decision: "Approved",
          creditAssessmentNotes: "Loan Officer cannot decide applications.",
          recommendedPrincipal: 30000,
          recommendedTermMonths: 12,
          decisionRemarks: "",
          decisionDate: "2026-06-19"
        })
      }
    );

    if (forbiddenLoanOfficerDecision.status !== 403) {
      throw new Error("Loan Officer should not record credit decisions.");
    }

    const invalidComputationDate = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}/computation-preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: loanOfficerCookie
        },
        body: JSON.stringify({ firstPaymentDate: "2026-06-19" })
      }
    );

    if (invalidComputationDate.status !== 400) {
      throw new Error("First payment date should be after the credit decision date.");
    }

    const previewLoanComputation = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}/computation-preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: loanOfficerCookie
        },
        body: JSON.stringify({ firstPaymentDate: "2026-07-19" })
      }
    );
    const previewLoanComputationBody = await previewLoanComputation.json();
    const previewSchedule = previewLoanComputationBody.computation;

    if (
      !previewLoanComputation.ok ||
      previewSchedule.principal !== 13000 ||
      previewSchedule.totalInterest !== 1462.52 ||
      previewSchedule.totalPayable !== 14462.52 ||
      previewSchedule.processingFee !== 585 ||
      previewSchedule.insuranceFee !== 195 ||
      previewSchedule.cbuAmount !== 260 ||
      previewSchedule.savingsRetentionAmount !== 130 ||
      previewSchedule.netProceeds !== 11830 ||
      previewSchedule.installmentCount !== 8 ||
      previewSchedule.installments.length !== 8 ||
      previewSchedule.maturityDate !== "2027-02-19" ||
      Math.round(previewSchedule.installments.reduce((sum, item) => sum + item.totalDue, 0) * 100) / 100 !== 14462.52
    ) {
      throw new Error("Diminishing-interest preview should produce a balanced centavo-accurate amortization schedule.");
    }

    const saveLoanComputation = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}/computation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: loanOfficerCookie
        },
        body: JSON.stringify({ firstPaymentDate: "2026-07-19" })
      }
    );
    const saveLoanComputationBody = await saveLoanComputation.json();
    const smokeLoanNo = saveLoanComputationBody.loan?.loanNo;

    if (
      !saveLoanComputation.ok ||
      !smokeLoanNo ||
      saveLoanComputationBody.loan.status !== "For Release" ||
      saveLoanComputationBody.loan.installments.length !== 8
    ) {
      throw new Error("Loan Officer should save one immutable computation for release.");
    }

    const duplicateLoanComputation = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}/computation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: loanOfficerCookie
        },
        body: JSON.stringify({ firstPaymentDate: "2026-07-19" })
      }
    );

    if (duplicateLoanComputation.status !== 409) {
      throw new Error("An application should not receive a duplicate saved computation.");
    }

    const loanOfficerLoans = await fetch(`${baseUrl}/api/loans`, {
      headers: { Cookie: loanOfficerCookie }
    });
    const loanOfficerLoanRows = await loanOfficerLoans.json();

    if (
      !loanOfficerLoans.ok ||
      !loanOfficerLoanRows.some(
        (loan) => loan.loanNo === smokeLoanNo && loan.applicationNo === smokeApplicationNo
      )
    ) {
      throw new Error("Loan Officer should see saved computations and installment schedules.");
    }

    const adminLoans = await fetch(`${baseUrl}/api/loans`, {
      headers: { Cookie: adminCookie }
    });
    const adminLoanRows = await adminLoans.json();

    if (
      !adminLoans.ok ||
      !adminLoanRows.some((loan) => loan.loanNo === smokeLoanNo && loan.status === "For Release")
    ) {
      throw new Error("Admin should have read-only visibility of saved loan computations.");
    }

    const forbiddenAdminComputation = await fetch(
      `${baseUrl}/api/loan-applications/${smokeApplicationNo}/computation-preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookie
        },
        body: JSON.stringify({ firstPaymentDate: "2026-07-19" })
      }
    );

    if (forbiddenAdminComputation.status !== 403) {
      throw new Error("Admin should decide applications but should not create loan computations.");
    }

    const forbiddenMembershipLoans = await fetch(`${baseUrl}/api/loans`, {
      headers: { Cookie: cookie }
    });

    if (forbiddenMembershipLoans.status !== 403) {
      throw new Error("Membership Officer should not receive loan computation access.");
    }

    const closeReviewedBatchForRelease = await fetch(
      `${baseUrl}/api/teller-batches/${secondReviewedBatchBody.batch.id}/close`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: bookkeeperCookie
        },
        body: JSON.stringify({
          closingNote: "Close reviewed batch before testing the loan release cash-out."
        })
      }
    );

    if (!closeReviewedBatchForRelease.ok) {
      throw new Error("Reviewed teller batch should close before a new loan release transaction.");
    }

    if (
      !managerLogin.ok ||
      !managerBody.user.permissions.includes("teller-fundings:approve")
    ) {
      throw new Error("General Manager should approve prepared teller funding.");
    }

    const unfundedLoanRelease = await fetch(`${baseUrl}/api/loans/${smokeLoanNo}/release`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({
        releaseDate: "2026-07-20",
        referenceNo: "LV-SMOKE-NO-FUNDING",
        cashReleased: 11830
      })
    });
    const unfundedLoanReleaseBody = await unfundedLoanRelease.json();

    if (
      unfundedLoanRelease.status !== 409 ||
      !unfundedLoanReleaseBody.error?.includes("Insufficient teller cash")
    ) {
      throw new Error(
        `Teller should not release a loan before sufficient cash is available. Got ${unfundedLoanRelease.status}: ${JSON.stringify(unfundedLoanReleaseBody)}`
      );
    }

    const fundingPositionBeforeFunding = await fetch(
      `${baseUrl}/api/teller-funding-position`,
      { headers: { Cookie: bookkeeperCookie } }
    );
    const fundingPositionBeforeFundingBody = await fundingPositionBeforeFunding.json();

    if (
      !fundingPositionBeforeFunding.ok ||
      fundingPositionBeforeFundingBody.totalReleaseDemand !== 11830 ||
      fundingPositionBeforeFundingBody.availableCash !== 0 ||
      fundingPositionBeforeFundingBody.fundingShortage !== 11830 ||
      !fundingPositionBeforeFundingBody.releaseQueue.some(
        (loan) => loan.loanNo === smokeLoanNo && loan.netProceeds === 11830
      )
    ) {
      throw new Error("Bookkeeper should see the For Release funding demand and current shortage.");
    }

    const prepareTellerFunding = await fetch(`${baseUrl}/api/teller-fundings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: bookkeeperCookie
      },
      body: JSON.stringify({
        tellerUsername: "teller01",
        amount: 20000,
        sourceAccountCode: "1020",
        sourceAccountName: "Cash in Bank",
        referenceNo: "TF-SMOKE-001",
        fundingDate: "2026-07-20"
      })
    });
    const prepareTellerFundingBody = await prepareTellerFunding.json();
    const smokeFundingNo = prepareTellerFundingBody.funding?.fundingNo;

    if (
      !prepareTellerFunding.ok ||
      !smokeFundingNo ||
      prepareTellerFundingBody.funding.status !== "Prepared" ||
      prepareTellerFundingBody.funding.preparedBy !== "bookkeeper"
    ) {
      throw new Error("Bookkeeper should prepare teller funding from an identified source account.");
    }

    const forbiddenBookkeeperApproval = await fetch(
      `${baseUrl}/api/teller-fundings/${smokeFundingNo}/approve`,
      {
        method: "POST",
        headers: { Cookie: bookkeeperCookie }
      }
    );

    if (forbiddenBookkeeperApproval.status !== 403) {
      throw new Error("Bookkeeper should not approve their prepared teller funding.");
    }

    const approveTellerFunding = await fetch(
      `${baseUrl}/api/teller-fundings/${smokeFundingNo}/approve`,
      {
        method: "POST",
        headers: { Cookie: managerCookie }
      }
    );
    const approveTellerFundingBody = await approveTellerFunding.json();

    if (
      !approveTellerFunding.ok ||
      approveTellerFundingBody.funding.status !== "Approved" ||
      approveTellerFundingBody.funding.approvedBy !== "manager"
    ) {
      throw new Error("General Manager should approve prepared teller funding.");
    }

    const acknowledgeTellerFunding = await fetch(
      `${baseUrl}/api/teller-fundings/${smokeFundingNo}/acknowledge`,
      {
        method: "POST",
        headers: { Cookie: tellerCookie }
      }
    );
    const acknowledgeTellerFundingBody = await acknowledgeTellerFunding.json();

    if (
      !acknowledgeTellerFunding.ok ||
      acknowledgeTellerFundingBody.funding.status !== "Acknowledged" ||
      !acknowledgeTellerFundingBody.funding.batchId ||
      acknowledgeTellerFundingBody.funding.acknowledgedBy !== "teller01"
    ) {
      throw new Error("Assigned Teller should acknowledge approved funding into the Open batch.");
    }

    const duplicateFundingAcknowledgment = await fetch(
      `${baseUrl}/api/teller-fundings/${smokeFundingNo}/acknowledge`,
      {
        method: "POST",
        headers: { Cookie: tellerCookie }
      }
    );

    if (duplicateFundingAcknowledgment.status !== 409) {
      throw new Error("Acknowledged teller funding should not be acknowledged twice.");
    }

    const fundingPositionAfterFunding = await fetch(
      `${baseUrl}/api/teller-funding-position`,
      { headers: { Cookie: tellerCookie } }
    );
    const fundingPositionAfterFundingBody = await fundingPositionAfterFunding.json();

    if (
      !fundingPositionAfterFunding.ok ||
      fundingPositionAfterFundingBody.openingFunding !== 20000 ||
      fundingPositionAfterFundingBody.availableCash !== 20000 ||
      fundingPositionAfterFundingBody.fundingShortage !== 0
    ) {
      throw new Error("Acknowledged funding should clear the Teller release shortage.");
    }

    const tellerLoansBeforeRelease = await fetch(`${baseUrl}/api/loans`, {
      headers: { Cookie: tellerCookie }
    });
    const tellerLoansBeforeReleaseRows = await tellerLoansBeforeRelease.json();

    if (
      !tellerLoansBeforeRelease.ok ||
      !tellerLoansBeforeReleaseRows.some((loan) => loan.loanNo === smokeLoanNo && loan.status === "For Release")
    ) {
      throw new Error("Teller should see the For Release loan queue.");
    }

    const tellerBatchesBeforeRelease = await fetch(`${baseUrl}/api/teller-batches`, {
      headers: { Cookie: tellerCookie }
    });
    const tellerBatchesBeforeReleaseBody = await tellerBatchesBeforeRelease.json();
    const openBatchBeforeRelease = tellerBatchesBeforeReleaseBody.find((batch) => batch.status === "Open");
    const openBatchDetailsBeforeRelease = await fetch(
      `${baseUrl}/api/teller-batches/${openBatchBeforeRelease.id}`,
      { headers: { Cookie: tellerCookie } }
    );
    const openBatchDetailsBeforeReleaseBody = await openBatchDetailsBeforeRelease.json();
    const cashOutBeforeRelease = openBatchDetailsBeforeReleaseBody.transactions.reduce(
      (sum, transaction) => sum + Number(transaction.cashOut || 0),
      0
    );

    if (
      openBatchDetailsBeforeReleaseBody.openingFunding !== 20000 ||
      !openBatchDetailsBeforeReleaseBody.fundings.some(
        (funding) => funding.fundingNo === smokeFundingNo && funding.status === "Acknowledged"
      )
    ) {
      throw new Error("Acknowledged funding should become opening cash evidence for the Open batch.");
    }

    const incorrectCashRelease = await fetch(`${baseUrl}/api/loans/${smokeLoanNo}/release`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({
        releaseDate: "2026-07-20",
        referenceNo: "LV-SMOKE-WRONG-CASH",
        cashReleased: 12000
      })
    });

    if (incorrectCashRelease.status !== 400) {
      throw new Error("Loan release cash should exactly match computed net proceeds.");
    }

    const duplicateCashOutReference = await fetch(`${baseUrl}/api/loans/${smokeLoanNo}/release`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({
        releaseDate: "2026-07-20",
        referenceNo: "WV-SMOKE-001",
        cashReleased: 11830
      })
    });

    if (duplicateCashOutReference.status !== 409) {
      throw new Error("Loan release vouchers should not reuse an existing cash-out reference.");
    }

    const releaseLoan = await fetch(`${baseUrl}/api/loans/${smokeLoanNo}/release`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({
        releaseDate: "2026-07-20",
        referenceNo: "LV-SMOKE-001",
        cashReleased: 11830
      })
    });
    const releaseLoanBody = await releaseLoan.json();
    const smokeReleaseNo = releaseLoanBody.release?.releaseNo;

    if (
      !releaseLoan.ok ||
      !smokeReleaseNo ||
      releaseLoanBody.release.status !== "Teller Batch" ||
      releaseLoanBody.release.cashReleased !== 11830 ||
      releaseLoanBody.loan.status !== "Released"
    ) {
      throw new Error("Teller should record an immutable loan release in the open teller batch.");
    }

    const duplicateLoanRelease = await fetch(`${baseUrl}/api/loans/${smokeLoanNo}/release`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({
        releaseDate: "2026-07-20",
        referenceNo: "LV-SMOKE-002",
        cashReleased: 11830
      })
    });

    if (duplicateLoanRelease.status !== 409) {
      throw new Error("A released loan should not be released twice.");
    }

    const tellerLoanReleases = await fetch(`${baseUrl}/api/loan-releases`, {
      headers: { Cookie: tellerCookie }
    });
    const tellerLoanReleaseRows = await tellerLoanReleases.json();

    if (
      !tellerLoanReleases.ok ||
      !tellerLoanReleaseRows.some(
        (release) => release.releaseNo === smokeReleaseNo && release.referenceNo === "LV-SMOKE-001"
      )
    ) {
      throw new Error("Teller should see immutable loan release history.");
    }

    const tellerBatchesAfterRelease = await fetch(`${baseUrl}/api/teller-batches`, {
      headers: { Cookie: tellerCookie }
    });
    const tellerBatchesAfterReleaseBody = await tellerBatchesAfterRelease.json();
    const releaseBatch = tellerBatchesAfterReleaseBody.find(
      (batch) => batch.id === releaseLoanBody.release.batchId
    );
    const releaseBatchDetails = await fetch(`${baseUrl}/api/teller-batches/${releaseBatch.id}`, {
      headers: { Cookie: tellerCookie }
    });
    const releaseBatchDetailsBody = await releaseBatchDetails.json();
    const cashOutAfterRelease = releaseBatchDetailsBody.transactions.reduce(
      (sum, transaction) => sum + Number(transaction.cashOut || 0),
      0
    );

    if (
      !tellerBatchesAfterRelease.ok ||
      !releaseBatchDetails.ok ||
      cashOutAfterRelease !== cashOutBeforeRelease + 11830
    ) {
      throw new Error("Loan release net proceeds should increase teller batch cash-out.");
    }

    const releaseCashCount = await fetch(`${baseUrl}/api/teller-cash-count`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({ actualCash: 8170 })
    });
    const releaseCashCountBody = await releaseCashCount.json();

    if (
      !releaseCashCount.ok ||
      releaseCashCountBody.batch.status !== "Submitted" ||
      releaseCashCountBody.cashCount.expectedCash !== 8170 ||
      releaseCashCountBody.cashCount.variance !== 0
    ) {
      throw new Error("Opening funding less loan proceeds should produce the expected ending teller cash.");
    }

    const reviewReleaseBatch = await fetch(
      `${baseUrl}/api/teller-batches/${releaseLoanBody.release.batchId}/review`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: bookkeeperCookie
        },
        body: JSON.stringify({ varianceNote: "" })
      }
    );

    if (!reviewReleaseBatch.ok) {
      throw new Error("Bookkeeper should review the teller batch containing the loan release.");
    }

    const postReleaseBatch = await fetch(
      `${baseUrl}/api/ledger/teller-batches/${releaseLoanBody.release.batchId}/post-reviewed`,
      {
        method: "POST",
        headers: { Cookie: bookkeeperCookie }
      }
    );
    const postReleaseBatchBody = await postReleaseBatch.json();
    const postedReleaseResult = postReleaseBatchBody.results?.find(
      (result) => result.id === smokeReleaseNo && result.batchType === "Loan Release"
    );
    const postedFundingResult = postReleaseBatchBody.results?.find(
      (result) => result.id === smokeFundingNo && result.batchType === "Teller Cash Funding"
    );
    const releaseDebitTotal = postedReleaseResult?.entry.lines.reduce(
      (sum, line) => sum + Number(line.debit || 0),
      0
    );
    const releaseCreditTotal = postedReleaseResult?.entry.lines.reduce(
      (sum, line) => sum + Number(line.credit || 0),
      0
    );
    const releaseReceivableLine = postedReleaseResult?.entry.lines.find(
      (line) => line.accountCode === "1050" && line.debit === 13000
    );
    const releaseCashLine = postedReleaseResult?.entry.lines.find(
      (line) => line.accountCode === "1010" && line.credit === 11830
    );
    const releaseFeeLine = postedReleaseResult?.entry.lines.find(
      (line) => line.accountCode === "4030" && line.credit === 585
    );
    const releaseInsuranceLine = postedReleaseResult?.entry.lines.find(
      (line) => line.accountCode === "4050" && line.credit === 195
    );
    const releaseCbuLine = postedReleaseResult?.entry.lines.find(
      (line) => line.accountCode === "3010" && line.credit === 260
    );
    const releaseSavingsLine = postedReleaseResult?.entry.lines.find(
      (line) => line.accountCode === "2020" && line.credit === 130
    );
    const fundingDebitTotal = postedFundingResult?.entry.lines.reduce(
      (sum, line) => sum + Number(line.debit || 0),
      0
    );
    const fundingCreditTotal = postedFundingResult?.entry.lines.reduce(
      (sum, line) => sum + Number(line.credit || 0),
      0
    );
    const fundingCashLine = postedFundingResult?.entry.lines.find(
      (line) => line.accountCode === "1010" && line.debit === 20000
    );
    const fundingSourceLine = postedFundingResult?.entry.lines.find(
      (line) => line.accountCode === "1020" && line.credit === 20000
    );

    if (
      !postReleaseBatch.ok ||
      postReleaseBatchBody.postedCount !== 2 ||
      postReleaseBatchBody.transactionPostedCount !== 1 ||
      postReleaseBatchBody.fundingPostedCount !== 1 ||
      !postedReleaseResult ||
      !postedFundingResult ||
      releaseDebitTotal !== 13000 ||
      releaseCreditTotal !== 13000 ||
      !releaseReceivableLine ||
      !releaseCashLine ||
      !releaseFeeLine ||
      !releaseInsuranceLine ||
      !releaseCbuLine ||
      !releaseSavingsLine ||
      fundingDebitTotal !== 20000 ||
      fundingCreditTotal !== 20000 ||
      !fundingCashLine ||
      !fundingSourceLine
    ) {
      throw new Error("Bookkeeper should post balanced funding and loan release journals from the reviewed batch.");
    }

    const postedTellerFundings = await fetch(`${baseUrl}/api/teller-fundings`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const postedTellerFundingsBody = await postedTellerFundings.json();
    const postedFunding = postedTellerFundingsBody.fundings?.find(
      (funding) => funding.fundingNo === smokeFundingNo
    );

    if (
      !postedTellerFundings.ok ||
      postedFunding?.status !== "Acknowledged" ||
      postedFunding?.postedBy !== "bookkeeper" ||
      postedFunding?.postedEntryNo !== postedFundingResult.entry.id
    ) {
      throw new Error("Acknowledged funding should retain custody status and expose its journal evidence.");
    }

    const postedReleaseBatchDetails = await fetch(
      `${baseUrl}/api/teller-batches/${releaseLoanBody.release.batchId}`,
      { headers: { Cookie: bookkeeperCookie } }
    );
    const postedReleaseBatchDetailsBody = await postedReleaseBatchDetails.json();

    if (
      !postedReleaseBatchDetails.ok ||
      !postedReleaseBatchDetailsBody.journalEntries.some(
        (entry) => entry.id === postedFundingResult.entry.id
      ) ||
      !postedReleaseBatchDetailsBody.journalEntries.some(
        (entry) => entry.id === postedReleaseResult.entry.id
      )
    ) {
      throw new Error("Batch details should link both funding and loan release journal entries.");
    }

    const postedLoanReleases = await fetch(`${baseUrl}/api/loan-releases`, {
      headers: { Cookie: tellerCookie }
    });
    const postedLoanReleaseRows = await postedLoanReleases.json();
    const postedRelease = postedLoanReleaseRows.find((release) => release.releaseNo === smokeReleaseNo);

    if (
      !postedLoanReleases.ok ||
      postedRelease?.status !== "Posted" ||
      postedRelease?.postedEntryNo !== postedReleaseResult.entry.id
    ) {
      throw new Error("Loan release history should expose its posted journal evidence.");
    }

    const postedLoanRows = await (await fetch(`${baseUrl}/api/loans`, {
      headers: { Cookie: loanOfficerCookie }
    })).json();
    const postedLoan = postedLoanRows.find((loan) => loan.loanNo === smokeLoanNo);

    if (postedLoan?.status !== "Posted") {
      throw new Error("Posted loan release should move the loan to Posted status.");
    }

    const repostReleaseBatch = await fetch(
      `${baseUrl}/api/ledger/teller-batches/${releaseLoanBody.release.batchId}/post-reviewed`,
      {
        method: "POST",
        headers: { Cookie: bookkeeperCookie }
      }
    );
    const repostReleaseBatchBody = await repostReleaseBatch.json();

    if (
      !repostReleaseBatch.ok ||
      repostReleaseBatchBody.postedCount !== 0 ||
      repostReleaseBatchBody.fundingPostedCount !== 0 ||
      repostReleaseBatchBody.transactionPostedCount !== 0
    ) {
      throw new Error("Posted funding and loan release should not create duplicate journal entries.");
    }

    const closeReleaseBatchForCollection = await fetch(
      `${baseUrl}/api/teller-batches/${releaseLoanBody.release.batchId}/close`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: bookkeeperCookie
        },
        body: JSON.stringify({
          closingNote: "Close the completed release batch before installment collection."
        })
      }
    );

    if (!closeReleaseBatchForCollection.ok) {
      throw new Error("Bookkeeper should close the fully posted release batch before collection.");
    }

    const tellerCollectionsBefore = await fetch(`${baseUrl}/api/loan-collections`, {
      headers: { Cookie: tellerCookie }
    });
    const tellerCollectionsBeforeRows = await tellerCollectionsBefore.json();

    if (!tellerCollectionsBefore.ok || tellerCollectionsBeforeRows.length !== 0) {
      throw new Error("Teller should start with an empty loan collection history.");
    }

    const collectionBeforeReleaseDate = await fetch(
      `${baseUrl}/api/loans/${smokeLoanNo}/collections`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: tellerCookie
        },
        body: JSON.stringify({
          collectionDate: "2026-06-30",
          referenceNo: "OR-LOAN-EARLY-DATE",
          amountReceived: 1950
        })
      }
    );

    if (collectionBeforeReleaseDate.status !== 400) {
      throw new Error("Collection date should not precede the actual loan release date.");
    }

    const excessiveCollectionAmount = await fetch(
      `${baseUrl}/api/loans/${smokeLoanNo}/collections`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: tellerCookie
        },
        body: JSON.stringify({
          collectionDate: "2026-07-21",
          referenceNo: "OR-LOAN-EXCESSIVE",
          amountReceived: 999999
        })
      }
    );

    if (excessiveCollectionAmount.status !== 400) {
      throw new Error("Loan collections should reject payment above the remaining loan balance.");
    }

    const recordLoanCollection = await fetch(
      `${baseUrl}/api/loans/${smokeLoanNo}/collections`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: tellerCookie
        },
        body: JSON.stringify({
          collectionDate: "2026-07-21",
          referenceNo: "OR-LOAN-SMOKE-001",
          amountReceived: 1950
        })
      }
    );
    const recordLoanCollectionBody = await recordLoanCollection.json();
    const smokeCollectionNo = recordLoanCollectionBody.collection?.collectionNo;

    if (
      !recordLoanCollection.ok ||
      !smokeCollectionNo ||
      recordLoanCollectionBody.collection.installmentNo !== 1 ||
      recordLoanCollectionBody.collection.principalAmount !== 1625 ||
      recordLoanCollectionBody.collection.interestAmount !== 325 ||
      recordLoanCollectionBody.collection.amountReceived !== 1950 ||
      recordLoanCollectionBody.collection.status !== "Teller Batch"
    ) {
      throw new Error("Teller should record the exact next scheduled installment in the Open batch.");
    }

    const collectedLoan = recordLoanCollectionBody.loan;
    if (
      collectedLoan.installments.find((item) => item.installmentNo === 1)?.status !== "Paid" ||
      collectedLoan.installments.find((item) => item.installmentNo === 2)?.status !== "Scheduled"
    ) {
      throw new Error("Collection should mark only the next scheduled installment Paid.");
    }

    const duplicateCollectionReference = await fetch(
      `${baseUrl}/api/loans/${smokeLoanNo}/collections`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: tellerCookie
        },
        body: JSON.stringify({
          collectionDate: "2026-07-21",
          referenceNo: "OR-LOAN-SMOKE-001",
          amountReceived: 1909.38
        })
      }
    );

    if (duplicateCollectionReference.status !== 409) {
      throw new Error("Loan collections should reject a duplicate official receipt reference.");
    }

    const collectionCashCount = await fetch(`${baseUrl}/api/teller-cash-count`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tellerCookie
      },
      body: JSON.stringify({ actualCash: 1950 })
    });
    const collectionCashCountBody = await collectionCashCount.json();

    if (
      !collectionCashCount.ok ||
      collectionCashCountBody.cashCount.expectedCash !== 1950 ||
      collectionCashCountBody.cashCount.variance !== 0
    ) {
      throw new Error("The exact installment receipt should increase expected Teller cash.");
    }

    const collectionBatchId = recordLoanCollectionBody.collection.batchId;
    const reviewCollectionBatch = await fetch(
      `${baseUrl}/api/teller-batches/${collectionBatchId}/review`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: bookkeeperCookie
        },
        body: JSON.stringify({ varianceNote: "" })
      }
    );

    if (!reviewCollectionBatch.ok) {
      throw new Error("Bookkeeper should review the batch containing the installment collection.");
    }

    const postCollectionBatch = await fetch(
      `${baseUrl}/api/ledger/teller-batches/${collectionBatchId}/post-reviewed`,
      {
        method: "POST",
        headers: { Cookie: bookkeeperCookie }
      }
    );
    const postCollectionBatchBody = await postCollectionBatch.json();
    const postedCollectionResult = postCollectionBatchBody.results?.find(
      (result) => result.id === smokeCollectionNo && result.batchType === "Loan Collection"
    );
    const collectionCashLine = postedCollectionResult?.entry.lines.find(
      (line) => line.accountCode === "1010" && line.debit === 1950
    );
    const collectionPrincipalLine = postedCollectionResult?.entry.lines.find(
      (line) => line.accountCode === "1050" && line.credit === 1625
    );
    const collectionInterestLine = postedCollectionResult?.entry.lines.find(
      (line) => line.accountCode === "4010" && line.credit === 325
    );

    if (
      !postCollectionBatch.ok ||
      postCollectionBatchBody.postedCount !== 1 ||
      !postedCollectionResult ||
      !collectionCashLine ||
      !collectionPrincipalLine ||
      !collectionInterestLine
    ) {
      throw new Error("Bookkeeper should post the balanced scheduled installment journal.");
    }

    const postedCollections = await fetch(`${baseUrl}/api/loan-collections`, {
      headers: { Cookie: loanOfficerCookie }
    });
    const postedCollectionRows = await postedCollections.json();
    const postedCollection = postedCollectionRows.find(
      (collection) => collection.collectionNo === smokeCollectionNo
    );

    if (
      !postedCollections.ok ||
      postedCollection?.status !== "Posted" ||
      postedCollection?.postedEntryNo !== postedCollectionResult.entry.id
    ) {
      throw new Error("Loan collection history should expose its posted journal evidence.");
    }

    const forbiddenLoanOfficerRelease = await fetch(`${baseUrl}/api/loans/${smokeLoanNo}/release`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: loanOfficerCookie
      },
      body: JSON.stringify({
        releaseDate: "2026-07-20",
        referenceNo: "LV-SMOKE-OFFICER",
        cashReleased: 11830
      })
    });

    if (forbiddenLoanOfficerRelease.status !== 403) {
      throw new Error("Loan Officer should not record cash releases.");
    }

    const forbiddenMembershipReleases = await fetch(`${baseUrl}/api/loan-releases`, {
      headers: { Cookie: cookie }
    });

    if (forbiddenMembershipReleases.status !== 403) {
      throw new Error("Membership Officer should not receive loan release access.");
    }

    const forbiddenMembershipFundingPosition = await fetch(
      `${baseUrl}/api/teller-funding-position`,
      { headers: { Cookie: cookie } }
    );

    if (forbiddenMembershipFundingPosition.status !== 403) {
      throw new Error("Membership Officer should not receive Teller funding demand access.");
    }

    const forbiddenMembershipCollections = await fetch(`${baseUrl}/api/loan-collections`, {
      headers: { Cookie: cookie }
    });

    if (forbiddenMembershipCollections.status !== 403) {
      throw new Error("Membership Officer should not receive loan collection access.");
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
