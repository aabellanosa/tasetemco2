const formatMoney = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0
  }).format(value);

const state = {
  currentUser: null,
  metrics: [],
  members: [],
  transactions: [],
  loans: [],
  ledger: [],
  depositProducts: [],
  capitalProducts: [],
  chart: [],
  watchItems: [],
  balanceSheet: [],
  incomeStatement: [],
  users: [],
  roles: []
};

const moduleColumns = [
  "membership",
  "accounts",
  "loans",
  "cash",
  "ledger",
  "reports",
  "security",
  "audit"
];

const accessMatrix = [
  {
    role: "System Administrator",
    membership: "View",
    accounts: "View",
    loans: "View",
    cash: "View",
    ledger: "View",
    reports: "View",
    security: "Admin",
    audit: "View"
  },
  {
    role: "General Manager",
    membership: "View",
    accounts: "View",
    loans: "Approve",
    cash: "View",
    ledger: "View",
    reports: "Approve",
    security: "None",
    audit: "View"
  },
  {
    role: "Accountant / Bookkeeper",
    membership: "View",
    accounts: "Review",
    loans: "Review",
    cash: "Review",
    ledger: "Post",
    reports: "Prepare",
    security: "None",
    audit: "View"
  },
  {
    role: "Loan Officer",
    membership: "View",
    accounts: "View",
    loans: "Process",
    cash: "None",
    ledger: "None",
    reports: "View",
    security: "None",
    audit: "None"
  },
  {
    role: "Credit Committee / Approver",
    membership: "View",
    accounts: "View",
    loans: "Approve",
    cash: "None",
    ledger: "None",
    reports: "View",
    security: "None",
    audit: "View"
  },
  {
    role: "Teller / Cashier",
    membership: "View",
    accounts: "Process",
    loans: "Collect",
    cash: "Process",
    ledger: "None",
    reports: "Own Batch",
    security: "None",
    audit: "None"
  },
  {
    role: "Membership Officer",
    membership: "Process",
    accounts: "None",
    loans: "None",
    cash: "None",
    ledger: "None",
    reports: "View",
    security: "None",
    audit: "None"
  },
  {
    role: "Auditor / Compliance Officer",
    membership: "View",
    accounts: "View",
    loans: "View",
    cash: "View",
    ledger: "View",
    reports: "View",
    security: "View",
    audit: "Admin"
  },
  {
    role: "Board / Read-Only Executive",
    membership: "Summary",
    accounts: "Summary",
    loans: "Summary",
    cash: "None",
    ledger: "None",
    reports: "View",
    security: "None",
    audit: "None"
  }
];

