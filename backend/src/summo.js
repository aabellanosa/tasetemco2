import ExcelJS from "exceljs";

export const SUMMO_CLUSTER = "REGULAR MEMBERS CAPTURE";

export const CLIENT_SUMMO_TEMPLATE_SHEETS = Object.freeze([
  "REG_MEM_CAP", "REG_MEM_NONCAP", "RET", "REG_MEM_LGU", "COM_A", "COM_B"
]);

const CLIENT_SUMMO_SYSTEM_FILL = Object.freeze({
  memberName: "B",
  canteen: "S",
  wrs: "T"
});

export const SUMMO_MOVEMENT_TYPES = Object.freeze({
  LBP: "LBP",
  GMAR: "GMAR",
  CANTEEN: "CANTEEN",
  WRS: "WRS",
  TFEA: "TFEA",
  CBU: "CBU",
  PROVIDENT: "PROVIDENT",
  SECURED_SAVINGS: "SECURED_SAVINGS",
  HONORARIUM: "HONORARIUM",
  ACTUAL_DEDUCTION: "ACTUAL_DEDUCTION",
  OVERPAYMENT: "OVERPAYMENT",
  OPENING_BALANCE: "OPENING_BALANCE",
  REVERSAL: "REVERSAL"
});

export const SUMMO_MOVEMENT_LABELS = Object.freeze({
  LBP: "LBP",
  GMAR: "G-mar Capital",
  CANTEEN: "Canteen",
  WRS: "WRS",
  TFEA: "TFEA",
  CBU: "CBU",
  PROVIDENT: "Provident Loan Deduction",
  SECURED_SAVINGS: "Secured Savings",
  HONORARIUM: "Honorarium Deduction",
  ACTUAL_DEDUCTION: "Actual / Payroll Deduction",
  OVERPAYMENT: "Overpayment",
  OPENING_BALANCE: "Opening Previous Balance",
  REVERSAL: "Correction / Reversal"
});

const SUMMO_LABEL_CODES = Object.freeze(
  Object.fromEntries(Object.entries(SUMMO_MOVEMENT_LABELS).map(([code, label]) => [label.toUpperCase(), code]))
);

function normalizeMovementType(value) {
  const text = String(value || "").trim().toUpperCase();
  return SUMMO_LABEL_CODES[text] || text.replace(/[ /-]+/g, "_").replace(/_+/g, "_");
}

export const SUMMO_PRODUCT_COLUMNS = Object.freeze({
  SALARY: "salaryLoan",
  EMERGENCY: "emergencyLoan",
  APPLIANCE: "applianceLoan",
  EDUCATIONAL: "educationalLoan",
  "PETTY-CASH": "pettyCash"
});

export const SUMMO_DEFAULT_RATES = Object.freeze({
  gmarInterestBps: 200,
  previousBalanceInterestBps: 200,
  pettyCashInterestBps: 250
});

const money = (value) => Math.round(Number(value || 0) * 100) / 100;
const add = (...values) => money(values.reduce((total, value) => total + money(value), 0));
const percentage = (amount, rateBps) => money((money(amount) * Number(rateBps || 0)) / 10000);

export function normalizePeriod(value) {
  const text = String(value || "").trim();
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(text) ? text : "";
}

export function periodBounds(period) {
  const normalized = normalizePeriod(period);
  if (!normalized) return null;
  const [year, month] = normalized.split("-").map(Number);
  const start = `${normalized}-01`;
  const endDate = new Date(Date.UTC(year, month, 0));
  const end = `${normalized}-${String(endDate.getUTCDate()).padStart(2, "0")}`;
  return { start, end };
}

