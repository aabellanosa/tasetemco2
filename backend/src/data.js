export const defaultPassword = "p@55@LL";

export const roles = [
  "System Administrator",
  "General Manager",
  "Accountant / Bookkeeper",
  "Loan Officer",
  "Teller / Cashier",
  "Membership Officer",
  "Auditor / Compliance Officer",
  "Board / Read-Only Executive"
];

export const memberClassifications = [
  "REGULAR MEMBERS CAPTURE",
  "REGULAR MEMBERS NON CAPTURE",
  "RETIREES",
  "REGULAR MEMBERS LGU",
  "COMMUNITY A MEMBERS",
  "COMMUNITY B MEMBERS"
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
    name: "Nora S. Angeles",
    username: "teller01",
    role: "Teller / Cashier",
    defaultView: "dashboard"
  },
  {
    id: 6,
    name: "Arnel V. Bautista",
    username: "membership",
    role: "Membership Officer",
    defaultView: "members"
  },
  {
    id: 7,
    name: "Celia T. Abad",
    username: "auditor",
    role: "Auditor / Compliance Officer",
    defaultView: "reports"
  },
  {
    id: 8,
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
  "Teller / Cashier": ["dashboard", "members", "loans"],
  "Membership Officer": ["dashboard", "members"],
  "Auditor / Compliance Officer": ["dashboard", "members", "loans", "ledger", "reports", "users"],
  "Board / Read-Only Executive": ["dashboard", "reports"]
};

export const rolePermissions = {
  "System Administrator": [
    "members:view",
    "members:profile:edit",
    "members:previous-loans:edit",
    "members:previous-loans:unlock-request",
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
    "reports:summo:prepare",
    "reports:summo:lock",
    "users:view",
    "loans:products:view",
    "loans:products:manage",
    "loans:applications:view",
    "loans:applications:decide",
    "loans:computations:view",
    "loans:releases:view",
    "loans:collections:view",
    "teller-fundings:view",
    "cost-centers:view",
    "cost-centers:manage",
    "member-charges:view",
    "remittance-sources:view",
    "remittance-sources:manage",
    "daily-remittances:view"
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
    "reports:summo:lock",
    "loans:products:view",
    "loans:applications:view",
    "loans:computations:view",
    "loans:releases:view",
    "loans:collections:view",
    "teller-fundings:view",
    "teller-fundings:approve",
    "cost-centers:view",
    "member-charges:view",
    "remittance-sources:view",
    "daily-remittances:view"
  ],
  "Accountant / Bookkeeper": [
    "ledger:view",
    "ledger:teller-batches:post",
    "ledger:teller-batches:review",
    "ledger:teller-batches:close",
    "teller-cash-counts:view",
    "teller-batches:view",
    "reports:view",
    "reports:summo:prepare",
    "loans:collections:view",
    "teller-fundings:view",
    "teller-fundings:prepare",
    "cost-centers:view",
    "member-charges:view",
    "remittance-sources:view",
    "daily-remittances:view"
  ],
  "Loan Officer": [
    "members:view",
    "members:previous-loans:edit",
    "members:previous-loans:unlock-request",
    "members:previous-loans:unlock-approve",
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
    "teller-fundings:acknowledge",
    "cost-centers:view",
    "member-charges:view",
    "member-charges:encode",
    "member-charges:finalize",
    "member-charges:reverse",
    "monthly-contributions:view",
    "monthly-contributions:encode",
    "monthly-contributions:finalize",
    "remittance-sources:view",
    "daily-remittances:view",
    "daily-remittances:encode",
    "daily-remittances:finalize"
  ],
  "Membership Officer": [
    "members:view",
    "members:profile:edit",
    "members:previous-loans:edit",
    "members:previous-loans:unlock-request",
    "members:applications:view",
    "members:applications:create",
    "loans:products:view"
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
    "teller-fundings:view",
    "cost-centers:view",
    "member-charges:view",
    "remittance-sources:view",
    "daily-remittances:view"
  ],
  "Board / Read-Only Executive": ["reports:view"]
};

