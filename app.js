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
  members: "Members",
  accounts: "Accounts",
  loans: "Loans",
  ledger: "General Ledger",
  reports: "Financial Reports",
  users: "Users and Roles"
};

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