const workflows = {
  "member-application": {
    title: "Member Application",
    owner: "Membership Officer prepares; authorized officer approves.",
    targetView: "members",
    allowedViews: ["members"],
    steps: [
      "Encode member profile and required identification details.",
      "Mark application as Pending Approval.",
      "Collect initial share capital requirement through teller.",
      "Approve membership and assign member number.",
      "Open eligible savings, share capital, or loan services."
    ],
    controls: ["Save draft", "Submit for approval", "Approve membership"]
  },
  "new-transaction": {
    title: "New Teller Transaction",
    owner: "Teller / Cashier processes; supervisor reviews batch.",
    targetView: "accounts",
    allowedViews: ["accounts"],
    steps: [
      "Search active member or account.",
      "Select transaction type: savings deposit, withdrawal, share capital, or loan collection.",
      "Validate balance, teller cash limit, and approval threshold.",
      "Print receipt and keep transaction in current teller batch.",
      "Submit teller batch for review and posting."
    ],
    controls: ["Search member", "Encode transaction", "Print receipt"]
  },
  "teller-batch": {
    title: "Teller Batch Posting",
    owner: "Cashier prepares; accountant or supervisor posts.",
    targetView: "dashboard",
    allowedViews: ["dashboard"],
    steps: [
      "Review all teller transactions for the day.",
      "Compare system cash position with physical cash count.",
      "Resolve shortages, overages, or voided slips.",
      "Submit batch to supervisor or accountant.",
      "Post batch to subsidiary ledgers and the general ledger."
    ],
    controls: ["Review batch", "Cash count", "Submit for posting"]
  },
  "loan-application": {
    title: "Loan Application",
    owner: "Loan Officer prepares; Credit Committee approves.",
    targetView: "loans",
    allowedViews: ["loans"],
    steps: [
      "Create loan application from member profile.",
      "Review savings, share capital, existing loans, and repayment history.",
      "Encode requested amount, term, collateral, and co-makers.",
      "Submit recommendation to approver.",
      "Approve, reject, or return application with conditions."
    ],
    controls: ["New application", "Credit review", "Submit recommendation"]
  },
  "loan-release": {
    title: "Loan Release",
    owner: "Approver authorizes; teller or cashier disburses.",
    targetView: "loans",
    allowedViews: ["loans"],
    steps: [
      "Select approved loan waiting for release.",
      "Confirm deductions, charges, net proceeds, and amortization schedule.",
      "Require release approval if amount exceeds authority level.",
      "Disburse cash, check, or savings credit.",
      "Post loan receivable, service fees, and cash or bank movement."
    ],
    controls: ["Verify approval", "Compute proceeds", "Release loan"]
  },
  "journal-voucher": {
    title: "Journal Voucher",
    owner: "Accountant prepares; reviewer posts.",
    targetView: "ledger",
    allowedViews: ["ledger"],
    steps: [
      "Encode journal header, date, reference, and explanation.",
      "Add debit and credit account lines.",
      "Validate that total debit equals total credit.",
      "Submit for review if maker-checker is enabled.",
      "Post or reverse through controlled journal action."
    ],
    controls: ["New voucher", "Validate balance", "Post journal"]
  },
  "report-export": {
    title: "Report Export",
    owner: "Accountant prepares; management reviews.",
    targetView: "reports",
    allowedViews: ["reports"],
    steps: [
      "Select reporting period.",
      "Generate trial balance and supporting schedules.",
      "Review Statement of Financial Condition and Statement of Operations.",
      "Lock report version after approval.",
      "Export PDF, spreadsheet, or CAIS-ready working file."
    ],
    controls: ["Select period", "Generate report", "Export"]
  },
  "user-setup": {
    title: "User Setup",
    owner: "System Administrator manages accounts and roles.",
    targetView: "users",
    allowedViews: ["users"],
    steps: [
      "Create individual user account.",
      "Assign role and default landing screen.",
      "Issue temporary password and require change at first login.",
      "Deactivate accounts when staff leave or change assignment.",
      "Review user activity from audit trail."
    ],
    controls: ["Add user", "Assign role", "Reset password"]
  },
  "global-search": {
    title: "Global Search",
    owner: "Every role searches only records allowed by access level.",
    targetView: "workflow",
    allowedViews: ["workflow"],
    steps: [
      "Search by member name, member number, account, loan number, or receipt reference.",
      "Filter results based on the logged-in role.",
      "Open the selected record in read-only or process mode.",
      "Record sensitive lookups in the audit trail when needed."
    ],
    controls: ["Search", "Filter results", "Open record"]
  },
  "exception-review": {
    title: "Exception Review",
    owner: "Manager, accountant, or auditor reviews alerts.",
    targetView: "dashboard",
    allowedViews: ["dashboard"],
    steps: [
      "Review past due loans, unposted batches, cash limit alerts, and dormant accounts.",
      "Assign each exception to the responsible officer.",
      "Resolve, approve, or escalate based on policy.",
      "Keep exception history for audit review."
    ],
    controls: ["Review alert", "Assign owner", "Resolve"]
  }
};

const rolePrimaryWorkflow = {
  "System Administrator": "user-setup",
  "General Manager": "exception-review",
  "Accountant / Bookkeeper": "journal-voucher",
  "Loan Officer": "loan-application",
  "Credit Committee / Approver": "loan-application",
  "Teller / Cashier": "new-transaction",
  "Membership Officer": "member-application",
  "Auditor / Compliance Officer": "exception-review",
  "Board / Read-Only Executive": "report-export"
};

