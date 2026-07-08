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
    "members:profile:edit",
    "members:applications:view",
    "members:applications:create",
    "members:applications:approve",
    "members:initial-payments:view",
    "members:share-capital-contributions:view",
    "members:savings-deposits:view",
    "members:savings-withdrawals:view",
    "teller-cash-counts:view",
    "teller-batches:view",
    "ledger:view",
    "reports:view",
    "users:view",
    "loans:products:view",
    "loans:products:manage",
    "loans:applications:view",
    "loans:computations:view",
    "loans:releases:view",
    "loans:collections:view",
    "teller-fundings:view"
  ],
  "General Manager": [
    "members:view",
    "members:applications:view",
    "members:initial-payments:view",
    "members:share-capital-contributions:view",
    "members:savings-deposits:view",
    "members:savings-withdrawals:view",
    "teller-cash-counts:view",
    "teller-batches:view",
    "ledger:view",
    "reports:view",
    "loans:products:view",
    "loans:applications:view",
    "loans:computations:view",
    "loans:releases:view",
    "loans:collections:view",
    "teller-fundings:view",
    "teller-fundings:approve"
  ],
  "Accountant / Bookkeeper": [
    "ledger:view",
    "ledger:teller-batches:post",
    "ledger:teller-batches:review",
    "ledger:teller-batches:close",
    "teller-cash-counts:view",
    "teller-batches:view",
    "reports:view",
    "loans:collections:view",
    "teller-fundings:view",
    "teller-fundings:prepare"
  ],
  "Loan Officer": [
    "members:view",
    "loans:products:view",
    "loans:applications:view",
    "loans:applications:create",
    "loans:applications:edit",
    "loans:applications:submit",
    "loans:computations:view",
    "loans:computations:create",
    "loans:releases:view",
    "loans:collections:view"
  ],
  "Credit Committee / Approver": [
    "members:view",
    "members:applications:view",
    "reports:view",
    "loans:products:view",
    "loans:applications:view",
    "loans:applications:decide",
    "loans:computations:view",
    "loans:releases:view",
    "loans:collections:view"
  ],
  "Teller / Cashier": [
    "members:view",
    "members:initial-payments:view",
    "members:initial-payments:create",
    "members:share-capital-contributions:view",
    "members:share-capital-contributions:create",
    "members:savings-deposits:view",
    "members:savings-deposits:create",
    "members:savings-withdrawals:view",
    "members:savings-withdrawals:create",
    "teller-cash-counts:view",
    "teller-cash-counts:create",
    "teller-batches:view",
    "loans:products:view",
    "loans:releases:view",
    "loans:releases:create",
    "loans:collections:view",
    "loans:collections:create",
    "teller-fundings:view",
    "teller-fundings:acknowledge"
  ],
  "Membership Officer": [
    "members:view",
    "members:profile:edit",
    "members:applications:view",
    "members:applications:create"
  ],
  "Auditor / Compliance Officer": [
    "members:view",
    "members:applications:view",
    "members:initial-payments:view",
    "members:share-capital-contributions:view",
    "members:savings-deposits:view",
    "members:savings-withdrawals:view",
    "teller-cash-counts:view",
    "teller-batches:view",
    "ledger:view",
    "reports:view",
    "users:view",
    "loans:products:view",
    "loans:applications:view",
    "loans:computations:view",
    "loans:releases:view",
    "loans:collections:view",
    "teller-fundings:view"
  ],
  "Board / Read-Only Executive": ["reports:view"]
};

