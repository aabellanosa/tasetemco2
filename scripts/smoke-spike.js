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

    const ledgerBeforePosting = await fetch(`${baseUrl}/api/ledger`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const ledgerBeforePostingBody = await ledgerBeforePosting.json();

    if (!ledgerBeforePostingBody.tellerBatch.some((payment) => payment.id === initialPaymentBody.payment.id)) {
      throw new Error("Bookkeeper ledger view should show the unposted teller payment.");
    }

    const postedPayment = await fetch(
      `${baseUrl}/api/ledger/teller-batches/${initialPaymentBody.payment.id}/post`,
      {
        method: "POST",
        headers: { Cookie: bookkeeperCookie }
      }
    );
    const postedPaymentBody = await postedPayment.json();

    if (!postedPayment.ok || postedPaymentBody.payment.status !== "Posted") {
      throw new Error("Bookkeeper did not post the teller payment.");
    }

    const debitTotal = postedPaymentBody.entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const creditTotal = postedPaymentBody.entry.lines.reduce((sum, line) => sum + line.credit, 0);

    if (debitTotal !== 6100 || creditTotal !== 6100) {
      throw new Error("Posted journal entry should be balanced for the teller payment.");
    }

    const ledgerAfterPosting = await fetch(`${baseUrl}/api/ledger`, {
      headers: { Cookie: bookkeeperCookie }
    });
    const ledgerAfterPostingBody = await ledgerAfterPosting.json();

    if (ledgerAfterPostingBody.tellerBatch.some((payment) => payment.id === initialPaymentBody.payment.id)) {
      throw new Error("Posted teller payment should no longer appear in the unposted batch.");
    }

    if (!ledgerAfterPostingBody.journalEntries.some((entry) => entry.id === postedPaymentBody.entry.id)) {
      throw new Error("Posted journal entry was not returned by the ledger endpoint.");
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

    if (!statementPayment || statementPayment.status !== "Posted") {
      throw new Error("Member statement did not show the posted initial payment.");
    }

    if (statementPayment.journalEntryNo !== postedPaymentBody.entry.id) {
      throw new Error("Member statement did not link the posted transaction to its journal entry.");
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

    const postedSavingsDeposit = await fetch(
      `${baseUrl}/api/ledger/savings-deposits/${savingsDepositBody.deposit.id}/post`,
      {
        method: "POST",
        headers: { Cookie: bookkeeperCookie }
      }
    );
    const postedSavingsDepositBody = await postedSavingsDeposit.json();

    if (!postedSavingsDeposit.ok || postedSavingsDepositBody.deposit.status !== "Posted") {
      throw new Error("Bookkeeper did not post the savings deposit.");
    }

    const savingsDebitTotal = postedSavingsDepositBody.entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const savingsCreditTotal = postedSavingsDepositBody.entry.lines.reduce((sum, line) => sum + line.credit, 0);

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

    if (statementDeposit.journalEntryNo !== postedSavingsDepositBody.entry.id) {
      throw new Error("Member statement did not link the savings deposit to its journal entry.");
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

    const postedSavingsWithdrawal = await fetch(
      `${baseUrl}/api/ledger/savings-withdrawals/${savingsWithdrawalBody.withdrawal.id}/post`,
      {
        method: "POST",
        headers: { Cookie: bookkeeperCookie }
      }
    );
    const postedSavingsWithdrawalBody = await postedSavingsWithdrawal.json();

    if (!postedSavingsWithdrawal.ok || postedSavingsWithdrawalBody.withdrawal.status !== "Posted") {
      throw new Error("Bookkeeper did not post the savings withdrawal.");
    }

    const withdrawalDebitTotal = postedSavingsWithdrawalBody.entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const withdrawalCreditTotal = postedSavingsWithdrawalBody.entry.lines.reduce((sum, line) => sum + line.credit, 0);

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

    if (statementWithdrawal.journalEntryNo !== postedSavingsWithdrawalBody.entry.id) {
      throw new Error("Member statement did not link the savings withdrawal to its journal entry.");
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