export const members = [
  {
    id: "M-000482",
    name: "Maria L. Santos",
    group: "REGULAR MEMBERS CAPTURE",
    share: 62000,
    savings: 184500,
    previousLoanBalance: 0,
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
    group: "REGULAR MEMBERS NON CAPTURE",
    share: 44000,
    savings: 76800,
    previousLoanBalance: 0,
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
    group: "REGULAR MEMBERS LGU",
    share: 83000,
    savings: 221400,
    previousLoanBalance: 0,
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
    clusterName: "COMMUNITY A MEMBERS",
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
    description: "One-month petty cash loan from PHP 1,000 to PHP 2,000 with no service fee.",
    minimumPrincipal: 1000,
    maximumPrincipal: 2000,
    minimumTermMonths: 1,
    maximumTermMonths: 1,
    annualInterestRateBps: 3000,
    interestMethod: "Diminishing Balance",
    paymentFrequency: "Monthly",
    processingFee: 0,
    serviceFeeRateBps: 0,
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
  },
  {
    id: 7,
    code: "LBP",
    name: "LBP Loan",
    description: "LBP loan with Appliance Loan rules and a PHP 500,000 maximum principal.",
    minimumPrincipal: 5000,
    maximumPrincipal: 500000,
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

function addDemoDays(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

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
    collateralType: "PDC",
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
  },
  {
    id: "LA-DEMO-PASTDUE",
    applicationNo: "LA-DEMO-PASTDUE",
    memberNo: "M-000621",
    memberName: "Alma R. Dizon",
    productCode: "SALARY",
    productName: "Salary Loan",
    requestedPrincipal: 15000,
    requestedTermMonths: 3,
    purpose: "Demo posted loan for collection follow-up",
    collateralType: "ATM Cards",
    applicationDate: addDemoDays(-70),
    annualInterestRateBps: 3000,
    interestMethod: "Diminishing Balance",
    paymentFrequency: "Monthly",
    processingFee: 675,
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
    status: "Posted",
    createdBy: "loanofficer",
    submittedBy: "loanofficer",
    submittedAt: `${addDemoDays(-70)}T02:00:00.000Z`,
    creditAssessmentNotes: "Demo account for overdue collection monitoring.",
    recommendedPrincipal: 15000,
    recommendedTermMonths: 3,
    decision: "Approved",
    decisionRemarks: "Approved for seeded demo.",
    decisionDate: addDemoDays(-69),
    decidedBy: "admin",
    decidedAt: `${addDemoDays(-69)}T03:00:00.000Z`,
    createdAt: `${addDemoDays(-70)}T01:30:00.000Z`,
    updatedAt: `${addDemoDays(-68)}T04:00:00.000Z`
  }
];

export const loanDocumentForms = [];
export const memberPreviousLoans = [];
export const memberPreviousLoanControls = [];
export const memberPreviousLoanUnlockRequests = [];
export const costCenters = [
  { code: "C1", name: "Canteen A", type: "Canteen", summoColumn: "Canteen", status: "Active" },
  { code: "C2", name: "Canteen B", type: "Canteen", summoColumn: "Canteen", status: "Active" },
  { code: "WRS", name: "Water Refilling Station", type: "Water Station", summoColumn: "WRS", status: "Active" },
  { code: "GMAR", name: "G-mar Commercial", type: "Commercial Store", summoColumn: "G-mar Capital", status: "Active" }
];
export const memberChargeBatches = [];
export const memberChargeEntries = [];
export const memberChargeMovements = [];
export const remittanceSources = [
  { code: "CANTEEN-A", name: "Canteen A", reportingGroup: "Canteen A", costCenterCode: "C1", incomeAccountCode: "4060", incomeAccountName: "Canteen Income", displayOrder: 10, status: "Active" },
  { code: "CANTEEN-B", name: "Canteen B", reportingGroup: "Canteen B", costCenterCode: "C2", incomeAccountCode: "4060", incomeAccountName: "Canteen Income", displayOrder: 20, status: "Active" },
  { code: "WRS", name: "WRS", reportingGroup: "WRS", costCenterCode: "WRS", incomeAccountCode: "4070", incomeAccountName: "Water Refilling Income", displayOrder: 30, status: "Active" },
  { code: "WATER-BOTTLE-A", name: "Water Bottle A", reportingGroup: "WRS", costCenterCode: "WRS", incomeAccountCode: "4070", incomeAccountName: "Water Refilling Income", displayOrder: 40, status: "Active" },
  { code: "WATER-BOTTLE-B", name: "Water Bottle B", reportingGroup: "WRS", costCenterCode: "WRS", incomeAccountCode: "4070", incomeAccountName: "Water Refilling Income", displayOrder: 50, status: "Active" },
  ...["Piso WiFi A", "Piso WiFi B", "Printing & Photocopy", "Water Vendo A", "Water Vendo B", "Catering"].map((name, index) => ({
    code: name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/(^-|-$)/g, ""), name,
    reportingGroup: name, costCenterCode: "", incomeAccountCode: "4080",
    incomeAccountName: "Other Operating Income", displayOrder: 60 + index * 10, status: "Active"
  }))
];
export const dailyRemittanceBatches = [];
export const dailyRemittanceEntries = [];

