const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const siteDir = join(root, "site");
const distDir = join(root, "dist-docs");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readRequiredFile(filePath) {
  assert(existsSync(filePath), `Missing required file: ${filePath}`);
  return readFileSync(filePath, "utf8");
}

function validateSite(directory) {
  const indexPath = join(directory, "index.html");
  const stylesPath = join(directory, "styles.css");
  const index = readRequiredFile(indexPath);

  readRequiredFile(stylesPath);

  assert(index.includes("<title>TASETEMCO Workflow Reference</title>"), "Document title is missing or incorrect.");
  assert(index.includes("TASETEMCO Workflow Guide"), "Hero heading is missing.");
  assert(index.includes('id="roles"'), "Roles section is missing.");
  assert(index.includes('id="workflows"'), "Workflows section is missing.");
  assert(index.includes('id="reports"'), "Reports section is missing.");
  assert(index.includes('id="find-flow"'), "Workflow navigation section is missing.");
  assert(index.includes("System Administrator"), "Role matrix is missing System Administrator.");
  assert(index.includes("Board / Read-Only Executive"), "Role matrix is missing Board / Read-Only Executive.");
  assert(index.includes("Loan Product Deductions"), "Loan product deductions section is missing.");
  assert(index.includes("principal up to PHP 500,000"), "LBP Loan maximum is missing.");
  assert(index.includes("2.5% monthly diminishing interest"), "TASETEMCO loan interest rule is missing.");
  assert(index.includes("1.5% insurance, 2% CBU, and 1% savings retention"), "TASETEMCO loan deduction rates are missing.");
  assert(index.includes("print a member loan breakdown"), "Printable loan breakdown workflow note is missing.");
  assert(index.includes("SUMMO Monthly Report"), "SUMMO workflow is missing.");
  assert(index.includes("LBP due date and amount in columns F and G"), "Native LBP SUMMO coverage is missing.");
  assert(index.includes('id="monthly-contributions"'), "Monthly Contributions workflow is missing.");
  assert(index.includes('id="daily-remittance"'), "Daily Remittance workflow is missing.");
  assert(index.includes("fixed grid containing every Active configured source"), "Daily Remittance grid guidance is missing.");
  assert(index.includes("snapshotted income account"), "Daily Remittance posting guidance is missing.");
  assert(index.includes("Admin configures centers and reviews activity"), "Cost-center role separation is missing.");
  assert(index.includes("TFEA Payable, Share Capital, and Secured Savings Payable"), "Monthly contribution posting flow is missing.");
  assert(index.includes("posted Secured Savings less pending secured withdrawals"), "Secured Savings withdrawal controls are missing.");
  assert(index.includes("SUMMO — Regular Members Capture"), "SUMMO report listing is missing.");
  assert(index.includes("Daily Cost-Center Payables"), "Cost-center payable workflow is missing.");
  assert(index.includes("G-mar Commercial purchases supply G-mar Capital"), "System-to-SUMMO G-mar flow is missing.");
  assert(index.includes("protected 2% G-mar interest formula"), "User guidance for G-mar interest is missing.");
  assert(index.includes("Generate Preview"), "Client-format SUMMO preview flow is missing.");
  assert(index.includes("Download Locked Version"), "Locked client-format SUMMO flow is missing.");
  assert(index.includes("current 67-row capacity"), "Client-format SUMMO capacity safeguard is missing.");
  assert(index.includes("other cluster transactions remain recorded"), "SUMMO cluster-coverage boundary is missing.");
  assert(index.includes("Tab to select and advance"), "Keyboard member-selection guidance is missing.");
  assert(index.includes("System Administrator records assessment notes and a loan decision"), "Current Admin loan decision flow is missing.");
  assert(index.includes("partial, full, or advance receipts"), "Flexible loan collection workflow is missing.");
  assert(!index.includes("Credit Committee / Approver"), "Retired loan Approver role is still shown in the published workflow.");
  assert(!/Tabon|tabon|TABON/.test(index), "Old Tabon branding is still present.");
}

const diagrams = readRequiredFile(join(root, "docs", "TASETEMCO_WORKFLOW_DIAGRAMS.md"));
assert(diagrams.includes("Cost Center and Other Sources into SUMMO"), "SUMMO diagram is missing.");
assert(diagrams.includes("Monthly Member Contribution Cash Collection"), "Monthly contribution diagram is missing.");
assert(diagrams.includes("Secured Savings subsidiary and withdrawal"), "Secured Savings subsidiary diagram is missing.");
assert(diagrams.includes("Daily Cost-Center Member Payables"), "Cost-center workflow diagram is missing.");
assert(diagrams.includes("No Dedicated Loan Approver"), "Updated loan decision diagram is missing.");
assert(diagrams.includes("Flexible Loan Collection"), "Updated collection diagram is missing.");
assert(diagrams.includes("Client-format workbook flow"), "Client-format SUMMO workflow diagram is missing.");
assert(diagrams.includes("Preserve formulas, yellow/manual cells"), "Client workbook preservation controls are missing.");
assert(diagrams.includes("GMAR writes principal to column P only"), "Developer G-mar workbook mapping is missing.");
assert(diagrams.includes("Column Q retains the workbook's shared 2% formula"), "Developer G-mar formula protection is missing.");

validateSite(siteDir);

if (existsSync(distDir)) {
  validateSite(distDir);
}

console.log("Static documentation smoke test passed.");
