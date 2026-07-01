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
  assert(index.includes("System Administrator"), "Role matrix is missing System Administrator.");
  assert(index.includes("Board / Read-Only Executive"), "Role matrix is missing Board / Read-Only Executive.");
  assert(index.includes("Loan Product Deductions"), "Loan product deductions section is missing.");
  assert(index.includes("2.5% monthly diminishing interest"), "TASETEMCO loan interest rule is missing.");
  assert(index.includes("1.5% insurance, 2% CBU, and 1% savings retention"), "TASETEMCO loan deduction rates are missing.");
  assert(index.includes("print a member loan breakdown"), "Printable loan breakdown workflow note is missing.");
  assert(!/Tabon|tabon|TABON/.test(index), "Old Tabon branding is still present.");
}

validateSite(siteDir);

if (existsSync(distDir)) {
  validateSite(distDir);
}

console.log("Static documentation smoke test passed.");