export function previousPeriod(period) {
  const normalized = normalizePeriod(period);
  if (!normalized) return "";
  const [year, month] = normalized.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function validateImportedMovements(rows, { period, members, existingRows = [] } = {}) {
  const bounds = periodBounds(period);
  const memberMap = new Map(
    members
      .filter((member) => member.group === SUMMO_CLUSTER && member.status === "Active")
      .map((member) => [String(member.id).trim().toUpperCase(), member])
  );
  const existingKeys = new Set(existingRows.map((row) => row.uniqueKey).filter(Boolean));
  const knownReferences = new Set([
    ...existingRows.map((row) => String(row.referenceNo || "").toUpperCase()),
    ...rows.map((row) => String(row.referenceNo || "").trim().toUpperCase())
  ].filter(Boolean));
  const validTypes = new Set(Object.keys(SUMMO_MOVEMENT_LABELS));
  const seenKeys = new Set();

  return rows.map((source, index) => {
    const rowNumber = Number(source.rowNumber || index + 2);
    const reportingPeriod = String(source.reportingPeriod || "").trim();
    const selectedMemberName = String(source.memberName || "").trim();
    let memberNo = String(source.memberNo || "").trim().toUpperCase();
    const movementDate = String(source.movementDate || "").slice(0, 10);
    const movementType = normalizeMovementType(source.movementType);
    const sourceUnit = String(source.sourceUnit || "").trim().slice(0, 160);
    const referenceNo = String(source.referenceNo || "").trim().toUpperCase().slice(0, 120);
    const remarks = String(source.remarks || "").trim().slice(0, 500);
    const reversesReference = String(source.reversesReference || "").trim().toUpperCase().slice(0, 120);
    const amount = money(source.amount);
    const issues = [];
    let member = memberMap.get(memberNo);
    if (!member && selectedMemberName) {
      const embeddedMemberNo = /\u2014\s*([A-Z0-9-]+)\s*$/.exec(selectedMemberName.toUpperCase())?.[1] || "";
      if (embeddedMemberNo) {
        memberNo = embeddedMemberNo;
        member = memberMap.get(memberNo);
      } else {
        const matches = Array.from(memberMap.values()).filter(
          (item) => item.name.trim().toUpperCase() === selectedMemberName.toUpperCase()
        );
        if (matches.length === 1) {
          member = matches[0];
          memberNo = member.id;
        } else if (matches.length > 1) {
          issues.push("Member name is duplicated; select the entry that includes the member number");
        }
      }
    }

    if (!member) issues.push("Member number is not an active Regular Members Capture member");
    if (reportingPeriod !== period) issues.push("Reporting month does not match the selected period");
    if (!bounds || movementDate < bounds.start || movementDate > bounds.end) {
      issues.push("Movement date is outside the reporting month");
    }
    if (!validTypes.has(movementType)) issues.push("Unknown movement category");
    if (!(amount > 0)) issues.push("Amount must be greater than zero");
    if (!referenceNo) issues.push("Reference number is required");
    if (movementType === "REVERSAL" && !reversesReference) {
      issues.push("A reversal must identify the original reference");
    }
    if (movementType === "REVERSAL" && reversesReference && !knownReferences.has(reversesReference)) {
      issues.push("Reversed reference was not found in this period");
    }
    if (movementType !== "REVERSAL" && reversesReference) {
      issues.push("Only reversal rows may identify a reversed reference");
    }

    const uniqueKey = [period, memberNo, movementType, referenceNo].join(":");
    if (seenKeys.has(uniqueKey) || existingKeys.has(uniqueKey)) issues.push("Duplicate member/category/reference");
    seenKeys.add(uniqueKey);

    return {
      rowNumber,
      reportingPeriod,
      memberNo,
      memberName: member?.name || "",
      movementDate,
      movementType,
      sourceUnit,
      referenceNo,
      amount,
      remarks,
      reversesReference,
      uniqueKey,
      rowStatus: issues.length ? "Issue" : "Ready",
      issues
    };
  });
}

export function calculateSummo({
  period,
  members,
  loans,
  collections,
  movements,
  priorRows = [],
  rates = SUMMO_DEFAULT_RATES,
  productColumns = SUMMO_PRODUCT_COLUMNS
}) {
  const bounds = periodBounds(period);
  if (!bounds) return { error: "Reporting period must be YYYY-MM." };

  const priorMap = new Map(priorRows.map((row) => [row.memberNo, money(row.endingBalance)]));
  const movementByMember = new Map();
  for (const movement of movements.filter((row) => row.rowStatus === "Finalized")) {
    const list = movementByMember.get(movement.memberNo) || [];
    list.push(movement);
    movementByMember.set(movement.memberNo, list);
  }

  const loanDetails = [];
  const unmappedProducts = [];
  const rows = members
    .filter((member) => member.group === SUMMO_CLUSTER && member.status === "Active")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((member) => {
      const values = {
        lbp: 0,
        salaryLoan: 0,
        emergencyLoan: 0,
        applianceLoan: 0,
        educationalLoan: 0,
        gmarCapital: 0,
        canteen: 0,
        wrs: 0,
        tfea: 0,
        cbu: 0,
        pettyCash: 0,
        provident: 0,
        securedSavings: 0,
        honorarium: 0,
        actualDeduction: 0,
        overpayment: 0,
        openingBalance: 0,
        reversal: 0
      };

      for (const loan of loans.filter((item) => item.memberNo === member.id && item.status === "Posted")) {
        for (const installment of loan.installments || []) {
          if (installment.dueDate < bounds.start || installment.dueDate > bounds.end) continue;
          const target = productColumns[loan.productCode];
          if (!target) {
            unmappedProducts.push({ memberNo: member.id, loanNo: loan.loanNo, productCode: loan.productCode });
            continue;
          }
          values[target] = add(values[target], installment.totalDue);
          loanDetails.push({
            memberNo: member.id,
            memberName: member.name,
            loanNo: loan.loanNo,
            productCode: loan.productCode,
            dueDate: installment.dueDate,
            installmentNo: installment.installmentNo,
            amount: money(installment.totalDue)
          });
        }
      }

      const memberMovements = movementByMember.get(member.id) || [];
      const movementTargets = {
        LBP: "lbp",
        GMAR: "gmarCapital",
        CANTEEN: "canteen",
        WRS: "wrs",
        TFEA: "tfea",
        CBU: "cbu",
        PROVIDENT: "provident",
        SECURED_SAVINGS: "securedSavings",
        HONORARIUM: "honorarium",
        ACTUAL_DEDUCTION: "actualDeduction",
        OVERPAYMENT: "overpayment",
        OPENING_BALANCE: "openingBalance",
        REVERSAL: "reversal"
      };
      for (const movement of memberMovements.filter((item) => item.movementType !== "REVERSAL")) {
        const target = movementTargets[movement.movementType];
        if (target) values[target] = add(values[target], movement.amount);
      }
      for (const reversal of memberMovements.filter((item) => item.movementType === "REVERSAL")) {
        const original = memberMovements.find(
          (item) => item.movementType !== "REVERSAL" && item.referenceNo === reversal.reversesReference
        );
        const target = movementTargets[original?.movementType];
        if (target) values[target] = add(values[target], -reversal.amount);
      }

      const postedCashPayment = add(
        ...collections
          .filter(
            (collection) =>
              collection.memberNo === member.id &&
              collection.status === "Posted" &&
              collection.collectionDate >= bounds.start &&
              collection.collectionDate <= bounds.end
          )
          .map((collection) => collection.amountReceived)
      );
      const previousBalance = priorMap.has(member.id) ? priorMap.get(member.id) : values.openingBalance;
      const gmarInterest = percentage(values.gmarCapital, rates.gmarInterestBps);
      const previousBalanceInterest = percentage(Math.max(0, previousBalance), rates.previousBalanceInterestBps);
      const pettyCashInterest = percentage(values.pettyCash, rates.pettyCashInterestBps);
      const gmarTotal = add(values.gmarCapital, gmarInterest);
      const previousBalanceTotal = add(previousBalance, previousBalanceInterest);
      const pettyCashTotal = add(values.pettyCash, pettyCashInterest);
      const currentCharges = add(
        values.lbp,
        values.salaryLoan,
        values.emergencyLoan,
        values.applianceLoan,
        values.educationalLoan,
        gmarTotal,
        values.canteen,
        values.wrs,
        values.tfea,
        values.cbu
      );
      const grossPayable = add(
        currentCharges,
        previousBalanceTotal,
        pettyCashTotal,
        values.provident,
        values.securedSavings,
        values.reversal
      );
      const settlements = add(postedCashPayment, values.honorarium, values.actualDeduction, values.overpayment);
      const endingBalance = add(grossPayable, -settlements);

      return {
        memberNo: member.id,
        memberName: member.name,
        ...values,
        cashPayment: postedCashPayment,
        previousBalance,
        gmarInterest,
        gmarTotal,
        previousBalanceInterest,
        previousBalanceTotal,
        pettyCashInterest,
        pettyCashTotal,
        currentCharges,
        grossPayable,
        settlements,
        endingBalance
      };
    });

  const numericFields = Object.keys(rows[0] || {}).filter((key) => typeof rows[0]?.[key] === "number");
  const totals = Object.fromEntries(numericFields.map((field) => [field, add(...rows.map((row) => row[field]))]));
  const issues = unmappedProducts.map(
    (item) => `Unmapped loan product ${item.productCode} on ${item.loanNo} for ${item.memberNo}`
  );

  return {
    period,
    cluster: SUMMO_CLUSTER,
    rates,
    rows,
    totals,
    loanDetails,
    issues,
    generatedAt: new Date().toISOString()
  };
}

export async function parseMovementWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet("Movements") || workbook.worksheets[0];
  if (!sheet) return { error: "Workbook does not contain a Movements sheet." };
  const headers = new Map();
  sheet.getRow(1).eachCell((cell, column) => headers.set(String(cell.value || "").trim().toLowerCase(), column));
  const column = (...names) => names.map((name) => headers.get(name)).find(Boolean);
  const cellText = (cell) => {
    const value = cell?.value;
    if (value && typeof value === "object") {
      if ("result" in value) return String(value.result || "");
      if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("");
      if ("formula" in value || "sharedFormula" in value) return "";
    }
    return String(value || "");
  };
  const rows = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const reportingPeriod = cellText(row.getCell(column("reporting month", "period") || 1));
    const memberName = cellText(row.getCell(column("member name") || 2));
    const memberNo = cellText(row.getCell(column("member number", "member no") || 3));
    const categoryCode = cellText(row.getCell(column("category code") || 6));
    const categoryLabel = cellText(row.getCell(column("category", "movement type") || 5));
    const sourceUnit = cellText(row.getCell(column("source unit") || 7));
    const referenceNo = cellText(row.getCell(column("reference number", "reference no") || 8));
    const amount = row.getCell(column("amount") || 9).value;
    const remarks = cellText(row.getCell(column("remarks") || 10));
    const reversesReference = cellText(row.getCell(column("reverses reference") || 11));
    if (![memberName, memberNo, categoryCode, categoryLabel, sourceUnit, referenceNo, amount, remarks, reversesReference]
      .some((value) => String(value || "").trim())) continue;
    const dateValue = row.getCell(column("movement date", "date") || 4).value;
    const movementDate = dateValue instanceof Date ? dateValue.toISOString().slice(0, 10) : String(dateValue || "").slice(0, 10);
    rows.push({
      rowNumber,
      reportingPeriod,
      memberName,
      memberNo,
      movementDate,
      movementType: categoryCode || categoryLabel,
      sourceUnit,
      referenceNo,
      amount,
      remarks,
      reversesReference
    });
  }
  return { rows };
}

