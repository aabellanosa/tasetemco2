import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  ChakraProvider,
  Container,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Grid,
  GridItem,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
  Select,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Table,
  TableContainer as ChakraTableContainer,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  VStack,
  extendTheme,
  useDisclosure
} from "@chakra-ui/react";
import { createRoot as createReactRoot } from "react-dom/client";

const apiBase = import.meta.env.VITE_API_BASE_URL || "";
const membersPollingMs = 5000;

const theme = extendTheme({
  styles: {
    global: {
      "html, body, #root": {
        maxWidth: "100%",
        overflowX: "hidden"
      },
      "*": {
        boxSizing: "border-box"
      }
    }
  },
  fonts: {
    heading: "Inter, system-ui, sans-serif",
    body: "Inter, system-ui, sans-serif"
  },
  colors: {
    brand: {
      500: "#1f7a4c",
      700: "#145936"
    }
  }
});

const viewTitles = {
  dashboard: "Dashboard",
  members: "Members",
  loans: "Loans",
  ledger: "General Ledger",
  reports: "Reports",
  users: "Users"
};

function TableContainer(props) {
  return (
    <ChakraTableContainer
      maxW="100%"
      overflowX="auto"
      overflowY="hidden"
      sx={{
        WebkitOverflowScrolling: "touch",
        scrollbarGutter: "stable"
      }}
      {...props}
    />
  );
}

async function api(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0
  }).format(value);
}

function formatTime(value) {
  if (!value) {
    return "Not refreshed yet";
  }

  return new Intl.DateTimeFormat("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(value);
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

const memberImportFields = [
  { key: "memberNo", label: "Member No.", aliases: ["member no", "member number", "member id", "account no", "account number"] },
  { key: "name", label: "Full Name", aliases: ["full name", "name", "member name"] },
  { key: "group", label: "Cluster / Group", aliases: ["cluster", "group", "area", "chapter"] },
  { key: "contactNumber", label: "Contact Number", aliases: ["contact", "contact number", "mobile", "phone", "cellphone"] },
  { key: "address", label: "Address", aliases: ["address", "home address"] },
  { key: "birthdate", label: "Birthdate", aliases: ["birthdate", "birth date", "date of birth", "dob"] },
  { key: "civilStatus", label: "Civil Status", aliases: ["civil status", "status civil", "marital status"] },
  { key: "occupation", label: "Occupation / Source of Income", aliases: ["occupation", "source of income", "income source", "work"] },
  { key: "membershipDate", label: "Membership Date", aliases: ["membership date", "date joined", "join date", "member since"] },
  { key: "status", label: "Status", aliases: ["status", "member status"] }
];

const sampleMemberImportCsv = `Member No.,Full Name,Cluster,Contact Number,Address,Birthdate,Civil Status,Occupation,Membership Date,Status
M-2026-004,Julieta M. Navarro,General Membership,09171234567,"Poblacion, Talisay",1985-02-14,Married,Sari-sari store owner,2026-06-15,Active
M-2026-005,Roberto P. Dizon,Water Station Group,09181234567,"San Isidro, Talisay",1979-09-30,Married,Tricycle operator,2026-06-15,Active`;

function normalizeImportHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeImportMemberNo(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let isQuoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && isQuoted && nextCharacter === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      isQuoted = !isQuoted;
    } else if (character === "," && !isQuoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }

  cells.push(cell.trim());
  return cells;
}

function parseMemberImportCsv(csvText) {
  const lines = String(csvText || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], errors: [] };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const errors = [];

  if (headers.some((header) => !header)) {
    errors.push("Header row has a blank column name.");
  }

  const rows = lines.slice(1).map((line, rowIndex) => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, columnIndex) => {
      row[header] = values[columnIndex] || "";
    });

    if (values.length !== headers.length) {
      errors.push(`Row ${rowIndex + 2} has ${values.length} cells but the header has ${headers.length}.`);
    }

    return row;
  });

  return { headers, rows, errors };
}

function suggestMemberImportMapping(headers) {
  return memberImportFields.reduce((mapping, field) => {
    const matchedHeader = headers.find((header) => field.aliases.includes(normalizeImportHeader(header)));
    return {
      ...mapping,
      [field.key]: matchedHeader || ""
    };
  }, {});
}

