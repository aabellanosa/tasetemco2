export const defaultPassword = "p@55@LL";

export const roles = [
  "System Administrator",
  "General Manager",
  "Accountant / Bookkeeper",
  "Loan Officer",
  "Credit Committee / Approver",
  "Teller / Cashier",
  "Membership Officer",
  "Auditor / Compliance Officer",
  "Board / Read-Only Executive"
];

export const users = [
  {
    id: 1,
    name: "Elena D. Ramos",
    username: "admin",
    role: "System Administrator",
    defaultView: "users"
  },
  {
    id: 2,
    name: "Victor M. Lim",
    username: "manager",
    role: "General Manager",
    defaultView: "dashboard"
  },
  {
    id: 3,
    name: "Grace P. Uy",
    username: "bookkeeper",
    role: "Accountant / Bookkeeper",
    defaultView: "ledger"
  },
  {
    id: 4,
    name: "Paolo C. Mendoza",
    username: "loanofficer",
    role: "Loan Officer",
    defaultView: "loans"
  },
  {
    id: 5,
    name: "Lorna B. Aquino",
    username: "approver",
    role: "Credit Committee / Approver",
    defaultView: "loans"
  },
  {
    id: 6,
    name: "Nora S. Angeles",
    username: "teller01",
    role: "Teller / Cashier",
    defaultView: "dashboard"
  },
  {
    id: 7,
    name: "Arnel V. Bautista",
    username: "membership",
    role: "Membership Officer",
    defaultView: "members"
  },
  {
    id: 8,
    name: "Celia T. Abad",
    username: "auditor",
    role: "Auditor / Compliance Officer",
    defaultView: "reports"
  },
  {
    id: 9,
    name: "Roberto J. Villanueva",
    username: "board",
    role: "Board / Read-Only Executive",
    defaultView: "reports"
  }
];

export const roleViews = {
  "System Administrator": ["dashboard", "members", "loans", "ledger", "reports", "users"],
  "General Manager": ["dashboard", "members", "loans", "ledger", "reports"],
  "Accountant / Bookkeeper": ["dashboard", "ledger", "reports"],
  "Loan Officer": ["dashboard", "members", "loans"],
  "Credit Committee / Approver": ["dashboard", "members", "loans", "reports"],
  "Teller / Cashier": ["dashboard", "members", "loans"],
  "Membership Officer": ["dashboard", "members"],
  "Auditor / Compliance Officer": ["dashboard", "members", "loans", "ledger", "reports", "users"],
  "Board / Read-Only Executive": ["dashboard", "reports"]
};

export const rolePermissions = {
  "System Administrator": [
    "members:view",
    "members:applications:view",
    "members:applications:create",
    "members:applications:approve"
  ],
  "General Manager": ["members:view", "members:applications:view", "members:applications:approve"],
  "Accountant / Bookkeeper": [],
  "Loan Officer": ["members:view"],
  "Credit Committee / Approver": ["members:view", "members:applications:view", "members:applications:approve"],
  "Teller / Cashier": ["members:view"],
  "Membership Officer": ["members:view", "members:applications:view", "members:applications:create"],
  "Auditor / Compliance Officer": ["members:view", "members:applications:view"],
  "Board / Read-Only Executive": []
};

export const members = [
  {
    id: "M-000482",
    name: "Maria L. Santos",
    group: "Market Vendors Cluster",
    share: 62000,
    savings: 184500,
    status: "Active"
  },
  {
    id: "M-000517",
    name: "Benito P. Cruz",
    group: "Rice Farmers Cluster",
    share: 44000,
    savings: 76800,
    status: "Active"
  },
  {
    id: "M-000621",
    name: "Alma R. Dizon",
    group: "Teachers Cluster",
    share: 83000,
    savings: 221400,
    status: "Active"
  }
];

export const memberApplications = [
  {
    id: "MA-2026-0001",
    fullName: "Julieta M. Navarro",
    clusterName: "General Membership",
    contactNumber: "0917-555-0148",
    initialShareCapital: 5000,
    status: "Pending Approval",
    createdBy: "membership"
  }
];

export const dashboard = {
  metrics: [
    { label: "Total assets", value: 14525300, note: "Seeded spike data" },
    { label: "Member deposits", value: 9453800, note: "Savings and time deposits" },
    { label: "Loan portfolio", value: 490100, note: "Sample active loans" },
    { label: "Net surplus", value: 438500, note: "Before allocations" }
  ],
  watchItems: [
    { title: "Past due loans", value: "4 accounts over 10 days" },
    { title: "Unposted teller batch", value: "1 branch batch pending review" },
    { title: "Dormant savings", value: "18 accounts flagged" }
  ]
};

export function publicUser(user) {
  const allowedViews = roleViews[user.role] || ["dashboard"];
  const permissions = rolePermissions[user.role] || [];

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    defaultView: allowedViews.includes(user.defaultView) ? user.defaultView : allowedViews[0],
    allowedViews,
    permissions
  };
}