function styleHeader(row, color = "1F4E78") {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${color}` } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FF808080" } } };
  });
}

export async function buildMovementTemplate({ period, members }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TASETEMCO Cooperative System";
  const movements = workbook.addWorksheet("Movements", { views: [{ state: "frozen", ySplit: 1 }] });
  movements.columns = [
    { header: "Reporting Month", key: "period", width: 18 },
    { header: "Member Name", key: "memberName", width: 34 },
    { header: "Member Number", key: "memberNo", width: 18 },
    { header: "Movement Date", key: "movementDate", width: 16 },
    { header: "Category", key: "category", width: 24 },
    { header: "Category Code", key: "categoryCode", width: 20 },
    { header: "Source Unit", key: "sourceUnit", width: 24 },
    { header: "Reference Number", key: "referenceNo", width: 22 },
    { header: "Amount", key: "amount", width: 16 },
    { header: "Remarks", key: "remarks", width: 36 },
    { header: "Reverses Reference", key: "reversesReference", width: 22 }
  ];
  styleHeader(movements.getRow(1));
  movements.addRow({ period, memberName: "", movementDate: `${period}-01`, category: "" });
  movements.getColumn("amount").numFmt = "#,##0.00;[Red]-#,##0.00";

  const activeMembers = members
    .filter((member) => member.group === SUMMO_CLUSTER && member.status === "Active")
    .sort((first, second) => first.name.localeCompare(second.name));
  const nameCounts = new Map();
  activeMembers.forEach((member) => {
    const key = member.name.trim().toUpperCase();
    nameCounts.set(key, Number(nameCounts.get(key) || 0) + 1);
  });
  const memberChoices = activeMembers.map((member) => ({
    display: nameCounts.get(member.name.trim().toUpperCase()) > 1 ? `${member.name} \u2014 ${member.id}` : member.name,
    memberNo: member.id
  }));
  const categoryChoices = Object.entries(SUMMO_MOVEMENT_LABELS).map(([code, label]) => ({ code, label }));

  movements.getCell("M1").value = "Member Choice";
  movements.getCell("N1").value = "Member Number Lookup";
  memberChoices.forEach((choice, index) => {
    movements.getCell(index + 2, 13).value = choice.display;
    movements.getCell(index + 2, 14).value = choice.memberNo;
  });
  movements.getCell("O1").value = "Category Choice";
  movements.getCell("P1").value = "Category Code Lookup";
  categoryChoices.forEach((choice, index) => {
    movements.getCell(index + 2, 15).value = choice.label;
    movements.getCell(index + 2, 16).value = choice.code;
  });
  [13, 14, 15, 16].forEach((columnNumber) => { movements.getColumn(columnNumber).hidden = true; });

  const memberListEnd = Math.max(2, memberChoices.length + 1);
  const categoryListEnd = categoryChoices.length + 1;
  for (let rowNumber = 2; rowNumber <= 1000; rowNumber += 1) {
    const row = movements.getRow(rowNumber);
    row.getCell(1).value = period;
    row.getCell(2).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [`$M$2:$M$${memberListEnd}`],
      showErrorMessage: true,
      errorTitle: "Select a Regular Capture member",
      error: "Choose a member from the dropdown list."
    };
    row.getCell(3).value = {
      formula: `IFERROR(INDEX($N$2:$N$${memberListEnd},MATCH(B${rowNumber},$M$2:$M$${memberListEnd},0)),\"\")`,
      result: ""
    };
    row.getCell(5).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [`$O$2:$O$${categoryListEnd}`],
      showErrorMessage: true,
      errorTitle: "Select a SUMMO category",
      error: "Choose a category from the dropdown list."
    };
    row.getCell(6).value = {
      formula: `IFERROR(INDEX($P$2:$P$${categoryListEnd},MATCH(E${rowNumber},$O$2:$O$${categoryListEnd},0)),\"\")`,
      result: ""
    };
    [2, 4, 5, 7, 8, 9, 10, 11].forEach((columnNumber) => {
      row.getCell(columnNumber).protection = { locked: false };
    });
    row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7E6E6" } };
    row.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7E6E6" } };
  }
  await movements.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    autoFilter: true,
    sort: true
  });

  const memberSheet = workbook.addWorksheet("Members", { views: [{ state: "frozen", ySplit: 1 }] });
  memberSheet.columns = [
    { header: "Member Number", key: "memberNo", width: 18 },
    { header: "Member Name", key: "memberName", width: 34 },
    { header: "Cluster", key: "cluster", width: 34 }
  ];
  styleHeader(memberSheet.getRow(1));
  activeMembers.forEach((member) => memberSheet.addRow({ memberNo: member.id, memberName: member.name, cluster: member.group }));

  const instructions = workbook.addWorksheet("Instructions");
  instructions.columns = [{ width: 28 }, { width: 90 }];
  instructions.addRow(["SUMMO External Movements", `Reporting month: ${period}`]);
  instructions.addRow(["Rule", "Use one line per member movement. Amounts must be positive and references must be unique per member/category."]);
  instructions.addRow(["Member", "Choose the member name from the dropdown. Member Number is filled automatically and remains the import key."]);
  instructions.addRow(["Category", "Choose the readable category from the dropdown. Category Code is filled automatically."]);
  instructions.addRow(["Categories", Object.entries(SUMMO_MOVEMENT_LABELS).map(([key, label]) => `${key} (${label})`).join(", ")]);
  instructions.addRow(["Corrections", "Use REVERSAL and identify the original reference in Reverses Reference."]);
  instructions.getRow(1).font = { bold: true, size: 14 };

  return workbook.xlsx.writeBuffer();
}