async function fetchJson(path) {
  const response = await fetch(path, { credentials: "same-origin" });

  if (!response.ok) {
    throw new Error(`Request failed: ${path}`);
  }

  return response.json();
}

async function postJson(path, payload = {}) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${path}`);
  }

  return data;
}

function renderMetrics() {
  const grid = document.querySelector("#metric-grid");
  grid.innerHTML = state.metrics
    .map(
      (metric) => `
        <article class="metric-card">
          <span>${metric.label}</span>
          <strong>${formatMoney(metric.value)}</strong>
          <small>${metric.note}</small>
        </article>
      `
    )
    .join("");
}

function renderChart() {
  const chartNode = document.querySelector("#bar-chart");
  chartNode.innerHTML = state.chart
    .map(
      (item) => `
        <div class="bar" style="--height: ${item.value}%; --bar-color: ${item.color}">
          <span>${item.label}</span>
        </div>
      `
    )
    .join("");
}

function renderWatchList() {
  document.querySelector("#watch-list").innerHTML = state.watchItems
    .map(
      (item) => `
        <div class="watch-item">
          <strong>${item.title}</strong>
          <span>${item.value}</span>
        </div>
      `
    )
    .join("");
}

function renderTransactions() {
  document.querySelector("#recent-transactions").innerHTML = state.transactions
    .map(
      (tx) => `
        <tr>
          <td>${tx.date}</td>
          <td>${tx.ref}</td>
          <td>${tx.member}</td>
          <td>${tx.type}</td>
          <td class="num">${formatMoney(tx.amount)}</td>
          <td><span class="status ${tx.status.toLowerCase()}">${tx.status}</span></td>
        </tr>
      `
    )
    .join("");
}

function renderMembers() {
  document.querySelector("#member-cards").innerHTML = state.members
    .map((member) => {
      const initials = member.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("");

      return `
        <article class="member-card">
          <div class="member-top">
            <div class="avatar">${initials}</div>
            <div>
              <h3>${member.name}</h3>
              <p>${member.id} • ${member.group}</p>
            </div>
          </div>
          <div class="member-stats">
            <div>
              <span>Share capital</span>
              <strong>${formatMoney(member.share)}</strong>
            </div>
            <div>
              <span>Savings</span>
              <strong>${formatMoney(member.savings)}</strong>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderProducts(selector, products) {
  document.querySelector(selector).innerHTML = products
    .map(
      (product) => `
        <div class="product-row">
          <div>
            <span>${product.count}</span>
            <strong>${product.name}</strong>
          </div>
          <div>
            <span>Balance</span>
            <strong>${formatMoney(product.balance)}</strong>
          </div>
        </div>
      `
    )
    .join("");
}

function renderLoans() {
  document.querySelector("#loan-table").innerHTML = state.loans
    .map(
      (loan) => `
        <tr>
          <td>${loan.no}</td>
          <td>${loan.borrower}</td>
          <td>${loan.product}</td>
          <td class="num">${formatMoney(loan.principal)}</td>
          <td class="num">${formatMoney(loan.outstanding)}</td>
          <td>${loan.due}</td>
          <td><span class="status ${loan.status.toLowerCase().replace(" ", "-")}">${loan.status}</span></td>
        </tr>
      `
    )
    .join("");
}

function renderLedger() {
  const totalDebit = state.ledger.reduce((sum, row) => sum + row.debit, 0);
  const totalCredit = state.ledger.reduce((sum, row) => sum + row.credit, 0);

  document.querySelector("#ledger-table").innerHTML = state.ledger
    .map(
      (row) => `
        <tr>
          <td>${row.code}</td>
          <td>${row.title}</td>
          <td>${row.type}</td>
          <td class="num">${row.debit ? formatMoney(row.debit) : "-"}</td>
          <td class="num">${row.credit ? formatMoney(row.credit) : "-"}</td>
        </tr>
      `
    )
    .join("");

  document.querySelector("#total-debit").textContent = formatMoney(totalDebit);
  document.querySelector("#total-credit").textContent = formatMoney(totalCredit);
}

