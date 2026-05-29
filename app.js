const formatMoney = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0
  }).format(value);

const metrics = [
  { label: "Total assets", value: 14079200, note: "+4.8% vs April" },
  { label: "Member deposits", value: 9453800, note: "1,284 active accounts" },
  { label: "Loan portfolio", value: 7116200, note: "96.4% current" },
  { label: "Net surplus", value: 438500, note: "Before allocations" }
];

const members = [
  {
    id: "M-000482",
    name: "Maria L. Santos",
    group: "Market Vendors Cluster",
    share: 62000,
    savings: 184500
  },
  {
    id: "M-000517",
    name: "Benito P. Cruz",
    group: "Rice Farmers Cluster",
    share: 44000,
    savings: 76800
  },
  {
    id: "M-000621",
    name: "Alma R. Dizon",
    group: "Teachers Cluster",
    share: 83000,
    savings: 221400
  },
  {
    id: "M-000706",
    name: "Joey T. Mercado",
    group: "Tricycle Operators Cluster",
    share: 35500,
    savings: 48200
  },
  {
    id: "M-000744",
    name: "Luzviminda F. Reyes",
    group: "General Membership",
    share: 51000,
    savings: 93400
  },
  {
    id: "M-000811",
    name: "Ramon G. Flores",
    group: "Small Enterprise Cluster",
    share: 77000,
    savings: 305200
  }
];

const transactions = [
  {
    date: "2026-05-30",
    ref: "OR-0526-1842",
    member: "Maria L. Santos",
    type: "Loan amortization",
    amount: 12800,
    status: "Posted"
  },
  {
    date: "2026-05-30",
    ref: "SV-0526-0991",
    member: "Ramon G. Flores",
    type: "Savings deposit",
    amount: 45000,
    status: "Posted"
  },
  {
    date: "2026-05-29",
    ref: "SC-0526-0438",
    member: "Alma R. Dizon",
    type: "Share capital",
    amount: 8000,
    status: "Posted"
  },
  {
    date: "2026-05-29",
    ref: "LN-0526-0126",
    member: "Benito P. Cruz",
    type: "Loan release",
    amount: 150000,
    status: "Review"
  },
  {
    date: "2026-05-28",
    ref: "TD-0526-0039",
    member: "Luzviminda F. Reyes",
    type: "Time deposit placement",
    amount: 100000,
    status: "Posted"
  }
];

const loans = [
  {
    no: "LN-2026-0184",
    borrower: "Maria L. Santos",
    product: "Providential Loan",
    principal: 180000,
    outstanding: 124300,
    due: "2026-06-15",
    status: "Current"
  },
  {
    no: "LN-2026-0201",
    borrower: "Benito P. Cruz",
    product: "Agricultural Production",
    principal: 150000,
    outstanding: 150000,
    due: "2026-07-30",
    status: "Review"
  },
  {
    no: "LN-2026-0157",
    borrower: "Alma R. Dizon",
    product: "Salary Loan",
    principal: 240000,
    outstanding: 187200,
    due: "2026-06-05",
    status: "Current"
  },
  {
    no: "LN-2025-0449",
    borrower: "Joey T. Mercado",
    product: "Motor Repair Loan",
    principal: 95000,
    outstanding: 28600,
    due: "2026-05-20",
    status: "Past Due"
  }
];

const ledger = [
  { code: "101000", title: "Cash on Hand", type: "Asset", debit: 1186500, credit: 0 },
  { code: "102000", title: "Cash in Bank", type: "Asset", debit: 4342800, credit: 0 },
  { code: "103000", title: "Loans Receivable - Current", type: "Asset", debit: 7116200, credit: 0 },
  { code: "105000", title: "Interest Receivable", type: "Asset", debit: 228000, credit: 0 },
  { code: "106000", title: "Property and Equipment", type: "Asset", debit: 1205700, credit: 0 },
  { code: "201000", title: "Savings Deposits Payable", type: "Liability", debit: 0, credit: 6453800 },
  { code: "202000", title: "Time Deposits Payable", type: "Liability", debit: 0, credit: 3000000 },
  { code: "301000", title: "Share Capital", type: "Equity", debit: 0, credit: 3450000 },
  { code: "302000", title: "Statutory Funds", type: "Equity", debit: 0, credit: 736900 },
  { code: "401000", title: "Interest Income from Loans", type: "Revenue", debit: 0, credit: 786400 },
  { code: "402000", title: "Service Fees", type: "Revenue", debit: 0, credit: 98200 },
  { code: "501000", title: "Interest Expense on Deposits", type: "Expense", debit: 162500, credit: 0 },
  { code: "502000", title: "Personnel Expenses", type: "Expense", debit: 198000, credit: 0 },
  { code: "503000", title: "Administrative Expenses", type: "Expense", debit: 85600, credit: 0 }
];