export async function buildSummoWorkbook(report, metadata = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TASETEMCO Cooperative System";
  const sheet = workbook.addWorksheet("Regular Capture", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
    views: [{ state: "frozen", ySplit: 5, xSplit: 2 }]
  });
  const columns = [
    ["memberNo", "Member No."], ["memberName", "Name"], ["lbp", "LBP"], ["salaryLoan", "SL"],
    ["emergencyLoan", "EL"], ["applianceLoan", "Appliance"], ["educationalLoan", "Educ'l"],
    ["gmarCapital", "G-mar Capital"], ["gmarInterest", "G-mar Interest"], ["gmarTotal", "G-mar Total"],
    ["canteen", "Canteen"], ["wrs", "WRS"], ["tfea", "TFEA"], ["cbu", "CBU"],
    ["currentCharges", "Current Total"], ["previousBalance", "Previous Balance"],
    ["previousBalanceInterest", "Prev. Interest"], ["previousBalanceTotal", "Prev. Total"],
    ["pettyCash", "Petty Cash"], ["pettyCashInterest", "Petty Interest"], ["pettyCashTotal", "Petty Total"],
    ["provident", "Provident"], ["securedSavings", "Secured Savings"], ["grossPayable", "Total Payable"],
    ["cashPayment", "Cash Payment"], ["honorarium", "Honorarium"], ["actualDeduction", "Actual Deduction"],
    ["overpayment", "Overpayment"], ["endingBalance", "Balance"]
  ];
  sheet.mergeCells(1, 1, 1, columns.length);
  sheet.getCell(1, 1).value = "TASETEMCO — SUMMARY OF ACCOUNT FOR DEDUCTION";
  sheet.getCell(1, 1).font = { bold: true, size: 16 };
  sheet.getCell(1, 1).alignment = { horizontal: "center" };
  sheet.mergeCells(2, 1, 2, columns.length);
  sheet.getCell(2, 1).value = `${SUMMO_CLUSTER} | ${report.period} | ${metadata.status || "Draft"}`;
  sheet.getCell(2, 1).alignment = { horizontal: "center" };
  sheet.mergeCells(3, 1, 3, columns.length);
  sheet.getCell(3, 1).value = `Rates: G-mar ${report.rates.gmarInterestBps / 100}% | Previous Balance ${report.rates.previousBalanceInterestBps / 100}% | Petty Cash ${report.rates.pettyCashInterestBps / 100}%`;
  sheet.getCell(3, 1).alignment = { horizontal: "center" };
  columns.forEach(([key, label], index) => {
    sheet.getCell(5, index + 1).value = label;
    sheet.getColumn(index + 1).key = key;
    sheet.getColumn(index + 1).width = key === "memberName" ? 28 : key === "memberNo" ? 14 : 15;
  });
  styleHeader(sheet.getRow(5));
  report.rows.forEach((source) => {
    const row = sheet.addRow(Object.fromEntries(columns.map(([key]) => [key, source[key]])));
    for (let index = 3; index <= columns.length; index += 1) row.getCell(index).numFmt = "#,##0.00;[Red]-#,##0.00";
  });
  const totalRow = sheet.addRow(Object.fromEntries(columns.map(([key]) => [key, report.totals[key] ?? ""])));
  totalRow.getCell(1).value = "TOTAL";
  totalRow.getCell(2).value = "";
  totalRow.font = { bold: true };
  totalRow.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EAF7" } }; });
  sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: totalRow.number, column: columns.length } };
  sheet.addRow([]);
  sheet.addRow(["Prepared by", metadata.preparedBy || "", "Approved by", metadata.lockedBy || ""]);
  sheet.addRow(["Generated", report.generatedAt, "Locked", metadata.lockedAt || ""]);

  const details = workbook.addWorksheet("Loan Details", { views: [{ state: "frozen", ySplit: 1 }] });
  details.columns = [
    { header: "Member No.", key: "memberNo", width: 16 }, { header: "Member Name", key: "memberName", width: 30 },
    { header: "Loan No.", key: "loanNo", width: 20 }, { header: "Product", key: "productCode", width: 18 },
    { header: "Due Date", key: "dueDate", width: 16 }, { header: "Installment", key: "installmentNo", width: 12 },
    { header: "Amount", key: "amount", width: 16 }
  ];
  styleHeader(details.getRow(1));
  report.loanDetails.forEach((row) => details.addRow(row));
  details.getColumn("amount").numFmt = "#,##0.00";

  const audit = workbook.addWorksheet("Audit");
  audit.columns = [{ width: 28 }, { width: 100 }];
  audit.addRows([
    ["Period", report.period], ["Cluster", report.cluster], ["Status", metadata.status || "Draft"],
    ["Version", metadata.version || 1], ["Generated at", report.generatedAt],
    ["Prepared by", metadata.preparedBy || ""], ["Locked by", metadata.lockedBy || ""],
    ["Validation issues", report.issues.join(" | ") || "None"]
  ]);
  audit.getColumn(1).font = { bold: true };
  return workbook.xlsx.writeBuffer();
}