function renderReports() {
  document.querySelector("#balance-sheet").innerHTML = state.balanceSheet
    .map(
      (line) => `
        <div class="report-line ${line.type || ""}">
          <strong>${line.label}</strong>
          <span>${formatMoney(line.value)}</span>
        </div>
      `
    )
    .join("");

  document.querySelector("#income-statement").innerHTML = state.incomeStatement
    .map(
      (line) => `
        <div class="report-line ${line.type || ""}">
          <strong>${line.label}</strong>
          <span>${formatMoney(line.value)}</span>
        </div>
      `
    )
    .join("");
}

function renderUsers() {
  document.querySelector("#users-table").innerHTML = state.users
    .map(
      (user) => `
        <tr>
          <td>${user.name}</td>
          <td>${user.username}</td>
          <td>${user.role}</td>
          <td>${viewTitles[user.defaultView] || user.defaultView}</td>
          <td><span class="status current">${user.status}</span></td>
          <td>${user.lastLogin || "-"}</td>
        </tr>
      `
    )
    .join("");

  document.querySelector("#roles-list").innerHTML = state.roles
    .map(
      (role) => `
        <div class="role-item">
          <strong>${role.name}</strong>
          <span>${role.description}</span>
        </div>
      `
    )
    .join("");
}

const viewTitles = {
  dashboard: "Dashboard",
  workflow: "Workflow",
  members: "Members",
  accounts: "Accounts",
  loans: "Loans",
  ledger: "General Ledger",
  reports: "Financial Reports",
  users: "Users and Roles"
};

function renderAccessMatrix() {
  document.querySelector("#access-matrix").innerHTML = accessMatrix
    .map(
      (row) => `
        <tr>
          <td><strong>${row.role}</strong></td>
          ${moduleColumns.map((column) => `<td><span class="access-pill ${accessClass(row[column])}">${row[column]}</span></td>`).join("")}
        </tr>
      `
    )
    .join("");
}

function accessClass(value) {
  return value.toLowerCase().replace(/[^a-z]+/g, "-");
}

function renderWorkflowActions() {
  const allowedViews = state.currentUser?.allowedViews || [];
  const availableWorkflows = Object.entries(workflows).filter(([, workflow]) =>
    workflow.allowedViews.some((view) => allowedViews.includes(view))
  );

  document.querySelector("#workflow-actions").innerHTML = availableWorkflows
    .map(
      ([key, workflow]) => `
        <button class="workflow-action" type="button" data-flow="${key}">
          <strong>${workflow.title}</strong>
          <span>${workflow.owner}</span>
        </button>
      `
    )
    .join("");
}

function showWorkflow(flowKey) {
  const resolvedKey = flowKey === "new-transaction" ? rolePrimaryWorkflow[state.currentUser.role] || flowKey : flowKey;
  const workflow = workflows[resolvedKey];

  if (!workflow) {
    return;
  }

  const canOpen = workflow.allowedViews.some((view) => state.currentUser.allowedViews.includes(view));

  if (!canOpen) {
    document.querySelector("#workflow-title").textContent = "Access restricted";
    document.querySelector("#workflow-owner").textContent = "This action is outside the current role.";
    document.querySelector("#workflow-detail").innerHTML = `
      <div class="empty-state">
        Your role is ${state.currentUser.role}. Best practice is to route this task to the proper maker or approver.
      </div>
    `;
    showView("workflow");
    return;
  }

  document.querySelector("#workflow-title").textContent = workflow.title;
  document.querySelector("#workflow-owner").textContent = workflow.owner;
  document.querySelector("#workflow-detail").innerHTML = `
    <ol class="workflow-steps">
      ${workflow.steps.map((step) => `<li>${step}</li>`).join("")}
    </ol>
    <div class="workflow-controls">
      ${workflow.controls.map((control) => `<button class="ghost-button" type="button">${control}</button>`).join("")}
    </div>
  `;

  if (state.currentUser.allowedViews.includes(workflow.targetView)) {
    showView(workflow.targetView);
  }

  showView("workflow");
}

function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      showView(button.dataset.view);
    });
  });
}