export const loans = [
  {
    loanNo: "LN-DEMO-PASTDUE",
    applicationNo: "LA-DEMO-PASTDUE",
    memberNo: "M-000621",
    memberName: "Alma R. Dizon",
    productCode: "SALARY",
    productName: "Salary Loan",
    principal: 15000,
    termMonths: 3,
    annualInterestRateBps: 3000,
    interestMethod: "Diminishing Balance",
    paymentFrequency: "Monthly",
    processingFee: 675,
    serviceFeeRateBps: 450,
    insuranceFee: 0,
    insuranceFeeRateBps: 0,
    cbuAmount: 0,
    cbuRateBps: 0,
    cbuApplied: false,
    savingsRetentionAmount: 0,
    savingsRetentionRateBps: 0,
    totalInterest: 750,
    totalPayable: 15750,
    netProceeds: 14325,
    installmentCount: 3,
    firstPaymentDate: addDemoDays(-35),
    maturityDate: addDemoDays(35),
    status: "Posted",
    computedBy: "loanofficer",
    computedAt: `${addDemoDays(-68)}T04:00:00.000Z`,
    createdAt: `${addDemoDays(-68)}T04:00:00.000Z`
  }
];

export const loanInstallments = [
  {
    loanNo: "LN-DEMO-PASTDUE",
    installmentNo: 1,
    dueDate: addDemoDays(-35),
    principalDue: 5000,
    interestDue: 375,
    totalDue: 5375,
    status: "Scheduled"
  },
  {
    loanNo: "LN-DEMO-PASTDUE",
    installmentNo: 2,
    dueDate: addDemoDays(5),
    principalDue: 5000,
    interestDue: 250,
    totalDue: 5250,
    status: "Scheduled"
  },
  {
    loanNo: "LN-DEMO-PASTDUE",
    installmentNo: 3,
    dueDate: addDemoDays(35),
    principalDue: 5000,
    interestDue: 125,
    totalDue: 5125,
    status: "Scheduled"
  }
];

export const loanReleases = [
  {
    releaseNo: "LR-DEMO-PASTDUE",
    loanNo: "LN-DEMO-PASTDUE",
    batchId: "TB-DEMO-PASTDUE",
    memberNo: "M-000621",
    memberName: "Alma R. Dizon",
    principal: 15000,
    processingFee: 675,
    insuranceFee: 0,
    cbuAmount: 0,
    savingsRetentionAmount: 0,
    netProceeds: 14325,
    cashReleased: 14325,
    releaseDate: addDemoDays(-65),
    referenceNo: "VCH-DEMO-PASTDUE",
    releasedBy: "teller01",
    status: "Posted",
    postedBy: "bookkeeper",
    postedEntryNo: "JE-DEMO-PASTDUE",
    postedAt: `${addDemoDays(-65)}T08:00:00.000Z`,
    createdAt: `${addDemoDays(-65)}T07:30:00.000Z`
  }
];

export const loanCollections = [];

export const memberImportBatches = [];

export const memberImportRows = [];

export const openingBalanceImportBatches = [];

export const openingBalanceImportRows = [];

export const summoImportBatches = [];

export const summoImportRows = [];

export const summoPeriods = [];

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
export const monthlyContributionBatches = [];
export const monthlyContributionEntries = [];
export const monthlyContributionMovements = [];

export const savingsDeposits = [];

export const savingsWithdrawals = [];
export const securedSavingsWithdrawals = [];

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
