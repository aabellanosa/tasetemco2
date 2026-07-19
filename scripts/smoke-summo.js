import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  SUMMO_CLUSTER,
  buildMovementTemplate,
  buildSummoWorkbook,
  calculateSummo,
  parseMovementWorkbook,
  validateImportedMovements
} from "../backend/src/summo.js";

const members = [
  { id: "M-001", name: "Capture Member", group: SUMMO_CLUSTER, status: "Active" },
  { id: "M-002", name: "Other Member", group: "RETIREES", status: "Active" }
];

const validated = validateImportedMovements([
  { rowNumber: 2, reportingPeriod: "2026-07", memberNo: "M-001", movementDate: "2026-07-05", movementType: "GMAR", referenceNo: "GM-1", amount: 1000 },
  { rowNumber: 3, reportingPeriod: "2026-07", memberNo: "M-001", movementDate: "2026-07-06", movementType: "CANTEEN", referenceNo: "CA-1", amount: 250 },
  { rowNumber: 4, reportingPeriod: "2026-07", memberNo: "M-001", movementDate: "2026-07-07", movementType: "OPENING_BALANCE", referenceNo: "OPEN-1", amount: 500 },
  { rowNumber: 5, reportingPeriod: "2026-07", memberNo: "M-002", movementDate: "2026-07-07", movementType: "WRS", referenceNo: "BAD-1", amount: 50 }
], { period: "2026-07", members });

assert.equal(validated[0].rowStatus, "Ready");
assert.equal(validated[3].rowStatus, "Issue");

const movements = validated.slice(0, 3).map((row) => ({ ...row, rowStatus: "Finalized" }));
const report = calculateSummo({
  period: "2026-07",
  members,
  movements,
  priorRows: [],
  loans: [{
    memberNo: "M-001", memberName: "Capture Member", loanNo: "LN-1", productCode: "SALARY", status: "Posted",
    installments: [{ installmentNo: 1, dueDate: "2026-07-15", totalDue: 2000 }]
  }],
  collections: [{ memberNo: "M-001", collectionDate: "2026-07-20", amountReceived: 1000, status: "Posted" }]
});

assert.equal(report.rows.length, 1);
assert.equal(report.rows[0].salaryLoan, 2000);
assert.equal(report.rows[0].gmarInterest, 20);
assert.equal(report.rows[0].previousBalanceInterest, 10);
assert.equal(report.rows[0].grossPayable, 3780);
assert.equal(report.rows[0].endingBalance, 2780);

const creditReport = calculateSummo({
  period: "2026-08", members, loans: [], collections: [], movements: [],
  priorRows: [{ memberNo: "M-001", endingBalance: -100 }]
});
assert.equal(creditReport.rows[0].previousBalanceInterest, 0);
assert.equal(creditReport.rows[0].endingBalance, -100);

const templateBuffer = await buildMovementTemplate({ period: "2026-07", members });
const parsedTemplate = await parseMovementWorkbook(Buffer.from(templateBuffer));
assert.equal(parsedTemplate.rows.length, 0);
const inputWorkbook = new ExcelJS.Workbook();
await inputWorkbook.xlsx.load(templateBuffer);
const inputSheet = inputWorkbook.getWorksheet("Movements");
assert.equal(inputSheet.getCell("B2").dataValidation.type, "list");
assert.equal(inputSheet.getCell("E2").dataValidation.type, "list");
assert.match(inputSheet.getCell("C2").value.formula, /MATCH\(B2/);
inputSheet.getCell("B2").value = "Capture Member";
inputSheet.getCell("D2").value = "2026-07-10";
inputSheet.getCell("E2").value = "Canteen";
inputSheet.getCell("H2").value = "CAN-DROPDOWN-1";
inputSheet.getCell("I2").value = 125;
const populatedTemplate = await inputWorkbook.xlsx.writeBuffer();
const parsedDropdownRow = await parseMovementWorkbook(populatedTemplate);
assert.equal(parsedDropdownRow.rows[0].memberName, "Capture Member");
assert.equal(parsedDropdownRow.rows[0].movementType, "Canteen");
assert.equal(
  validateImportedMovements(parsedDropdownRow.rows, { period: "2026-07", members })[0].rowStatus,
  "Ready"
);

const exportBuffer = await buildSummoWorkbook(report, { status: "Draft", preparedBy: "bookkeeper" });
const exportedWorkbook = new ExcelJS.Workbook();
await exportedWorkbook.xlsx.load(exportBuffer);
assert.ok(exportedWorkbook.getWorksheet("Regular Capture"));
assert.ok(exportedWorkbook.getWorksheet("Loan Details"));
assert.ok(exportedWorkbook.getWorksheet("Audit"));

console.log("SUMMO smoke checks passed.");