function showView(view) {
  const targetButton = document.querySelector(`.nav-item[data-view="${view}"]`);
  const targetView = document.querySelector(`#${view}-view`);

  if (!targetButton || !targetView || targetButton.classList.contains("hidden")) {
    return;
  }

  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll(".view").forEach((section) => section.classList.remove("active"));

  targetButton.classList.add("active");
  targetView.classList.add("active");
  document.querySelector("#view-title").textContent = viewTitles[view];
}

function applyUserShell() {
  const allowedViews = state.currentUser.allowedViews;

  document.querySelector("#current-user-name").textContent = state.currentUser.name;
  document.querySelector("#current-user-role").textContent = state.currentUser.role;

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("hidden", !allowedViews.includes(button.dataset.view));
  });

  showView(state.currentUser.defaultView);
}

function renderAll() {
  renderAccessMatrix();
  renderMetrics();
  renderChart();
  renderWatchList();
  renderTransactions();
  renderMembers();
  renderProducts("#deposit-products", state.depositProducts);
  renderProducts("#capital-products", state.capitalProducts);
  renderLoans();
  renderLedger();
  renderReports();
  renderUsers();
  renderWorkflowActions();
}

async function loadData() {
  const allowed = state.currentUser.allowedViews;
  const can = (view) => allowed.includes(view);
  const dashboard = await fetchJson("/api/dashboard");
  const [members, products, loans, transactions, ledger, reports, users, roles] = await Promise.all([
    can("members") ? fetchJson("/api/members") : [],
    can("accounts") ? fetchJson("/api/products") : [],
    can("loans") ? fetchJson("/api/loans") : [],
    can("dashboard") ? fetchJson("/api/transactions") : [],
    can("ledger") ? fetchJson("/api/ledger") : [],
    can("reports") ? fetchJson("/api/reports") : { balanceSheet: [], incomeStatement: [] },
    can("users") ? fetchJson("/api/users") : [],
    can("users") ? fetchJson("/api/roles") : []
  ]);

  state.metrics = dashboard.metrics;
  state.chart = dashboard.chart;
  state.watchItems = dashboard.watchItems;
  state.members = members;
  state.depositProducts = products.filter((product) => product.category === "deposit");
  state.capitalProducts = products.filter((product) => product.category === "capital");
  state.loans = loans;
  state.transactions = transactions;
  state.ledger = ledger;
  state.balanceSheet = reports.balanceSheet;
  state.incomeStatement = reports.incomeStatement;
  state.users = users;
  state.roles = roles;
}

function showLogin() {
  document.querySelector("#login-screen").classList.remove("hidden");
  document.querySelector("#app-shell").classList.add("hidden");
  document.querySelector("#password").value = "";
}

function showApp() {
  document.querySelector("#login-screen").classList.add("hidden");
  document.querySelector("#app-shell").classList.remove("hidden");
}

function setupAuth() {
  document.querySelector("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const errorNode = document.querySelector("#login-error");
    errorNode.textContent = "";

    try {
      const data = await postJson("/api/login", {
        username: document.querySelector("#username").value,
        password: document.querySelector("#password").value
      });

      state.currentUser = data.user;
      await loadData();
      renderAll();
      showApp();
      applyUserShell();
    } catch (error) {
      errorNode.textContent = error.message;
    }
  });

  document.querySelector("#logout-button").addEventListener("click", async () => {
    await postJson("/api/logout");
    state.currentUser = null;
    showLogin();
  });

  document.addEventListener("click", (event) => {
    const flowButton = event.target.closest("[data-flow]");

    if (!flowButton || !state.currentUser) {
      return;
    }

    showWorkflow(flowButton.dataset.flow);
  });
}

async function init() {
  setupAuth();
  setupNavigation();

  try {
    const me = await fetchJson("/api/me");

    if (!me.user) {
      showLogin();
      return;
    }

    state.currentUser = me.user;
    await loadData();
    renderAll();
    showApp();
    applyUserShell();
  } catch (error) {
    showLogin();
    document.querySelector("#login-error").textContent = "Backend unavailable. Run npm start, then refresh.";
    console.error(error);
  }
}

init();