export const members = [
  {
    id: "M-000482",
    name: "Maria L. Santos",
    group: "Market Vendors Cluster",
    share: 62000,
    savings: 184500,
    status: "Active",
    contactNumber: "0917-555-0101",
    address: "Poblacion Public Market, Tarlac City",
    birthdate: "1981-04-12",
    civilStatus: "Married",
    occupation: "Market vendor",
    membershipDate: "2019-03-18"
  },
  {
    id: "M-000517",
    name: "Benito P. Cruz",
    group: "Rice Farmers Cluster",
    share: 44000,
    savings: 76800,
    status: "Active",
    contactNumber: "0918-555-0102",
    address: "Brgy. San Isidro, Tarlac City",
    birthdate: "1976-09-24",
    civilStatus: "Married",
    occupation: "Rice farmer",
    membershipDate: "2020-07-06"
  },
  {
    id: "M-000621",
    name: "Alma R. Dizon",
    group: "Teachers Cluster",
    share: 83000,
    savings: 221400,
    status: "Active",
    contactNumber: "0919-555-0103",
    address: "Brgy. Maliwalo, Tarlac City",
    birthdate: "1988-11-02",
    civilStatus: "Single",
    occupation: "Public school teacher",
    membershipDate: "2021-01-15"
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

export const loanProducts = [
  {
    id: 1,
    code: "EMERGENCY",
    name: "Emergency Loan",
    description: "Six-month emergency loan with service fee deducted from proceeds.",
    minimumPrincipal: 1000,
    maximumPrincipal: 20000,
    minimumTermMonths: 6,
    maximumTermMonths: 6,
    annualInterestRateBps: 3000,
    interestMethod: "Diminishing Balance",
    paymentFrequency: "Monthly",
    processingFee: 0,
    serviceFeeRateBps: 450,
    insuranceFeeRateBps: 0,
    cbuRateBps: 0,
    savingsRetentionRateBps: 0,
    cbuOptional: false,
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
  },
  {
    id: 2,
    code: "PETTY-CASH",
    name: "Petty Cash Loan",
    description: "One-month petty cash loan with service fee deducted from proceeds.",
    minimumPrincipal: 500,
    maximumPrincipal: 10000,
    minimumTermMonths: 1,
    maximumTermMonths: 1,
    annualInterestRateBps: 3000,
    interestMethod: "Diminishing Balance",
    paymentFrequency: "Monthly",
    processingFee: 0,
    serviceFeeRateBps: 450,
    insuranceFeeRateBps: 0,
    cbuRateBps: 0,
    savingsRetentionRateBps: 0,
    cbuOptional: false,
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
  },
  {
    id: 3,
    code: "SALARY",
    name: "Salary Loan",
    description: "Salary loan with service fee, insurance, CBU, and savings retention.",
    minimumPrincipal: 10000,
    maximumPrincipal: 350000,
    minimumTermMonths: 6,
    maximumTermMonths: 60,
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
  },
  {
    id: 4,
    code: "EDUCATIONAL",
    name: "Educational Loan",
    description: "Education-purpose loan with standard retention deductions.",
    minimumPrincipal: 5000,
    maximumPrincipal: 10000,
    minimumTermMonths: 6,
    maximumTermMonths: 60,
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
  },
  {
    id: 5,
    code: "APPLIANCE",
    name: "Appliance Loan",
    description: "Appliance loan with standard retention deductions.",
    minimumPrincipal: 5000,
    maximumPrincipal: 100000,
    minimumTermMonths: 6,
    maximumTermMonths: 60,
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
  },
  {
    id: 6,
    code: "SMALL-BUSINESS",
    name: "Small Business Loan",
    description: "Entrepreneurial loan with standard retention deductions.",
    minimumPrincipal: 5000,
    maximumPrincipal: 100000,
    minimumTermMonths: 6,
    maximumTermMonths: 60,
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
  }
];

export const loanApplications = [
  {
    id: "LA-2026-0001",
    applicationNo: "LA-2026-0001",
    memberNo: "M-000517",
    memberName: "Benito P. Cruz",
    productCode: "SALARY",
    productName: "Salary Loan",
    requestedPrincipal: 30000,
    requestedTermMonths: 12,
    purpose: "Farm inputs for the next planting season",
    applicationDate: "2026-06-15",
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
    status: "Submitted",
    createdBy: "loanofficer",
    submittedBy: "loanofficer",
    submittedAt: "2026-06-15T02:00:00.000Z",
    creditAssessmentNotes: "",
    recommendedPrincipal: 0,
    recommendedTermMonths: 0,
    decision: "",
    decisionRemarks: "",
    decisionDate: "",
    decidedBy: "",
    decidedAt: "",
    createdAt: "2026-06-15T01:30:00.000Z",
    updatedAt: "2026-06-15T02:00:00.000Z"
  }
];

export const loanDocumentForms = [];

export const loans = [];

export const loanInstallments = [];

export const loanReleases = [];

export const loanCollections = [];

export const memberImportBatches = [];

export const memberImportRows = [];

export const openingBalanceImportBatches = [];

export const openingBalanceImportRows = [];

export const initialPayments = [
  {
    id: "IP-2026-0001",
    memberId: "M-000482",
    memberName: "Maria L. Santos",
    shareCapitalAmount: 5000,
    membershipFeeAmount: 100,
    savingsDepositAmount: 1000,
    cashReceived: 6100,
    referenceNo: "OR-10001",
    receivedBy: "teller01",
    status: "Teller Batch",
    batchId: "TB-2026-0001"
  }
];

export const shareCapitalContributions = [];

export const savingsDeposits = [];

export const savingsWithdrawals = [];

export const journalEntries = [];

export const tellerCashCounts = [];

export const tellerFundings = [];

export const tellerBatches = [
  {
    id: "TB-2026-0001",
    tellerUsername: "teller01",
    status: "Open",
    openedAt: "2026-06-10T08:00:00.000Z",
    submittedAt: "",
    reviewedAt: "",
    reviewedBy: "",
    expectedCash: 0,
    actualCash: 0,
    variance: 0,
    transactionCount: 0,
    varianceNote: "",
    varianceNotedBy: "",
    varianceNotedAt: "",
    closedBy: "",
    closingNote: ""
  }
];

export const dashboard = {
  metrics: [
    { label: "Total assets", value: 14525300, note: "Sample demonstration data" },
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
  const additionalRoles = Array.isArray(user.additionalRoles) ? user.additionalRoles : [];
  const assignedRoles = [user.role, ...additionalRoles].filter((role, index, list) =>
    role && list.indexOf(role) === index
  );
  const allowedViews = Array.from(
    new Set(assignedRoles.flatMap((role) => roleViews[role] || []))
  );
  const permissions = Array.from(
    new Set(assignedRoles.flatMap((role) => rolePermissions[role] || []))
  );

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    additionalRoles,
    assignedRoles,
    defaultView: allowedViews.includes(user.defaultView) ? user.defaultView : allowedViews[0],
    allowedViews,
    permissions
  };
}