function isValidImportDate(value) {
  if (!value) {
    return true;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

function buildMemberImportPreview(rows, mapping, existingMembers = []) {
  const duplicateUploadMemberNos = new Set();
  const seenMemberNos = new Set();
  const existingMemberNos = new Set(existingMembers.map((member) => member.id));
  const mappedRows = rows.map((row, rowIndex) => {
    const mapped = memberImportFields.reduce((values, field) => {
      const sourceColumn = mapping[field.key];
      return {
        ...values,
        [field.key]: sourceColumn ? String(row[sourceColumn] || "").trim() : ""
      };
    }, {});

    if (mapped.memberNo) {
      if (seenMemberNos.has(mapped.memberNo)) {
        duplicateUploadMemberNos.add(mapped.memberNo);
      }
      seenMemberNos.add(mapped.memberNo);
    }

    return {
      rowNumber: rowIndex + 2,
      ...mapped,
      rawData: row
    };
  });

  return mappedRows.map((row) => {
    const issues = [];
    const normalizedStatus = row.status.toLowerCase();

    if (!row.name) {
      issues.push("Missing full name");
    }

    if (row.memberNo && duplicateUploadMemberNos.has(row.memberNo)) {
      issues.push("Duplicate member no. in upload");
    }

    if (row.memberNo && existingMemberNos.has(row.memberNo)) {
      issues.push("Member no. already exists");
    }

    if (!isValidImportDate(row.birthdate)) {
      issues.push("Invalid birthdate");
    }

    if (!isValidImportDate(row.membershipDate)) {
      issues.push("Invalid membership date");
    }

    if (row.status && !["active", "inactive"].includes(normalizedStatus)) {
      issues.push("Unknown status");
    }

    return {
      ...row,
      status: row.status || "Active",
      issues
    };
  });
}

const openingBalanceFields = [
  { key: "memberNo", label: "Member No.", aliases: ["member no", "member number", "member id", "account no", "account number"] },
  { key: "memberName", label: "Member Name", aliases: ["member name", "full name", "name"] },
  {
    key: "shareCapitalOpeningBalance",
    label: "Share Capital Opening Balance",
    aliases: ["share capital", "share capital opening balance", "share balance", "capital share", "paid up share"]
  },
  {
    key: "savingsOpeningBalance",
    label: "Savings Opening Balance",
    aliases: ["savings", "savings opening balance", "savings balance", "deposit balance"]
  },
  { key: "cutoverDate", label: "Cutover Date", aliases: ["cutover date", "as of date", "balance date", "date"] },
  { key: "sourceReference", label: "Source Reference", aliases: ["source reference", "reference", "sheet", "file", "batch reference"] }
];

const sampleOpeningBalanceCsv = `Member No.,Member Name,Share Capital,Savings,Cutover Date,Source Reference
M-000482,Maria L. Santos,62000,184500,2026-06-30,Excel June 2026
M-000517,Benito P. Cruz,44000,76800,2026-06-30,Excel June 2026`;

function suggestOpeningBalanceMapping(headers) {
  return openingBalanceFields.reduce((mapping, field) => {
    const matchedHeader = headers.find((header) => field.aliases.includes(normalizeImportHeader(header)));
    return {
      ...mapping,
      [field.key]: matchedHeader || ""
    };
  }, {});
}

function parseOpeningBalanceAmount(value) {
  const cleanedValue = String(value || "")
    .replace(/[,\s]/g, "")
    .replace(/^PHP/i, "")
    .trim();

  if (!cleanedValue) {
    return { value: 0 };
  }

  const amount = Number(cleanedValue);

  if (!Number.isFinite(amount) || amount < 0) {
    return { value: 0, error: "Invalid amount" };
  }

  return { value: amount };
}

function buildOpeningBalancePreview(
  rows,
  mapping,
  memberLookup = [],
  stagedMemberNos = [],
  finalizedMemberNos = []
) {
  const memberMap = new Map(memberLookup.map((member) => [normalizeImportMemberNo(member.id), member]));
  const stagedMemberNoSet = new Set(stagedMemberNos.map(normalizeImportMemberNo).filter(Boolean));
  const finalizedMemberNoSet = new Set(finalizedMemberNos.map(normalizeImportMemberNo).filter(Boolean));
  const seenMemberNos = new Set();
  const duplicateMemberNos = new Set();
  const mappedRows = rows.map((row, rowIndex) => {
    const mapped = openingBalanceFields.reduce((values, field) => {
      const sourceColumn = mapping[field.key];
      return {
        ...values,
        [field.key]: sourceColumn ? String(row[sourceColumn] || "").trim() : ""
      };
    }, {});

    const normalizedMemberNo = normalizeImportMemberNo(mapped.memberNo);

    if (normalizedMemberNo) {
      if (seenMemberNos.has(normalizedMemberNo)) {
        duplicateMemberNos.add(normalizedMemberNo);
      }
      seenMemberNos.add(normalizedMemberNo);
    }

    return {
      rowNumber: rowIndex + 2,
      ...mapped,
      normalizedMemberNo,
      rawData: row
    };
  });

  return mappedRows.map((row) => {
    const issues = [];
    const warnings = [];
    const member = memberMap.get(row.normalizedMemberNo);
    const shareCapital = parseOpeningBalanceAmount(row.shareCapitalOpeningBalance);
    const savings = parseOpeningBalanceAmount(row.savingsOpeningBalance);

    if (!row.memberNo) {
      issues.push("Missing member no.");
    } else if (!member) {
      issues.push("Member no. was not found");
    }

    if (row.normalizedMemberNo && duplicateMemberNos.has(row.normalizedMemberNo)) {
      issues.push("Duplicate member no. in upload");
    }

    if (row.normalizedMemberNo && stagedMemberNoSet.has(row.normalizedMemberNo)) {
      issues.push("Member already has a staged opening balance");
    }

    if (row.normalizedMemberNo && finalizedMemberNoSet.has(row.normalizedMemberNo)) {
      issues.push("Opening balance already finalized for member");
    }

    if (shareCapital.error) {
      issues.push("Invalid share capital amount");
    }

    if (savings.error) {
      issues.push("Invalid savings amount");
    }

    if (!isValidImportDate(row.cutoverDate)) {
      issues.push("Invalid cutover date");
    }

    if (!row.sourceReference) {
      issues.push("Missing source reference");
    }

    if (member && row.memberName && normalizeImportHeader(member.name) !== normalizeImportHeader(row.memberName)) {
      warnings.push(`Name differs from system record: ${member.name}`);
    }

    return {
      ...row,
      systemMemberName: member?.name || "",
      shareCapitalAmount: shareCapital.value,
      savingsAmount: savings.value,
      issues,
      warnings
    };
  });
}

function buildTellerBatchSummary(rows) {
  return rows.reduce(
    (summary, row) => {
      const cashIn = Number(row.cashReceived || 0);
      const cashOut = Number(row.cashOut || 0);

      return {
        cashIn: summary.cashIn + cashIn,
        cashOut: summary.cashOut + cashOut,
        transactionCount: summary.transactionCount + 1,
        initialPaymentCount: summary.initialPaymentCount + (row.batchType === "Initial Payment" ? 1 : 0),
        shareCapitalContributionCount:
          summary.shareCapitalContributionCount + (row.batchType === "Share Capital Contribution" ? 1 : 0),
        savingsDepositCount: summary.savingsDepositCount + (row.batchType === "Savings Deposit" ? 1 : 0),
        savingsWithdrawalCount: summary.savingsWithdrawalCount + (row.batchType === "Savings Withdrawal" ? 1 : 0)
      };
    },
    {
      cashIn: 0,
      cashOut: 0,
      transactionCount: 0,
      initialPaymentCount: 0,
      shareCapitalContributionCount: 0,
      savingsDepositCount: 0,
      savingsWithdrawalCount: 0
    }
  );
}

function Login({ onLogin }) {
  const [username, setUsername] = useState("membership");
  const [password, setPassword] = useState("p@55@LL");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");

    try {
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      onLogin(data.user);
    } catch (loginError) {
      setError(loginError.message);
    }
  }

  return (
    <Flex minH="100vh" bg="brand.700" color="white" align="center">
      <Container maxW="6xl">
        <Grid templateColumns={{ base: "1fr", lg: "1.2fr 420px" }} gap={10} alignItems="center">
          <GridItem>
            <Badge bg="yellow.300" color="green.900" mb={5}>
              React + Chakra + MySQL spike
            </Badge>
            <Heading size="3xl" lineHeight="1">
              TASETEMCO
            </Heading>
            <Text mt={5} fontSize="xl" color="green.50" maxW="2xl">
              First vertical slice for the cooperative working prototype: staff login,
              role-based landing screens, dashboard metrics, and seeded member data.
            </Text>
          </GridItem>
          <GridItem>
            <Box as="form" onSubmit={submit} bg="white" color="gray.800" p={7} borderRadius="lg">
              <Heading size="lg" mb={6}>
                Staff sign in
              </Heading>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Username</FormLabel>
                  <Input value={username} onChange={(event) => setUsername(event.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </FormControl>
                {error ? <Text color="red.500">{error}</Text> : null}
                <Button type="submit" colorScheme="green" width="full">
                  Sign in
                </Button>
              </VStack>
              <Text mt={5} fontSize="sm" color="gray.500">
                Try admin, manager, bookkeeper, loanofficer, approver, teller01,
                membership, auditor, or board. Password: p@55@LL
              </Text>
            </Box>
          </GridItem>
        </Grid>
      </Container>
    </Flex>
  );
}

function MemberImportPreview({ existingMembers, user }) {
  const [csvText, setCsvText] = useState(sampleMemberImportCsv);
  const [sourceLabel, setSourceLabel] = useState("CSV Paste");
  const [importBatches, setImportBatches] = useState([]);
  const [selectedImportBatch, setSelectedImportBatch] = useState(null);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [isSavingImportBatch, setIsSavingImportBatch] = useState(false);
  const [isFinalizingImportBatch, setIsFinalizingImportBatch] = useState(false);
  const parsedImport = useMemo(() => parseMemberImportCsv(csvText), [csvText]);
  const [mapping, setMapping] = useState(() => suggestMemberImportMapping(parsedImport.headers));
  const canFinalizeImport = user.username === "admin";

  const loadImportBatches = useCallback(async () => {
    try {
      const batches = await api("/api/member-import-batches");
      setImportBatches(batches);
    } catch (batchError) {
      setImportError(batchError.message);
    }
  }, []);

  useEffect(() => {
    loadImportBatches();
  }, [loadImportBatches]);

  useEffect(() => {
    setMapping((currentMapping) => {
      const nextMapping = suggestMemberImportMapping(parsedImport.headers);
      const preservedMapping = memberImportFields.reduce((values, field) => {
        const currentSource = currentMapping[field.key];
        return {
          ...values,
          [field.key]: parsedImport.headers.includes(currentSource) ? currentSource : nextMapping[field.key]
        };
      }, {});

      return preservedMapping;
    });
  }, [parsedImport.headers.join("|")]);

  const previewRows = useMemo(
    () => buildMemberImportPreview(parsedImport.rows, mapping, existingMembers),
    [parsedImport.rows, mapping, existingMembers]
  );
  const issueCount = previewRows.reduce((total, row) => total + row.issues.length, parsedImport.errors.length);
  const validRowCount = previewRows.filter((row) => row.issues.length === 0).length;

  function updateMapping(fieldKey, sourceColumn) {
    setMapping((current) => ({
      ...current,
      [fieldKey]: sourceColumn
    }));
  }

  function resetToSampleCsv() {
    setCsvText(sampleMemberImportCsv);
    setMapping(suggestMemberImportMapping(parseMemberImportCsv(sampleMemberImportCsv).headers));
  }

  function autoMapColumns() {
    setMapping(suggestMemberImportMapping(parsedImport.headers));
  }

  async function createImportBatch() {
    setImportMessage("");
    setImportError("");
    setIsSavingImportBatch(true);

    try {
      const data = await api("/api/member-import-batches", {
        method: "POST",
        body: JSON.stringify({
          sourceLabel,
          rows: previewRows
        })
      });

      setSelectedImportBatch(data);
      setImportMessage(`${data.batch.importNo} staged with ${data.batch.readyRows} ready rows and ${data.batch.issueRows} issue rows.`);
      await loadImportBatches();
    } catch (batchError) {
      setImportError(batchError.message);
    } finally {
      setIsSavingImportBatch(false);
    }
  }

  async function openImportBatch(importNo) {
    setImportMessage("");
    setImportError("");

    try {
      const data = await api(`/api/member-import-batches/${importNo}`);
      setSelectedImportBatch(data);
    } catch (batchError) {
      setImportError(batchError.message);
    }
  }

  async function finalizeImportBatch(importNo) {
    setImportMessage("");
    setImportError("");
    setIsFinalizingImportBatch(true);

    try {
      const data = await api(`/api/member-import-batches/${importNo}/finalize`, {
        method: "POST"
      });
      setSelectedImportBatch(data);
      setImportMessage(
        `${data.batch.importNo} finalized: ${data.batch.importedRows} imported, ${data.batch.skippedRows} skipped.`
      );
      await loadImportBatches();
    } catch (batchError) {
      setImportError(batchError.message);
    } finally {
      setIsFinalizingImportBatch(false);
    }
  }

  return (
    <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
      <Flex justify="space-between" gap={4} wrap="wrap" mb={4}>
        <Box>
          <Heading size="md">Member Import Preview</Heading>
          <Text color="gray.600" mt={1}>
            Preview only. No database records are created from this panel.
          </Text>
        </Box>
        <HStack spacing={3} flexWrap="wrap">
          <Button size="sm" variant="outline" onClick={resetToSampleCsv}>
            Load sample CSV
          </Button>
          <Button size="sm" variant="outline" onClick={autoMapColumns}>
            Auto-map columns
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCsvText("")}>
            Clear
          </Button>
        </HStack>
      </Flex>

      <FormControl mb={4}>
        <FormLabel>CSV Paste Area</FormLabel>
        <Textarea
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          minH="150px"
          fontFamily="mono"
          fontSize="sm"
        />
      </FormControl>

      <Grid templateColumns={{ base: "1fr", md: "1fr auto" }} gap={4} alignItems="end" mb={4}>
        <FormControl>
          <FormLabel>Import Source Label</FormLabel>
          <Input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} />
        </FormControl>
        <Button
          colorScheme="green"
          onClick={createImportBatch}
          isLoading={isSavingImportBatch}
          isDisabled={previewRows.length === 0}
        >
          Create Import Batch
        </Button>
      </Grid>

      {importMessage ? (
        <Text color="green.600" mb={4}>
          {importMessage}
        </Text>
      ) : null}
      {importError ? (
        <Text color="red.500" mb={4}>
          {importError}
        </Text>
      ) : null}

      <Box borderWidth="1px" borderRadius="md" p={4} mb={4}>
        <Text fontWeight="bold" mb={3}>
          Detected Columns
        </Text>
        <HStack spacing={2} flexWrap="wrap">
          {parsedImport.headers.length > 0 ? (
            parsedImport.headers.map((header) => (
              <Badge key={header} colorScheme="blue" variant="subtle">
                {header}
              </Badge>
            ))
          ) : (
            <Text color="gray.500">No header row detected.</Text>
          )}
        </HStack>
      </Box>

      <Box borderWidth="1px" borderRadius="md" p={4} mb={4}>
        <Flex justify="space-between" gap={4} wrap="wrap" mb={3}>
          <Text fontWeight="bold">Column Mapping</Text>
          <Text color={issueCount > 0 ? "orange.600" : "green.600"} fontSize="sm">
            {validRowCount} valid rows / {previewRows.length} preview rows / {issueCount} issues
          </Text>
        </Flex>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }} gap={4}>
          {memberImportFields.map((field) => (
            <FormControl key={field.key}>
              <FormLabel>{field.label}</FormLabel>
              <Select value={mapping[field.key] || ""} onChange={(event) => updateMapping(field.key, event.target.value)}>
                <option value="">Do not import</option>
                {parsedImport.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </Select>
            </FormControl>
          ))}
        </Grid>
      </Box>

      {parsedImport.errors.length > 0 ? (
        <Box borderWidth="1px" borderRadius="md" p={4} mb={4} borderColor="orange.200" bg="orange.50">
          <Text fontWeight="bold" mb={2}>
            CSV Structure Issues
          </Text>
          <VStack align="stretch" spacing={1}>
            {parsedImport.errors.map((importError) => (
              <Text key={importError} color="orange.700" fontSize="sm">
                {importError}
              </Text>
            ))}
          </VStack>
        </Box>
      ) : null}

      <TableContainer>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Row</Th>
              <Th>Member No.</Th>
              <Th>Name</Th>
              <Th>Cluster</Th>
              <Th>Contact</Th>
              <Th>Membership Date</Th>
              <Th>Status</Th>
              <Th>Issues</Th>
            </Tr>
          </Thead>
          <Tbody>
            {previewRows.map((row) => (
              <Tr key={row.rowNumber}>
                <Td>{row.rowNumber}</Td>
                <Td>{row.memberNo || "-"}</Td>
                <Td>{row.name || "-"}</Td>
                <Td>{row.group || "-"}</Td>
                <Td>{row.contactNumber || "-"}</Td>
                <Td>{row.membershipDate || "-"}</Td>
                <Td>
                  <Badge colorScheme={row.status === "Active" ? "green" : "gray"}>{row.status}</Badge>
                </Td>
                <Td>
                  {row.issues.length > 0 ? (
                    <VStack align="stretch" spacing={1}>
                      {row.issues.map((issue) => (
                        <Badge key={issue} colorScheme="orange" width="fit-content">
                          {issue}
                        </Badge>
                      ))}
                    </VStack>
                  ) : (
                    <Badge colorScheme="green">Ready</Badge>
                  )}
                </Td>
              </Tr>
            ))}
            {previewRows.length === 0 ? (
              <Tr>
                <Td colSpan={8} color="gray.500">
                  No rows to preview.
                </Td>
              </Tr>
            ) : null}
          </Tbody>
        </Table>
      </TableContainer>

      <Box borderWidth="1px" borderRadius="md" p={4} mt={5}>
        <Flex justify="space-between" gap={4} wrap="wrap" mb={3}>
          <Text fontWeight="bold">Import Batch History</Text>
          <Button size="sm" variant="outline" onClick={loadImportBatches}>
            Refresh batches
          </Button>
        </Flex>
        <TableContainer>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Batch No.</Th>
                <Th>Source</Th>
                <Th>Status</Th>
                <Th isNumeric>Total</Th>
                <Th isNumeric>Ready</Th>
                <Th isNumeric>Issues</Th>
                <Th>Created By</Th>
                <Th>Created</Th>
                <Th>Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {importBatches.map((batch) => (
                <Tr key={batch.importNo}>
                  <Td>{batch.importNo}</Td>
                  <Td>{batch.sourceLabel}</Td>
                  <Td>
                    <Badge colorScheme={batch.status === "Finalized" ? "green" : "blue"}>{batch.status}</Badge>
                  </Td>
                  <Td isNumeric>{batch.totalRows}</Td>
                  <Td isNumeric>{batch.readyRows}</Td>
                  <Td isNumeric>{batch.issueRows}</Td>
                  <Td>{batch.createdBy}</Td>
                  <Td>{formatDateTime(batch.createdAt)}</Td>
                  <Td>
                    <Button size="sm" onClick={() => openImportBatch(batch.importNo)}>
                      View
                    </Button>
                  </Td>
                </Tr>
              ))}
              {importBatches.length === 0 ? (
                <Tr>
                  <Td colSpan={9} color="gray.500">
                    No staged import batches yet.
                  </Td>
                </Tr>
              ) : null}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      {selectedImportBatch ? (
        <Box borderWidth="1px" borderRadius="md" p={4} mt={5}>
          <Flex justify="space-between" gap={4} wrap="wrap" mb={3}>
            <Box>
              <Text fontWeight="bold">{selectedImportBatch.batch.importNo} Details</Text>
              <Text color="gray.600" fontSize="sm">
                Ready rows become active members only after Admin finalization.
              </Text>
            </Box>
            <HStack spacing={3} flexWrap="wrap">
              {canFinalizeImport && selectedImportBatch.batch.status !== "Finalized" ? (
                <Button
                  size="sm"
                  colorScheme="green"
                  onClick={() => finalizeImportBatch(selectedImportBatch.batch.importNo)}
                  isLoading={isFinalizingImportBatch}
                  isDisabled={selectedImportBatch.batch.readyRows === 0}
                >
                  Finalize Import
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => setSelectedImportBatch(null)}>
                Close
              </Button>
            </HStack>
          </Flex>
          {selectedImportBatch.batch.status === "Finalized" ? (
            <HStack spacing={3} flexWrap="wrap" mb={3}>
              <Badge colorScheme="green">{selectedImportBatch.batch.importedRows} imported</Badge>
              <Badge colorScheme="gray">{selectedImportBatch.batch.skippedRows} skipped</Badge>
              <Text color="gray.600" fontSize="sm">
                Finalized by {selectedImportBatch.batch.finalizedBy || "-"} {formatDateTime(selectedImportBatch.batch.finalizedAt)}
              </Text>
            </HStack>
          ) : null}
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Row</Th>
                  <Th>Member No.</Th>
                  <Th>Name</Th>
                  <Th>Cluster</Th>
                  <Th>Contact</Th>
                  <Th>Status</Th>
                  <Th>Row Status</Th>
                  <Th>Issues</Th>
                </Tr>
              </Thead>
              <Tbody>
                {selectedImportBatch.rows.map((row) => (
                  <Tr key={`${selectedImportBatch.batch.importNo}-${row.rowNumber}`}>
                    <Td>{row.rowNumber}</Td>
                    <Td>{row.memberNo || "-"}</Td>
                    <Td>{row.name || "-"}</Td>
                    <Td>{row.group || "-"}</Td>
                    <Td>{row.contactNumber || "-"}</Td>
                    <Td>{row.status}</Td>
                    <Td>
                      <Badge
                        colorScheme={
                          row.rowStatus === "Imported"
                            ? "green"
                            : row.rowStatus === "Skipped"
                              ? "gray"
                              : row.rowStatus === "Ready"
                                ? "blue"
                                : "orange"
                        }
                      >
                        {row.rowStatus}
                      </Badge>
                    </Td>
                    <Td>
                      {row.issues.length > 0 ? row.issues.join(", ") : "Ready"}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      ) : null}
    </Box>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api("/api/dashboard").then(setData);
  }, []);

  if (!data) {
    return <Text>Loading dashboard...</Text>;
  }

  return (
    <VStack align="stretch" spacing={5} minW={0} maxW="100%">
      <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4}>
        {data.metrics.map((metric) => (
          <Box key={metric.label} bg="white" borderWidth="1px" borderRadius="lg" p={5}>
            <Stat>
              <StatLabel>{metric.label}</StatLabel>
              <StatNumber>{formatMoney(metric.value)}</StatNumber>
              <StatHelpText>{metric.note}</StatHelpText>
            </Stat>
          </Box>
        ))}
      </Grid>
      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Heading size="md" mb={4}>
          Risk Watch
        </Heading>
        <VStack align="stretch">
          {data.watchItems.map((item) => (
            <Flex key={item.title} justify="space-between" borderBottomWidth="1px" py={2}>
              <Text fontWeight="bold">{item.title}</Text>
              <Text color="gray.500">{item.value}</Text>
            </Flex>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
}

function OpeningBalancePreview({ memberLookup, user, onBalancesChanged }) {
  const [csvText, setCsvText] = useState(sampleOpeningBalanceCsv);
  const parsedImport = useMemo(() => parseMemberImportCsv(csvText), [csvText]);
  const [mapping, setMapping] = useState(() => suggestOpeningBalanceMapping(parsedImport.headers));
  const [sourceLabel, setSourceLabel] = useState("CSV Paste");
  const [stagedBatches, setStagedBatches] = useState([]);
  const [stagedMemberNos, setStagedMemberNos] = useState([]);
  const [finalizedMemberNos, setFinalizedMemberNos] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [selectedBatchDetails, setSelectedBatchDetails] = useState(null);
  const [loadingDetailsId, setLoadingDetailsId] = useState("");
  const [isRejectingBatch, setIsRejectingBatch] = useState(false);
  const [isFinalizingBatch, setIsFinalizingBatch] = useState(false);
  const [isPostingJournal, setIsPostingJournal] = useState(false);
  const batchDetails = useDisclosure();
  const finalizeConfirmation = useDisclosure();
  const canRejectOpeningBalanceBatch = user.username === "admin" || user.role === "System Administrator";
  const canFinalizeOpeningBalanceBatch = canRejectOpeningBalanceBatch;

  useEffect(() => {
    setMapping((currentMapping) => {
      const nextMapping = suggestOpeningBalanceMapping(parsedImport.headers);
      return openingBalanceFields.reduce((values, field) => {
        const currentSource = currentMapping[field.key];
        return {
          ...values,
          [field.key]: parsedImport.headers.includes(currentSource) ? currentSource : nextMapping[field.key]
        };
      }, {});
    });
  }, [parsedImport.headers.join("|")]);

  const previewRows = useMemo(
    () => buildOpeningBalancePreview(parsedImport.rows, mapping, memberLookup, stagedMemberNos, finalizedMemberNos),
    [parsedImport.rows, mapping, memberLookup, stagedMemberNos, finalizedMemberNos]
  );
  const issueCount = previewRows.reduce((total, row) => total + row.issues.length, parsedImport.errors.length);
  const warningCount = previewRows.reduce((total, row) => total + row.warnings.length, 0);
  const validRowCount = previewRows.filter((row) => row.issues.length === 0).length;
  const shareCapitalTotal = previewRows
    .filter((row) => row.issues.length === 0)
    .reduce((total, row) => total + row.shareCapitalAmount, 0);
  const savingsTotal = previewRows
    .filter((row) => row.issues.length === 0)
    .reduce((total, row) => total + row.savingsAmount, 0);
  const canSaveStagedBatch = previewRows.length > 0 && parsedImport.errors.length === 0;

  async function loadStagedBatches() {
    setIsLoadingBatches(true);

    try {
      const [rows, memberNos, finalizedNos] = await Promise.all([
        api("/api/ledger/opening-balance-import-batches"),
        api("/api/ledger/opening-balance-staged-member-nos"),
        api("/api/ledger/opening-balance-finalized-member-nos")
      ]);
      setStagedBatches(rows);
      setStagedMemberNos(memberNos);
      setFinalizedMemberNos(finalizedNos);
    } catch (batchError) {
      setError(batchError.message);
    } finally {
      setIsLoadingBatches(false);
    }
  }

  useEffect(() => {
    loadStagedBatches();
  }, []);

  function updateMapping(fieldKey, sourceColumn) {
    setMapping((current) => ({
      ...current,
      [fieldKey]: sourceColumn
    }));
  }

  function resetToSampleCsv() {
    setCsvText(sampleOpeningBalanceCsv);
    setSourceLabel("CSV Paste");
    setMapping(suggestOpeningBalanceMapping(parseMemberImportCsv(sampleOpeningBalanceCsv).headers));
  }

  function autoMapColumns() {
    setMapping(suggestOpeningBalanceMapping(parsedImport.headers));
  }

  async function saveStagedBatch() {
    setMessage("");
    setError("");
    setIsSaving(true);

    try {
      const payloadRows = previewRows.map((row) => ({
        rowNumber: row.rowNumber,
        memberNo: row.memberNo,
        memberName: row.memberName,
        shareCapitalOpeningBalance: row.shareCapitalOpeningBalance,
        savingsOpeningBalance: row.savingsOpeningBalance,
        cutoverDate: row.cutoverDate,
        sourceReference: row.sourceReference,
        rawData: row.rawData
      }));
      const data = await api("/api/ledger/opening-balance-import-batches", {
        method: "POST",
        body: JSON.stringify({
          sourceLabel,
          rows: payloadRows
        })
      });

      setMessage(`${data.batch.importNo} saved as staged opening balance import.`);
      await loadStagedBatches();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function openBatchDetails(importNo) {
    setError("");
    setLoadingDetailsId(importNo);

    try {
      const data = await api(`/api/ledger/opening-balance-import-batches/${importNo}`);
      setSelectedBatchDetails(data);
      batchDetails.onOpen();
    } catch (detailsError) {
      setError(detailsError.message);
    } finally {
      setLoadingDetailsId("");
    }
  }

  async function rejectSelectedBatch() {
    if (!selectedBatchDetails) {
      return;
    }

    setError("");
    setMessage("");
    setIsRejectingBatch(true);

    try {
      const data = await api(`/api/ledger/opening-balance-import-batches/${selectedBatchDetails.batch.importNo}/reject`, {
        method: "POST"
      });
      setSelectedBatchDetails((current) => (current ? { ...current, batch: data.batch } : current));
      setMessage(`${data.batch.importNo} rejected.`);
      await loadStagedBatches();
    } catch (rejectError) {
      setError(rejectError.message);
    } finally {
      setIsRejectingBatch(false);
    }
  }

  async function finalizeSelectedBatch() {
    if (!selectedBatchDetails) {
      return;
    }

    setError("");
    setMessage("");
    setIsFinalizingBatch(true);

    try {
      const data = await api(`/api/ledger/opening-balance-import-batches/${selectedBatchDetails.batch.importNo}/finalize`, {
        method: "POST"
      });
      setSelectedBatchDetails(data);
      setMessage(
        `${data.batch.importNo} finalized: ${data.batch.finalizedRows} row${data.batch.finalizedRows === 1 ? "" : "s"} applied, ${data.batch.skippedRows} skipped.`
      );
      finalizeConfirmation.onClose();
      await loadStagedBatches();
      await onBalancesChanged?.();
    } catch (finalizeError) {
      setError(finalizeError.message);
    } finally {
      setIsFinalizingBatch(false);
    }
  }

  async function postMissingJournal() {
    if (!selectedBatchDetails) {
      return;
    }

    setError("");
    setMessage("");
    setIsPostingJournal(true);

    try {
      const data = await api(
        `/api/ledger/opening-balance-import-batches/${selectedBatchDetails.batch.importNo}/post-journal`,
        { method: "POST" }
      );
      setSelectedBatchDetails((current) => (current ? { ...current, batch: data.batch } : current));
      setMessage(`${data.batch.importNo} linked to journal ${data.entry.id}.`);
      await loadStagedBatches();
      await onBalancesChanged?.();
    } catch (journalError) {
      setError(journalError.message);
    } finally {
      setIsPostingJournal(false);
    }
  }

  return (
    <VStack align="stretch" spacing={5}>
    <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
      <Flex justify="space-between" gap={4} wrap="wrap" mb={4}>
        <Box>
          <Heading size="md">Opening Balance Import</Heading>
          <Text color="gray.600" mt={1}>
            Save mapped cutover balances into a staged review batch. Final posting is not enabled yet.
          </Text>
        </Box>
        <HStack spacing={3} flexWrap="wrap">
          <Button size="sm" variant="outline" onClick={resetToSampleCsv}>
            Load sample CSV
          </Button>
          <Button size="sm" variant="outline" onClick={autoMapColumns}>
            Auto-map columns
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCsvText("")}>
            Clear
          </Button>
          <Button
            size="sm"
            colorScheme="green"
            onClick={saveStagedBatch}
            isLoading={isSaving}
            isDisabled={!canSaveStagedBatch}
          >
            Save Staged Batch
          </Button>
        </HStack>
      </Flex>

      {message ? <Text color="green.600" mb={4}>{message}</Text> : null}
      {error ? <Text color="red.500" mb={4}>{error}</Text> : null}

      <FormControl mb={4}>
        <FormLabel>Source Label</FormLabel>
        <Input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} />
      </FormControl>

      <FormControl mb={4}>
        <FormLabel>CSV Paste Area</FormLabel>
        <Textarea
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          minH="130px"
          fontFamily="mono"
          fontSize="sm"
        />
      </FormControl>

      <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4} mb={4}>
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Text color="gray.500" fontSize="sm">Valid Rows</Text>
          <Text fontWeight="bold">{validRowCount} / {previewRows.length}</Text>
        </Box>
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Text color="gray.500" fontSize="sm">Share Capital Total</Text>
          <Text fontWeight="bold">{formatMoney(shareCapitalTotal)}</Text>
        </Box>
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Text color="gray.500" fontSize="sm">Savings Total</Text>
          <Text fontWeight="bold">{formatMoney(savingsTotal)}</Text>
        </Box>
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Text color="gray.500" fontSize="sm">Issues / Warnings</Text>
          <Text fontWeight="bold">{issueCount} / {warningCount}</Text>
        </Box>
      </Grid>

      <Box borderWidth="1px" borderRadius="md" p={4} mb={4}>
        <Text fontWeight="bold" mb={3}>Detected Columns</Text>
        <HStack spacing={2} flexWrap="wrap">
          {parsedImport.headers.length > 0 ? (
            parsedImport.headers.map((header) => (
              <Badge key={header} colorScheme="blue" variant="subtle">
                {header}
              </Badge>
            ))
          ) : (
            <Text color="gray.500">No header row detected.</Text>
          )}
        </HStack>
      </Box>

      <Box borderWidth="1px" borderRadius="md" p={4} mb={4}>
        <Flex justify="space-between" gap={4} wrap="wrap" mb={3}>
          <Text fontWeight="bold">Column Mapping</Text>
          <Text color={issueCount > 0 ? "orange.600" : "green.600"} fontSize="sm">
            Unknown columns can stay as Do not import.
          </Text>
        </Flex>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }} gap={4}>
          {openingBalanceFields.map((field) => (
            <FormControl key={field.key}>
              <FormLabel>{field.label}</FormLabel>
              <Select value={mapping[field.key] || ""} onChange={(event) => updateMapping(field.key, event.target.value)}>
                <option value="">Do not import</option>
                {parsedImport.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </Select>
            </FormControl>
          ))}
        </Grid>
      </Box>

      {parsedImport.errors.length > 0 ? (
        <Box borderWidth="1px" borderRadius="md" p={4} mb={4} borderColor="orange.200" bg="orange.50">
          <Text fontWeight="bold" mb={2}>CSV Structure Issues</Text>
          <VStack align="stretch" spacing={1}>
            {parsedImport.errors.map((importError) => (
              <Text key={importError} color="orange.700" fontSize="sm">
                {importError}
              </Text>
            ))}
          </VStack>
        </Box>
      ) : null}

      <TableContainer>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Row</Th>
              <Th>Member No.</Th>
              <Th>Member Name</Th>
              <Th isNumeric>Share Capital</Th>
              <Th isNumeric>Savings</Th>
              <Th>Cutover</Th>
              <Th>Reference</Th>
              <Th>Issues</Th>
            </Tr>
          </Thead>
          <Tbody>
            {previewRows.map((row) => (
              <Tr key={row.rowNumber}>
                <Td>{row.rowNumber}</Td>
                <Td>{row.memberNo || "-"}</Td>
                <Td>
                  <Text>{row.memberName || "-"}</Text>
                  {row.systemMemberName ? (
                    <Text color="gray.500" fontSize="xs">System: {row.systemMemberName}</Text>
                  ) : null}
                </Td>
                <Td isNumeric>{formatMoney(row.shareCapitalAmount)}</Td>
                <Td isNumeric>{formatMoney(row.savingsAmount)}</Td>
                <Td>{row.cutoverDate || "-"}</Td>
                <Td>{row.sourceReference || "-"}</Td>
                <Td>
                  {row.issues.length > 0 || row.warnings.length > 0 ? (
                    <VStack align="stretch" spacing={1}>
                      {row.issues.map((issue) => (
                        <Badge key={issue} colorScheme="orange" width="fit-content">
                          {issue}
                        </Badge>
                      ))}
                      {row.warnings.map((warning) => (
                        <Badge key={warning} colorScheme="yellow" width="fit-content">
                          {warning}
                        </Badge>
                      ))}
                    </VStack>
                  ) : (
                    <Badge colorScheme="green">Ready</Badge>
                  )}
                </Td>
              </Tr>
            ))}
            {previewRows.length === 0 ? (
              <Tr>
                <Td colSpan={8} color="gray.500">No rows to preview.</Td>
              </Tr>
            ) : null}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>

    <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
      <Flex justify="space-between" align="center" gap={4} wrap="wrap" mb={4}>
        <Box>
          <Heading size="md">Staged Opening Balance Batches</Heading>
          <Text color="gray.600" mt={1}>
            Opening balance batches remain visible through staged, finalized, and rejected status.
          </Text>
        </Box>
        <Button size="sm" variant="outline" onClick={loadStagedBatches} isLoading={isLoadingBatches}>
          Refresh
        </Button>
      </Flex>
      <TableContainer>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Batch</Th>
              <Th>Status</Th>
              <Th>Source</Th>
              <Th isNumeric>Ready</Th>
              <Th isNumeric>Issues</Th>
              <Th isNumeric>Share Capital</Th>
              <Th isNumeric>Savings</Th>
              <Th>Created By</Th>
              <Th>Created</Th>
              <Th>Details</Th>
            </Tr>
          </Thead>
          <Tbody>
            {stagedBatches.map((batch) => (
              <Tr key={batch.importNo}>
                <Td>{batch.importNo}</Td>
                <Td>
                  <Badge
                    colorScheme={
                      batch.status === "Rejected" ? "red" : batch.status === "Finalized" ? "green" : "blue"
                    }
                  >
                    {batch.status}
                  </Badge>
                </Td>
                <Td>{batch.sourceLabel}</Td>
                <Td isNumeric>{batch.readyRows} / {batch.totalRows}</Td>
                <Td isNumeric>{batch.issueRows}</Td>
                <Td isNumeric>{formatMoney(batch.totalShareCapital)}</Td>
                <Td isNumeric>{formatMoney(batch.totalSavings)}</Td>
                <Td>{batch.createdBy}</Td>
                <Td>{formatDateTime(batch.createdAt)}</Td>
                <Td>
                  <Button
                    size="sm"
                    onClick={() => openBatchDetails(batch.importNo)}
                    isLoading={loadingDetailsId === batch.importNo}
                  >
                    View
                  </Button>
                </Td>
              </Tr>
            ))}
            {stagedBatches.length === 0 ? (
              <Tr>
                <Td colSpan={10} color="gray.500">No staged opening balance batches yet.</Td>
              </Tr>
            ) : null}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>

    <Modal isOpen={batchDetails.isOpen} onClose={batchDetails.onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {selectedBatchDetails ? `Opening Balance Batch - ${selectedBatchDetails.batch.importNo}` : "Opening Balance Batch"}
        </ModalHeader>
        <ModalBody>
          {selectedBatchDetails ? (
            <VStack align="stretch" spacing={5}>
              <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4}>
                <Box borderWidth="1px" borderRadius="md" p={4}>
                  <Text color="gray.500" fontSize="sm">Status</Text>
                  <Badge
                    colorScheme={
                      selectedBatchDetails.batch.status === "Rejected"
                        ? "red"
                        : selectedBatchDetails.batch.status === "Finalized"
                          ? "green"
                          : "blue"
                    }
                  >
                    {selectedBatchDetails.batch.status}
                  </Badge>
                </Box>
                <Box borderWidth="1px" borderRadius="md" p={4}>
                  <Text color="gray.500" fontSize="sm">Ready / Total</Text>
                  <Text fontWeight="bold">
                    {selectedBatchDetails.batch.readyRows} / {selectedBatchDetails.batch.totalRows}
                  </Text>
                </Box>
                <Box borderWidth="1px" borderRadius="md" p={4}>
                  <Text color="gray.500" fontSize="sm">Share Capital</Text>
                  <Text fontWeight="bold">{formatMoney(selectedBatchDetails.batch.totalShareCapital)}</Text>
                </Box>
                <Box borderWidth="1px" borderRadius="md" p={4}>
                  <Text color="gray.500" fontSize="sm">Savings</Text>
                  <Text fontWeight="bold">{formatMoney(selectedBatchDetails.batch.totalSavings)}</Text>
                </Box>
              </Grid>

              {selectedBatchDetails.batch.status !== "Staged" ? (
                <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
                  <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Text color="gray.500" fontSize="sm">Finalized Rows</Text>
                    <Text fontWeight="bold">{selectedBatchDetails.batch.finalizedRows || 0}</Text>
                  </Box>
                  <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Text color="gray.500" fontSize="sm">Skipped Rows</Text>
                    <Text fontWeight="bold">{selectedBatchDetails.batch.skippedRows || 0}</Text>
                  </Box>
                  <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Text color="gray.500" fontSize="sm">Actioned By</Text>
                    <Text fontWeight="bold">{selectedBatchDetails.batch.finalizedBy || "-"}</Text>
                    <Text color="gray.500" fontSize="xs">
                      {formatDateTime(selectedBatchDetails.batch.finalizedAt)}
                    </Text>
                  </Box>
                </Grid>
              ) : null}

              {selectedBatchDetails.batch.status === "Finalized" ? (
                <Box borderWidth="1px" borderRadius="md" p={4}>
                  <Text color="gray.500" fontSize="sm">Opening Journal</Text>
                  <Text fontWeight="bold">{selectedBatchDetails.batch.postedEntryNo || "Missing journal"}</Text>
                  <Text color="gray.500" fontSize="sm" mt={1}>
                    Debit Opening Balance Clearing; credit Share Capital and Savings Deposits Payable.
                  </Text>
                </Box>
              ) : null}

              <TableContainer>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Row</Th>
                      <Th>Member</Th>
                      <Th isNumeric>Share Capital</Th>
                      <Th isNumeric>Savings</Th>
                      <Th>Cutover</Th>
                      <Th>Reference</Th>
                      <Th>Status</Th>
                      <Th>Raw Source</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {selectedBatchDetails.rows.map((row) => (
                      <Tr key={row.id}>
                        <Td>{row.rowNumber}</Td>
                        <Td>
                          <Text>{row.memberNo || "-"}</Text>
                          <Text color="gray.500" fontSize="xs">{row.memberName || "-"}</Text>
                        </Td>
                        <Td isNumeric>{formatMoney(row.shareCapitalAmount)}</Td>
                        <Td isNumeric>{formatMoney(row.savingsAmount)}</Td>
                        <Td>{row.cutoverDate || "-"}</Td>
                        <Td>{row.sourceReference || "-"}</Td>
                        <Td>
                          <VStack align="stretch" spacing={1}>
                            <Badge colorScheme={row.rowStatus === "Ready" ? "green" : "orange"} width="fit-content">
                              {row.rowStatus}
                            </Badge>
                            {row.issues.map((issue) => (
                              <Badge key={issue} colorScheme="orange" width="fit-content">
                                {issue}
                              </Badge>
                            ))}
                          </VStack>
                        </Td>
                        <Td>
                          <Text as="pre" whiteSpace="pre-wrap" fontSize="xs" maxW="260px">
                            {JSON.stringify(row.rawData || {}, null, 2)}
                          </Text>
                        </Td>
                      </Tr>
                    ))}
                    {selectedBatchDetails.rows.length === 0 ? (
                      <Tr>
                        <Td colSpan={8} color="gray.500">No staged rows found.</Td>
                      </Tr>
                    ) : null}
                  </Tbody>
                </Table>
              </TableContainer>
            </VStack>
          ) : null}
        </ModalBody>
        <ModalFooter>
          {selectedBatchDetails?.batch.status === "Finalized" &&
          !selectedBatchDetails.batch.postedEntryNo &&
          canFinalizeOpeningBalanceBatch ? (
            <Button colorScheme="orange" mr={3} onClick={postMissingJournal} isLoading={isPostingJournal}>
              Post Missing Journal
            </Button>
          ) : null}
          {selectedBatchDetails?.batch.status === "Staged" &&
          selectedBatchDetails.batch.readyRows > 0 &&
          canFinalizeOpeningBalanceBatch ? (
            <Button colorScheme="green" mr={3} onClick={finalizeConfirmation.onOpen}>
              Finalize Ready Rows
            </Button>
          ) : null}
          {selectedBatchDetails?.batch.status === "Staged" && canRejectOpeningBalanceBatch ? (
            <Button colorScheme="red" variant="outline" mr={3} onClick={rejectSelectedBatch} isLoading={isRejectingBatch}>
              Reject Batch
            </Button>
          ) : null}
          <Button onClick={batchDetails.onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>

    <Modal isOpen={finalizeConfirmation.isOpen} onClose={finalizeConfirmation.onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Confirm Opening Balance Finalization</ModalHeader>
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <Text>
              Finalize the ready rows in {selectedBatchDetails?.batch.importNo || "this batch"}?
            </Text>
            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
              <Box borderWidth="1px" borderRadius="md" p={4}>
                <Text color="gray.500" fontSize="sm">Ready Rows</Text>
                <Text fontWeight="bold">{selectedBatchDetails?.batch.readyRows || 0}</Text>
              </Box>
              <Box borderWidth="1px" borderRadius="md" p={4}>
                <Text color="gray.500" fontSize="sm">Issue Rows Skipped</Text>
                <Text fontWeight="bold">{selectedBatchDetails?.batch.issueRows || 0}</Text>
              </Box>
              <Box borderWidth="1px" borderRadius="md" p={4}>
                <Text color="gray.500" fontSize="sm">Share Capital</Text>
                <Text fontWeight="bold">{formatMoney(selectedBatchDetails?.batch.totalShareCapital || 0)}</Text>
              </Box>
              <Box borderWidth="1px" borderRadius="md" p={4}>
                <Text color="gray.500" fontSize="sm">Savings</Text>
                <Text fontWeight="bold">{formatMoney(selectedBatchDetails?.batch.totalSavings || 0)}</Text>
              </Box>
            </Grid>
            <Text color="green.700" fontSize="sm">
              This updates member balances and creates one balanced opening journal for the finalized rows.
            </Text>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button mr={3} onClick={finalizeConfirmation.onClose}>
            Cancel
          </Button>
          <Button colorScheme="green" onClick={finalizeSelectedBatch} isLoading={isFinalizingBatch}>
            Confirm Finalization
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
    </VStack>
  );
}

function Members({ user }) {
  const [members, setMembers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [initialPayments, setInitialPayments] = useState([]);
  const [shareCapitalContributions, setShareCapitalContributions] = useState([]);
  const [savingsDeposits, setSavingsDeposits] = useState([]);
  const [savingsWithdrawals, setSavingsWithdrawals] = useState([]);
  const [activeBatch, setActiveBatch] = useState(null);
  const [latestCashCount, setLatestCashCount] = useState(null);
  const [statement, setStatement] = useState(null);
  const [form, setForm] = useState({
    fullName: "",
    clusterName: "General Membership",
    contactNumber: "",
    initialShareCapital: 5000
  });
  const [paymentForm, setPaymentForm] = useState({
    memberId: "",
    shareCapitalAmount: 5000,
    membershipFeeAmount: 100,
    savingsDepositAmount: 1000,
    cashReceived: 6100,
    referenceNo: ""
  });
  const [savingsDepositForm, setSavingsDepositForm] = useState({
    memberId: "",
    amount: 1000,
    cashReceived: 1000,
    referenceNo: ""
  });
  const [shareCapitalContributionForm, setShareCapitalContributionForm] = useState({
    memberId: "",
    amount: 1000,
    cashReceived: 1000,
    referenceNo: ""
  });
  const [savingsWithdrawalForm, setSavingsWithdrawalForm] = useState({
    memberId: "",
    amount: 500,
    referenceNo: ""
  });
  const [cashCountForm, setCashCountForm] = useState({
    actualCash: 0
  });
  const [memberProfileForm, setMemberProfileForm] = useState({
    name: "",
    group: "",
    contactNumber: "",
    address: "",
    birthdate: "",
    civilStatus: "",
    occupation: "",
    membershipDate: "",
    status: "Active"
  });
  const [selectedTellerMemberId, setSelectedTellerMemberId] = useState("");
  const [tellerTransactionType, setTellerTransactionType] = useState("initial-payment");
  const [approvedMemberName, setApprovedMemberName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const approvalNotice = useDisclosure();
  const canCreateApplication = user.permissions.includes("members:applications:create");
  const canEditMemberProfile = user.permissions.includes("members:profile:edit");
  const canViewApplications = user.permissions.includes("members:applications:view");
  const canApproveApplication = user.permissions.includes("members:applications:approve");
  const canViewInitialPayments = user.permissions.includes("members:initial-payments:view");
  const canCreateInitialPayment = user.permissions.includes("members:initial-payments:create");
  const canViewShareCapitalContributions = user.permissions.includes("members:share-capital-contributions:view");
  const canCreateShareCapitalContribution = user.permissions.includes("members:share-capital-contributions:create");
  const canViewSavingsDeposits = user.permissions.includes("members:savings-deposits:view");
  const canCreateSavingsDeposit = user.permissions.includes("members:savings-deposits:create");
  const canViewSavingsWithdrawals = user.permissions.includes("members:savings-withdrawals:view");
  const canCreateSavingsWithdrawal = user.permissions.includes("members:savings-withdrawals:create");
  const canViewTellerCashCount = user.permissions.includes("teller-cash-counts:view");
  const canCreateTellerCashCount = user.permissions.includes("teller-cash-counts:create");
  const pendingApplications = applications.filter((application) => application.status === "Pending Approval");
  const activeMembers = members.filter((member) => member.status === "Active");
  const canUseTellerWorkspace =
    canCreateInitialPayment ||
    canCreateShareCapitalContribution ||
    canCreateSavingsDeposit ||
    canCreateSavingsWithdrawal;
  const selectedTellerMember = activeMembers.find((member) => member.id === selectedTellerMemberId);
  const tellerBatchRows = [
    ...initialPayments
      .filter((payment) => payment.status === "Teller Batch")
      .map((payment) => ({ ...payment, batchType: "Initial Payment", cashOut: 0 })),
    ...savingsDeposits
      .filter((deposit) => deposit.status === "Teller Batch")
      .map((deposit) => ({
        ...deposit,
        batchType: "Savings Deposit",
        cashOut: 0,
        shareCapitalAmount: 0,
        membershipFeeAmount: 0,
        savingsDepositAmount: deposit.amount
      })),
    ...shareCapitalContributions
      .filter((contribution) => contribution.status === "Teller Batch")
      .map((contribution) => ({
        ...contribution,
        batchType: "Share Capital Contribution",
        cashOut: 0,
        shareCapitalAmount: contribution.amount,
        membershipFeeAmount: 0,
        savingsDepositAmount: 0
      })),
    ...savingsWithdrawals
      .filter((withdrawal) => withdrawal.status === "Teller Batch")
      .map((withdrawal) => ({
        ...withdrawal,
        batchType: "Savings Withdrawal",
        cashReceived: 0,
        cashOut: withdrawal.amount,
        shareCapitalAmount: 0,
        membershipFeeAmount: 0,
        savingsDepositAmount: -withdrawal.amount
      }))
  ];
  const tellerBatchSummary = buildTellerBatchSummary(tellerBatchRows);

  const loadMembersWorkflow = useCallback(
    async ({ silent = false } = {}) => {
      setIsRefreshing(true);

      try {
        const [
          memberRows,
          applicationRows,
          paymentRows,
          contributionRows,
          savingsRows,
          withdrawalRows,
          cashCountData
        ] =
          await Promise.all([
          api("/api/members"),
          canViewApplications ? api("/api/member-applications") : [],
          canViewInitialPayments ? api("/api/initial-member-payments") : [],
          canViewShareCapitalContributions ? api("/api/share-capital-contributions") : [],
          canViewSavingsDeposits ? api("/api/savings-deposits") : [],
          canViewSavingsWithdrawals ? api("/api/savings-withdrawals") : [],
          canViewTellerCashCount ? api("/api/teller-cash-count") : { latestCashCount: null }
        ]);
        setMembers(memberRows);
        setApplications(applicationRows);
        setInitialPayments(paymentRows);
        setShareCapitalContributions(contributionRows);
        setSavingsDeposits(savingsRows);
        setSavingsWithdrawals(withdrawalRows);
        setActiveBatch(cashCountData.activeBatch);
        setLatestCashCount(cashCountData.latestCashCount);
        setLastRefreshedAt(new Date());

        if (!silent) {
          setError("");
        }
      } catch (refreshError) {
        if (!silent) {
          setError(refreshError.message);
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [
      canViewApplications,
      canViewInitialPayments,
      canViewShareCapitalContributions,
      canViewSavingsDeposits,
      canViewSavingsWithdrawals,
      canViewTellerCashCount
    ]
  );

  useEffect(() => {
    loadMembersWorkflow();
    const timerId = window.setInterval(() => {
      loadMembersWorkflow({ silent: true });
    }, membersPollingMs);

    return () => window.clearInterval(timerId);
  }, [loadMembersWorkflow]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectTellerMember(memberId) {
    setSelectedTellerMemberId(memberId);
    updatePaymentForm("memberId", memberId);
    updateShareCapitalContributionForm("memberId", memberId);
    updateSavingsDepositForm("memberId", memberId);
    updateSavingsWithdrawalForm("memberId", memberId);
  }

  function updatePaymentForm(field, value) {
    setPaymentForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "shareCapitalAmount" || field === "membershipFeeAmount" || field === "savingsDepositAmount") {
        next.cashReceived =
          Number(next.shareCapitalAmount || 0) +
          Number(next.membershipFeeAmount || 0) +
          Number(next.savingsDepositAmount || 0);
      }

      return next;
    });
  }

  function updateSavingsDepositForm(field, value) {
    setSavingsDepositForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "amount") {
        next.cashReceived = Number(next.amount || 0);
      }

      return next;
    });
  }

  function updateShareCapitalContributionForm(field, value) {
    setShareCapitalContributionForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "amount") {
        next.cashReceived = Number(next.amount || 0);
      }

      return next;
    });
  }

  function updateSavingsWithdrawalForm(field, value) {
    setSavingsWithdrawalForm((current) => ({ ...current, [field]: value }));
  }

  async function submitApplication(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const data = await api("/api/member-applications", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setMessage(`${data.application.id} saved as Pending Approval.`);
      setForm({
        fullName: "",
        clusterName: "General Membership",
        contactNumber: "",
        initialShareCapital: 5000
      });
      await loadMembersWorkflow();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function approveApplication(applicationId) {
    setError("");
    setMessage("");

    try {
      const data = await api(`/api/member-applications/${applicationId}/approve`, {
        method: "POST"
      });
      setMessage(`${data.application.id} approved as ${data.member.id}.`);
      setApprovedMemberName(data.member.name);
      approvalNotice.onOpen();
      await loadMembersWorkflow();
    } catch (approveError) {
      setError(approveError.message);
    }
  }

  async function submitInitialPayment(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const data = await api("/api/initial-member-payments", {
        method: "POST",
        body: JSON.stringify(paymentForm)
      });
      setMessage(`${data.payment.id} recorded for ${data.payment.memberName}.`);
      setPaymentForm({
        memberId: paymentForm.memberId,
        shareCapitalAmount: 5000,
        membershipFeeAmount: 100,
        savingsDepositAmount: 1000,
        cashReceived: 6100,
        referenceNo: ""
      });
      await loadMembersWorkflow();
    } catch (paymentError) {
      setError(paymentError.message);
    }
  }

  async function submitSavingsDeposit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const data = await api("/api/savings-deposits", {
        method: "POST",
        body: JSON.stringify(savingsDepositForm)
      });
      setMessage(`${data.deposit.id} recorded for ${data.deposit.memberName}.`);
      setSavingsDepositForm({
        memberId: savingsDepositForm.memberId,
        amount: 1000,
        cashReceived: 1000,
        referenceNo: ""
      });
      await loadMembersWorkflow();
    } catch (depositError) {
      setError(depositError.message);
    }
  }

  async function submitShareCapitalContribution(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const data = await api("/api/share-capital-contributions", {
        method: "POST",
        body: JSON.stringify(shareCapitalContributionForm)
      });
      setMessage(`${data.contribution.id} recorded for ${data.contribution.memberName}.`);
      setShareCapitalContributionForm({
        memberId: shareCapitalContributionForm.memberId,
        amount: 1000,
        cashReceived: 1000,
        referenceNo: ""
      });
      await loadMembersWorkflow();
    } catch (contributionError) {
      setError(contributionError.message);
    }
  }

  async function submitSavingsWithdrawal(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const data = await api("/api/savings-withdrawals", {
        method: "POST",
        body: JSON.stringify(savingsWithdrawalForm)
      });
      setMessage(`${data.withdrawal.id} recorded for ${data.withdrawal.memberName}.`);
      setSavingsWithdrawalForm({
        memberId: savingsWithdrawalForm.memberId,
        amount: 500,
        referenceNo: ""
      });
      await loadMembersWorkflow();
    } catch (withdrawalError) {
      setError(withdrawalError.message);
    }
  }

  async function submitCashCount(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const data = await api("/api/teller-cash-count", {
        method: "POST",
        body: JSON.stringify(cashCountForm)
      });
      setMessage(`${data.cashCount.id} submitted with ${formatMoney(data.cashCount.variance)} variance.`);
      setActiveBatch(data.batch);
      setLatestCashCount(data.cashCount);
      setCashCountForm({ actualCash: 0 });
      await loadMembersWorkflow();
    } catch (cashCountError) {
      setError(cashCountError.message);
    }
  }

  async function loadMemberStatement(memberId) {
    setError("");

    try {
      const data = await api(`/api/members/${memberId}/statement`);
      setStatement(data);
      setMemberProfileForm({
        name: data.member.name || "",
        group: data.member.group || "",
        contactNumber: data.member.contactNumber || "",
        address: data.member.address || "",
        birthdate: data.member.birthdate ? String(data.member.birthdate).slice(0, 10) : "",
        civilStatus: data.member.civilStatus || "",
        occupation: data.member.occupation || "",
        membershipDate: data.member.membershipDate ? String(data.member.membershipDate).slice(0, 10) : "",
        status: data.member.status || "Active"
      });
    } catch (statementError) {
      setError(statementError.message);
    }
  }

  function updateMemberProfileForm(field, value) {
    setMemberProfileForm((current) => ({ ...current, [field]: value }));
  }

  async function submitMemberProfile(event) {
    event.preventDefault();

    if (!statement) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const data = await api(`/api/members/${statement.member.id}/profile`, {
        method: "PATCH",
        body: JSON.stringify(memberProfileForm)
      });
      setStatement((current) => ({ ...current, member: data.member }));
      setMessage(`${data.member.id} profile updated.`);
      await loadMembersWorkflow();
    } catch (profileError) {
      setError(profileError.message);
    }
  }

  return (
    <VStack align="stretch" spacing={5} minW={0} maxW="100%">
      <Flex justify="space-between" align="center" gap={4} wrap="wrap">
        <Text color="gray.500" fontSize="sm">
          Last refreshed: {formatTime(lastRefreshedAt)}
        </Text>
        <Button size="sm" onClick={() => loadMembersWorkflow()} isLoading={isRefreshing}>
          Refresh
        </Button>
      </Flex>

      <Tabs variant="enclosed" colorScheme="green" isLazy>
        <TabList overflowX="auto" overflowY="hidden" maxW="100%">
          {(canCreateApplication || canViewApplications) ? <Tab flexShrink={0}>Applications</Tab> : null}
          {canEditMemberProfile ? <Tab flexShrink={0}>Imports</Tab> : null}
          {canUseTellerWorkspace ? <Tab flexShrink={0}>Teller Transactions</Tab> : null}
          <Tab flexShrink={0}>Member Directory</Tab>
          {(canViewInitialPayments ||
            canViewShareCapitalContributions ||
            canViewSavingsDeposits ||
            canViewSavingsWithdrawals) ? (
            <Tab flexShrink={0}>Transaction History</Tab>
          ) : null}
        </TabList>

        <TabPanels>
          {(canCreateApplication || canViewApplications) ? (
            <TabPanel px={0}>
              <VStack align="stretch" spacing={5}>
      {canCreateApplication ? (
        <Box as="form" onSubmit={submitApplication} bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="md" mb={1}>
            New Member Application
          </Heading>
          <Text color="gray.600" mb={5}>
            Membership Officer encodes the application. Admin approval creates the member record for Teller payment.
          </Text>
          <Grid templateColumns={{ base: "1fr", lg: "1.2fr 1fr" }} gap={4}>
            <FormControl isRequired>
              <FormLabel>Full name</FormLabel>
              <Input value={form.fullName} onChange={(event) => updateForm("fullName", event.target.value)} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Cluster</FormLabel>
              <Input value={form.clusterName} onChange={(event) => updateForm("clusterName", event.target.value)} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Contact number</FormLabel>
              <Input
                value={form.contactNumber}
                onChange={(event) => updateForm("contactNumber", event.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Required Initial Share Capital</FormLabel>
              <NumberInput
                min={0}
                value={form.initialShareCapital}
                onChange={(value) => updateForm("initialShareCapital", Number(value || 0))}
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>
          </Grid>
          <HStack mt={5} spacing={4} align="center" flexWrap="wrap">
            <Button type="submit" colorScheme="green">
              Submit application
            </Button>
            {message ? <Text color="green.600">{message}</Text> : null}
            {error ? <Text color="red.500">{error}</Text> : null}
          </HStack>
        </Box>
      ) : null}

      {canViewApplications ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="md" mb={4}>
            Pending Applications
          </Heading>
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Application No.</Th>
                  <Th>Name</Th>
                  <Th>Cluster</Th>
                  <Th>Contact</Th>
                <Th isNumeric>Required Initial Share Capital</Th>
                <Th>Status</Th>
                {canApproveApplication ? <Th>Action</Th> : null}
                </Tr>
              </Thead>
              <Tbody>
                {pendingApplications.map((application) => (
                  <Tr key={application.id}>
                    <Td>{application.id}</Td>
                    <Td>{application.fullName}</Td>
                    <Td>{application.clusterName}</Td>
                    <Td>{application.contactNumber}</Td>
                    <Td isNumeric>{formatMoney(application.initialShareCapital)}</Td>
                  <Td>
                    <Badge colorScheme="yellow">{application.status}</Badge>
                  </Td>
                  {canApproveApplication ? (
                    <Td>
                      <Button
                        size="sm"
                        colorScheme="green"
                        isDisabled={application.status !== "Pending Approval"}
                        onClick={() => approveApplication(application.id)}
                      >
                        Approve
                      </Button>
                    </Td>
                  ) : null}
                </Tr>
                ))}
                {pendingApplications.length === 0 ? (
                  <Tr>
                    <Td colSpan={canApproveApplication ? 7 : 6} color="gray.500">
                      No pending applications.
                    </Td>
                  </Tr>
                ) : null}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      ) : null}
              </VStack>
            </TabPanel>
          ) : null}

          {canEditMemberProfile ? (
            <TabPanel px={0}>
              <MemberImportPreview existingMembers={members} user={user} />
            </TabPanel>
          ) : null}

          {canUseTellerWorkspace ? (
            <TabPanel px={0}>
              <VStack align="stretch" spacing={5}>
      {canUseTellerWorkspace ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="md" mb={1}>
            Teller Transaction Workspace
          </Heading>
          <Text color="gray.600" mb={5}>
            Select the member first, verify balances, then choose the transaction to record.
          </Text>
          <Grid templateColumns={{ base: "1fr", lg: "1.2fr repeat(3, 1fr)" }} gap={4} mb={5}>
            <FormControl isRequired>
              <FormLabel>Member</FormLabel>
              <Select
                placeholder="Select active member"
                value={selectedTellerMemberId}
                onChange={(event) => selectTellerMember(event.target.value)}
              >
                {activeMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.id} - {member.name}
                  </option>
                ))}
              </Select>
            </FormControl>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">
                Share Capital
              </Text>
              <Text fontWeight="bold">{selectedTellerMember ? formatMoney(selectedTellerMember.share) : "-"}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">
                Savings
              </Text>
              <Text fontWeight="bold">{selectedTellerMember ? formatMoney(selectedTellerMember.savings) : "-"}</Text>
            </Box>
            <FormControl>
              <FormLabel>Transaction type</FormLabel>
              <Select value={tellerTransactionType} onChange={(event) => setTellerTransactionType(event.target.value)}>
                {canCreateInitialPayment ? <option value="initial-payment">Initial member payment</option> : null}
                {canCreateShareCapitalContribution ? (
                  <option value="share-capital-contribution">Share capital contribution</option>
                ) : null}
                {canCreateSavingsDeposit ? <option value="savings-deposit">Savings deposit</option> : null}
                {canCreateSavingsWithdrawal ? <option value="savings-withdrawal">Savings withdrawal</option> : null}
              </Select>
            </FormControl>
          </Grid>

          {tellerTransactionType === "initial-payment" && canCreateInitialPayment ? (
            <Box as="form" onSubmit={submitInitialPayment}>
              <Grid templateColumns={{ base: "1fr", lg: "repeat(4, 1fr)" }} gap={4}>
                <FormControl>
                  <FormLabel>Share capital</FormLabel>
                  <NumberInput
                    min={0}
                    value={paymentForm.shareCapitalAmount}
                    onChange={(value) => updatePaymentForm("shareCapitalAmount", Number(value || 0))}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Membership fee</FormLabel>
                  <NumberInput
                    min={0}
                    value={paymentForm.membershipFeeAmount}
                    onChange={(value) => updatePaymentForm("membershipFeeAmount", Number(value || 0))}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Savings</FormLabel>
                  <NumberInput
                    min={0}
                    value={paymentForm.savingsDepositAmount}
                    onChange={(value) => updatePaymentForm("savingsDepositAmount", Number(value || 0))}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Cash received</FormLabel>
                  <NumberInput
                    min={0}
                    value={paymentForm.cashReceived}
                    onChange={(value) => updatePaymentForm("cashReceived", Number(value || 0))}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>OR / reference no.</FormLabel>
                  <Input
                    value={paymentForm.referenceNo}
                    onChange={(event) => updatePaymentForm("referenceNo", event.target.value)}
                  />
                </FormControl>
              </Grid>
              <HStack mt={5} spacing={4} align="center" flexWrap="wrap">
                <Button type="submit" colorScheme="green" isDisabled={!selectedTellerMemberId}>
                  Record payment
                </Button>
                {message ? <Text color="green.600">{message}</Text> : null}
                {error ? <Text color="red.500">{error}</Text> : null}
              </HStack>
            </Box>
          ) : null}

          {tellerTransactionType === "share-capital-contribution" && canCreateShareCapitalContribution ? (
            <Box as="form" onSubmit={submitShareCapitalContribution}>
              <Grid templateColumns={{ base: "1fr", lg: "repeat(3, 1fr)" }} gap={4}>
                <FormControl isRequired>
                  <FormLabel>Share capital contribution</FormLabel>
                  <NumberInput
                    min={1}
                    value={shareCapitalContributionForm.amount}
                    onChange={(value) => updateShareCapitalContributionForm("amount", Number(value || 0))}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Cash received</FormLabel>
                  <NumberInput
                    min={0}
                    value={shareCapitalContributionForm.cashReceived}
                    onChange={(value) => updateShareCapitalContributionForm("cashReceived", Number(value || 0))}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>OR / reference no.</FormLabel>
                  <Input
                    value={shareCapitalContributionForm.referenceNo}
                    onChange={(event) => updateShareCapitalContributionForm("referenceNo", event.target.value)}
                  />
                </FormControl>
              </Grid>
              <HStack mt={5} spacing={4} align="center" flexWrap="wrap">
                <Button type="submit" colorScheme="green" isDisabled={!selectedTellerMemberId}>
                  Record share capital
                </Button>
                {message ? <Text color="green.600">{message}</Text> : null}
                {error ? <Text color="red.500">{error}</Text> : null}
              </HStack>
            </Box>
          ) : null}

          {tellerTransactionType === "savings-deposit" && canCreateSavingsDeposit ? (
            <Box as="form" onSubmit={submitSavingsDeposit}>
              <Grid templateColumns={{ base: "1fr", lg: "repeat(3, 1fr)" }} gap={4}>
                <FormControl isRequired>
                  <FormLabel>Savings deposit</FormLabel>
                  <NumberInput
                    min={1}
                    value={savingsDepositForm.amount}
                    onChange={(value) => updateSavingsDepositForm("amount", Number(value || 0))}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Cash received</FormLabel>
                  <NumberInput
                    min={0}
                    value={savingsDepositForm.cashReceived}
                    onChange={(value) => updateSavingsDepositForm("cashReceived", Number(value || 0))}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>OR / reference no.</FormLabel>
                  <Input
                    value={savingsDepositForm.referenceNo}
                    onChange={(event) => updateSavingsDepositForm("referenceNo", event.target.value)}
                  />
                </FormControl>
              </Grid>
              <HStack mt={5} spacing={4} align="center" flexWrap="wrap">
                <Button type="submit" colorScheme="green" isDisabled={!selectedTellerMemberId}>
                  Record savings deposit
                </Button>
                {message ? <Text color="green.600">{message}</Text> : null}
                {error ? <Text color="red.500">{error}</Text> : null}
              </HStack>
            </Box>
          ) : null}

          {tellerTransactionType === "savings-withdrawal" && canCreateSavingsWithdrawal ? (
            <Box as="form" onSubmit={submitSavingsWithdrawal}>
              <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={4}>
                <FormControl isRequired>
                  <FormLabel>Withdrawal amount</FormLabel>
                  <NumberInput
                    min={1}
                    value={savingsWithdrawalForm.amount}
                    onChange={(value) => updateSavingsWithdrawalForm("amount", Number(value || 0))}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Voucher / reference no.</FormLabel>
                  <Input
                    value={savingsWithdrawalForm.referenceNo}
                    onChange={(event) => updateSavingsWithdrawalForm("referenceNo", event.target.value)}
                  />
                </FormControl>
              </Grid>
              <HStack mt={5} spacing={4} align="center" flexWrap="wrap">
                <Button type="submit" colorScheme="green" isDisabled={!selectedTellerMemberId}>
                  Record withdrawal
                </Button>
                {message ? <Text color="green.600">{message}</Text> : null}
                {error ? <Text color="red.500">{error}</Text> : null}
              </HStack>
            </Box>
          ) : null}

          <Box mt={6} borderTopWidth="1px" pt={5}>
            <Flex justify="space-between" gap={4} wrap="wrap" mb={4}>
              <Box>
                <Heading size="sm">Teller Batch Cash Position</Heading>
                <Text color="gray.600" mt={1}>
                  Unposted transactions waiting for Bookkeeper posting.
                </Text>
              </Box>
              <HStack alignSelf="flex-start" flexWrap="wrap">
                <Badge colorScheme={activeBatch?.status === "Open" ? "blue" : "purple"}>
                  {activeBatch ? `${activeBatch.id} - ${activeBatch.status}` : "No batch"}
                </Badge>
                <Badge colorScheme={tellerBatchSummary.transactionCount ? "blue" : "gray"}>
                  {tellerBatchSummary.transactionCount} unposted
                </Badge>
              </HStack>
            </Flex>
            <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4} mb={4}>
              <Box borderWidth="1px" borderRadius="md" p={4}>
                <Text color="gray.500" fontSize="sm">
                  Cash In
                </Text>
                <Text fontWeight="bold">{formatMoney(tellerBatchSummary.cashIn)}</Text>
              </Box>
              <Box borderWidth="1px" borderRadius="md" p={4}>
                <Text color="gray.500" fontSize="sm">
                  Cash Out
                </Text>
                <Text fontWeight="bold">{formatMoney(tellerBatchSummary.cashOut)}</Text>
              </Box>
              <Box borderWidth="1px" borderRadius="md" p={4}>
                <Text color="gray.500" fontSize="sm">
                  Net Cash
                </Text>
                <Text fontWeight="bold">{formatMoney(tellerBatchSummary.cashIn - tellerBatchSummary.cashOut)}</Text>
              </Box>
              <Box borderWidth="1px" borderRadius="md" p={4}>
                <Text color="gray.500" fontSize="sm">
                  Transaction Mix
                </Text>
                <VStack align="stretch" spacing={0} mt={1}>
                  <Text fontWeight="bold">Initial payments: {tellerBatchSummary.initialPaymentCount}</Text>
                  <Text fontWeight="bold">
                    Share capital: {tellerBatchSummary.shareCapitalContributionCount}
                  </Text>
                  <Text fontWeight="bold">Deposits: {tellerBatchSummary.savingsDepositCount}</Text>
                  <Text fontWeight="bold">Withdrawals: {tellerBatchSummary.savingsWithdrawalCount}</Text>
                </VStack>
              </Box>
            </Grid>
            <TableContainer>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>No.</Th>
                    <Th>Type</Th>
                    <Th>Member</Th>
                    <Th isNumeric>Cash In</Th>
                    <Th isNumeric>Cash Out</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {tellerBatchRows.slice(0, 5).map((row) => (
                    <Tr key={`${row.batchType}-${row.id}`}>
                      <Td>{row.id}</Td>
                      <Td>{row.batchType}</Td>
                      <Td>{row.memberName}</Td>
                      <Td isNumeric>{row.cashReceived ? formatMoney(row.cashReceived) : ""}</Td>
                      <Td isNumeric>{row.cashOut ? formatMoney(row.cashOut) : ""}</Td>
                    </Tr>
                  ))}
                  {tellerBatchRows.length === 0 ? (
                    <Tr>
                      <Td colSpan={5} color="gray.500">
                        No unposted teller transactions.
                      </Td>
                    </Tr>
                  ) : null}
                </Tbody>
              </Table>
            </TableContainer>
            {canCreateTellerCashCount ? (
              <Box as="form" onSubmit={submitCashCount} mt={5} borderTopWidth="1px" pt={5}>
                <Flex justify="space-between" gap={4} wrap="wrap" mb={4}>
                  <Box>
                    <Heading size="sm">Cash Count Verification</Heading>
                    <Text color="gray.600" mt={1}>
                      Count actual cash on hand before sending the batch for accounting review.
                    </Text>
                  </Box>
                  <Badge colorScheme={activeBatch?.status === "Open" ? "blue" : "purple"} alignSelf="flex-start">
                    {activeBatch ? activeBatch.status : "No batch"}
                  </Badge>
                </Flex>
                <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4}>
                  <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Text color="gray.500" fontSize="sm">
                      Expected Net Cash
                    </Text>
                    <Text fontWeight="bold">{formatMoney(tellerBatchSummary.cashIn - tellerBatchSummary.cashOut)}</Text>
                  </Box>
                  <FormControl isRequired>
                    <FormLabel>Actual cash counted</FormLabel>
                    <NumberInput
                      min={0}
                      value={cashCountForm.actualCash}
                      onChange={(value) => setCashCountForm({ actualCash: Number(value || 0) })}
                    >
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>
                  <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Text color="gray.500" fontSize="sm">
                      Variance
                    </Text>
                    <Text fontWeight="bold">
                      {formatMoney(Number(cashCountForm.actualCash || 0) - (tellerBatchSummary.cashIn - tellerBatchSummary.cashOut))}
                    </Text>
                  </Box>
                  <Box alignSelf="end">
                    <Button
                      type="submit"
                      colorScheme="green"
                      width="full"
                      isDisabled={tellerBatchSummary.transactionCount === 0 || activeBatch?.status !== "Open"}
                    >
                      Submit cash count
                    </Button>
                  </Box>
                </Grid>
                {latestCashCount ? (
                  <Text mt={3} color="gray.600" fontSize="sm">
                    Latest submitted by {latestCashCount.submittedBy}: expected {formatMoney(latestCashCount.expectedCash)},
                    actual {formatMoney(latestCashCount.actualCash)}, variance {formatMoney(latestCashCount.variance)}.
                  </Text>
                ) : null}
              </Box>
            ) : null}
          </Box>
        </Box>
      ) : null}
              </VStack>
            </TabPanel>
          ) : null}

          <TabPanel px={0}>
            <VStack align="stretch" spacing={5}>
      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Flex justify="space-between" mb={4}>
          <Heading size="md">Active Members</Heading>
        </Flex>
        <TableContainer>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Member No.</Th>
                <Th>Name</Th>
                <Th>Cluster</Th>
                <Th>Contact</Th>
                <Th>Membership Date</Th>
                <Th isNumeric>Share Capital</Th>
                <Th isNumeric>Savings</Th>
                <Th>Status</Th>
                <Th>Statement</Th>
              </Tr>
            </Thead>
            <Tbody>
              {members.map((member) => (
                <Tr key={member.id}>
                  <Td>{member.id}</Td>
                  <Td>{member.name}</Td>
                  <Td>{member.group}</Td>
                  <Td>{member.contactNumber || "-"}</Td>
                  <Td>{formatDate(member.membershipDate)}</Td>
                  <Td isNumeric>{formatMoney(member.share)}</Td>
                  <Td isNumeric>{formatMoney(member.savings)}</Td>
                  <Td>
                    <Badge colorScheme="green">{member.status}</Badge>
                  </Td>
                  <Td>
                    <Button size="sm" onClick={() => loadMemberStatement(member.id)}>
                      View
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      {statement ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Flex justify="space-between" gap={4} wrap="wrap" mb={4}>
            <Box>
              <Heading size="md">Member Statement</Heading>
              <Text color="gray.600" mt={1}>
                {statement.member.id} - {statement.member.name}
              </Text>
            </Box>
            <Button size="sm" onClick={() => setStatement(null)}>
              Close
            </Button>
          </Flex>
          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4} mb={5}>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">
                Cluster
              </Text>
              <Text fontWeight="bold">{statement.member.group}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">
                Share Capital
              </Text>
              <Text fontWeight="bold">{formatMoney(statement.member.share)}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">
                Savings
              </Text>
              <Text fontWeight="bold">{formatMoney(statement.member.savings)}</Text>
            </Box>
          </Grid>

          <Box as={canEditMemberProfile ? "form" : "div"} onSubmit={canEditMemberProfile ? submitMemberProfile : undefined} borderWidth="1px" borderRadius="md" p={4} mb={5}>
            <Flex justify="space-between" align="center" gap={4} wrap="wrap" mb={4}>
              <Box>
                <Heading size="sm">Member Profile</Heading>
                <Text color="gray.600" mt={1}>
                  Master data only. Share capital and savings balances remain transaction-derived.
                </Text>
              </Box>
              {canEditMemberProfile ? (
                <Button type="submit" size="sm" colorScheme="green">
                  Save Profile
                </Button>
              ) : (
                <Badge colorScheme="gray">Read only</Badge>
              )}
            </Flex>

            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }} gap={4}>
              <FormControl>
                <FormLabel>Full Name</FormLabel>
                <Input
                  value={memberProfileForm.name}
                  onChange={(event) => updateMemberProfileForm("name", event.target.value)}
                  isReadOnly={!canEditMemberProfile}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Cluster / Group</FormLabel>
                <Input
                  value={memberProfileForm.group}
                  onChange={(event) => updateMemberProfileForm("group", event.target.value)}
                  isReadOnly={!canEditMemberProfile}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Contact Number</FormLabel>
                <Input
                  value={memberProfileForm.contactNumber}
                  onChange={(event) => updateMemberProfileForm("contactNumber", event.target.value)}
                  isReadOnly={!canEditMemberProfile}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Address</FormLabel>
                <Input
                  value={memberProfileForm.address}
                  onChange={(event) => updateMemberProfileForm("address", event.target.value)}
                  isReadOnly={!canEditMemberProfile}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Birthdate</FormLabel>
                <Input
                  type="date"
                  value={memberProfileForm.birthdate}
                  onChange={(event) => updateMemberProfileForm("birthdate", event.target.value)}
                  isReadOnly={!canEditMemberProfile}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Civil Status</FormLabel>
                <Select
                  value={memberProfileForm.civilStatus}
                  onChange={(event) => updateMemberProfileForm("civilStatus", event.target.value)}
                  isDisabled={!canEditMemberProfile}
                >
                  <option value="">Unspecified</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Separated">Separated</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Occupation / Source of Income</FormLabel>
                <Input
                  value={memberProfileForm.occupation}
                  onChange={(event) => updateMemberProfileForm("occupation", event.target.value)}
                  isReadOnly={!canEditMemberProfile}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Membership Date</FormLabel>
                <Input
                  type="date"
                  value={memberProfileForm.membershipDate}
                  onChange={(event) => updateMemberProfileForm("membershipDate", event.target.value)}
                  isReadOnly={!canEditMemberProfile}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select
                  value={memberProfileForm.status}
                  onChange={(event) => updateMemberProfileForm("status", event.target.value)}
                  isDisabled={!canEditMemberProfile}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Select>
              </FormControl>
            </Grid>
          </Box>

          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Transaction</Th>
                  <Th>Reference</Th>
                  <Th isNumeric>Share Capital</Th>
                  <Th isNumeric>Savings</Th>
                  <Th>Batch / Date</Th>
                  <Th>Status</Th>
                  <Th>Journal Entry</Th>
                </Tr>
              </Thead>
              <Tbody>
                {statement.transactions.map((transaction) => (
                  <Tr key={transaction.id}>
                    <Td>{transaction.type}</Td>
                    <Td>{transaction.referenceNo}</Td>
                    <Td isNumeric>{formatMoney(transaction.shareCapitalAmount)}</Td>
                    <Td isNumeric>{formatMoney(transaction.savingsDepositAmount)}</Td>
                    <Td>
                      {transaction.type === "Opening Balance" ? (
                        <>
                          <Text>{transaction.batchNo}</Text>
                          <Text color="gray.500" fontSize="xs">{formatDate(transaction.cutoverDate)}</Text>
                        </>
                      ) : (
                        "-"
                      )}
                    </Td>
                    <Td>
                      <Badge colorScheme={transaction.status === "Posted" ? "green" : "blue"}>
                        {transaction.status}
                      </Badge>
                    </Td>
                    <Td>{transaction.journalEntryNo || "Not posted"}</Td>
                  </Tr>
                ))}
                {statement.transactions.length === 0 ? (
                  <Tr>
                    <Td colSpan={7} color="gray.500">
                      No member transactions recorded.
                    </Td>
                  </Tr>
                ) : null}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      ) : null}
            </VStack>
          </TabPanel>

          {(canViewInitialPayments ||
            canViewShareCapitalContributions ||
            canViewSavingsDeposits ||
            canViewSavingsWithdrawals) ? (
            <TabPanel px={0}>
              <VStack align="stretch" spacing={5}>
      {canViewInitialPayments ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="md" mb={4}>
            Initial Payment History
          </Heading>
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Payment No.</Th>
                  <Th>Member</Th>
                  <Th isNumeric>Share Capital</Th>
                  <Th isNumeric>Membership Fee</Th>
                  <Th isNumeric>Savings</Th>
                  <Th>Reference</Th>
                  <Th>Received By</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {initialPayments.map((payment) => (
                  <Tr key={payment.id}>
                    <Td>{payment.id}</Td>
                    <Td>{payment.memberName}</Td>
                    <Td isNumeric>{formatMoney(payment.shareCapitalAmount)}</Td>
                    <Td isNumeric>{formatMoney(payment.membershipFeeAmount)}</Td>
                    <Td isNumeric>{formatMoney(payment.savingsDepositAmount)}</Td>
                    <Td>{payment.referenceNo}</Td>
                    <Td>{payment.receivedBy}</Td>
                    <Td>
                      <Badge colorScheme="blue">{payment.status}</Badge>
                    </Td>
                  </Tr>
                ))}
                {initialPayments.length === 0 ? (
                  <Tr>
                    <Td colSpan={8} color="gray.500">
                      No initial payments recorded.
                    </Td>
                  </Tr>
                ) : null}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      ) : null}

      {canViewShareCapitalContributions ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="md" mb={4}>
            Share Capital Contribution History
          </Heading>
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Contribution No.</Th>
                  <Th>Member</Th>
                  <Th isNumeric>Amount</Th>
                  <Th>Reference</Th>
                  <Th>Received By</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {shareCapitalContributions.map((contribution) => (
                  <Tr key={contribution.id}>
                    <Td>{contribution.id}</Td>
                    <Td>{contribution.memberName}</Td>
                    <Td isNumeric>{formatMoney(contribution.amount)}</Td>
                    <Td>{contribution.referenceNo}</Td>
                    <Td>{contribution.receivedBy}</Td>
                    <Td>
                      <Badge colorScheme={contribution.status === "Posted" ? "green" : "blue"}>
                        {contribution.status}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
                {shareCapitalContributions.length === 0 ? (
                  <Tr>
                    <Td colSpan={6} color="gray.500">
                      No share capital contributions recorded.
                    </Td>
                  </Tr>
                ) : null}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      ) : null}

      {canViewSavingsDeposits ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="md" mb={4}>
            Savings Deposit History
          </Heading>
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Deposit No.</Th>
                  <Th>Member</Th>
                  <Th isNumeric>Amount</Th>
                  <Th>Reference</Th>
                  <Th>Received By</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {savingsDeposits.map((deposit) => (
                  <Tr key={deposit.id}>
                    <Td>{deposit.id}</Td>
                    <Td>{deposit.memberName}</Td>
                    <Td isNumeric>{formatMoney(deposit.amount)}</Td>
                    <Td>{deposit.referenceNo}</Td>
                    <Td>{deposit.receivedBy}</Td>
                    <Td>
                      <Badge colorScheme={deposit.status === "Posted" ? "green" : "blue"}>
                        {deposit.status}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
                {savingsDeposits.length === 0 ? (
                  <Tr>
                    <Td colSpan={6} color="gray.500">
                      No savings deposits recorded.
                    </Td>
                  </Tr>
                ) : null}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      ) : null}

      {canViewSavingsWithdrawals ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="md" mb={4}>
            Savings Withdrawal History
          </Heading>
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Withdrawal No.</Th>
                  <Th>Member</Th>
                  <Th isNumeric>Amount</Th>
                  <Th>Reference</Th>
                  <Th>Released By</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {savingsWithdrawals.map((withdrawal) => (
                  <Tr key={withdrawal.id}>
                    <Td>{withdrawal.id}</Td>
                    <Td>{withdrawal.memberName}</Td>
                    <Td isNumeric>{formatMoney(withdrawal.amount)}</Td>
                    <Td>{withdrawal.referenceNo}</Td>
                    <Td>{withdrawal.releasedBy}</Td>
                    <Td>
                      <Badge colorScheme={withdrawal.status === "Posted" ? "green" : "blue"}>
                        {withdrawal.status}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
                {savingsWithdrawals.length === 0 ? (
                  <Tr>
                    <Td colSpan={6} color="gray.500">
                      No savings withdrawals recorded.
                    </Td>
                  </Tr>
                ) : null}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      ) : null}
              </VStack>
            </TabPanel>
          ) : null}
        </TabPanels>
      </Tabs>

      <Modal isOpen={approvalNotice.isOpen} onClose={approvalNotice.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Membership Approved</ModalHeader>
          <ModalBody>
            <Text fontWeight="bold" mb={3}>
              {approvedMemberName} is now an active member.
            </Text>
            <Text>
              Please advise the member to proceed to the Teller/Cashier for initial share capital,
              membership fee, and savings payment.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="green" onClick={approvalNotice.onClose}>
              Got it
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}

function Ledger({ user }) {
  const [tellerBatch, setTellerBatch] = useState([]);
  const [tellerBatches, setTellerBatches] = useState([]);
  const [selectedBatchDetails, setSelectedBatchDetails] = useState(null);
  const [activeBatch, setActiveBatch] = useState(null);
  const [latestCashCount, setLatestCashCount] = useState(null);
  const [journalEntries, setJournalEntries] = useState([]);
  const [memberLookup, setMemberLookup] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [varianceNote, setVarianceNote] = useState("");
  const [closingNote, setClosingNote] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingBatchDetailsId, setLoadingBatchDetailsId] = useState("");
  const batchDetails = useDisclosure();
  const closeConfirmation = useDisclosure();
  const canPostTellerBatch = user.permissions.includes("ledger:teller-batches:post");
  const canReviewTellerBatch = user.permissions.includes("ledger:teller-batches:review");
  const canCloseTellerBatch = user.permissions.includes("ledger:teller-batches:close");
  const canPreviewOpeningBalances =
    user.username === "admin" ||
    user.role === "System Administrator" ||
    canReviewTellerBatch ||
    canPostTellerBatch;
  const canManageTellerBatches = canReviewTellerBatch || canPostTellerBatch || canCloseTellerBatch;
  const canViewLedgerHistory = canManageTellerBatches || canPreviewOpeningBalances;
  const canViewPostedEntries = canPostTellerBatch || canReviewTellerBatch || user.role === "System Administrator";
  const needsVarianceNote = activeBatch?.status === "Submitted" && Number(activeBatch.variance || 0) !== 0;
  const tellerBatchSummary = buildTellerBatchSummary(tellerBatch);
  const activeBatchHistory = activeBatch ? tellerBatches.find((batch) => batch.id === activeBatch.id) : null;

  async function loadLedger() {
    setIsRefreshing(true);
    setError("");

    try {
      const [data, lookupRows] = await Promise.all([
        api("/api/ledger"),
        canPreviewOpeningBalances ? api("/api/ledger/member-lookup") : []
      ]);
      setActiveBatch(data.activeBatch);
      setTellerBatch(data.tellerBatch);
      setTellerBatches(data.tellerBatches || []);
      setLatestCashCount(data.latestCashCount);
      setJournalEntries(data.journalEntries);
      setMemberLookup(lookupRows);
      if (!data.activeBatch || data.activeBatch.status !== "Submitted" || data.activeBatch.variance === 0) {
        setVarianceNote("");
      }
      if (!data.activeBatch || data.activeBatch.status !== "Reviewed") {
        setClosingNote("");
      }
    } catch (ledgerError) {
      setError(ledgerError.message);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadLedger();
  }, []);

  async function postReviewedBatch() {
    if (!activeBatch) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const data = await api(`/api/ledger/teller-batches/${activeBatch.id}/post-reviewed`, {
        method: "POST"
      });
      setMessage(
        data.postedCount > 0
          ? `${data.postedCount} teller batch transaction${data.postedCount === 1 ? "" : "s"} posted.`
          : data.message
      );
      await loadLedger();
    } catch (postError) {
      setError(postError.message);
    }
  }

  async function reviewBatch() {
    if (!activeBatch) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const data = await api(`/api/teller-batches/${activeBatch.id}/review`, {
        method: "POST",
        body: JSON.stringify({ varianceNote })
      });
      setActiveBatch(data.batch);
      setVarianceNote("");
      setMessage(`${data.batch.id} marked as Reviewed.`);
      await loadLedger();
    } catch (reviewError) {
      setError(reviewError.message);
    }
  }

  async function closeBatch() {
    if (!activeBatch) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const data = await api(`/api/teller-batches/${activeBatch.id}/close`, {
        method: "POST",
        body: JSON.stringify({ closingNote })
      });
      setActiveBatch(data.nextBatch);
      setClosingNote("");
      closeConfirmation.onClose();
      setMessage(`${data.batch.id} closed. ${data.nextBatch.id} is now Open.`);
      await loadLedger();
    } catch (closeError) {
      setError(closeError.message);
    }
  }

  async function openBatchDetails(batchId) {
    setError("");
    setLoadingBatchDetailsId(batchId);

    try {
      const data = await api(`/api/teller-batches/${batchId}`);
      setSelectedBatchDetails(data);
      batchDetails.onOpen();
    } catch (detailsError) {
      setError(detailsError.message);
    } finally {
      setLoadingBatchDetailsId("");
    }
  }

  return (
    <VStack align="stretch" spacing={5} minW={0} maxW="100%">
      <Flex justify="space-between" align="center" gap={4} wrap="wrap">
        <Box>
          <Heading size="md">Teller Batch Review</Heading>
          <Text color="gray.600" mt={1}>
            Bookkeeper reviews teller cash receipts before they become general ledger entries.
          </Text>
        </Box>
        <Button size="sm" onClick={loadLedger} isLoading={isRefreshing}>
          Refresh
        </Button>
      </Flex>

      {message ? <Text color="green.600">{message}</Text> : null}
      {error ? <Text color="red.500">{error}</Text> : null}

      <Tabs variant="enclosed" colorScheme="green" isLazy>
        <TabList overflowX="auto" overflowY="hidden" maxW="100%">
          {canManageTellerBatches ? <Tab flexShrink={0}>Batch Review</Tab> : null}
          {canPreviewOpeningBalances ? <Tab flexShrink={0}>Opening Balances</Tab> : null}
          {canViewLedgerHistory ? <Tab flexShrink={0}>Batch History</Tab> : null}
          {canViewPostedEntries ? <Tab flexShrink={0}>Posted Entries</Tab> : null}
        </TabList>

        <TabPanels>
          {canManageTellerBatches ? (
            <TabPanel px={0}>
              <VStack align="stretch" spacing={5}>
                <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
                  <Flex justify="space-between" gap={4} wrap="wrap" mb={4}>
                    <Box>
                      <Heading size="md">Teller Cash Count</Heading>
                      <Text color="gray.600" mt={1}>
                        Latest teller-submitted cash count for the unposted batch.
                      </Text>
                    </Box>
                    <HStack flexWrap="wrap">
                      <Badge colorScheme={activeBatch?.status === "Open" ? "blue" : activeBatch ? "purple" : "gray"}>
                        {activeBatch ? `${activeBatch.id} - ${activeBatch.status}` : "No batch"}
                      </Badge>
                      {latestCashCount && latestCashCount.variance !== 0 ? (
                        <Badge colorScheme="orange">Variance warning</Badge>
                      ) : null}
                      {canReviewTellerBatch && activeBatch?.status === "Submitted" ? (
                        <Button
                          size="sm"
                          colorScheme="green"
                          onClick={reviewBatch}
                          isDisabled={needsVarianceNote && !varianceNote.trim()}
                        >
                          Mark reviewed
                        </Button>
                      ) : null}
                      {canPostTellerBatch && activeBatch?.status === "Reviewed" ? (
                        <Button
                          size="sm"
                          colorScheme="green"
                          onClick={postReviewedBatch}
                          isDisabled={tellerBatch.length === 0}
                        >
                          Post reviewed batch
                        </Button>
                      ) : null}
                      {canCloseTellerBatch && activeBatch?.status === "Reviewed" ? (
                        <Button
                          size="sm"
                          colorScheme="green"
                          onClick={closeConfirmation.onOpen}
                          isDisabled={tellerBatch.length > 0}
                        >
                          Close and open next
                        </Button>
                      ) : null}
                    </HStack>
                  </Flex>
                  <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4}>
                    <Box borderWidth="1px" borderRadius="md" p={4}>
                      <Text color="gray.500" fontSize="sm">
                        Expected Cash
                      </Text>
                      <Text fontWeight="bold">
                        {formatMoney(latestCashCount ? latestCashCount.expectedCash : tellerBatchSummary.cashIn - tellerBatchSummary.cashOut)}
                      </Text>
                    </Box>
                    <Box borderWidth="1px" borderRadius="md" p={4}>
                      <Text color="gray.500" fontSize="sm">
                        Actual Cash
                      </Text>
                      <Text fontWeight="bold">{latestCashCount ? formatMoney(latestCashCount.actualCash) : "-"}</Text>
                    </Box>
                    <Box borderWidth="1px" borderRadius="md" p={4}>
                      <Text color="gray.500" fontSize="sm">
                        Variance
                      </Text>
                      <Text fontWeight="bold">{latestCashCount ? formatMoney(latestCashCount.variance) : "-"}</Text>
                    </Box>
                    <Box borderWidth="1px" borderRadius="md" p={4}>
                      <Text color="gray.500" fontSize="sm">
                        Submitted By
                      </Text>
                      <Text fontWeight="bold">{latestCashCount ? latestCashCount.submittedBy : "-"}</Text>
                    </Box>
                  </Grid>
                  <Text mt={3} color="gray.600" fontSize="sm">
                    Post reviewed batch creates the accounting entries for all unposted rows in the reviewed batch. A non-zero variance requires a Bookkeeper note before review.
                  </Text>
                  {needsVarianceNote ? (
                    <FormControl mt={4} isRequired>
                      <FormLabel>Variance note</FormLabel>
                      <Textarea
                        value={varianceNote}
                        onChange={(event) => setVarianceNote(event.target.value)}
                        placeholder="Record the reason or follow-up action before review."
                      />
                    </FormControl>
                  ) : null}
                </Box>

                <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
                  <Heading size="md" mb={4}>
                    Unposted Teller Batch
                  </Heading>
                  <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4} mb={4}>
                    <Box borderWidth="1px" borderRadius="md" p={4}>
                      <Text color="gray.500" fontSize="sm">
                        Cash In
                      </Text>
                      <Text fontWeight="bold">{formatMoney(tellerBatchSummary.cashIn)}</Text>
                    </Box>
                    <Box borderWidth="1px" borderRadius="md" p={4}>
                      <Text color="gray.500" fontSize="sm">
                        Cash Out
                      </Text>
                      <Text fontWeight="bold">{formatMoney(tellerBatchSummary.cashOut)}</Text>
                    </Box>
                    <Box borderWidth="1px" borderRadius="md" p={4}>
                      <Text color="gray.500" fontSize="sm">
                        Net Cash
                      </Text>
                      <Text fontWeight="bold">{formatMoney(tellerBatchSummary.cashIn - tellerBatchSummary.cashOut)}</Text>
                    </Box>
                    <Box borderWidth="1px" borderRadius="md" p={4}>
                      <Text color="gray.500" fontSize="sm">
                        Transactions
                      </Text>
                      <Text fontWeight="bold">{tellerBatchSummary.transactionCount}</Text>
                    </Box>
                  </Grid>
                  <TableContainer>
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>Payment No.</Th>
                          <Th>Type</Th>
                          <Th>Member</Th>
                          <Th isNumeric>Cash In</Th>
                          <Th isNumeric>Cash Out</Th>
                          <Th isNumeric>Share Capital</Th>
                          <Th isNumeric>Fee</Th>
                          <Th isNumeric>Savings</Th>
                          <Th>Status</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {tellerBatch.map((payment) => (
                          <Tr key={payment.id}>
                            <Td>{payment.id}</Td>
                            <Td>{payment.batchType}</Td>
                            <Td>{payment.memberName}</Td>
                            <Td isNumeric>{payment.cashReceived ? formatMoney(payment.cashReceived) : ""}</Td>
                            <Td isNumeric>{payment.cashOut ? formatMoney(payment.cashOut) : ""}</Td>
                            <Td isNumeric>{formatMoney(payment.shareCapitalAmount)}</Td>
                            <Td isNumeric>{formatMoney(payment.membershipFeeAmount)}</Td>
                            <Td isNumeric>{formatMoney(payment.savingsDepositAmount)}</Td>
                            <Td>
                              <Badge colorScheme="blue">{payment.status}</Badge>
                            </Td>
                          </Tr>
                        ))}
                        {tellerBatch.length === 0 ? (
                          <Tr>
                            <Td colSpan={9} color="gray.500">
                              No unposted teller batch payments.
                            </Td>
                          </Tr>
                        ) : null}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>
              </VStack>
            </TabPanel>
          ) : null}

          {canPreviewOpeningBalances ? (
            <TabPanel px={0}>
              <OpeningBalancePreview memberLookup={memberLookup} user={user} onBalancesChanged={loadLedger} />
            </TabPanel>
          ) : null}

          {canViewLedgerHistory ? (
            <TabPanel px={0}>
              <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
                <Heading size="md" mb={4}>
                  Teller Batch History
                </Heading>
                <TableContainer>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Batch</Th>
                        <Th>Status</Th>
                        <Th>Teller</Th>
                        <Th isNumeric>Expected</Th>
                        <Th isNumeric>Actual</Th>
                        <Th isNumeric>Variance</Th>
                        <Th isNumeric>Txns</Th>
                        <Th isNumeric>Posted</Th>
                        <Th isNumeric>Unposted</Th>
                        <Th>Variance Note</Th>
                        <Th>Reviewed By</Th>
                        <Th>Closed By</Th>
                        <Th>Closed</Th>
                        <Th>Details</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {tellerBatches.map((batch) => (
                        <Tr key={batch.id}>
                          <Td>{batch.id}</Td>
                          <Td>
                            <Badge
                              colorScheme={
                                batch.status === "Open"
                                  ? "blue"
                                  : batch.status === "Closed"
                                    ? "gray"
                                    : batch.status === "Reviewed"
                                      ? "green"
                                      : "purple"
                              }
                            >
                              {batch.status}
                            </Badge>
                          </Td>
                          <Td>{batch.tellerUsername}</Td>
                          <Td isNumeric>{formatMoney(batch.expectedCash)}</Td>
                          <Td isNumeric>{formatMoney(batch.actualCash)}</Td>
                          <Td isNumeric>{formatMoney(batch.variance)}</Td>
                          <Td isNumeric>{batch.transactionCount}</Td>
                          <Td isNumeric>{batch.postedEntryCount}</Td>
                          <Td isNumeric>{batch.unpostedTransactionCount}</Td>
                          <Td>{batch.varianceNote || "-"}</Td>
                          <Td>{batch.reviewedBy || "-"}</Td>
                          <Td>{batch.closedBy || "-"}</Td>
                          <Td>{formatDateTime(batch.closedAt)}</Td>
                          <Td>
                            <Button
                              size="sm"
                              onClick={() => openBatchDetails(batch.id)}
                              isLoading={loadingBatchDetailsId === batch.id}
                            >
                              View
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                      {tellerBatches.length === 0 ? (
                        <Tr>
                          <Td colSpan={14} color="gray.500">
                            No teller batch history yet.
                          </Td>
                        </Tr>
                      ) : null}
                    </Tbody>
                  </Table>
                </TableContainer>
              </Box>
            </TabPanel>
          ) : null}

          {canViewPostedEntries ? (
            <TabPanel px={0}>
              <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
                <Heading size="md" mb={4}>
                  Posted Journal Entries
                </Heading>
                <VStack align="stretch" spacing={4}>
                  {journalEntries.map((entry) => (
                    <Box key={entry.id} borderWidth="1px" borderRadius="md" p={4}>
                      <Flex justify="space-between" gap={4} wrap="wrap" mb={3}>
                        <Box>
                          <Text fontWeight="bold">{entry.id}</Text>
                          <Text color="gray.600">{entry.description}</Text>
                        </Box>
                        <Text color="gray.500" fontSize="sm">
                          Posted by {entry.postedBy}
                        </Text>
                      </Flex>
                      <TableContainer>
                        <Table size="sm">
                          <Thead>
                            <Tr>
                              <Th>Account</Th>
                              <Th isNumeric>Debit</Th>
                              <Th isNumeric>Credit</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {entry.lines.map((line) => (
                              <Tr key={`${entry.id}-${line.accountCode}`}>
                                <Td>
                                  {line.accountCode} - {line.accountName}
                                </Td>
                                <Td isNumeric>{line.debit ? formatMoney(line.debit) : ""}</Td>
                                <Td isNumeric>{line.credit ? formatMoney(line.credit) : ""}</Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    </Box>
                  ))}
                  {journalEntries.length === 0 ? <Text color="gray.500">No posted journal entries yet.</Text> : null}
                </VStack>
              </Box>
            </TabPanel>
          ) : null}
        </TabPanels>
      </Tabs>

      <Modal isOpen={closeConfirmation.isOpen} onClose={closeConfirmation.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Teller Batch Close</ModalHeader>
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
                <Box borderWidth="1px" borderRadius="md" p={4}>
                  <Text color="gray.500" fontSize="sm">Batch</Text>
                  <Text fontWeight="bold">{activeBatch?.id || "-"}</Text>
                </Box>
                <Box borderWidth="1px" borderRadius="md" p={4}>
                  <Text color="gray.500" fontSize="sm">Variance</Text>
                  <Text fontWeight="bold">{formatMoney(activeBatch?.variance || 0)}</Text>
                </Box>
                <Box borderWidth="1px" borderRadius="md" p={4}>
                  <Text color="gray.500" fontSize="sm">Expected Cash</Text>
                  <Text fontWeight="bold">{formatMoney(activeBatch?.expectedCash || 0)}</Text>
                </Box>
                <Box borderWidth="1px" borderRadius="md" p={4}>
                  <Text color="gray.500" fontSize="sm">Actual Cash</Text>
                  <Text fontWeight="bold">{formatMoney(activeBatch?.actualCash || 0)}</Text>
                </Box>
                <Box borderWidth="1px" borderRadius="md" p={4}>
                  <Text color="gray.500" fontSize="sm">Posted Entries</Text>
                  <Text fontWeight="bold">{activeBatchHistory?.postedEntryCount || 0}</Text>
                </Box>
                <Box borderWidth="1px" borderRadius="md" p={4}>
                  <Text color="gray.500" fontSize="sm">Unposted Transactions</Text>
                  <Text fontWeight="bold">{activeBatchHistory?.unpostedTransactionCount || tellerBatch.length}</Text>
                </Box>
              </Grid>
              <FormControl>
                <FormLabel>Closing note</FormLabel>
                <Textarea
                  value={closingNote}
                  onChange={(event) => setClosingNote(event.target.value)}
                  placeholder="Optional end-of-day close note."
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={closeConfirmation.onClose}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={closeBatch} isDisabled={tellerBatch.length > 0}>
              Confirm close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={batchDetails.isOpen} onClose={batchDetails.onClose} size="6xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedBatchDetails ? `Teller Batch Details - ${selectedBatchDetails.batch.id}` : "Teller Batch Details"}
          </ModalHeader>
          <ModalBody>
            {selectedBatchDetails ? (
              <VStack align="stretch" spacing={5}>
                <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4}>
                  <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Text color="gray.500" fontSize="sm">Status</Text>
                    <Badge colorScheme={selectedBatchDetails.batch.status === "Closed" ? "gray" : "green"}>
                      {selectedBatchDetails.batch.status}
                    </Badge>
                  </Box>
                  <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Text color="gray.500" fontSize="sm">Teller</Text>
                    <Text fontWeight="bold">{selectedBatchDetails.batch.tellerUsername}</Text>
                  </Box>
                  <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Text color="gray.500" fontSize="sm">Reviewed By</Text>
                    <Text fontWeight="bold">{selectedBatchDetails.batch.reviewedBy || "-"}</Text>
                  </Box>
                  <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Text color="gray.500" fontSize="sm">Closed By</Text>
                    <Text fontWeight="bold">{selectedBatchDetails.batch.closedBy || "-"}</Text>
                    <Text color="gray.500" fontSize="sm" mt={1}>
                      {formatDateTime(selectedBatchDetails.batch.closedAt)}
                    </Text>
                  </Box>
                </Grid>

                <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4}>
                  <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Text color="gray.500" fontSize="sm">Expected Cash</Text>
                    <Text fontWeight="bold">{formatMoney(selectedBatchDetails.batch.expectedCash)}</Text>
                  </Box>
                  <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Text color="gray.500" fontSize="sm">Actual Cash</Text>
                    <Text fontWeight="bold">{formatMoney(selectedBatchDetails.batch.actualCash)}</Text>
                  </Box>
                  <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Text color="gray.500" fontSize="sm">Variance</Text>
                    <Text fontWeight="bold">{formatMoney(selectedBatchDetails.batch.variance)}</Text>
                  </Box>
                  <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Text color="gray.500" fontSize="sm">Submitted</Text>
                    <Text fontWeight="bold">{formatDateTime(selectedBatchDetails.batch.submittedAt)}</Text>
                  </Box>
                </Grid>

                <Box borderWidth="1px" borderRadius="md" p={4}>
                  <Text color="gray.500" fontSize="sm">Variance Note</Text>
                  <Text fontWeight="bold">{selectedBatchDetails.batch.varianceNote || "-"}</Text>
                  {selectedBatchDetails.batch.varianceNotedBy ? (
                    <Text color="gray.500" fontSize="sm" mt={1}>
                      Noted by {selectedBatchDetails.batch.varianceNotedBy} on {formatDateTime(selectedBatchDetails.batch.varianceNotedAt)}
                    </Text>
                  ) : null}
                </Box>

                <Box borderWidth="1px" borderRadius="md" p={4}>
                  <Text color="gray.500" fontSize="sm">Closing Note</Text>
                  <Text fontWeight="bold">{selectedBatchDetails.batch.closingNote || "-"}</Text>
                </Box>

                <Box>
                  <Heading size="sm" mb={3}>Cash Count Evidence</Heading>
                  <TableContainer>
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>Count No.</Th>
                          <Th isNumeric>Expected</Th>
                          <Th isNumeric>Actual</Th>
                          <Th isNumeric>Variance</Th>
                          <Th isNumeric>Txns</Th>
                          <Th>Submitted By</Th>
                          <Th>Submitted</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {selectedBatchDetails.cashCounts.map((cashCount) => (
                          <Tr key={cashCount.id}>
                            <Td>{cashCount.id}</Td>
                            <Td isNumeric>{formatMoney(cashCount.expectedCash)}</Td>
                            <Td isNumeric>{formatMoney(cashCount.actualCash)}</Td>
                            <Td isNumeric>{formatMoney(cashCount.variance)}</Td>
                            <Td isNumeric>{cashCount.transactionCount}</Td>
                            <Td>{cashCount.submittedBy}</Td>
                            <Td>{formatDateTime(cashCount.submittedAt)}</Td>
                          </Tr>
                        ))}
                        {selectedBatchDetails.cashCounts.length === 0 ? (
                          <Tr>
                            <Td colSpan={7} color="gray.500">No cash count submitted for this batch.</Td>
                          </Tr>
                        ) : null}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>

                <Box>
                  <Heading size="sm" mb={3}>Transactions</Heading>
                  <TableContainer>
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>No.</Th>
                          <Th>Type</Th>
                          <Th>Member</Th>
                          <Th>Reference</Th>
                          <Th isNumeric>Cash In</Th>
                          <Th isNumeric>Cash Out</Th>
                          <Th>Status</Th>
                          <Th>Journal Entry</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {selectedBatchDetails.transactions.map((transaction) => (
                          <Tr key={`${transaction.batchType}-${transaction.id}`}>
                            <Td>{transaction.id}</Td>
                            <Td>{transaction.batchType}</Td>
                            <Td>{transaction.memberName}</Td>
                            <Td>{transaction.referenceNo}</Td>
                            <Td isNumeric>{transaction.cashReceived ? formatMoney(transaction.cashReceived) : ""}</Td>
                            <Td isNumeric>{transaction.cashOut ? formatMoney(transaction.cashOut) : ""}</Td>
                            <Td>
                              <Badge colorScheme={transaction.status === "Posted" ? "green" : "blue"}>
                                {transaction.status}
                              </Badge>
                            </Td>
                            <Td>{transaction.postedEntryNo || "-"}</Td>
                          </Tr>
                        ))}
                        {selectedBatchDetails.transactions.length === 0 ? (
                          <Tr>
                            <Td colSpan={8} color="gray.500">No transactions found for this batch.</Td>
                          </Tr>
                        ) : null}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>

                <Box>
                  <Heading size="sm" mb={3}>Linked Journal Entries</Heading>
                  <VStack align="stretch" spacing={3}>
                    {selectedBatchDetails.journalEntries.map((entry) => (
                      <Box key={entry.id} borderWidth="1px" borderRadius="md" p={4}>
                        <Flex justify="space-between" gap={4} wrap="wrap" mb={3}>
                          <Box>
                            <Text fontWeight="bold">{entry.id}</Text>
                            <Text color="gray.600">{entry.description}</Text>
                          </Box>
                          <Text color="gray.500" fontSize="sm">Posted by {entry.postedBy}</Text>
                        </Flex>
                        <TableContainer>
                          <Table size="sm">
                            <Thead>
                              <Tr>
                                <Th>Account</Th>
                                <Th isNumeric>Debit</Th>
                                <Th isNumeric>Credit</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {entry.lines.map((line) => (
                                <Tr key={`${entry.id}-${line.accountCode}`}>
                                  <Td>{line.accountCode} - {line.accountName}</Td>
                                  <Td isNumeric>{line.debit ? formatMoney(line.debit) : ""}</Td>
                                  <Td isNumeric>{line.credit ? formatMoney(line.credit) : ""}</Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </TableContainer>
                      </Box>
                    ))}
                    {selectedBatchDetails.journalEntries.length === 0 ? (
                      <Text color="gray.500">No linked journal entries yet.</Text>
                    ) : null}
                  </VStack>
                </Box>
              </VStack>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button onClick={batchDetails.onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}

function Reports() {
  const reportOptions = [
    {
      id: "daily-cash-position",
      title: "Daily Cash Position",
      description: "Read-only teller cash position summarized from batch evidence."
    },
    {
      id: "member-subsidiary-ledger",
      title: "Member Subsidiary Ledger",
      description: "Member balance and movement summary for share capital and savings."
    },
    {
      id: "control-account-reconciliation",
      title: "Control Account Reconciliation",
      description: "Subsidiary movement compared with posted GL control accounts."
    },
    {
      id: "trial-balance",
      title: "Trial Balance",
      description: "Posted general ledger debit and credit totals by account."
    },
    {
      id: "statement-of-financial-condition",
      title: "Statement of Financial Condition",
      description: "Balance-sheet view from posted general ledger balances."
    }
  ];
  const [selectedReport, setSelectedReport] = useState("daily-cash-position");
  const [dailyCashReport, setDailyCashReport] = useState(null);
  const [memberLedgerReport, setMemberLedgerReport] = useState(null);
  const [controlReconciliationReport, setControlReconciliationReport] = useState(null);
  const [trialBalanceReport, setTrialBalanceReport] = useState(null);
  const [financialConditionReport, setFinancialConditionReport] = useState(null);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadReport() {
    setIsRefreshing(true);
    setError("");

    try {
      const [
        dailyCashData,
        memberLedgerData,
        controlReconciliationData,
        trialBalanceData,
        financialConditionData
      ] = await Promise.all([
        api("/api/reports/daily-cash-position"),
        api("/api/reports/member-subsidiary-ledger"),
        api("/api/reports/control-account-reconciliation"),
        api("/api/reports/trial-balance"),
        api("/api/reports/statement-of-financial-condition")
      ]);
      setDailyCashReport(dailyCashData);
      setMemberLedgerReport(memberLedgerData);
      setControlReconciliationReport(controlReconciliationData);
      setTrialBalanceReport(trialBalanceData);
      setFinancialConditionReport(financialConditionData);
    } catch (reportError) {
      setError(reportError.message);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  const summary = dailyCashReport?.summary;
  const memberSummary = memberLedgerReport?.summary;
  const controlSummary = controlReconciliationReport?.summary;
  const trialBalanceSummary = trialBalanceReport?.summary;
  const financialConditionSummary = financialConditionReport?.summary;
  const activeReport = reportOptions.find((report) => report.id === selectedReport) || reportOptions[0];
  const activeGeneratedAt = {
    "daily-cash-position": dailyCashReport?.generatedAt,
    "member-subsidiary-ledger": memberLedgerReport?.generatedAt,
    "control-account-reconciliation": controlReconciliationReport?.generatedAt,
    "trial-balance": trialBalanceReport?.generatedAt,
    "statement-of-financial-condition": financialConditionReport?.generatedAt
  }[selectedReport];

  function renderFinancialConditionRows(rows) {
    return rows.map((row) => (
      <Tr key={row.accountCode}>
        <Td>{row.accountCode} - {row.accountName}</Td>
        <Td isNumeric>{formatMoney(row.amount)}</Td>
      </Tr>
    ));
  }

  return (
    <VStack align="stretch" spacing={5} minW={0} maxW="100%">
      <Flex justify="space-between" align="flex-start" gap={4} wrap="wrap">
        <Box>
          <Heading size="md">{activeReport.title}</Heading>
          <Text color="gray.600" mt={1}>
            {activeReport.description}
          </Text>
          {activeGeneratedAt ? (
            <Text color="gray.500" fontSize="sm" mt={1}>
              Generated {formatDateTime(activeGeneratedAt)}
            </Text>
          ) : null}
        </Box>
        <Flex gap={3} wrap="wrap">
          <Select
            size="sm"
            value={selectedReport}
            onChange={(event) => setSelectedReport(event.target.value)}
            bg="white"
            minW={{ base: 0, md: "280px" }}
            w={{ base: "100%", md: "auto" }}
          >
            {reportOptions.map((report) => (
              <option key={report.id} value={report.id}>
                {report.title}
              </option>
            ))}
          </Select>
          <Button size="sm" onClick={loadReport} isLoading={isRefreshing}>
            Refresh
          </Button>
        </Flex>
      </Flex>

      {error ? <Text color="red.500">{error}</Text> : null}

      {selectedReport === "daily-cash-position" && summary ? (
        <>
          <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4}>
            <Box bg="white" borderWidth="1px" borderRadius="lg" p={4}>
              <Text color="gray.500" fontSize="sm">Batches</Text>
              <Text fontWeight="bold">{summary.batchCount}</Text>
              <Text color="gray.500" fontSize="sm">{summary.closedBatchCount} closed</Text>
            </Box>
            <Box bg="white" borderWidth="1px" borderRadius="lg" p={4}>
              <Text color="gray.500" fontSize="sm">Cash In</Text>
              <Text fontWeight="bold">{formatMoney(summary.cashIn)}</Text>
            </Box>
            <Box bg="white" borderWidth="1px" borderRadius="lg" p={4}>
              <Text color="gray.500" fontSize="sm">Cash Out</Text>
              <Text fontWeight="bold">{formatMoney(summary.cashOut)}</Text>
            </Box>
            <Box bg="white" borderWidth="1px" borderRadius="lg" p={4}>
              <Text color="gray.500" fontSize="sm">Net Cash</Text>
              <Text fontWeight="bold">{formatMoney(summary.netCash)}</Text>
            </Box>
            <Box bg="white" borderWidth="1px" borderRadius="lg" p={4}>
              <Text color="gray.500" fontSize="sm">Expected Cash</Text>
              <Text fontWeight="bold">{formatMoney(summary.expectedCash)}</Text>
            </Box>
            <Box bg="white" borderWidth="1px" borderRadius="lg" p={4}>
              <Text color="gray.500" fontSize="sm">Actual Cash</Text>
              <Text fontWeight="bold">{formatMoney(summary.actualCash)}</Text>
            </Box>
            <Box bg="white" borderWidth="1px" borderRadius="lg" p={4}>
              <Text color="gray.500" fontSize="sm">Variance</Text>
              <Text fontWeight="bold">{formatMoney(summary.variance)}</Text>
            </Box>
            <Box bg="white" borderWidth="1px" borderRadius="lg" p={4}>
              <Text color="gray.500" fontSize="sm">Posting</Text>
              <Text fontWeight="bold">{summary.postedEntryCount} posted</Text>
              <Text color="gray.500" fontSize="sm">{summary.unpostedTransactionCount} unposted</Text>
            </Box>
          </Grid>

          <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
            <Flex justify="space-between" gap={4} wrap="wrap" mb={4}>
              <Heading size="md">Batch Rows</Heading>
              <Text color="gray.500" fontSize="sm">Generated {formatDateTime(dailyCashReport.generatedAt)}</Text>
            </Flex>
            <TableContainer>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Batch</Th>
                    <Th>Status</Th>
                    <Th>Teller</Th>
                    <Th isNumeric>Cash In</Th>
                    <Th isNumeric>Cash Out</Th>
                    <Th isNumeric>Net</Th>
                    <Th isNumeric>Expected</Th>
                    <Th isNumeric>Actual</Th>
                    <Th isNumeric>Variance</Th>
                    <Th isNumeric>Posted</Th>
                    <Th isNumeric>Unposted</Th>
                    <Th>Closed By</Th>
                    <Th>Closed</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {dailyCashReport.batches.map((batch) => (
                    <Tr key={batch.id}>
                      <Td>{batch.id}</Td>
                      <Td>
                        <Badge colorScheme={batch.status === "Closed" ? "gray" : batch.status === "Open" ? "blue" : "green"}>
                          {batch.status}
                        </Badge>
                      </Td>
                      <Td>{batch.tellerUsername}</Td>
                      <Td isNumeric>{formatMoney(batch.cashIn)}</Td>
                      <Td isNumeric>{formatMoney(batch.cashOut)}</Td>
                      <Td isNumeric>{formatMoney(batch.netCash)}</Td>
                      <Td isNumeric>{formatMoney(batch.expectedCash)}</Td>
                      <Td isNumeric>{formatMoney(batch.actualCash)}</Td>
                      <Td isNumeric>{formatMoney(batch.variance)}</Td>
                      <Td isNumeric>{batch.postedEntryCount}</Td>
                      <Td isNumeric>{batch.unpostedTransactionCount}</Td>
                      <Td>{batch.closedBy || "-"}</Td>
                      <Td>{formatDateTime(batch.closedAt)}</Td>
                    </Tr>
                  ))}
                  {dailyCashReport.batches.length === 0 ? (
                    <Tr>
                      <Td colSpan={13} color="gray.500">No teller batches found.</Td>
                    </Tr>
                  ) : null}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        </>
      ) : null}

      {selectedReport === "member-subsidiary-ledger" && memberSummary ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Flex justify="space-between" gap={4} wrap="wrap" mb={4}>
            <Box>
              <Heading size="md">Member Subsidiary Ledger</Heading>
              <Text color="gray.600" mt={1}>
                Read-only balances split between finalized opening imports and normal member transactions.
              </Text>
            </Box>
            <Text color="gray.500" fontSize="sm">Generated {formatDateTime(memberLedgerReport.generatedAt)}</Text>
          </Flex>

          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)", xl: "repeat(6, 1fr)" }} gap={4} mb={5}>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Members</Text>
              <Text fontWeight="bold">{memberSummary.totalMembers}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Share Capital</Text>
              <Text fontWeight="bold">{formatMoney(memberSummary.totalShareCapital)}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Savings</Text>
              <Text fontWeight="bold">{formatMoney(memberSummary.totalSavings)}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Opening Share</Text>
              <Text fontWeight="bold">{formatMoney(memberSummary.totalOpeningShareCapital)}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Opening Savings</Text>
              <Text fontWeight="bold">{formatMoney(memberSummary.totalOpeningSavings)}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Transactions</Text>
              <Text fontWeight="bold">{memberSummary.totalPostedTransactions} posted</Text>
              <Text color="gray.500" fontSize="sm">{memberSummary.totalUnpostedTransactions} unposted</Text>
            </Box>
          </Grid>

          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Member No.</Th>
                  <Th>Name</Th>
                  <Th>Status</Th>
                  <Th isNumeric>Share Balance</Th>
                  <Th isNumeric>Savings Balance</Th>
                  <Th isNumeric>Opening Share</Th>
                  <Th isNumeric>Opening Savings</Th>
                  <Th isNumeric>Initial Share</Th>
                  <Th isNumeric>Share Adds</Th>
                  <Th isNumeric>Savings Deposits</Th>
                  <Th isNumeric>Savings Withdrawals</Th>
                  <Th isNumeric>Posted</Th>
                  <Th isNumeric>Unposted</Th>
                </Tr>
              </Thead>
              <Tbody>
                {memberLedgerReport.members.map((member) => (
                  <Tr key={member.id}>
                    <Td>{member.id}</Td>
                    <Td>{member.name}</Td>
                    <Td>
                      <Badge colorScheme={member.status === "Active" ? "green" : "gray"}>{member.status}</Badge>
                    </Td>
                    <Td isNumeric>{formatMoney(member.shareCapitalBalance)}</Td>
                    <Td isNumeric>{formatMoney(member.savingsBalance)}</Td>
                    <Td isNumeric>{formatMoney(member.openingShareCapitalTotal)}</Td>
                    <Td isNumeric>{formatMoney(member.openingSavingsTotal)}</Td>
                    <Td isNumeric>{formatMoney(member.initialPaymentTotal)}</Td>
                    <Td isNumeric>{formatMoney(member.shareCapitalContributionTotal)}</Td>
                    <Td isNumeric>{formatMoney(member.savingsDepositTotal)}</Td>
                    <Td isNumeric>{formatMoney(member.savingsWithdrawalTotal)}</Td>
                    <Td isNumeric>{member.postedTransactionCount}</Td>
                    <Td isNumeric>{member.unpostedTransactionCount}</Td>
                  </Tr>
                ))}
                {memberLedgerReport.members.length === 0 ? (
                  <Tr>
                    <Td colSpan={13} color="gray.500">No member subsidiary rows found.</Td>
                  </Tr>
                ) : null}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      ) : null}

      {selectedReport === "control-account-reconciliation" && controlSummary ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Flex justify="space-between" gap={4} wrap="wrap" mb={4}>
            <Box>
              <Heading size="md">Control Account Reconciliation</Heading>
              <Text color="gray.600" mt={1}>
                Prototype activity only: subsidiary movement compared with posted GL control accounts.
              </Text>
            </Box>
            <Text color="gray.500" fontSize="sm">
              {controlSummary.reconciledCount} of {controlSummary.accountCount} reconciled
            </Text>
          </Flex>

          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Account</Th>
                  <Th isNumeric>Subsidiary Total</Th>
                  <Th isNumeric>General Ledger Total</Th>
                  <Th isNumeric>Difference</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {controlReconciliationReport.rows.map((row) => (
                  <Tr key={row.accountCode}>
                    <Td>{row.accountCode} - {row.accountName}</Td>
                    <Td isNumeric>{formatMoney(row.subsidiaryTotal)}</Td>
                    <Td isNumeric>{formatMoney(row.generalLedgerTotal)}</Td>
                    <Td isNumeric>{formatMoney(row.difference)}</Td>
                    <Td>
                      <Badge colorScheme={row.status === "Reconciled" ? "green" : "orange"}>{row.status}</Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      ) : null}

      {selectedReport === "trial-balance" && trialBalanceSummary ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Flex justify="space-between" gap={4} wrap="wrap" mb={4}>
            <Box>
              <Heading size="md">Trial Balance</Heading>
              <Text color="gray.600" mt={1}>
                Prototype posted journal entries only: total debit and credit movement by general ledger account.
              </Text>
            </Box>
            <Badge colorScheme={trialBalanceSummary.status === "Balanced" ? "green" : "orange"}>
              {trialBalanceSummary.status}
            </Badge>
          </Flex>

          <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4} mb={5}>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Accounts</Text>
              <Text fontWeight="bold">{trialBalanceSummary.accountCount}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Total Debits</Text>
              <Text fontWeight="bold">{formatMoney(trialBalanceSummary.totalDebits)}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Total Credits</Text>
              <Text fontWeight="bold">{formatMoney(trialBalanceSummary.totalCredits)}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Difference</Text>
              <Text fontWeight="bold">{formatMoney(trialBalanceSummary.difference)}</Text>
            </Box>
          </Grid>

          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Account</Th>
                  <Th isNumeric>Total Debit</Th>
                  <Th isNumeric>Total Credit</Th>
                  <Th isNumeric>Debit Balance</Th>
                  <Th isNumeric>Credit Balance</Th>
                </Tr>
              </Thead>
              <Tbody>
                {trialBalanceReport.rows.map((row) => (
                  <Tr key={row.accountCode}>
                    <Td>{row.accountCode} - {row.accountName}</Td>
                    <Td isNumeric>{formatMoney(row.totalDebit)}</Td>
                    <Td isNumeric>{formatMoney(row.totalCredit)}</Td>
                    <Td isNumeric>{formatMoney(row.endingDebitBalance)}</Td>
                    <Td isNumeric>{formatMoney(row.endingCreditBalance)}</Td>
                  </Tr>
                ))}
                {trialBalanceReport.rows.length === 0 ? (
                  <Tr>
                    <Td colSpan={5} color="gray.500">No posted journal entries found.</Td>
                  </Tr>
                ) : null}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      ) : null}

      {selectedReport === "statement-of-financial-condition" && financialConditionSummary ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Flex justify="space-between" gap={4} wrap="wrap" mb={4}>
            <Box>
              <Heading size="md">Statement of Financial Condition</Heading>
              <Text color="gray.600" mt={1}>
                Balance-sheet view from posted general ledger balances.
              </Text>
            </Box>
            <Badge colorScheme={financialConditionSummary.status === "Balanced" ? "green" : "orange"}>
              {financialConditionSummary.status}
            </Badge>
          </Flex>

          <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4} mb={5}>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Assets</Text>
              <Text fontWeight="bold">{formatMoney(financialConditionSummary.totalAssets)}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Liabilities</Text>
              <Text fontWeight="bold">{formatMoney(financialConditionSummary.totalLiabilities)}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Equity</Text>
              <Text fontWeight="bold">{formatMoney(financialConditionSummary.totalEquity)}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Difference</Text>
              <Text fontWeight="bold">{formatMoney(financialConditionSummary.difference)}</Text>
            </Box>
          </Grid>

          <Grid templateColumns={{ base: "1fr", lg: "repeat(3, 1fr)" }} gap={5}>
            <Box>
              <Heading size="sm" mb={3}>Assets</Heading>
              <TableContainer>
                <Table size="sm">
                  <Tbody>{renderFinancialConditionRows(financialConditionReport.sections.assets)}</Tbody>
                </Table>
              </TableContainer>
            </Box>
            <Box>
              <Heading size="sm" mb={3}>Liabilities</Heading>
              <TableContainer>
                <Table size="sm">
                  <Tbody>{renderFinancialConditionRows(financialConditionReport.sections.liabilities)}</Tbody>
                </Table>
              </TableContainer>
            </Box>
            <Box>
              <Heading size="sm" mb={3}>Equity</Heading>
              <TableContainer>
                <Table size="sm">
                  <Tbody>{renderFinancialConditionRows(financialConditionReport.sections.equity)}</Tbody>
                </Table>
              </TableContainer>
            </Box>
          </Grid>

          <Flex justify="flex-end" mt={5}>
            <Text fontWeight="bold">
              Liabilities + Equity: {formatMoney(financialConditionSummary.totalLiabilitiesAndEquity)}
            </Text>
          </Flex>
        </Box>
      ) : null}
    </VStack>
  );
}

function AdminUserManagement({ user }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [defaultPassword, setDefaultPassword] = useState("");
  const [form, setForm] = useState({
    name: "",
    username: "",
    role: "Membership Officer",
    defaultView: "members"
  });
  const [drafts, setDrafts] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canManageUsers = user.username === "admin" || user.role === "System Administrator";
  const canViewUsers = canManageUsers || user.permissions.includes("users:view");

  const roleOptions = useMemo(() => roles.map((role) => role.name), [roles]);
  const defaultViews = useMemo(
    () => roles.find((role) => role.name === form.role)?.defaultViews || [],
    [form.role, roles]
  );

  const loadUsers = useCallback(async () => {
    setError("");

    try {
      const data = await api("/api/admin/users");
      setUsers(data.users);
      setRoles(data.roles);
      setDefaultPassword(data.defaultPassword);
      setDrafts(
        Object.fromEntries(
          data.users.map((item) => [
            item.username,
            {
              role: item.role,
              status: item.status,
              defaultView: item.defaultView
            }
          ])
        )
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!defaultViews.includes(form.defaultView) && defaultViews[0]) {
      setForm((current) => ({ ...current, defaultView: defaultViews[0] }));
    }
  }, [defaultViews, form.defaultView]);

  function updateDraft(username, patch) {
    setDrafts((current) => {
      const nextDraft = { ...current[username], ...patch };
      const nextRoleViews = roles.find((role) => role.name === nextDraft.role)?.defaultViews || [];

      if (!nextRoleViews.includes(nextDraft.defaultView)) {
        nextDraft.defaultView = nextRoleViews[0] || "dashboard";
      }

      return { ...current, [username]: nextDraft };
    });
  }

  async function createUser(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setForm({
        name: "",
        username: "",
        role: "Membership Officer",
        defaultView: "members"
      });
      setMessage(`Created ${form.username}. Prototype password is ${defaultPassword}.`);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveUser(username) {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      await api(`/api/admin/users/${username}`, {
        method: "PATCH",
        body: JSON.stringify(drafts[username])
      });
      setMessage(`Updated ${username}.`);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (!canViewUsers) {
    return null;
  }

  return (
    <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
      <Flex justify="space-between" align="flex-start" gap={4} wrap="wrap" mb={4}>
        <Box>
          <Heading size="md">{canManageUsers ? "User Management" : "User / Security Review"}</Heading>
          <Text color="gray.600" mt={1}>
            {canManageUsers
              ? "Staff accounts use the shared prototype password while role and access testing continues."
              : "Read-only staff account directory for compliance and access review."}
          </Text>
        </Box>
        <Badge colorScheme="purple">{users.length} users</Badge>
      </Flex>

      {message ? (
        <Box mb={4} borderWidth="1px" borderColor="green.200" bg="green.50" borderRadius="md" p={3}>
          <Text color="green.800">{message}</Text>
        </Box>
      ) : null}

      {error ? (
        <Box mb={4} borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="md" p={3}>
          <Text color="red.800">{error}</Text>
        </Box>
      ) : null}

      {canManageUsers ? (
      <Box as="form" onSubmit={createUser} borderWidth="1px" borderRadius="md" p={4} mb={5}>
        <Heading size="sm" mb={4}>Create Staff User</Heading>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "2fr 1fr 1fr 1fr" }} gap={4}>
          <FormControl>
            <FormLabel>Full Name</FormLabel>
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Juan D. Cruz"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Username</FormLabel>
            <Input
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value.toLowerCase() }))}
              placeholder="juancruz"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Role</FormLabel>
            <Select
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Default Screen</FormLabel>
            <Select
              value={form.defaultView}
              onChange={(event) => setForm((current) => ({ ...current, defaultView: event.target.value }))}
            >
              {defaultViews.map((viewName) => (
                <option key={viewName} value={viewName}>{viewTitles[viewName]}</option>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Flex justify="space-between" align="center" gap={4} wrap="wrap" mt={4}>
          <Text color="gray.600" fontSize="sm">
            New users sign in with the prototype password: {defaultPassword}
          </Text>
          <Button colorScheme="green" type="submit" isLoading={busy}>
            Create User
          </Button>
        </Flex>
      </Box>
      ) : null}

      <TableContainer>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>User</Th>
              <Th>Role</Th>
              <Th>Default Screen</Th>
              <Th>Status</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {users.map((item) => {
              const draft = drafts[item.username] || item;
              const draftViews = roles.find((role) => role.name === draft.role)?.defaultViews || [];

              return (
                <Tr key={item.username}>
                  <Td>
                    <Text fontWeight="semibold">{item.name}</Text>
                    <Text color="gray.500" fontSize="sm">@{item.username}</Text>
                  </Td>
                  <Td minW="220px">
                    {canManageUsers ? (
                      <Select size="sm" value={draft.role} onChange={(event) => updateDraft(item.username, { role: event.target.value })}>
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </Select>
                    ) : (
                      <Text>{item.role}</Text>
                    )}
                  </Td>
                  <Td minW="150px">
                    {canManageUsers ? (
                      <Select
                        size="sm"
                        value={draft.defaultView}
                        onChange={(event) => updateDraft(item.username, { defaultView: event.target.value })}
                      >
                        {draftViews.map((viewName) => (
                          <option key={viewName} value={viewName}>{viewTitles[viewName]}</option>
                        ))}
                      </Select>
                    ) : (
                      <Text>{viewTitles[item.defaultView] || item.defaultView}</Text>
                    )}
                  </Td>
                  <Td minW="120px">
                    {canManageUsers ? (
                      <Select
                        size="sm"
                        value={draft.status}
                        onChange={(event) => updateDraft(item.username, { status: event.target.value })}
                        isDisabled={item.username === "admin"}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </Select>
                    ) : (
                      <Badge colorScheme={item.status === "Active" ? "green" : "gray"}>{item.status}</Badge>
                    )}
                  </Td>
                  <Td textAlign="right">
                    {canManageUsers ? (
                      <Button size="sm" onClick={() => saveUser(item.username)} isLoading={busy}>
                        Save
                      </Button>
                    ) : (
                      <Text color="gray.500" fontSize="sm">Read only</Text>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function AdminDemoMaintenance({ user }) {
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  const canReset = confirmation.trim() === "RESET TASETEMCO";

  const loadStatus = useCallback(async () => {
    setError("");

    try {
      const data = await api("/api/admin/demo-maintenance");
      setStatus(data);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  function downloadJson(data, fileName) {
    const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function backupDemoData() {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const data = await api("/api/admin/demo-maintenance/backup", { method: "POST" });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadJson(data, `tasetemco-demo-backup-${stamp}.json`);
      setMessage("Backup JSON downloaded.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetDemoData() {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const data = await api("/api/admin/demo-maintenance/reset", {
        method: "POST",
        body: JSON.stringify({ confirmation })
      });
      const stamp = new Date(data.resetAt).toISOString().replace(/[:.]/g, "-");
      downloadJson(data.backup, `tasetemco-pre-reset-backup-${stamp}.json`);
      setConfirmation("");
      setMessage("Demo data reset to seed. A pre-reset backup JSON was downloaded.");
      await loadStatus();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (user.username !== "admin") {
    return null;
  }

  return (
    <VStack align="stretch" spacing={5}>
      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Flex justify="space-between" align="flex-start" gap={4} wrap="wrap">
          <Box>
            <Heading size="md">Demo Maintenance</Heading>
            <Text color="gray.600" mt={1}>
              Admin-only controls for the hosted prototype data.
            </Text>
          </Box>
          <Badge colorScheme={status?.database === "postgres" ? "green" : "gray"}>
            {status?.database || "Checking"}
          </Badge>
        </Flex>

        {message ? (
          <Box mt={4} borderWidth="1px" borderColor="green.200" bg="green.50" borderRadius="md" p={3}>
            <Text color="green.800">{message}</Text>
          </Box>
        ) : null}

        {error ? (
          <Box mt={4} borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="md" p={3}>
            <Text color="red.800">{error}</Text>
          </Box>
        ) : null}

        <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4} mt={5}>
          <Box borderWidth="1px" borderRadius="md" p={4}>
            <Text color="gray.500" fontSize="sm">Database Mode</Text>
            <Text fontWeight="bold">{status?.database || "-"}</Text>
          </Box>
          <Box borderWidth="1px" borderRadius="md" p={4}>
            <Text color="gray.500" fontSize="sm">Reset Available</Text>
            <Text fontWeight="bold">{status?.resetAvailable ? "Yes" : "No"}</Text>
          </Box>
          <Box borderWidth="1px" borderRadius="md" p={4}>
            <Text color="gray.500" fontSize="sm">Tracked Tables</Text>
            <Text fontWeight="bold">{status?.tables?.length || 0}</Text>
          </Box>
        </Grid>
      </Box>

      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Flex justify="space-between" align="center" gap={4} wrap="wrap" mb={4}>
          <Box>
            <Heading size="sm">Current Table Counts</Heading>
            <Text color="gray.600" mt={1}>
              Snapshot of persisted demo tables before any maintenance action.
            </Text>
          </Box>
          <Button onClick={loadStatus} isLoading={busy}>Refresh</Button>
        </Flex>

        <TableContainer>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Table</Th>
                <Th isNumeric>Rows</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(status?.tables || []).map((table) => (
                <Tr key={table.name}>
                  <Td>{table.name}</Td>
                  <Td isNumeric>{table.count}</Td>
                </Tr>
              ))}
              {status?.tables?.length === 0 ? (
                <Tr>
                  <Td colSpan={2} color="gray.500">No persisted table status available.</Td>
                </Tr>
              ) : null}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Heading size="sm">Backup Demo Data</Heading>
        <Text color="gray.600" mt={1}>
          Download a JSON snapshot before a demo, client review, or reset.
        </Text>
        <Button mt={4} colorScheme="green" onClick={backupDemoData} isLoading={busy}>
          Download Backup JSON
        </Button>
      </Box>

      <Box bg="white" borderWidth="1px" borderColor="red.200" borderRadius="lg" p={5}>
        <Heading size="sm">Reset To Demo Seed</Heading>
        <Text color="gray.600" mt={1}>
          This clears hosted tester input and restores the original seeded prototype rows.
          A pre-reset backup downloads automatically.
        </Text>
        <FormControl mt={4}>
          <FormLabel>Confirmation</FormLabel>
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="RESET TASETEMCO"
          />
        </FormControl>
        <Button
          mt={4}
          colorScheme="red"
          onClick={resetDemoData}
          isDisabled={!canReset || !status?.resetAvailable}
          isLoading={busy}
        >
          Reset Demo Data
        </Button>
      </Box>
    </VStack>
  );
}

const defaultLoanProductForm = {
  code: "",
  name: "",
  description: "",
  minimumPrincipal: 5000,
  maximumPrincipal: 50000,
  minimumTermMonths: 3,
  maximumTermMonths: 12,
  annualInterestRateBps: 1200,
  interestMethod: "Flat Interest",
  paymentFrequency: "Monthly",
  processingFee: 250,
  penaltyRateBps: 200,
  loansReceivableAccount: "1050",
  interestIncomeAccount: "4010",
  processingFeeAccount: "4030",
  penaltyIncomeAccount: "4040",
  cashAccount: "1010",
  status: "Active"
};

function formatRateBps(value) {
  return `${(Number(value || 0) / 100).toFixed(2)}%`;
}

function Loans({ user }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(defaultLoanProductForm);
  const [editingCode, setEditingCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyCode, setBusyCode] = useState("");
  const canViewProducts = user.permissions.includes("loans:products:view");
  const canManageProducts = user.permissions.includes("loans:products:manage");

  const loadProducts = useCallback(async () => {
    if (!canViewProducts) {
      return;
    }

    setError("");
    try {
      const rows = await api("/api/loan-products");
      setProducts(rows);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [canViewProducts]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(product) {
    setEditingCode(product.code);
    setForm({ ...product });
    setMessage("");
    setError("");
  }

  function cancelEdit() {
    setEditingCode("");
    setForm(defaultLoanProductForm);
  }

  async function submitProduct(event) {
    event.preventDefault();
    setBusyCode(editingCode || "create");
    setMessage("");
    setError("");

    try {
      const data = await api(editingCode ? `/api/loan-products/${editingCode}` : "/api/loan-products", {
        method: editingCode ? "PATCH" : "POST",
        body: JSON.stringify(form)
      });
      setMessage(`${data.product.name} ${editingCode ? "updated" : "created"}.`);
      setEditingCode("");
      setForm(defaultLoanProductForm);
      await loadProducts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyCode("");
    }
  }

  if (!canViewProducts) {
    return <Placeholder view="loans" />;
  }

  return (
    <VStack align="stretch" spacing={5} minW={0} maxW="100%">
      <Flex justify="space-between" gap={4} align="center" wrap="wrap">
        <Box>
          <Heading size="md">Loan Products</Heading>
          <Text color="gray.600" mt={1}>
            Reusable lending rules for amount limits, terms, rates, fees, penalties, and accounting mappings.
          </Text>
        </Box>
        <Button size="sm" variant="outline" onClick={loadProducts}>
          Refresh
        </Button>
      </Flex>

      {message ? <Text color="green.600">{message}</Text> : null}
      {error ? <Text color="red.500">{error}</Text> : null}

      {canManageProducts ? (
        <Box as="form" onSubmit={submitProduct} bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="sm" mb={4}>{editingCode ? `Edit Loan Product - ${editingCode}` : "Create Loan Product"}</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap={4}>
            <FormControl isRequired>
              <FormLabel>Product Code</FormLabel>
              <Input
                value={form.code}
                onChange={(event) => updateForm("code", event.target.value.toUpperCase())}
                isDisabled={Boolean(editingCode)}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Product Name</FormLabel>
              <Input value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Minimum Principal</FormLabel>
              <NumberInput min={0} value={form.minimumPrincipal} onChange={(value) => updateForm("minimumPrincipal", Number(value || 0))}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Maximum Principal</FormLabel>
              <NumberInput min={1} value={form.maximumPrincipal} onChange={(value) => updateForm("maximumPrincipal", Number(value || 0))}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Minimum Term (months)</FormLabel>
              <NumberInput min={1} value={form.minimumTermMonths} onChange={(value) => updateForm("minimumTermMonths", Number(value || 0))}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Maximum Term (months)</FormLabel>
              <NumberInput min={1} value={form.maximumTermMonths} onChange={(value) => updateForm("maximumTermMonths", Number(value || 0))}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Annual Interest (%)</FormLabel>
              <NumberInput min={0} max={100} precision={2} value={form.annualInterestRateBps / 100} onChange={(value) => updateForm("annualInterestRateBps", Math.round(Number(value || 0) * 100))}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Processing Fee</FormLabel>
              <NumberInput min={0} value={form.processingFee} onChange={(value) => updateForm("processingFee", Number(value || 0))}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Penalty Rate (%)</FormLabel>
              <NumberInput min={0} max={100} precision={2} value={form.penaltyRateBps / 100} onChange={(value) => updateForm("penaltyRateBps", Math.round(Number(value || 0) * 100))}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Interest Method</FormLabel>
              <Select value={form.interestMethod} onChange={(event) => updateForm("interestMethod", event.target.value)}>
                <option>Flat Interest</option>
                <option>Diminishing Balance</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Payment Frequency</FormLabel>
              <Select value={form.paymentFrequency} onChange={(event) => updateForm("paymentFrequency", event.target.value)}>
                <option>Monthly</option>
                <option>Semi-monthly</option>
                <option>Weekly</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Status</FormLabel>
              <Select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>
                <option>Active</option>
                <option>Inactive</option>
              </Select>
            </FormControl>
          </Grid>
          <FormControl mt={4}>
            <FormLabel>Description</FormLabel>
            <Textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
          </FormControl>
          <Grid templateColumns={{ base: "1fr", md: "repeat(5, 1fr)" }} gap={4} mt={4}>
            {[
              ["loansReceivableAccount", "Loans Receivable"],
              ["interestIncomeAccount", "Interest Income"],
              ["processingFeeAccount", "Processing Fee"],
              ["penaltyIncomeAccount", "Penalty Income"],
              ["cashAccount", "Cash"]
            ].map(([field, label]) => (
              <FormControl key={field}>
                <FormLabel>{label} Account</FormLabel>
                <Input value={form[field]} onChange={(event) => updateForm(field, event.target.value)} />
              </FormControl>
            ))}
          </Grid>
          <Flex justify="flex-end" mt={5}>
            {editingCode ? (
              <Button mr={3} variant="outline" onClick={cancelEdit}>
                Cancel
              </Button>
            ) : null}
            <Button type="submit" colorScheme="green" isLoading={busyCode === (editingCode || "create")}>
              {editingCode ? "Save Product" : "Create Product"}
            </Button>
          </Flex>
        </Box>
      ) : null}

      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <TableContainer>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Product</Th>
                <Th>Principal Range</Th>
                <Th>Term</Th>
                <Th>Interest</Th>
                <Th>Frequency</Th>
                <Th isNumeric>Fee</Th>
                <Th>Penalty</Th>
                <Th>Status</Th>
                {canManageProducts ? <Th>Action</Th> : null}
              </Tr>
            </Thead>
            <Tbody>
              {products.map((product) => {
                return (
                  <Tr key={product.code}>
                    <Td minW="220px">
                      <Text fontWeight="bold">{product.code} - {product.name}</Text>
                      <Text color="gray.500" fontSize="xs">{product.description}</Text>
                    </Td>
                    <Td minW="170px">
                      {formatMoney(product.minimumPrincipal)} - {formatMoney(product.maximumPrincipal)}
                    </Td>
                    <Td minW="150px">
                      {product.minimumTermMonths}-{product.maximumTermMonths} months
                    </Td>
                    <Td minW="140px">
                      <Text>{formatRateBps(product.annualInterestRateBps)} annual</Text>
                      <Text color="gray.500" fontSize="xs">{product.interestMethod}</Text>
                    </Td>
                    <Td>{product.paymentFrequency}</Td>
                    <Td isNumeric>{formatMoney(product.processingFee)}</Td>
                    <Td>{formatRateBps(product.penaltyRateBps)}</Td>
                    <Td>
                      <Badge colorScheme={product.status === "Active" ? "green" : "gray"}>{product.status}</Badge>
                    </Td>
                    {canManageProducts ? (
                      <Td>
                        <Button size="sm" onClick={() => startEdit(product)}>
                          Edit
                        </Button>
                      </Td>
                    ) : null}
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </TableContainer>
        <Text color="gray.500" fontSize="sm" mt={4}>
          Account mapping: 1050 Loans Receivable, 4010 Interest Income, 4030 Processing Fee Income,
          4040 Penalty Income, and 1010 Cash on Hand.
        </Text>
      </Box>
    </VStack>
  );
}

function Placeholder({ view }) {
  return (
    <Box bg="white" borderWidth="1px" borderRadius="lg" p={6}>
      <Heading size="md">{viewTitles[view]}</Heading>
      <Text mt={3} color="gray.600">
        This screen is reserved for the next spike slice. The first iteration proves
        login, role navigation, dashboard loading, and member listing.
      </Text>
    </Box>
  );
}

function Shell({ user, onLogout }) {
  const [view, setView] = useState(user.defaultView);
  const navItems = useMemo(() => user.allowedViews.filter((item) => viewTitles[item]), [user]);

  function renderView() {
    if (view === "dashboard") {
      return <Dashboard />;
    }

    if (view === "members") {
      return <Members user={user} />;
    }

    if (view === "loans") {
      return <Loans user={user} />;
    }

    if (view === "ledger") {
      return <Ledger user={user} />;
    }

    if (view === "reports") {
      return <Reports />;
    }

    if (view === "users") {
      return (
        <VStack align="stretch" spacing={5}>
          <AdminUserManagement user={user} />
          <AdminDemoMaintenance user={user} />
        </VStack>
      );
    }

    return <Placeholder view={view} />;
  }

  return (
    <Grid minH="100vh" templateColumns={{ base: "minmax(0, 1fr)", lg: "280px minmax(0, 1fr)" }} bg="gray.50" maxW="100vw">
      <GridItem bg="green.900" color="white" p={5} minW={0}>
        <Heading size="md">TASETEMCO</Heading>
        <Text color="green.100" mt={1} fontSize="sm">
          React spike
        </Text>
        <VStack align="stretch" mt={8}>
          {navItems.map((item) => (
            <Button
              key={item}
              justifyContent="flex-start"
              colorScheme={view === item ? "yellow" : "whiteAlpha"}
              variant={view === item ? "solid" : "ghost"}
              onClick={() => setView(item)}
            >
              {viewTitles[item]}
            </Button>
          ))}
        </VStack>
      </GridItem>
      <GridItem p={{ base: 4, md: 8 }} minW={0} overflowX="hidden">
        <Flex justify="space-between" align="center" mb={7} gap={4} wrap="wrap" minW={0}>
          <Box minW={0}>
            <Text color="gray.500" fontSize="sm">
              {user.role}
            </Text>
            <Heading>{viewTitles[view]}</Heading>
          </Box>
          <Flex align="center" gap={3} wrap="wrap" justify={{ base: "flex-start", md: "flex-end" }} minW={0}>
            <Box textAlign={{ base: "left", md: "right" }} minW={0}>
              <Text fontWeight="bold">{user.name}</Text>
              <Text color="gray.500" fontSize="sm">
                @{user.username}
              </Text>
            </Box>
            <Button onClick={onLogout}>Logout</Button>
          </Flex>
        </Flex>
        {renderView()}
      </GridItem>
    </Grid>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api("/api/me")
      .then((data) => setUser(data.user))
      .finally(() => setReady(true));
  }, []);

  async function logout() {
    await api("/api/logout", { method: "POST" });
    setUser(null);
  }

  if (!ready) {
    return <Box p={8}>Loading...</Box>;
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return <Shell user={user} onLogout={logout} />;
}

createReactRoot(document.getElementById("root")).render(
  <ChakraProvider theme={theme}>
    <App />
  </ChakraProvider>
);