const depositProducts = [
  { name: "Regular Savings", count: "1,084 accounts", balance: 6453800 },
  { name: "Time Deposit", count: "126 placements", balance: 3000000 },
  { name: "Youth Savers", count: "74 accounts", balance: 482600 }
];

const capitalProducts = [
  { name: "Common Share Capital", count: "834 members", balance: 3450000 },
  { name: "Subscribed Share Capital", count: "61 plans", balance: 628000 },
  { name: "Statutory Reserve Fund", count: "Current year", balance: 412500 }
];

const chart = [
  { label: "Savings", value: 88, color: "#1f7a4c" },
  { label: "Loans", value: 72, color: "#287a80" },
  { label: "Capital", value: 54, color: "#b98716" },
  { label: "Expenses", value: 36, color: "#416f9f" },
  { label: "Fees", value: 28, color: "#7a5b92" }
];

const watchItems = [
  { title: "Past due loans", value: "4 accounts over 10 days" },
  { title: "Unposted teller batch", value: "1 branch batch pending review" },
  { title: "Dormant savings", value: "18 accounts flagged" },
  { title: "Cash limit alert", value: "Main cashier above threshold" }
];

function renderMetrics() {
  const grid = document.querySelector("#metric-grid");
  grid.innerHTML = metrics
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
  chartNode.innerHTML = chart
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
  document.querySelector("#watch-list").innerHTML = watchItems
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
  document.querySelector("#recent-transactions").innerHTML = transactions
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
  document.querySelector("#member-cards").innerHTML = members
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
  document.querySelector("#loan-table").innerHTML = loans
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
  const totalDebit = ledger.reduce((sum, row) => sum + row.debit, 0);
  const totalCredit = ledger.reduce((sum, row) => sum + row.credit, 0);

  document.querySelector("#ledger-table").innerHTML = ledger
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
  const assets = ledger
    .filter((row) => row.type === "Asset")
    .reduce((sum, row) => sum + row.debit - row.credit, 0);
  const liabilities = ledger
    .filter((row) => row.type === "Liability")
    .reduce((sum, row) => sum + row.credit - row.debit, 0);
  const equity = ledger
    .filter((row) => row.type === "Equity")
    .reduce((sum, row) => sum + row.credit - row.debit, 0);
  const revenue = ledger
    .filter((row) => row.type === "Revenue")
    .reduce((sum, row) => sum + row.credit - row.debit, 0);
  const expenses = ledger
    .filter((row) => row.type === "Expense")
    .reduce((sum, row) => sum + row.debit - row.credit, 0);
  const surplus = revenue - expenses;

  document.querySelector("#balance-sheet").innerHTML = [
    ["Assets", assets],
    ["Liabilities", liabilities],
    ["Members' Equity", equity],
    ["Current Net Surplus", surplus],
    ["Liabilities, Equity and Surplus", liabilities + equity + surplus, "total"]
  ]
    .map(
      ([label, value, type]) => `
        <div class="report-line ${type || ""}">
          <strong>${label}</strong>
          <span>${formatMoney(value)}</span>
        </div>
      `
    )
    .join("");

  document.querySelector("#income-statement").innerHTML = [
    ["Revenue", revenue],
    ["Operating Expenses", expenses],
    ["Net Surplus Before Allocation", surplus, "total"]
  ]
    .map(
      ([label, value, type]) => `
        <div class="report-line ${type || ""}">
          <strong>${label}</strong>
          <span>${formatMoney(value)}</span>
        </div>
      `
    )
    .join("");
}

function setupNavigation() {
  const titles = {
    dashboard: "Dashboard",
    members: "Members",
    accounts: "Accounts",
    loans: "Loans",
    ledger: "General Ledger",
    reports: "Financial Reports"
  };

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;

      document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".view").forEach((section) => section.classList.remove("active"));

      button.classList.add("active");
      document.querySelector(`#${view}-view`).classList.add("active");
      document.querySelector("#view-title").textContent = titles[view];
    });
  });
}

renderMetrics();
renderChart();
renderWatchList();
renderTransactions();
renderMembers();
renderProducts("#deposit-products", depositProducts);
renderProducts("#capital-products", capitalProducts);
renderLoans();
renderLedger();
renderReports();
setupNavigation();
