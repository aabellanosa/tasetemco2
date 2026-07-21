import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import {
  CLIENT_SUMMO_TEMPLATE_SHEETS,
  SUMMO_CLUSTER,
  buildClientSummoWorkbook,
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

const clientTemplateBuffer = await readFile(path.resolve(
  "backend", "templates", "summo", "TASETEMCO-SUMMO-6-CLUSTER-TEMPLATE.xlsx"
));
const originalClientWorkbook = new ExcelJS.Workbook();
await originalClientWorkbook.xlsx.load(clientTemplateBuffer);
const clientWorkbookBuffer = await buildClientSummoWorkbook({
  templateBuffer: clientTemplateBuffer,
  period: "2026-07",
  rows: [{ memberNo: "M-001", memberName: "Capture Member", canteen: 250, wrs: 75 }]
});
const clientWorkbook = new ExcelJS.Workbook();
await clientWorkbook.xlsx.load(clientWorkbookBuffer);
assert.deepEqual(clientWorkbook.worksheets.map((sheet) => sheet.name), [...CLIENT_SUMMO_TEMPLATE_SHEETS]);
const clientSheet = clientWorkbook.getWorksheet("REG_MEM_CAP");
const originalClientSheet = originalClientWorkbook.getWorksheet("REG_MEM_CAP");
assert.equal(clientSheet.getCell("B7").value, "Capture Member");
assert.equal(clientSheet.getCell("S7").value, 250);
assert.equal(clientSheet.getCell("T7").value, 75);
assert.equal(clientSheet.getCell("S3").value, "JULY'2026");
assert.equal(clientSheet.getCell("X7").value, originalClientSheet.getCell("X7").value);
assert.deepEqual(clientSheet.getCell("X7").fill, originalClientSheet.getCell("X7").fill);
assert.deepEqual(clientSheet.getCell("S7").fill, originalClientSheet.getCell("S7").fill);
for (const sheetName of CLIENT_SUMMO_TEMPLATE_SHEETS) {
  const originalSheet = originalClientWorkbook.getWorksheet(sheetName);
  const generatedSheet = clientWorkbook.getWorksheet(sheetName);
  originalSheet.eachRow((row) => row.eachCell((cell) => {
    if (cell.value?.formula) {
      assert.equal(generatedSheet.getCell(cell.address).value?.formula, cell.value.formula);
    }
  }));
}
assert.equal(
  clientWorkbook.getWorksheet("REG_MEM_NONCAP").getCell("S7").value,
  originalClientWorkbook.getWorksheet("REG_MEM_NONCAP").getCell("S7").value
);
await assert.rejects(
  buildClientSummoWorkbook({
    templateBuffer: clientTemplateBuffer,
    period: "2026-07",
    rows: Array.from({ length: 68 }, (_, index) => ({ memberName: `Member ${index + 1}` }))
  }),
  /exceed the 67 template rows/
);

console.log("SUMMO smoke checks passed.");