function isClientSummoSystemCell(cell) {
  const color = cell.fill?.fgColor || {};
  return cell.fill?.type === "pattern" && cell.fill?.pattern === "solid" &&
    Number(color.theme) === 9 && Math.abs(Number(color.tint) - 0.7999816888943144) < 0.000001;
}

function clientSummoMemberRows(sheet) {
  const rows = [];
  for (let rowNumber = 7; rowNumber <= Math.max(sheet.rowCount, 7); rowNumber += 1) {
    const nameCell = sheet.getCell(`B${rowNumber}`);
    if (nameCell.isMerged && nameCell.master.address === nameCell.address) rows.push(rowNumber);
    else if (rows.length) break;
  }
  return rows;
}

function clientSummoMonthLabel(period) {
  const [year, month] = period.split("-").map(Number);
  const monthName = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1))).toUpperCase();
  return `${monthName}'${year}`;
}

export async function buildClientSummoWorkbook({ templateBuffer, period, rows = [] }) {
  const normalizedPeriod = normalizePeriod(period);
  if (!normalizedPeriod) throw new Error("Reporting period must be YYYY-MM.");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer);
  const issues = [];
  for (const sheetName of CLIENT_SUMMO_TEMPLATE_SHEETS) {
    if (!workbook.getWorksheet(sheetName)) issues.push(`Missing worksheet ${sheetName}.`);
  }
  const sheet = workbook.getWorksheet("REG_MEM_CAP");
  if (sheet) {
    if (String(sheet.getCell("A6").text || "").trim() !== SUMMO_CLUSTER) {
      issues.push(`REG_MEM_CAP title must be ${SUMMO_CLUSTER}.`);
    }
    if (String(sheet.getCell("S4").text || "").trim().toUpperCase() !== "CANTEEN") {
      issues.push("Expected Canteen header in S4.");
    }
    if (String(sheet.getCell("T4").text || "").trim().toUpperCase() !== "WRS") {
      issues.push("Expected WRS header in T4.");
    }
    const memberRows = clientSummoMemberRows(sheet);
    if (!memberRows.length) issues.push("No merged member rows were found from B7:E7 downward.");
    if (rows.length > memberRows.length) {
      issues.push(`${rows.length} active Regular Capture members exceed the ${memberRows.length} template rows.`);
    }
    for (const rowNumber of memberRows) {
      for (const [field, column] of Object.entries(CLIENT_SUMMO_SYSTEM_FILL)) {
        const cell = sheet.getCell(`${column}${rowNumber}`);
        if (!isClientSummoSystemCell(cell)) issues.push(`${cell.address} (${field}) is not an approved light-green system cell.`);
        if (cell.formula) issues.push(`${cell.address} (${field}) contains a formula and cannot be overwritten.`);
      }
    }
    if (!issues.length) {
      for (const rowNumber of memberRows) {
        sheet.getCell(`B${rowNumber}`).value = null;
        sheet.getCell(`S${rowNumber}`).value = null;
        sheet.getCell(`T${rowNumber}`).value = null;
      }
      [...rows].sort((left, right) => String(left.memberName || "").localeCompare(String(right.memberName || "")) ||
        String(left.memberNo || "").localeCompare(String(right.memberNo || ""))).forEach((row, index) => {
        const rowNumber = memberRows[index];
        sheet.getCell(`B${rowNumber}`).value = String(row.memberName || "").trim();
        sheet.getCell(`S${rowNumber}`).value = Number(row.canteen || 0) || null;
        sheet.getCell(`T${rowNumber}`).value = Number(row.wrs || 0) || null;
      });
      sheet.getCell("S3").value = clientSummoMonthLabel(normalizedPeriod);
    }
  }
  if (issues.length) throw new Error(`Client SUMMO template validation failed: ${issues.join(" ")}`);
  workbook.calcProperties.fullCalcOnLoad = true;
  workbook.lastModifiedBy = "TASETEMCO Cooperative System";
  workbook.modified = new Date();
  return workbook.xlsx.writeBuffer();
}
