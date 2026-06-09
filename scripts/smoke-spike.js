const { spawn } = require("node:child_process");

const port = String(4300 + Math.floor(Math.random() * 500));
const baseUrl = `http://127.0.0.1:${port}`;

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
  const server = spawn(process.execPath, ["backend/src/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: port,
      DB_HOST: ""
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
    await waitForHealth();

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

    console.log("React/MySQL spike API smoke test passed.");
  } finally {
    server.kill();
    await wait(200);
  }

  if (server.exitCode && server.exitCode !== 0) {
    throw new Error(`Spike API exited unexpectedly.\n${output}`);
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
