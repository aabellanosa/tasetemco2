import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Button,
  ChakraProvider,
  Checkbox,
  Container,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Grid,
  GridItem,
  Heading,
  Image,
  Input,
  InputGroup,
  InputRightElement,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
  Portal,
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
const memberDirectoryPageSizeOptions = [25, 50, 100];
const memberClassifications = [
  "REGULAR MEMBERS CAPTURE",
  "REGULAR MEMBERS NON CAPTURE",
  "RETIREES",
  "REGULAR MEMBERS LGU",
  "COMMUNITY A MEMBERS",
  "COMMUNITY B MEMBERS"
];
const memberApplicationIdTypes = [
  "PhilSys ID / ePhilID",
  "Philippine Passport",
  "Driver's License",
  "Unified Multi-Purpose ID (UMID)",
  "SSS ID",
  "GSIS eCard",
  "PRC ID",
  "Voter's ID / Voter's Certificate",
  "Postal ID",
  "PhilHealth ID",
  "TIN ID",
  "Pag-IBIG Loyalty Card",
  "Senior Citizen ID",
  "PWD ID",
  "NBI Clearance",
  "Police Clearance",
  "Barangay ID",
  "School ID",
  "Other"
];
const memberApplicationGenders = ["Male", "Female", "Prefer not to say"];
const cooperativeContact = {
  phoneDisplay: "0917 000 0000",
  phoneHref: "+639170000000",
  email: "memberservices@tasetemco.example",
  facebook: "https://www.facebook.com/tase.temco"
};

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
  users: "Users",
  setup: "System Setup"
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

function PasswordInput(props) {
  const [isVisible, setIsVisible] = useState(false);
  return <InputGroup>
    <Input {...props} type={isVisible ? "text" : "password"} pr="4.75rem" />
    <InputRightElement width="4.5rem">
      <Button type="button" size="sm" variant="ghost" height="1.75rem"
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible} onClick={() => setIsVisible((current) => !current)}>
        {isVisible ? "Hide" : "Show"}
      </Button>
    </InputRightElement>
  </InputGroup>;
}

function CooperativeContact({ compact = false }) {
  return <Box mt={compact ? 4 : 0} pt={compact ? 4 : 0} borderTopWidth={compact ? "1px" : 0}
    borderColor="gray.200">
    <Text fontWeight="bold" color={compact ? "gray.700" : "green.800"}>
      {compact ? "Need help signing in?" : "Contact TASETEMCO"}
    </Text>
    {!compact ? <Text mt={1} color="gray.600">Contact the cooperative office for account assistance.</Text> : null}
    <Flex mt={2} gap={compact ? 2 : 4} wrap="wrap" fontSize="sm">
      <Text as="a" href={`tel:${cooperativeContact.phoneHref}`} color="green.700" textDecoration="underline"
        display="inline-flex" alignItems="center" gap={1.5}>
        <Box as="span" aria-hidden="true" display="inline-flex" alignItems="center" justifyContent="center"
          boxSize="20px" borderRadius="full" bg="green.100" color="green.800" fontSize="xs">☎</Box>
        {cooperativeContact.phoneDisplay}
      </Text>
      <Text as="a" href={`mailto:${cooperativeContact.email}`} color="green.700" textDecoration="underline"
        display="inline-flex" alignItems="center" gap={1.5}>
        <Box as="span" aria-hidden="true" display="inline-flex" alignItems="center" justifyContent="center"
          boxSize="20px" borderRadius="full" bg="green.100" color="green.800" fontSize="xs">✉</Box>
        {cooperativeContact.email}
      </Text>
      <Text as="a" href={cooperativeContact.facebook} target="_blank" rel="noopener noreferrer"
        color="blue.600" textDecoration="underline" display="inline-flex" alignItems="center" gap={1.5}>
        <Box as="span" aria-hidden="true" display="inline-flex" alignItems="center" justifyContent="center"
          boxSize="20px" borderRadius="full" bg="blue.600" color="white" fontSize="xs" fontWeight="bold">f</Box>
        Official Facebook page
      </Text>
      <Text color="gray.700" display="inline-flex" alignItems="center" gap={1.5}>
        <Box as="span" aria-hidden="true" display="inline-flex" alignItems="center" justifyContent="center"
          boxSize="20px" borderRadius="full" bg="orange.100" color="orange.800" fontSize="xs">◷</Box>
        Office hours: 8:00 AM–5:00 PM PST (Philippine Standard Time)
      </Text>
    </Flex>
    <Text mt={2} fontSize="xs" color="orange.600">Phone and email are temporary placeholders pending office confirmation.</Text>
  </Box>;
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
  const responseText = await response.text();
  let data = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        response.ok
          ? `Server returned an unreadable response for ${path}.`
          : `Request failed (${response.status}) for ${path}: ${responseText.slice(0, 160)}`
      );
    }
  }

  if (!response.ok) {
    const requestError = new Error(data.error || `Request failed (${response.status}) for ${path}`);
    requestError.code = data.code;
    requestError.details = data.details;
    throw requestError;
  }

  return data;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

const MONEY_SCALE = 100;
const MAX_MONEY = 9999999999999.99;

function moneyCents(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.round(amount * MONEY_SCALE) : Number.NaN;
}

function moneyValue(value) {
  const cents = moneyCents(value);
  return Number.isFinite(cents) ? cents / MONEY_SCALE : Number.NaN;
}

function addMoney(...values) {
  return values.reduce((total, value) => total + moneyCents(value), 0) / MONEY_SCALE;
}

function previewLoanCollectionAllocation(amountReceived, installments = []) {
  const amount = Math.max(0, moneyValue(amountReceived));
  const collectibleInstallments = installments.filter(
    (installment) => installment.status !== "Paid" && installment.totalRemaining > 0
  );
  const dueNow = moneyValue(collectibleInstallments[0]?.totalRemaining ?? 0);
  const outstandingBalance = moneyValue(
    collectibleInstallments.reduce((total, installment) => addMoney(total, installment.totalRemaining), 0)
  );
  let remaining = amount;
  const allocations = [];
  for (const installment of collectibleInstallments) {
    if (remaining <= 0) break;
    const interestApplied = Math.min(
      remaining,
      moneyValue(installment.interestRemaining ?? installment.interestDue ?? 0)
    );
    remaining = moneyValue(remaining - interestApplied);
    const principalApplied = Math.min(
      remaining,
      moneyValue(installment.principalRemaining ?? installment.principalDue ?? 0)
    );
    remaining = moneyValue(remaining - principalApplied);
    const amountApplied = addMoney(interestApplied, principalApplied);
    if (amountApplied > 0) {
      allocations.push({
        installmentNo: installment.installmentNo,
        interestApplied,
        principalApplied,
        amountApplied,
        result: amountApplied + 0.005 >= installment.totalRemaining ? "Paid" : "Partial"
      });
    }
  }
  const interestApplied = moneyValue(
    allocations.reduce((total, item) => addMoney(total, item.interestApplied), 0)
  );
  const principalApplied = moneyValue(
    allocations.reduce((total, item) => addMoney(total, item.principalApplied), 0)
  );
  const remainingAfterReceipt = Math.max(0, moneyValue(outstandingBalance - amount));
  const paymentType =
    amount > dueNow
      ? "Advance Payment"
      : amount < dueNow
        ? "Partial Payment"
        : "Full Payment";

  return {
    amount,
    interestApplied: moneyValue(interestApplied),
    principalApplied: moneyValue(principalApplied),
    remainingAfterReceipt,
    paymentType,
    paymentTypeColor: {
      "Partial Payment": "orange",
      "Full Payment": "green",
      "Advance Payment": "blue"
    }[paymentType],
    dueNow,
    allocations
  };
}

function percentOfMoney(amount, rateBps) {
  return Math.round((moneyCents(amount) * Number(rateBps || 0)) / 10000) / MONEY_SCALE;
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

function MemberCombobox({ members, value, onChange, placeholder = "Search member name or number", maxResults = 15 }) {
  const selectedMember = members.find((member) => member.id === value);
  const selectedLabel = selectedMember ? `${selectedMember.name} (${selectedMember.id})` : "";
  const [query, setQuery] = useState(selectedLabel);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState(null);
  const inputRef = useRef(null);
  const tabSelectionRef = useRef(false);
  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (selectedMember && query === selectedLabel) {
      return [selectedMember, ...members.filter((member) => member.id !== selectedMember.id)].slice(0, maxResults);
    }
    if (!normalized) return members.slice(0, maxResults);
    return members.filter((member) => [member.name, member.id, member.group, member.contactNumber]
      .join(" ").toLowerCase().includes(normalized)).slice(0, maxResults);
  }, [members, query, selectedLabel, selectedMember, maxResults]);

  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  function selectMember(member) {
    onChange(member.id);
    setQuery(`${member.name} (${member.id})`);
    setIsOpen(false);
    setActiveIndex(0);
  }

  function openMenu() {
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) setMenuPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setIsOpen(true);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault(); openMenu(); setActiveIndex((current) => Math.min(current + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault(); setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && isOpen && matches[activeIndex]) {
      event.preventDefault(); selectMember(matches[activeIndex]);
    } else if (event.key === "Tab" && isOpen && matches[activeIndex]) {
      tabSelectionRef.current = true;
      selectMember(matches[activeIndex]);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return <Box position="relative" minW={0}>
    <Input ref={inputRef} size="sm" value={query} placeholder={placeholder} autoComplete="off"
      role="combobox" aria-expanded={isOpen} aria-autocomplete="list"
      onFocus={() => { openMenu(); setActiveIndex(0); }}
      onBlur={() => {
        setIsOpen(false);
        if (tabSelectionRef.current) { tabSelectionRef.current = false; return; }
        if (!value) setQuery(""); else setQuery(selectedLabel);
      }}
      onKeyDown={handleKeyDown}
      onChange={(event) => { setQuery(event.target.value); onChange(""); openMenu(); setActiveIndex(0); }} />
    {isOpen && menuPosition ? <Portal><Box position="fixed" top={`${menuPosition.top}px`} left={`${menuPosition.left}px`}
      width={`${menuPosition.width}px`} zIndex={1500} bg="white"
      borderWidth="1px" borderRadius="md" boxShadow="lg" maxH="260px" overflowY="auto" role="listbox">
      {matches.map((member, index) => <Box key={member.id} role="option" aria-selected={index === activeIndex}
        px={3} py={2} cursor="pointer" bg={index === activeIndex ? "green.50" : "white"}
        borderBottomWidth={index < matches.length - 1 ? "1px" : 0}
        onMouseDown={(event) => { event.preventDefault(); selectMember(member); }}
        onMouseEnter={() => setActiveIndex(index)}>
        <Text fontWeight="semibold" fontSize="sm">{member.name}</Text>
        <Text color="gray.500" fontSize="xs">{member.id} · {member.group}</Text>
      </Box>)}
      {matches.length === 0 ? <Text px={3} py={3} color="gray.500" fontSize="sm">No active members match.</Text> : null}
    </Box></Portal> : null}
  </Box>;
}

function OptionCombobox({
  options,
  value,
  onChange,
  placeholder = "Search options",
  noMatchesText = "No options match.",
  isRequired = true
}) {
  const [query, setQuery] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState(null);
  const inputRef = useRef(null);
  const tabSelectionRef = useRef(false);
  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized || query === value) return options;
    return options.filter((option) => option.toLowerCase().includes(normalized));
  }, [options, query, value]);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  function selectOption(option) {
    onChange(option);
    setQuery(option);
    setIsOpen(false);
    setActiveIndex(0);
  }

  function openMenu() {
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) setMenuPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setIsOpen(true);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu();
      setActiveIndex((current) => Math.min(current + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && isOpen && matches[activeIndex]) {
      event.preventDefault();
      selectOption(matches[activeIndex]);
    } else if (event.key === "Tab" && isOpen && matches[activeIndex]) {
      tabSelectionRef.current = true;
      selectOption(matches[activeIndex]);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return <Box position="relative" minW={0}>
    <Input
      ref={inputRef}
      value={query}
      placeholder={placeholder}
      autoComplete="off"
      required={isRequired}
      role="combobox"
      aria-expanded={isOpen}
      aria-autocomplete="list"
      onFocus={() => { openMenu(); setActiveIndex(0); }}
      onBlur={() => {
        setIsOpen(false);
        if (tabSelectionRef.current) { tabSelectionRef.current = false; return; }
        setQuery(value || "");
      }}
      onKeyDown={handleKeyDown}
      onChange={(event) => {
        setQuery(event.target.value);
        onChange("");
        openMenu();
        setActiveIndex(0);
      }}
    />
    {isOpen && menuPosition ? <Portal><Box
      position="fixed"
      top={`${menuPosition.top}px`}
      left={`${menuPosition.left}px`}
      width={`${menuPosition.width}px`}
      zIndex={1500}
      bg="white"
      borderWidth="1px"
      borderRadius="md"
      boxShadow="lg"
      maxH="260px"
      overflowY="auto"
      role="listbox"
    >
      {matches.map((option, index) => <Box
        key={option}
        role="option"
        aria-selected={index === activeIndex}
        px={3}
        py={2}
        cursor="pointer"
        bg={index === activeIndex ? "green.50" : "white"}
        borderBottomWidth={index < matches.length - 1 ? "1px" : 0}
        onMouseDown={(event) => { event.preventDefault(); selectOption(option); }}
        onMouseEnter={() => setActiveIndex(index)}
      >
        <Text fontSize="sm">{option}</Text>
      </Box>)}
      {matches.length === 0 ? <Text px={3} py={3} color="gray.500" fontSize="sm">{noMatchesText}</Text> : null}
    </Box></Portal> : null}
  </Box>;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
M-2026-004,Julieta M. Navarro,COMMUNITY A MEMBERS,09171234567,"Poblacion, Talisay",1985-02-14,Married,Sari-sari store owner,2026-06-15,Active
M-2026-005,Roberto P. Dizon,REGULAR MEMBERS CAPTURE,09181234567,"San Isidro, Talisay",1979-09-30,Married,Tricycle operator,2026-06-15,Active`;

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
    const normalizedGroup = normalizeMemberClassification(row.group);

    if (!row.name) {
      issues.push("Missing full name");
    }

    if (!normalizedGroup) {
      issues.push("Unknown cluster/group");
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
      group: normalizedGroup || row.group,
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

  if (Math.abs(amount * MONEY_SCALE - Math.round(amount * MONEY_SCALE)) >= 0.000001) {
    return { value: 0, error: "Amount must have no more than two decimal places" };
  }

  if (amount > MAX_MONEY) {
    return { value: 0, error: "Amount exceeds the supported limit" };
  }

  return { value: moneyValue(amount) };
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
      issues.push(`Share capital: ${shareCapital.error}`);
    }

    if (savings.error) {
      issues.push(`Savings: ${savings.error}`);
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
      const cashIn = moneyValue(row.cashReceived);
      const cashOut = moneyValue(row.cashOut);

      return {
        cashIn: addMoney(summary.cashIn, cashIn),
        cashOut: addMoney(summary.cashOut, cashOut),
        transactionCount: summary.transactionCount + 1,
        initialPaymentCount: summary.initialPaymentCount + (row.batchType === "Initial Payment" ? 1 : 0),
        shareCapitalContributionCount:
          summary.shareCapitalContributionCount + (row.batchType === "Share Capital Contribution" ? 1 : 0),
        savingsDepositCount: summary.savingsDepositCount + (row.batchType === "Savings Deposit" ? 1 : 0),
        savingsWithdrawalCount: summary.savingsWithdrawalCount + (row.batchType === "Savings Withdrawal" ? 1 : 0),
        securedSavingsWithdrawalCount:
          summary.securedSavingsWithdrawalCount + (row.batchType === "Secured Savings Withdrawal" ? 1 : 0),
        loanReleaseCount: summary.loanReleaseCount + (row.batchType === "Loan Release" ? 1 : 0),
        loanCollectionCount: summary.loanCollectionCount + (row.batchType === "Loan Collection" ? 1 : 0),
        monthlyContributionCount:
          summary.monthlyContributionCount + (row.batchType === "Monthly Member Contributions" ? 1 : 0),
        dailyRemittanceCount:
          summary.dailyRemittanceCount + (row.batchType === "Daily Remittance" ? 1 : 0),
        dailyDisbursementCount:
          summary.dailyDisbursementCount + (row.batchType === "Daily Disbursement" ? 1 : 0)
      };
    },
    {
      cashIn: 0,
      cashOut: 0,
      transactionCount: 0,
      initialPaymentCount: 0,
      shareCapitalContributionCount: 0,
      savingsDepositCount: 0,
      savingsWithdrawalCount: 0,
      securedSavingsWithdrawalCount: 0,
      loanReleaseCount: 0,
      loanCollectionCount: 0,
      monthlyContributionCount: 0,
      dailyRemittanceCount: 0,
      dailyDisbursementCount: 0
    }
  );
}

function Login({ onLogin, onMemberPortal }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    <Flex
      minH="100vh"
      bg="#f5f3f4"
      color="#142319"
      align="center"
      overflow="hidden"
      position="relative"
      py={{ base: 8, lg: 12 }}
    >
      <Box
        position="absolute"
        insetX="0"
        top="0"
        bottom="0"
        bg={{
          base: "#014709",
          lg: "linear-gradient(135deg, #014709 0%, #0f6b25 58%, #f5f3f4 58%)"
        }}
        opacity="0.98"
      />
      <Box
        position="absolute"
        right={{ base: "-26%", md: "-12%", xl: "1%" }}
        bottom={{ base: "2%", lg: "6%" }}
        w={{ base: "82vw", md: "56vw", xl: "42vw" }}
        maxW="720px"
        opacity={{ base: 0.18, lg: 1 }}
        pointerEvents="none"
      >
        <Image src="/brand/tasetemco-building.png" alt="TASETEMCO cooperative building" w="100%" />
      </Box>

      <Container maxW="7xl" position="relative" zIndex="1">
        <Grid
          templateColumns={{ base: "1fr", lg: "minmax(0, 1fr) 430px minmax(260px, 0.72fr)" }}
          gap={{ base: 8, lg: 10 }}
          alignItems="center"
        >
          <GridItem>
            <VStack align="flex-start" spacing={{ base: 5, lg: 7 }}>
              <HStack spacing={4} align="center">
                <Image
                  src="/brand/tasetemco-seal.png"
                  alt="TASETEMCO seal"
                  boxSize={{ base: "76px", md: "92px" }}
                  objectFit="contain"
                  flexShrink={0}
                />
                <Box>
                  <Badge bg="#FFBE00" color="#014709" mb={3} px={3} py={1} borderRadius="md">
                    Cooperative Operations and Accounting
                  </Badge>
                  <Heading color="white" size={{ base: "xl", md: "2xl" }} lineHeight="1">
                    TASETEMCO
                  </Heading>
                </Box>
              </HStack>

              <Box maxW="620px">
                <Heading
                  as="h1"
                  color="white"
                  fontSize={{ base: "3xl", md: "5xl" }}
                  lineHeight="1.05"
                  fontWeight="800"
                >
                  Tabon Secondary Teachers, Employees and Community Multi-Purpose Cooperative
                </Heading>
                <Text mt={5} fontSize={{ base: "md", md: "lg" }} color="green.50">
                  Secure staff access to member services, teller operations, loans,
                  accounting records, and management reports.
                </Text>
              </Box>

              <Box
                bg="rgba(255, 255, 255, 0.9)"
                border="1px solid"
                borderColor="green.100"
                borderRadius="md"
                p={{ base: 4, md: 5 }}
                maxW="620px"
                boxShadow="0 14px 35px rgba(1, 71, 9, 0.08)"
              >
                <HStack align="center" spacing={4}>
                  <Image
                    src="/brand/pftec.png"
                    alt="Cooperative registration mark"
                    boxSize={{ base: "54px", md: "64px" }}
                    objectFit="contain"
                    flexShrink={0}
                  />
                  <Box>
                    <Text fontWeight="700" color="#014709">
                      Registered under the Laws of the Philippines
                    </Text>
                    <Text mt={1} fontSize="sm" color="gray.600">
                      RN: CARA-0146, 02.16.97 | RN: RA9520-13005802, 01.07.10
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      CIN: 0104130163 | TIN: 004-393-599
                    </Text>
                  </Box>
                </HStack>
              </Box>
            </VStack>
          </GridItem>

          <GridItem>
            <Box
              as="form"
              onSubmit={submit}
              bg="white"
              color="gray.800"
              p={{ base: 6, md: 8 }}
              borderRadius="md"
              boxShadow="0 28px 70px rgba(1, 35, 7, 0.22)"
              border="1px solid"
              borderColor="whiteAlpha.800"
            >
              <Text color="#014709" fontWeight="800" fontSize="sm" textTransform="uppercase">
                Staff access
              </Text>
              <Heading size="lg" mt={2} mb={6}>
                Login
              </Heading>
              <VStack spacing={5}>
                <FormControl>
                  <FormLabel color="gray.700" fontWeight="700">
                    User
                  </FormLabel>
                  <Input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    variant="flushed"
                    borderColor="gray.500"
                    focusBorderColor="#014709"
                    placeholder="Enter username"
                    autoComplete="username"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel color="gray.700" fontWeight="700">
                    Password
                  </FormLabel>
                  <PasswordInput
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    variant="flushed"
                    borderColor="gray.500"
                    focusBorderColor="#014709"
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </FormControl>
                {error ? (
                  <Text color="red.500" fontSize="sm" alignSelf="stretch">
                    {error}
                  </Text>
                ) : null}
                <Button
                  type="submit"
                  width="full"
                  h="48px"
                  bg="#014709"
                  color="#FFBE00"
                  _hover={{ bg: "#0f5f18" }}
                  _active={{ bg: "#013b08" }}
                >
                  Login
                </Button>
              </VStack>
              <Text mt={6} pt={5} borderTop="1px solid" borderColor="gray.200" fontSize="sm" color="gray.500">
                Use the individual credentials issued by the System Administrator.
              </Text>
              <Button mt={4} width="full" variant="outline" colorScheme="green" onClick={onMemberPortal}>
                Member Portal Login
              </Button>
              <CooperativeContact compact />
            </Box>
          </GridItem>

          <GridItem display={{ base: "none", lg: "block" }} />
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

function TellerBatchCashPosition({
  activeBatch,
  openingFunding = 0,
  rows = [],
  title = "Teller Batch Cash Position",
  description = "Unposted transactions waiting for Bookkeeper posting."
}) {
  const summary = buildTellerBatchSummary(rows);

  return (
    <Box>
      <Flex justify="space-between" gap={4} wrap="wrap" mb={4}>
        <Box>
          <Heading size="sm">{title}</Heading>
          <Text color="gray.600" mt={1}>
            {description}
          </Text>
        </Box>
        <HStack alignSelf="flex-start" flexWrap="wrap">
          <Badge colorScheme={activeBatch?.status === "Open" ? "blue" : activeBatch ? "purple" : "gray"}>
            {activeBatch ? `${activeBatch.id} - ${activeBatch.status}` : "No batch"}
          </Badge>
          <Badge colorScheme={summary.transactionCount ? "blue" : "gray"}>
            {summary.transactionCount} unposted
          </Badge>
        </HStack>
      </Flex>
      <Grid templateColumns={{ base: "1fr", md: "repeat(5, 1fr)" }} gap={4} mb={4}>
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Text color="gray.500" fontSize="sm">Opening Funding</Text>
          <Text fontWeight="bold">{formatMoney(openingFunding)}</Text>
        </Box>
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Text color="gray.500" fontSize="sm">Cash In</Text>
          <Text fontWeight="bold">{formatMoney(summary.cashIn)}</Text>
        </Box>
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Text color="gray.500" fontSize="sm">Cash Out</Text>
          <Text fontWeight="bold">{formatMoney(summary.cashOut)}</Text>
        </Box>
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Text color="gray.500" fontSize="sm">Expected Ending Cash</Text>
          <Text fontWeight="bold">
            {formatMoney(addMoney(openingFunding, summary.cashIn, -summary.cashOut))}
          </Text>
        </Box>
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Text color="gray.500" fontSize="sm">Transaction Mix</Text>
          <VStack align="stretch" spacing={0} mt={1}>
            <Text fontWeight="bold">Initial payments: {summary.initialPaymentCount}</Text>
            <Text fontWeight="bold">Share capital: {summary.shareCapitalContributionCount}</Text>
            <Text fontWeight="bold">Deposits: {summary.savingsDepositCount}</Text>
            <Text fontWeight="bold">Withdrawals: {summary.savingsWithdrawalCount}</Text>
            <Text fontWeight="bold">Secured withdrawals: {summary.securedSavingsWithdrawalCount}</Text>
            <Text fontWeight="bold">Loan releases: {summary.loanReleaseCount}</Text>
            <Text fontWeight="bold">Loan collections: {summary.loanCollectionCount}</Text>
            <Text fontWeight="bold">Monthly contributions: {summary.monthlyContributionCount}</Text>
            <Text fontWeight="bold">Daily remittances: {summary.dailyRemittanceCount}</Text>
            <Text fontWeight="bold">Daily disbursements: {summary.dailyDisbursementCount}</Text>
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
            {rows.slice(0, 5).map((row) => (
              <Tr key={`${row.batchType}-${row.id}`}>
                <Td>{row.id}</Td>
                <Td>{row.batchType}</Td>
                <Td>{row.memberName}</Td>
                <Td isNumeric>{row.cashReceived ? formatMoney(row.cashReceived) : ""}</Td>
                <Td isNumeric>{row.cashOut ? formatMoney(row.cashOut) : ""}</Td>
              </Tr>
            ))}
            {rows.length === 0 ? (
              <Tr>
                <Td colSpan={5} color="gray.500">
                  No unposted teller transactions.
                </Td>
              </Tr>
            ) : null}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function Dashboard({ user }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let isActive = true;

    const loadDashboard = () => {
      api("/api/dashboard").then((nextData) => {
        if (isActive) {
          setData(nextData);
        }
      });
    };

    loadDashboard();
    const timerId = window.setInterval(loadDashboard, membersPollingMs);

    return () => {
      isActive = false;
      window.clearInterval(timerId);
    };
  }, []);

  if (!data) {
    return <Text>Loading dashboard...</Text>;
  }

  const loanAlerts = data.loanAlerts;
  const hasLoanAlertDetails = loanAlerts?.canViewDetails && (loanAlerts.overdueCount > 0 || loanAlerts.dueSoonCount > 0);

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
      {user.role === "System Administrator" && data.outstandingBatch ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <TellerBatchCashPosition
            activeBatch={data.outstandingBatch.activeBatch}
            openingFunding={data.outstandingBatch.openingFunding}
            rows={data.outstandingBatch.rows}
            title="Outstanding Teller Batch"
            description="Current teller activity and the cash expected for day closing."
          />
        </Box>
      ) : null}
      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Heading size="md" mb={4}>
          Risk Watch
        </Heading>
        <VStack align="stretch" spacing={3}>
          {data.watchItems.map((item) => (
            <Flex key={item.title} justify="space-between" borderBottomWidth="1px" py={2}>
              <Text fontWeight="bold">{item.title}</Text>
              <Text color="gray.500">{item.value}</Text>
            </Flex>
          ))}
          {loanAlerts?.canViewDetails ? (
            <Accordion allowToggle borderWidth="1px" borderRadius="md" overflow="hidden">
              <AccordionItem border="0">
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <Text fontWeight="bold">Loan portfolio watch</Text>
                    <Text fontSize="sm" color="gray.600">
                      Overdue installments: {loanAlerts.overdueCount} / Due within 7 days: {loanAlerts.dueSoonCount}
                    </Text>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  {hasLoanAlertDetails ? (
                    <TableContainer>
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>Status</Th>
                            <Th>Member</Th>
                            <Th>Loan</Th>
                            <Th>Due Date</Th>
                            <Th isNumeric>Amount Due</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {loanAlerts.items.map((item) => (
                            <Tr key={`${item.loanNo}-${item.installmentNo}`}>
                              <Td>
                                <Badge colorScheme={item.severity === "overdue" ? "red" : "orange"}>
                                  {item.statusLabel}
                                </Badge>
                              </Td>
                              <Td>{item.memberName}</Td>
                              <Td>{item.loanNo}</Td>
                              <Td>{formatDate(item.dueDate)}</Td>
                              <Td isNumeric>{formatMoney(item.totalDue)}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Text color="gray.600">No overdue or near-due loan installments.</Text>
                  )}
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          ) : null}
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
  const readyRows = previewRows.filter((row) => row.issues.length === 0);
  const shareCapitalTotal = addMoney(...readyRows.map((row) => row.shareCapitalAmount));
  const savingsTotal = addMoney(...readyRows.map((row) => row.savingsAmount));
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

function CostCenterAdministration({ user }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ code: "", name: "", type: "", summoColumn: "", status: "Active" });
  const [drafts, setDrafts] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canManage = user.permissions.includes("cost-centers:manage");
  const load = useCallback(async () => {
    try {
      const data = await api("/api/cost-centers");
      setRows(data); setDrafts(Object.fromEntries(data.map((row) => [row.code, { ...row }]))); setError("");
    } catch (requestError) { setError(requestError.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function create(event) {
    event.preventDefault(); setError(""); setMessage("");
    try {
      await api("/api/cost-centers", { method: "POST", body: JSON.stringify(form) });
      setForm({ code: "", name: "", type: "", summoColumn: "", status: "Active" });
      setMessage("Cost center created."); await load();
    } catch (requestError) { setError(requestError.message); }
  }
  async function save(code) {
    setError(""); setMessage("");
    try {
      await api(`/api/cost-centers/${code}`, { method: "PATCH", body: JSON.stringify(drafts[code]) });
      setMessage(`${code} updated.`); await load();
    } catch (requestError) { setError(requestError.message); }
  }
  if (!user.permissions.includes("cost-centers:view")) return null;
  return <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
    <Heading size="md">Cost Centers</Heading>
    <Text color="gray.600" mt={1} mb={4}>Operational payable sources and their future SUMMO column mapping.</Text>
    {message ? <Text color="green.700" mb={3}>{message}</Text> : null}
    {error ? <Text color="red.700" mb={3}>{error}</Text> : null}
    {canManage ? <Grid as="form" onSubmit={create} templateColumns={{ base: "1fr", md: "repeat(5, 1fr)" }} gap={3} mb={5}>
      <FormControl isRequired><FormLabel>Code</FormLabel><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></FormControl>
      <FormControl isRequired><FormLabel>Name</FormLabel><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormControl>
      <FormControl isRequired><FormLabel>Type</FormLabel><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></FormControl>
      <FormControl isRequired><FormLabel>SUMMO Column</FormLabel><Input value={form.summoColumn} onChange={(e) => setForm({ ...form, summoColumn: e.target.value })} /></FormControl>
      <Button alignSelf="end" type="submit" colorScheme="green">Add Cost Center</Button>
    </Grid> : null}
    <TableContainer><Table size="sm"><Thead><Tr><Th>Code</Th><Th>Name</Th><Th>Type</Th><Th>SUMMO Mapping</Th><Th>Status</Th>{canManage ? <Th /> : null}</Tr></Thead>
      <Tbody>{rows.map((row) => { const draft = drafts[row.code] || row; return <Tr key={row.code}><Td>{row.code}</Td>
        <Td>{canManage ? <Input size="sm" value={draft.name} onChange={(e) => setDrafts({ ...drafts, [row.code]: { ...draft, name: e.target.value } })} /> : row.name}</Td>
        <Td>{canManage ? <Input size="sm" value={draft.type} onChange={(e) => setDrafts({ ...drafts, [row.code]: { ...draft, type: e.target.value } })} /> : row.type}</Td>
        <Td>{canManage ? <Input size="sm" value={draft.summoColumn} onChange={(e) => setDrafts({ ...drafts, [row.code]: { ...draft, summoColumn: e.target.value } })} /> : row.summoColumn}</Td>
        <Td>{canManage ? <Select size="sm" value={draft.status} onChange={(e) => setDrafts({ ...drafts, [row.code]: { ...draft, status: e.target.value } })}><option>Active</option><option>Inactive</option></Select> : <Badge>{row.status}</Badge>}</Td>
        {canManage ? <Td><Button size="sm" onClick={() => save(row.code)}>Save</Button></Td> : null}</Tr>; })}</Tbody>
    </Table></TableContainer>
  </Box>;
}

function RemittanceSourceAdministration({ user }) {
  const blank = { code: "", name: "", reportingGroup: "", costCenterCode: "", incomeAccountCode: "4080",
    incomeAccountName: "Other Operating Income", displayOrder: 100, status: "Active" };
  const [rows, setRows] = useState([]); const [centers, setCenters] = useState([]); const [drafts, setDrafts] = useState({});
  const [form, setForm] = useState(blank); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const canManage = user.permissions.includes("remittance-sources:manage");
  const load = useCallback(async () => {
    try { const [sourceRows, centerRows] = await Promise.all([api("/api/remittance-sources"), api("/api/cost-centers")]);
      setRows(sourceRows); setCenters(centerRows); setDrafts(Object.fromEntries(sourceRows.map((row) => [row.code, { ...row }]))); setError("");
    } catch (requestError) { setError(requestError.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function create(event) { event.preventDefault(); setError(""); setMessage("");
    try { await api("/api/remittance-sources", { method: "POST", body: JSON.stringify(form) }); setForm(blank);
      setMessage("Remittance source created."); await load(); } catch (requestError) { setError(requestError.message); } }
  async function save(code) { try { await api(`/api/remittance-sources/${code}`, { method: "PATCH", body: JSON.stringify(drafts[code]) });
    setMessage(`${code} updated.`); await load(); } catch (requestError) { setError(requestError.message); } }
  return <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}><Heading size="md">Daily Remittance Sources</Heading>
    <Text color="gray.600" mt={1} mb={4}>Configure teller choices, reporting rollups, cost-center destinations, and direct income accounts.</Text>
    {message ? <Text color="green.700" mb={3}>{message}</Text> : null}{error ? <Text color="red.700" mb={3}>{error}</Text> : null}
    {canManage ? <Grid as="form" onSubmit={create} templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3} mb={5}>
      <FormControl isRequired><FormLabel>Code</FormLabel><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></FormControl>
      <FormControl isRequired><FormLabel>Name</FormLabel><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormControl>
      <FormControl isRequired><FormLabel>Reporting Group</FormLabel><Input value={form.reportingGroup} onChange={(e) => setForm({ ...form, reportingGroup: e.target.value })} /></FormControl>
      <FormControl><FormLabel>Cost Center</FormLabel><Select value={form.costCenterCode} onChange={(e) => setForm({ ...form, costCenterCode: e.target.value })}><option value="">Standalone</option>{centers.map((center) => <option key={center.code} value={center.code}>{center.name}</option>)}</Select></FormControl>
      <FormControl isRequired><FormLabel>Income Account Code</FormLabel><Input value={form.incomeAccountCode} onChange={(e) => setForm({ ...form, incomeAccountCode: e.target.value })} /></FormControl>
      <FormControl isRequired><FormLabel>Income Account Name</FormLabel><Input value={form.incomeAccountName} onChange={(e) => setForm({ ...form, incomeAccountName: e.target.value })} /></FormControl>
      <FormControl><FormLabel>Display Order</FormLabel><NumberInput min={0} value={form.displayOrder} onChange={(value) => setForm({ ...form, displayOrder: Number(value || 0) })}><NumberInputField /></NumberInput></FormControl>
      <Button alignSelf="end" type="submit" colorScheme="green">Add Source</Button>
    </Grid> : null}
    <TableContainer><Table size="sm"><Thead><Tr><Th>Source</Th><Th>Reporting Group</Th><Th>Cost Center</Th><Th>Income Account</Th><Th>Order</Th><Th>Status</Th><Th /></Tr></Thead>
      <Tbody>{rows.map((row) => { const draft = drafts[row.code] || row; return <Tr key={row.code}><Td>{row.code}<br />{canManage ? <Input size="sm" value={draft.name} onChange={(e) => setDrafts({ ...drafts, [row.code]: { ...draft, name: e.target.value } })} /> : row.name}</Td>
        <Td>{canManage ? <Input size="sm" value={draft.reportingGroup} onChange={(e) => setDrafts({ ...drafts, [row.code]: { ...draft, reportingGroup: e.target.value } })} /> : row.reportingGroup}</Td>
        <Td>{canManage ? <Select size="sm" value={draft.costCenterCode} onChange={(e) => setDrafts({ ...drafts, [row.code]: { ...draft, costCenterCode: e.target.value } })}><option value="">Standalone</option>{centers.map((center) => <option key={center.code} value={center.code}>{center.name}</option>)}</Select> : row.costCenterCode || "Standalone"}</Td>
        <Td>{canManage ? <HStack><Input size="sm" maxW="80px" value={draft.incomeAccountCode} onChange={(e) => setDrafts({ ...drafts, [row.code]: { ...draft, incomeAccountCode: e.target.value } })} /><Input size="sm" value={draft.incomeAccountName} onChange={(e) => setDrafts({ ...drafts, [row.code]: { ...draft, incomeAccountName: e.target.value } })} /></HStack> : `${row.incomeAccountCode} - ${row.incomeAccountName}`}</Td>
        <Td>{canManage ? <NumberInput size="sm" min={0} value={draft.displayOrder} onChange={(value) => setDrafts({ ...drafts, [row.code]: { ...draft, displayOrder: Number(value || 0) } })}><NumberInputField /></NumberInput> : row.displayOrder}</Td>
        <Td>{canManage ? <Select size="sm" value={draft.status} onChange={(e) => setDrafts({ ...drafts, [row.code]: { ...draft, status: e.target.value } })}><option>Active</option><option>Inactive</option></Select> : <Badge>{row.status}</Badge>}</Td>
        <Td>{canManage ? <Button size="sm" onClick={() => save(row.code)}>Save</Button> : null}</Td></Tr>; })}</Tbody>
    </Table></TableContainer>
  </Box>;
}

function DisbursementCategoryAdministration({ user }) {
  const blank = { code: "", name: "", reportingGroup: "", costCenterCode: "", expenseAccountCode: "5090",
    expenseAccountName: "Other Operating Expenses", displayOrder: 100, status: "Active" };
  const [rows, setRows] = useState([]); const [centers, setCenters] = useState([]); const [drafts, setDrafts] = useState({});
  const [form, setForm] = useState(blank); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const canManage = user.permissions.includes("disbursement-categories:manage");
  const load = useCallback(async () => {
    try {
      const [categoryRows, centerRows] = await Promise.all([api("/api/disbursement-categories"), api("/api/cost-centers")]);
      setRows(categoryRows); setCenters(centerRows);
      setDrafts(Object.fromEntries(categoryRows.map((row) => [row.code, { ...row }])));
      setError("");
    } catch (requestError) { setError(requestError.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function create(event) {
    event.preventDefault(); setError(""); setMessage("");
    try {
      await api("/api/disbursement-categories", { method: "POST", body: JSON.stringify(form) });
      setForm(blank); setMessage("Disbursement category created."); await load();
    } catch (requestError) { setError(requestError.message); }
  }
  async function save(code) {
    try {
      await api(`/api/disbursement-categories/${code}`, {
        method: "PATCH", body: JSON.stringify(drafts[code])
      });
      setMessage(`${code} updated.`); await load();
    } catch (requestError) { setError(requestError.message); }
  }
  return <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
    <Heading size="md">Daily Disbursement Categories</Heading>
    <Text color="gray.600" mt={1} mb={4}>Configure cash-out choices, reporting rollups, optional cost centers, and expense accounts.</Text>
    {message ? <Text color="green.700" mb={3}>{message}</Text> : null}
    {error ? <Text color="red.700" mb={3}>{error}</Text> : null}
    {canManage ? <Grid as="form" onSubmit={create} templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3} mb={5}>
      <FormControl isRequired><FormLabel>Code</FormLabel><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></FormControl>
      <FormControl isRequired><FormLabel>Name</FormLabel><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormControl>
      <FormControl isRequired><FormLabel>Reporting Group</FormLabel><Input value={form.reportingGroup} onChange={(e) => setForm({ ...form, reportingGroup: e.target.value })} /></FormControl>
      <FormControl><FormLabel>Cost Center</FormLabel><Select value={form.costCenterCode} onChange={(e) => setForm({ ...form, costCenterCode: e.target.value })}><option value="">Coop Operations</option>{centers.map((center) => <option key={center.code} value={center.code}>{center.name}</option>)}</Select></FormControl>
      <FormControl isRequired><FormLabel>Expense Account Code</FormLabel><Input value={form.expenseAccountCode} onChange={(e) => setForm({ ...form, expenseAccountCode: e.target.value })} /></FormControl>
      <FormControl isRequired><FormLabel>Expense Account Name</FormLabel><Input value={form.expenseAccountName} onChange={(e) => setForm({ ...form, expenseAccountName: e.target.value })} /></FormControl>
      <FormControl><FormLabel>Display Order</FormLabel><NumberInput min={0} value={form.displayOrder} onChange={(value) => setForm({ ...form, displayOrder: Number(value || 0) })}><NumberInputField /></NumberInput></FormControl>
      <Button alignSelf="end" type="submit" colorScheme="green">Add Category</Button>
    </Grid> : null}
    <TableContainer><Table size="sm"><Thead><Tr><Th>Category</Th><Th>Reporting Group</Th><Th>Cost Center</Th><Th>Expense Account</Th><Th>Order</Th><Th>Status</Th><Th /></Tr></Thead>
      <Tbody>{rows.map((row) => { const draft = drafts[row.code] || row; return <Tr key={row.code}>
        <Td>{row.code}<br />{canManage ? <Input size="sm" value={draft.name} onChange={(e) => setDrafts({ ...drafts, [row.code]: { ...draft, name: e.target.value } })} /> : row.name}</Td>
        <Td>{canManage ? <Input size="sm" value={draft.reportingGroup} onChange={(e) => setDrafts({ ...drafts, [row.code]: { ...draft, reportingGroup: e.target.value } })} /> : row.reportingGroup}</Td>
        <Td>{canManage ? <Select size="sm" value={draft.costCenterCode} onChange={(e) => setDrafts({ ...drafts, [row.code]: { ...draft, costCenterCode: e.target.value } })}><option value="">Coop Operations</option>{centers.map((center) => <option key={center.code} value={center.code}>{center.name}</option>)}</Select> : row.costCenterCode || "Coop Operations"}</Td>
        <Td>{canManage ? <HStack><Input size="sm" maxW="80px" value={draft.expenseAccountCode} onChange={(e) => setDrafts({ ...drafts, [row.code]: { ...draft, expenseAccountCode: e.target.value } })} /><Input size="sm" value={draft.expenseAccountName} onChange={(e) => setDrafts({ ...drafts, [row.code]: { ...draft, expenseAccountName: e.target.value } })} /></HStack> : `${row.expenseAccountCode} - ${row.expenseAccountName}`}</Td>
        <Td>{canManage ? <NumberInput size="sm" min={0} value={draft.displayOrder} onChange={(value) => setDrafts({ ...drafts, [row.code]: { ...draft, displayOrder: Number(value || 0) } })}><NumberInputField /></NumberInput> : row.displayOrder}</Td>
        <Td>{canManage ? <Select size="sm" value={draft.status} onChange={(e) => setDrafts({ ...drafts, [row.code]: { ...draft, status: e.target.value } })}><option>Active</option><option>Inactive</option></Select> : <Badge>{row.status}</Badge>}</Td>
        <Td>{canManage ? <Button size="sm" onClick={() => save(row.code)}>Save</Button> : null}</Td>
      </Tr>; })}</Tbody>
    </Table></TableContainer>
  </Box>;
}

function MonthlyContributionCapture({ members, user }) {
  const today = new Date().toISOString().slice(0, 10);
  const emptyEntry = () => ({ id: `new-${Date.now()}-${Math.random()}`, memberNo: "", tfeaAmount: 0,
    cbuAmount: 0, securedSavingsAmount: 0, remarks: "" });
  const [batches, setBatches] = useState([]);
  const [batchNo, setBatchNo] = useState("");
  const [batchStatus, setBatchStatus] = useState("Draft");
  const [batchCreatedBy, setBatchCreatedBy] = useState(user.username);
  const [contributionPeriod, setContributionPeriod] = useState(today.slice(0, 7));
  const [transactionDate, setTransactionDate] = useState(today);
  const [sourceType, setSourceType] = useState("Cash Payment");
  const [sourceReference, setSourceReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [entries, setEntries] = useState([emptyEntry()]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const activeMembers = members.filter((member) => member.status === "Active");
  const canEditDraft = batchStatus === "Draft" && batchCreatedBy === user.username;
  const totals = entries.reduce((summary, entry) => ({
    tfea: addMoney(summary.tfea, entry.tfeaAmount), cbu: addMoney(summary.cbu, entry.cbuAmount),
    secured: addMoney(summary.secured, entry.securedSavingsAmount)
  }), { tfea: 0, cbu: 0, secured: 0 });
  const load = useCallback(async () => {
    try { setBatches(await api("/api/monthly-contribution-batches")); setError(""); }
    catch (requestError) { setError(requestError.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  function updateEntry(index, field, value) {
    setEntries((current) => current.map((entry, rowIndex) => rowIndex === index ? { ...entry, [field]: value } : entry));
  }
  function reset() {
    setBatchNo(""); setBatchStatus("Draft"); setBatchCreatedBy(user.username); setContributionPeriod(today.slice(0, 7));
    setTransactionDate(today); setSourceType("Cash Payment"); setSourceReference(""); setRemarks("");
    setEntries([emptyEntry()]); setMessage(""); setError("");
  }
  async function openBatch(selectedBatchNo) {
    try {
      const data = await api(`/api/monthly-contribution-batches/${selectedBatchNo}`);
      setBatchNo(data.batch.batchNo); setBatchStatus(data.batch.status); setBatchCreatedBy(data.batch.createdBy);
      setContributionPeriod(data.batch.contributionPeriod); setTransactionDate(data.batch.transactionDate);
      setSourceType(data.batch.sourceType); setSourceReference(data.batch.sourceReference); setRemarks(data.batch.remarks);
      setEntries(data.entries); setMessage(""); setError("");
    } catch (requestError) { setError(requestError.message); }
  }
  async function saveDraft(event) {
    event.preventDefault(); setMessage(""); setError("");
    try {
      const data = await api(batchNo ? `/api/monthly-contribution-batches/${batchNo}` : "/api/monthly-contribution-batches", {
        method: batchNo ? "PUT" : "POST",
        body: JSON.stringify({ contributionPeriod, transactionDate, sourceType, sourceReference, remarks, entries })
      });
      setBatchNo(data.batch.batchNo); setBatchStatus(data.batch.status); setBatchCreatedBy(data.batch.createdBy);
      setEntries(data.entries); setMessage(`${data.batch.batchNo} saved as Draft.`); await load();
    } catch (requestError) { setError(requestError.message); }
  }
  async function finalizeBatch() {
    if (!batchNo || !window.confirm(`Add ${batchNo} to the Open teller batch as a ${sourceType.toLowerCase()} collection?`)) return;
    setMessage(""); setError("");
    try {
      const data = await api(`/api/monthly-contribution-batches/${batchNo}/finalize`, { method: "POST" });
      setBatchStatus(data.batch.status);
      setMessage(`${batchNo} added to teller batch ${data.batch.tellerBatchNo}. CBU and SUMMO update after accounting posts the reviewed batch.`); await load();
    } catch (requestError) { setError(requestError.message); }
  }
  return <VStack align="stretch" spacing={5}>
    <Box as="form" onSubmit={saveDraft} bg="white" borderWidth="1px" borderRadius="lg" p={5}>
      <Flex justify="space-between" wrap="wrap" gap={3} mb={4}><Box><Heading size="md">Monthly Member Contributions</Heading>
        <Text color="gray.600">Record Cash Payment or Payroll Deduction funding for TFEA, CBU, and Secured Savings without creating member payables.</Text></Box>
        <HStack><Badge colorScheme={batchStatus === "Finalized" ? "green" : "blue"}>{batchNo || "New Draft"} · {batchStatus}</Badge>
          <Button type="button" variant="outline" onClick={reset}>New</Button>
          {canEditDraft ? <Button type="submit" colorScheme="green">Save Draft</Button> : null}
          {batchNo && batchStatus === "Draft" ? <Button type="button" colorScheme="orange" onClick={finalizeBatch}>Add to Teller Batch</Button> : null}</HStack></Flex>
      {message ? <Text color="green.700" mb={3}>{message}</Text> : null}{error ? <Text color="red.700" mb={3}>{error}</Text> : null}
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap={4} mb={4}>
        <FormControl isRequired><FormLabel>Contribution Month</FormLabel><Input isDisabled={!canEditDraft} type="month" value={contributionPeriod}
          onChange={(event) => { setContributionPeriod(event.target.value); setTransactionDate(`${event.target.value}-01`); }} /></FormControl>
        <FormControl isRequired><FormLabel>Transaction Date</FormLabel><Input isDisabled={!canEditDraft} type="date" max={today} value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} /></FormControl>
        <FormControl isRequired><FormLabel>Source</FormLabel><Select isDisabled={!canEditDraft} value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
          <option>Cash Payment</option><option>Payroll Deduction</option></Select></FormControl>
        <FormControl isRequired><FormLabel>Receipt / Payroll Reference</FormLabel><Input isDisabled={!canEditDraft} value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} placeholder="e.g. OR-2026-00125 or PAYROLL-2026-06" /></FormControl>
      </Grid>
      <FormControl mb={4}><FormLabel>Batch Remarks</FormLabel><Input isDisabled={!canEditDraft} value={remarks} onChange={(event) => setRemarks(event.target.value)} /></FormControl>
      <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3} mb={4}>
        <Box borderWidth="1px" borderRadius="md" p={3}><Text fontSize="sm" color="gray.500">Members</Text><Text fontWeight="bold">{entries.length}</Text></Box>
        <Box borderWidth="1px" borderRadius="md" p={3}><Text fontSize="sm" color="gray.500">TFEA</Text><Text fontWeight="bold">{formatMoney(totals.tfea)}</Text></Box>
        <Box borderWidth="1px" borderRadius="md" p={3}><Text fontSize="sm" color="gray.500">CBU</Text><Text fontWeight="bold">{formatMoney(totals.cbu)}</Text></Box>
        <Box borderWidth="1px" borderRadius="md" p={3}><Text fontSize="sm" color="gray.500">Secured Savings</Text><Text fontWeight="bold">{formatMoney(totals.secured)}</Text></Box>
      </Grid>
      <TableContainer><Table size="sm"><Thead><Tr><Th>Member</Th><Th isNumeric>TFEA</Th><Th isNumeric>CBU</Th><Th isNumeric>Secured Savings</Th><Th>Remarks</Th><Th /></Tr></Thead>
        <Tbody>{entries.map((entry, index) => <Tr key={entry.id || index}><Td minW="300px">{canEditDraft ? <MemberCombobox members={activeMembers} value={entry.memberNo}
          onChange={(memberNo) => updateEntry(index, "memberNo", memberNo)} /> : `${entry.memberName} (${entry.memberNo})`}</Td>
          {["tfeaAmount", "cbuAmount", "securedSavingsAmount"].map((field) => <Td key={field} minW="130px">{canEditDraft ? <NumberInput min={0} precision={2} value={entry[field]}
            onChange={(value) => updateEntry(index, field, Number(value || 0))}><NumberInputField textAlign="right" /></NumberInput> : formatMoney(entry[field])}</Td>)}
          <Td>{canEditDraft ? <Input size="sm" value={entry.remarks} onChange={(event) => updateEntry(index, "remarks", event.target.value)} /> : entry.remarks || "-"}</Td>
          <Td>{canEditDraft ? <Button size="sm" variant="outline" isDisabled={entries.length === 1} onClick={() => setEntries(entries.filter((_, rowIndex) => rowIndex !== index))}>Remove</Button>
            : <Badge colorScheme="green">Locked</Badge>}</Td></Tr>)}</Tbody></Table></TableContainer>
      {canEditDraft ? <Button mt={3} type="button" variant="outline" onClick={() => setEntries([...entries, emptyEntry()])}>Add Member</Button> : null}
    </Box>
    <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}><Heading size="sm" mb={3}>Contribution Batch History</Heading>
      <TableContainer><Table size="sm"><Thead><Tr><Th>Batch</Th><Th>Month</Th><Th>Source</Th><Th>Reference</Th><Th>Status</Th><Th isNumeric>Members</Th><Th isNumeric>TFEA</Th><Th isNumeric>CBU</Th><Th isNumeric>Secured Savings</Th><Th /></Tr></Thead>
        <Tbody>{batches.map((batch) => <Tr key={batch.batchNo}><Td>{batch.batchNo}</Td><Td>{batch.contributionPeriod}</Td><Td>{batch.sourceType}</Td><Td>{batch.sourceReference}</Td>
          <Td><Badge colorScheme={batch.status === "Finalized" ? "green" : "blue"}>{batch.status}</Badge></Td><Td isNumeric>{batch.entryCount}</Td>
          <Td isNumeric>{formatMoney(batch.tfeaTotal)}</Td><Td isNumeric>{formatMoney(batch.cbuTotal)}</Td><Td isNumeric>{formatMoney(batch.securedSavingsTotal)}</Td>
          <Td><Button size="sm" onClick={() => openBatch(batch.batchNo)}>{batch.status === "Draft" && batch.createdBy === user.username ? "Edit" : "View"}</Button></Td></Tr>)}</Tbody>
      </Table></TableContainer></Box>
  </VStack>;
}

function DailyRemittanceCapture({ user }) {
  const today = new Date().toISOString().slice(0, 10);
  const [sources, setSources] = useState([]); const [batches, setBatches] = useState([]);
  const [batchNo, setBatchNo] = useState(""); const [batchStatus, setBatchStatus] = useState("Draft");
  const [batchCreatedBy, setBatchCreatedBy] = useState(user.username);
  const [remittanceDate, setRemittanceDate] = useState(today); const [cashReceivedDate, setCashReceivedDate] = useState(today);
  const [sourceReference, setSourceReference] = useState(""); const [remarks, setRemarks] = useState("");
  const [entries, setEntries] = useState([]); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const canEncode = user.permissions.includes("daily-remittances:encode");
  const canEditDraft = canEncode && batchStatus === "Draft" && batchCreatedBy === user.username;
  const total = entries.reduce((sum, entry) => addMoney(sum, entry.amount), 0);
  function gridEntries(sourceRows, savedEntries = []) {
    const savedByCode = new Map(savedEntries.map((entry) => [entry.sourceCode, entry]));
    const visibleSources = [...sourceRows.filter((source) => source.status === "Active")];
    for (const entry of savedEntries) if (!visibleSources.some((source) => source.code === entry.sourceCode)) {
      visibleSources.push({ code: entry.sourceCode, name: entry.sourceName, reportingGroup: entry.reportingGroup,
        costCenterCode: entry.costCenterCode, incomeAccountCode: entry.incomeAccountCode,
        incomeAccountName: entry.incomeAccountName, displayOrder: 9999, status: "Inactive" });
    }
    return visibleSources.map((source) => ({ id: savedByCode.get(source.code)?.id || `grid-${source.code}`,
      sourceCode: source.code, sourceName: source.name, reportingGroup: source.reportingGroup,
      costCenterCode: source.costCenterCode, incomeAccountCode: source.incomeAccountCode,
      incomeAccountName: source.incomeAccountName, amount: Number(savedByCode.get(source.code)?.amount || 0),
      remarks: savedByCode.get(source.code)?.remarks || "" }));
  }
  const load = useCallback(async () => {
    try { const [sourceRows, batchRows] = await Promise.all([api("/api/remittance-sources"), api("/api/daily-remittance-batches")]);
      setSources(sourceRows); setBatches(batchRows); setError(""); } catch (requestError) { setError(requestError.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!batchNo && sources.length) setEntries(gridEntries(sources)); }, [sources, batchNo]);
  function reset() { setBatchNo(""); setBatchStatus("Draft"); setBatchCreatedBy(user.username); setRemittanceDate(today);
    setCashReceivedDate(today); setSourceReference(""); setRemarks(""); setEntries(gridEntries(sources)); setMessage(""); setError(""); }
  function updateEntry(index, field, value) { setEntries((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row)); }
  async function openBatch(selected) {
    try { const data = await api(`/api/daily-remittance-batches/${selected}`); setBatchNo(data.batch.batchNo);
      setBatchStatus(data.batch.status); setBatchCreatedBy(data.batch.createdBy); setRemittanceDate(data.batch.remittanceDate);
      setCashReceivedDate(data.batch.cashReceivedDate); setSourceReference(data.batch.sourceReference);
      setRemarks(data.batch.remarks); setEntries(data.batch.status === "Draft" ? gridEntries(sources, data.entries) : data.entries);
      setMessage(""); setError(""); } catch (requestError) { setError(requestError.message); }
  }
  async function saveDraft(event) {
    event.preventDefault(); setMessage(""); setError("");
    try { const data = await api(batchNo ? `/api/daily-remittance-batches/${batchNo}` : "/api/daily-remittance-batches", {
      method: batchNo ? "PUT" : "POST", body: JSON.stringify({ remittanceDate, cashReceivedDate, sourceReference, remarks,
        entries: entries.filter((entry) => Number(entry.amount || 0) > 0) }) });
      setBatchNo(data.batch.batchNo); setBatchStatus(data.batch.status); setBatchCreatedBy(data.batch.createdBy);
      setEntries(gridEntries(sources, data.entries)); setMessage(`${data.batch.batchNo} saved as Draft.`); await load(); } catch (requestError) { setError(requestError.message); }
  }
  async function addToBatch() {
    if (!batchNo || !window.confirm(`Add ${batchNo} to the Open teller batch as cash collection?`)) return;
    try { const data = await api(`/api/daily-remittance-batches/${batchNo}/finalize`, { method: "POST" });
      setBatchStatus(data.batch.status); setMessage(`${batchNo} added to teller batch ${data.batch.tellerBatchNo}. Income posts after review.`); await load();
    } catch (requestError) { setError(requestError.message); }
  }
  return <VStack align="stretch" spacing={5}>
    <Box as="form" onSubmit={saveDraft} bg="white" borderWidth="1px" borderRadius="lg" p={5}>
      <Flex justify="space-between" wrap="wrap" gap={3} mb={4}><Box><Heading size="md">Daily Remittance</Heading>
        <Text color="gray.600">Record cash turned over by cooperative operations and service units.</Text></Box>
        <HStack><Badge>{batchNo || (canEncode ? "New Draft" : "Read Only")} · {batchStatus}</Badge>
          {canEncode ? <Button type="button" variant="outline" onClick={reset}>New</Button> : null}
          {canEditDraft ? <Button type="submit" colorScheme="green">Save Draft</Button> : null}
          {batchNo && canEditDraft ? <Button type="button" colorScheme="orange" onClick={addToBatch}>Add to Teller Batch</Button> : null}</HStack></Flex>
      {message ? <Text color="green.700" mb={3}>{message}</Text> : null}{error ? <Text color="red.700" mb={3}>{error}</Text> : null}
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap={4} mb={4}>
        <FormControl isRequired><FormLabel>Remittance Date</FormLabel><Input isDisabled={!canEditDraft} type="date" max={cashReceivedDate} value={remittanceDate} onChange={(e) => setRemittanceDate(e.target.value)} /></FormControl>
        <FormControl isRequired><FormLabel>Cash Received Date</FormLabel><Input isDisabled={!canEditDraft} type="date" max={today} value={cashReceivedDate} onChange={(e) => setCashReceivedDate(e.target.value)} /></FormControl>
        <FormControl isRequired><FormLabel>Official Receipt / Reference</FormLabel><Input isDisabled={!canEditDraft} value={sourceReference} onChange={(e) => setSourceReference(e.target.value)} /></FormControl>
        <FormControl><FormLabel>Batch Remarks</FormLabel><Input isDisabled={!canEditDraft} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></FormControl>
      </Grid>
      <Box borderWidth="1px" borderRadius="md" p={3} mb={4}><Text color="gray.500" fontSize="sm">Total Cash Remittance</Text><Text fontWeight="bold" fontSize="xl">{formatMoney(total)}</Text></Box>
      <TableContainer><Table size="sm"><Thead><Tr><Th>Source</Th><Th>Reporting Destination</Th><Th>Income Account</Th><Th isNumeric>Amount</Th><Th>Remarks</Th></Tr></Thead>
        <Tbody>{entries.map((entry, index) => { const source = sources.find((row) => row.code === entry.sourceCode) || entry; return <Tr key={entry.id || index}>
          <Td minW="220px"><Text fontWeight="semibold">{source.name || entry.sourceName}</Text>
            <Text color="gray.500" fontSize="xs">{entry.sourceCode}</Text></Td>
          <Td>{source.reportingGroup || "-"}{source.costCenterCode ? ` (${source.costCenterCode})` : ""}</Td>
          <Td>{source.incomeAccountCode ? `${source.incomeAccountCode} - ${source.incomeAccountName}` : "-"}</Td>
          <Td minW="140px">{canEditDraft ? <NumberInput min={0} precision={2} value={entry.amount} onChange={(value) => updateEntry(index, "amount", Number(value || 0))}><NumberInputField textAlign="right" /></NumberInput> : formatMoney(entry.amount)}</Td>
          <Td>{canEditDraft ? <Input size="sm" value={entry.remarks || ""} onChange={(e) => updateEntry(index, "remarks", e.target.value)} /> : entry.remarks || "-"}</Td>
        </Tr>; })}</Tbody></Table></TableContainer>
      {canEditDraft ? <Text mt={3} color="gray.600" fontSize="sm">Only sources with a positive amount are saved. Admin-configured active sources appear here automatically.</Text> : null}
    </Box>
    <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}><Heading size="sm" mb={3}>Daily Remittance History</Heading>
      <TableContainer><Table size="sm"><Thead><Tr><Th>Batch</Th><Th>Remittance Date</Th><Th>Cash Received</Th><Th>Reference</Th><Th>Status</Th><Th isNumeric>Sources</Th><Th isNumeric>Total</Th><Th /></Tr></Thead>
        <Tbody>{batches.map((batch) => <Tr key={batch.batchNo}><Td>{batch.batchNo}</Td><Td>{formatDate(batch.remittanceDate)}</Td><Td>{formatDate(batch.cashReceivedDate)}</Td>
          <Td>{batch.sourceReference}</Td><Td><Badge>{batch.status}</Badge></Td><Td isNumeric>{batch.entryCount}</Td><Td isNumeric>{formatMoney(batch.totalAmount)}</Td>
          <Td><Button size="sm" onClick={() => openBatch(batch.batchNo)}>{batch.status === "Draft" && batch.createdBy === user.username ? "Edit" : "View"}</Button></Td></Tr>)}</Tbody>
      </Table></TableContainer></Box>
  </VStack>;
}

function DailyDisbursementCapture({ user }) {
  const today = new Date().toISOString().slice(0, 10);
  const [categories, setCategories] = useState([]); const [batches, setBatches] = useState([]);
  const [batchNo, setBatchNo] = useState(""); const [batchStatus, setBatchStatus] = useState("Draft");
  const [batchCreatedBy, setBatchCreatedBy] = useState(user.username);
  const [disbursementDate, setDisbursementDate] = useState(today);
  const [cashDisbursedDate, setCashDisbursedDate] = useState(today);
  const [sourceReference, setSourceReference] = useState(""); const [remarks, setRemarks] = useState("");
  const [entries, setEntries] = useState([]); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const canEncode = user.permissions.includes("daily-disbursements:encode");
  const canEditDraft = canEncode && batchStatus === "Draft" && batchCreatedBy === user.username;
  const total = entries.reduce((sum, entry) => addMoney(sum, entry.amount), 0);
  function gridEntries(categoryRows, savedEntries = []) {
    const savedByCode = new Map(savedEntries.map((entry) => [entry.categoryCode, entry]));
    const visibleCategories = [...categoryRows.filter((category) => category.status === "Active")];
    for (const entry of savedEntries) if (!visibleCategories.some((category) => category.code === entry.categoryCode)) {
      visibleCategories.push({ code: entry.categoryCode, name: entry.categoryName,
        reportingGroup: entry.reportingGroup, costCenterCode: entry.costCenterCode,
        expenseAccountCode: entry.expenseAccountCode, expenseAccountName: entry.expenseAccountName,
        displayOrder: 9999, status: "Inactive" });
    }
    return visibleCategories.map((category) => ({
      id: savedByCode.get(category.code)?.id || `grid-${category.code}`,
      categoryCode: category.code, categoryName: category.name, reportingGroup: category.reportingGroup,
      costCenterCode: category.costCenterCode, expenseAccountCode: category.expenseAccountCode,
      expenseAccountName: category.expenseAccountName,
      amount: Number(savedByCode.get(category.code)?.amount || 0),
      remarks: savedByCode.get(category.code)?.remarks || ""
    }));
  }
  const load = useCallback(async () => {
    try {
      const [categoryRows, batchRows] = await Promise.all([
        api("/api/disbursement-categories"), api("/api/daily-disbursement-batches")
      ]);
      setCategories(categoryRows); setBatches(batchRows); setError("");
    } catch (requestError) { setError(requestError.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!batchNo && categories.length) setEntries(gridEntries(categories)); }, [categories, batchNo]);
  function reset() {
    setBatchNo(""); setBatchStatus("Draft"); setBatchCreatedBy(user.username);
    setDisbursementDate(today); setCashDisbursedDate(today); setSourceReference(""); setRemarks("");
    setEntries(gridEntries(categories)); setMessage(""); setError("");
  }
  function updateEntry(index, field, value) {
    setEntries((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  }
  async function openBatch(selected) {
    try {
      const data = await api(`/api/daily-disbursement-batches/${selected}`);
      setBatchNo(data.batch.batchNo); setBatchStatus(data.batch.status); setBatchCreatedBy(data.batch.createdBy);
      setDisbursementDate(data.batch.disbursementDate); setCashDisbursedDate(data.batch.cashDisbursedDate);
      setSourceReference(data.batch.sourceReference); setRemarks(data.batch.remarks);
      setEntries(data.batch.status === "Draft" ? gridEntries(categories, data.entries) : data.entries);
      setMessage(""); setError("");
    } catch (requestError) { setError(requestError.message); }
  }
  async function saveDraft(event) {
    event.preventDefault(); setMessage(""); setError("");
    try {
      const data = await api(batchNo ? `/api/daily-disbursement-batches/${batchNo}` : "/api/daily-disbursement-batches", {
        method: batchNo ? "PUT" : "POST",
        body: JSON.stringify({ disbursementDate, cashDisbursedDate, sourceReference, remarks,
          entries: entries.filter((entry) => Number(entry.amount || 0) > 0) })
      });
      setBatchNo(data.batch.batchNo); setBatchStatus(data.batch.status); setBatchCreatedBy(data.batch.createdBy);
      setEntries(gridEntries(categories, data.entries)); setMessage(`${data.batch.batchNo} saved as Draft.`); await load();
    } catch (requestError) { setError(requestError.message); }
  }
  async function addToBatch() {
    if (!batchNo || !window.confirm(`Add ${batchNo} to the Open teller batch as a cash disbursement?`)) return;
    try {
      const data = await api(`/api/daily-disbursement-batches/${batchNo}/finalize`, { method: "POST" });
      setBatchStatus(data.batch.status);
      setMessage(`${batchNo} added to teller batch ${data.batch.tellerBatchNo}. Expenses post after review.`);
      await load();
    } catch (requestError) { setError(requestError.message); }
  }
  return <VStack align="stretch" spacing={5}>
    <Box as="form" onSubmit={saveDraft} bg="white" borderWidth="1px" borderRadius="lg" p={5}>
      <Flex justify="space-between" wrap="wrap" gap={3} mb={4}><Box><Heading size="md">Daily Disbursement</Heading>
        <Text color="gray.600">Record cash expenses for cost centers and cooperative operations.</Text></Box>
        <HStack><Badge>{batchNo || (canEncode ? "New Draft" : "Read Only")} · {batchStatus}</Badge>
          {canEncode ? <Button type="button" variant="outline" onClick={reset}>New</Button> : null}
          {canEditDraft ? <Button type="submit" colorScheme="green">Save Draft</Button> : null}
          {batchNo && canEditDraft ? <Button type="button" colorScheme="orange" onClick={addToBatch}>Add to Teller Batch</Button> : null}</HStack></Flex>
      {message ? <Text color="green.700" mb={3}>{message}</Text> : null}
      {error ? <Text color="red.700" mb={3}>{error}</Text> : null}
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap={4} mb={4}>
        <FormControl isRequired><FormLabel>Disbursement Date</FormLabel><Input isDisabled={!canEditDraft} type="date" max={cashDisbursedDate} value={disbursementDate} onChange={(e) => setDisbursementDate(e.target.value)} /></FormControl>
        <FormControl isRequired><FormLabel>Cash Disbursed Date</FormLabel><Input isDisabled={!canEditDraft} type="date" max={today} value={cashDisbursedDate} onChange={(e) => setCashDisbursedDate(e.target.value)} /></FormControl>
        <FormControl isRequired><FormLabel>Voucher / Reference</FormLabel><Input isDisabled={!canEditDraft} value={sourceReference} onChange={(e) => setSourceReference(e.target.value)} /></FormControl>
        <FormControl><FormLabel>Batch Remarks</FormLabel><Input isDisabled={!canEditDraft} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></FormControl>
      </Grid>
      <Box borderWidth="1px" borderRadius="md" p={3} mb={4}><Text color="gray.500" fontSize="sm">Total Cash Disbursement</Text><Text fontWeight="bold" fontSize="xl">{formatMoney(total)}</Text></Box>
      <TableContainer><Table size="sm"><Thead><Tr><Th>Category</Th><Th>Reporting Destination</Th><Th>Expense Account</Th><Th isNumeric>Amount</Th><Th>Remarks</Th></Tr></Thead>
        <Tbody>{entries.map((entry, index) => {
          const category = categories.find((row) => row.code === entry.categoryCode) || entry;
          return <Tr key={entry.id || index}>
            <Td minW="220px"><Text fontWeight="semibold">{category.name || entry.categoryName}</Text><Text color="gray.500" fontSize="xs">{entry.categoryCode}</Text></Td>
            <Td>{category.reportingGroup || "-"}{category.costCenterCode ? ` (${category.costCenterCode})` : " (Coop Operations)"}</Td>
            <Td>{category.expenseAccountCode ? `${category.expenseAccountCode} - ${category.expenseAccountName}` : "-"}</Td>
            <Td minW="140px">{canEditDraft ? <NumberInput min={0} precision={2} value={entry.amount} onChange={(value) => updateEntry(index, "amount", Number(value || 0))}><NumberInputField textAlign="right" /></NumberInput> : formatMoney(entry.amount)}</Td>
            <Td>{canEditDraft ? <Input size="sm" value={entry.remarks || ""} onChange={(e) => updateEntry(index, "remarks", e.target.value)} /> : entry.remarks || "-"}</Td>
          </Tr>;
        })}</Tbody>
      </Table></TableContainer>
      {canEditDraft ? <Text mt={3} color="gray.600" fontSize="sm">Only categories with a positive amount are saved. Admin-configured active categories appear here automatically.</Text> : null}
    </Box>
    <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}><Heading size="sm" mb={3}>Daily Disbursement History</Heading>
      <TableContainer><Table size="sm"><Thead><Tr><Th>Batch</Th><Th>Disbursement Date</Th><Th>Cash Disbursed</Th><Th>Reference</Th><Th>Status</Th><Th isNumeric>Categories</Th><Th isNumeric>Total</Th><Th /></Tr></Thead>
        <Tbody>{batches.map((batch) => <Tr key={batch.batchNo}><Td>{batch.batchNo}</Td><Td>{formatDate(batch.disbursementDate)}</Td><Td>{formatDate(batch.cashDisbursedDate)}</Td>
          <Td>{batch.sourceReference}</Td><Td><Badge>{batch.status}</Badge></Td><Td isNumeric>{batch.entryCount}</Td><Td isNumeric>{formatMoney(batch.totalAmount)}</Td>
          <Td><Button size="sm" onClick={() => openBatch(batch.batchNo)}>{batch.status === "Draft" && batch.createdBy === user.username ? "Edit" : "View"}</Button></Td>
        </Tr>)}</Tbody>
      </Table></TableContainer>
    </Box>
  </VStack>;
}

function MemberChargeCapture({ members, user }) {
  const today = new Date().toISOString().slice(0, 10);
  const emptyEntry = () => ({ id: `new-${Date.now()}-${Math.random()}`, memberNo: "", amount: 0, referenceNo: "", remarks: "" });
  const [centers, setCenters] = useState([]);
  const [batches, setBatches] = useState([]);
  const [batchNo, setBatchNo] = useState("");
  const [batchStatus, setBatchStatus] = useState("Draft");
  const [batchCreatedBy, setBatchCreatedBy] = useState(user.username);
  const [costCenterCode, setCostCenterCode] = useState("");
  const [transactionDate, setTransactionDate] = useState(today);
  const [entries, setEntries] = useState([emptyEntry()]);
  const [movements, setMovements] = useState([]);
  const [reversalReasons, setReversalReasons] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const activeMembers = members.filter((member) => member.status === "Active");
  const activeCenters = centers.filter((center) => center.status === "Active");
  const total = entries.reduce((sum, row) => addMoney(sum, row.amount), 0);
  const canEditDraft = batchStatus === "Draft" && batchCreatedBy === user.username;
  const load = useCallback(async () => {
    try {
      const [centerRows, batchRows] = await Promise.all([api("/api/cost-centers"), api("/api/member-charge-batches")]);
      setCenters(centerRows); setBatches(batchRows);
      setCostCenterCode((current) => current || centerRows.find((row) => row.status === "Active")?.code || "");
      setError("");
    } catch (requestError) { setError(requestError.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  function updateEntry(index, field, value) { setEntries((current) => current.map((row, i) => i === index ? { ...row, [field]: value } : row)); }
  function reset() { setBatchNo(""); setBatchStatus("Draft"); setBatchCreatedBy(user.username); setTransactionDate(today); setEntries([emptyEntry()]);
    setMovements([]); setReversalReasons({}); setMessage(""); setError(""); }
  async function openBatch(selectedBatchNo) {
    try {
      const data = await api(`/api/member-charge-batches/${selectedBatchNo}`);
      setBatchNo(data.batch.batchNo); setBatchStatus(data.batch.status); setBatchCreatedBy(data.batch.createdBy); setCostCenterCode(data.batch.costCenterCode);
      setTransactionDate(data.batch.transactionDate); setEntries(data.entries); setMovements(data.movements || []);
      setReversalReasons({}); setMessage(""); setError("");
    } catch (requestError) { setError(requestError.message); }
  }
  async function saveDraft(event) {
    event.preventDefault(); setError(""); setMessage("");
    try {
      const data = await api(batchNo ? `/api/member-charge-batches/${batchNo}` : "/api/member-charge-batches", {
        method: batchNo ? "PUT" : "POST", body: JSON.stringify({ costCenterCode, transactionDate, entries })
      });
      setBatchNo(data.batch.batchNo); setBatchStatus(data.batch.status); setBatchCreatedBy(data.batch.createdBy); setEntries(data.entries);
      setMovements(data.movements || []); setMessage(`${data.batch.batchNo} saved as Draft.`); await load();
    } catch (requestError) { setError(requestError.message); }
  }
  async function finalizeBatch() {
    if (!batchNo || !window.confirm(`Finalize ${batchNo}? Its source entries will become immutable member payables.`)) return;
    setError(""); setMessage("");
    try {
      const data = await api(`/api/member-charge-batches/${batchNo}/finalize`, { method: "POST" });
      setBatchStatus(data.batch.status); setMovements(data.movements || []);
      setMessage(`${batchNo} finalized. ${data.movements.length} payable movement(s) created.`); await load();
    } catch (requestError) { setError(requestError.message); }
  }
  async function reverseMovement(movementNo) {
    setError(""); setMessage("");
    try {
      const data = await api(`/api/member-charge-movements/${movementNo}/reverse`, {
        method: "POST", body: JSON.stringify({ reason: reversalReasons[movementNo] || "" })
      });
      setMovements(data.movements); setReversalReasons((current) => ({ ...current, [movementNo]: "" }));
      setMessage("Charge reversed. Enter any corrected amount in a new Draft batch.");
    } catch (requestError) { setError(requestError.message); }
  }
  return <VStack align="stretch" spacing={5}>
    <Box as="form" onSubmit={saveDraft} borderWidth="1px" borderRadius="lg" p={5}>
      <Flex justify="space-between" wrap="wrap" gap={3} mb={4}><Box><Heading size="md">Daily Member Payables</Heading>
        <Text color="gray.600">Drafts have no payable effect. Finalization creates immutable member payable movements.</Text></Box>
        <HStack><Badge colorScheme={batchStatus === "Finalized" ? "green" : "blue"}>{batchNo || "New Draft"} · {batchStatus}</Badge>
          <Button type="button" variant="outline" onClick={reset}>New</Button>
          {canEditDraft ? <Button type="submit" colorScheme="green">Save Draft</Button> : null}
          {batchNo && batchStatus === "Draft" ? <Button type="button" colorScheme="orange" onClick={finalizeBatch}>Finalize</Button> : null}</HStack></Flex>
      {message ? <Text color="green.700" mb={3}>{message}</Text> : null}{error ? <Text color="red.700" mb={3}>{error}</Text> : null}
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap={4} mb={4}>
        <FormControl isRequired><FormLabel>Cost Center</FormLabel><Select isDisabled={!canEditDraft} value={costCenterCode} onChange={(e) => setCostCenterCode(e.target.value)}>{activeCenters.map((center) => <option key={center.code} value={center.code}>{center.name} ({center.code})</option>)}</Select></FormControl>
        <FormControl isRequired><FormLabel>Transaction Date</FormLabel><Input isDisabled={!canEditDraft} type="date" max={today} value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} /></FormControl>
        <Box alignSelf="end"><Text fontSize="sm" color="gray.500">Running total</Text><Heading size="md">{formatMoney(total)}</Heading><Text fontSize="sm">{entries.length} row(s)</Text></Box>
      </Grid>
      <TableContainer><Table size="sm"><Thead><Tr><Th>Member</Th><Th isNumeric>Amount</Th><Th>Reference</Th><Th>Remarks</Th><Th /></Tr></Thead>
        <Tbody>{entries.map((row, index) => <Tr key={row.id || index}><Td minW="300px">{canEditDraft ? <MemberCombobox members={activeMembers} value={row.memberNo} onChange={(memberNo) => updateEntry(index, "memberNo", memberNo)} /> : `${row.memberName} (${row.memberNo})`}</Td>
          <Td minW="140px">{canEditDraft ? <NumberInput min={0.01} precision={2} value={row.amount} onChange={(value) => updateEntry(index, "amount", Number(value || 0))}><NumberInputField textAlign="right" /></NumberInput> : formatMoney(row.amount)}</Td>
          <Td>{canEditDraft ? <Input size="sm" value={row.referenceNo} onChange={(e) => updateEntry(index, "referenceNo", e.target.value)} /> : row.referenceNo || "-"}</Td>
          <Td>{canEditDraft ? <Input size="sm" value={row.remarks} onChange={(e) => updateEntry(index, "remarks", e.target.value)} /> : row.remarks || "-"}</Td>
          <Td>{canEditDraft ? <Button size="sm" variant="outline" isDisabled={entries.length === 1} onClick={() => setEntries(entries.filter((_, i) => i !== index))}>Remove</Button> : <Badge colorScheme={batchStatus === "Finalized" ? "green" : "gray"}>{batchStatus === "Finalized" ? "Locked" : "Read only"}</Badge>}</Td></Tr>)}</Tbody>
      </Table></TableContainer>
      {canEditDraft ? <Button mt={3} type="button" variant="outline" onClick={() => setEntries([...entries, emptyEntry()])}>Add Row</Button> : null}
      {batchStatus === "Finalized" && movements.length ? <Box mt={5}><Heading size="sm" mb={2}>Payable Movement Audit</Heading>
        <TableContainer><Table size="sm"><Thead><Tr><Th>Movement</Th><Th>Member</Th><Th>Type</Th><Th isNumeric>Amount</Th><Th>Actor / Reason</Th><Th>Correction</Th></Tr></Thead>
          <Tbody>{movements.map((movement) => <Tr key={movement.movementNo}><Td>{movement.movementNo}</Td><Td>{movement.memberName}</Td>
            <Td><Badge colorScheme={movement.movementType === "Reversal" ? "red" : "green"}>{movement.movementType}</Badge></Td><Td isNumeric>{formatMoney(movement.amount)}</Td>
            <Td>{movement.createdBy}<br />{formatDateTime(movement.createdAt)}<br />{movement.reason || "-"}</Td><Td minW="280px">
              {movement.movementType === "Charge" && !movement.isReversed ? <HStack><Input size="sm" placeholder="Required reversal reason" value={reversalReasons[movement.movementNo] || ""}
                onChange={(e) => setReversalReasons({ ...reversalReasons, [movement.movementNo]: e.target.value })} />
                <Button type="button" size="sm" colorScheme="red" variant="outline" onClick={() => reverseMovement(movement.movementNo)}>Reverse</Button></HStack>
                : movement.isReversed ? <Badge colorScheme="red">Reversed</Badge> : "Links to original charge"}</Td></Tr>)}</Tbody>
        </Table></TableContainer></Box> : null}
    </Box>
    <Box borderWidth="1px" borderRadius="lg" p={5}><Heading size="sm" mb={3}>Batch History</Heading>
      <TableContainer><Table size="sm"><Thead><Tr><Th>Batch</Th><Th>Date</Th><Th>Cost Center</Th><Th isNumeric>Rows</Th><Th isNumeric>Total</Th><Th>Encoder</Th><Th /></Tr></Thead>
        <Tbody>{batches.map((batch) => <Tr key={batch.batchNo}><Td>{batch.batchNo}</Td><Td>{formatDate(batch.transactionDate)}</Td><Td>{batch.costCenterName}</Td><Td isNumeric>{batch.entryCount}</Td><Td isNumeric>{formatMoney(batch.totalAmount)}</Td><Td>{batch.createdBy}</Td><Td><Button size="sm" onClick={() => openBatch(batch.batchNo)}>{batch.status === "Draft" && batch.createdBy === user.username ? "Edit" : "View"}</Button></Td></Tr>)}</Tbody>
      </Table></TableContainer>
    </Box>
  </VStack>;
}

function MemberChargeReview() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [centers, setCenters] = useState([]);
  const [members, setMembers] = useState([]);
  const [filters, setFilters] = useState({ dateFrom: monthStart, dateTo: today, costCenterCode: "", memberNo: "", status: "" });
  const [report, setReport] = useState(null);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const loadReport = useCallback(async (currentFilters = filters) => {
    setBusy(true);
    try {
      const query = new URLSearchParams(Object.entries(currentFilters).filter(([, value]) => value)).toString();
      const [centerRows, data] = await Promise.all([
        api("/api/cost-centers"), api(`/api/member-charge-reconciliation${query ? `?${query}` : ""}`)
      ]);
      setCenters(centerRows); setMembers(data.memberOptions || []); setReport(data); setDetails(null); setError("");
    } catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }, [filters]);
  useEffect(() => { loadReport(); }, []);
  async function openDetails(batchNo) {
    try { setDetails(await api(`/api/member-charge-batches/${batchNo}`)); setError(""); }
    catch (requestError) { setError(requestError.message); }
  }
  const summary = report?.summary || {};
  return <VStack align="stretch" spacing={5}>
    <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
      <Flex justify="space-between" gap={3} wrap="wrap" mb={4}><Box><Heading size="md">Cost Center Charge Review</Heading>
        <Text color="gray.600">Read-only reconciliation of drafts, finalized sources, reversals, and net member payables.</Text></Box>
        <Button onClick={() => loadReport()} isLoading={busy}>Refresh</Button></Flex>
      {error ? <Text color="red.700" mb={3}>{error}</Text> : null}
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(6, 1fr)" }} gap={3} alignItems="end">
        <FormControl><FormLabel>From</FormLabel><Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} /></FormControl>
        <FormControl><FormLabel>To</FormLabel><Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} /></FormControl>
        <FormControl><FormLabel>Cost Center</FormLabel><Select value={filters.costCenterCode} onChange={(e) => setFilters({ ...filters, costCenterCode: e.target.value })}><option value="">All cost centers</option>{centers.map((center) => <option key={center.code} value={center.code}>{center.name}</option>)}</Select></FormControl>
        <FormControl><FormLabel>Member</FormLabel><MemberCombobox members={members} value={filters.memberNo}
          onChange={(memberNo) => setFilters((current) => ({ ...current, memberNo }))} placeholder="All members / search" /></FormControl>
        <FormControl><FormLabel>Status</FormLabel><Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option><option>Draft</option><option>Finalized</option></Select></FormControl>
        <Button colorScheme="green" onClick={() => loadReport()} isLoading={busy}>Apply Filters</Button>
      </Grid>
    </Box>
    <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4}>
      <Box borderWidth="1px" borderRadius="md" p={4}><Text color="gray.500" fontSize="sm">Draft Amount</Text><Text fontWeight="bold">{formatMoney(summary.draftAmount || 0)}</Text><Text fontSize="xs">{summary.draftBatchCount || 0} batches—not payable yet</Text></Box>
      <Box borderWidth="1px" borderRadius="md" p={4}><Text color="gray.500" fontSize="sm">Finalized Source</Text><Text fontWeight="bold">{formatMoney(summary.finalizedSourceAmount || 0)}</Text><Text fontSize="xs">{summary.finalizedBatchCount || 0} batches</Text></Box>
      <Box borderWidth="1px" borderRadius="md" p={4}><Text color="gray.500" fontSize="sm">Reversals</Text><Text fontWeight="bold" color="red.600">{formatMoney(summary.reversalAmount || 0)}</Text></Box>
      <Box borderWidth="1px" borderRadius="md" p={4}><Text color="gray.500" fontSize="sm">Net Member Payables</Text><Text fontWeight="bold" color="green.700">{formatMoney(summary.netPayableMovement || 0)}</Text></Box>
    </Grid>
    <Box borderWidth="1px" borderRadius="lg" p={5}><Heading size="sm" mb={3}>Cost Center Summary</Heading>
      <TableContainer><Table size="sm"><Thead><Tr><Th>Cost Center</Th><Th isNumeric>Draft Batches</Th><Th isNumeric>Draft Amount</Th><Th isNumeric>Finalized Batches</Th><Th isNumeric>Source Amount</Th><Th isNumeric>Net Payable</Th></Tr></Thead>
        <Tbody>{(report?.byCostCenter || []).map((row) => <Tr key={row.costCenterCode}><Td>{row.costCenterName} ({row.costCenterCode})</Td><Td isNumeric>{row.draftBatchCount}</Td><Td isNumeric>{formatMoney(row.draftAmount)}</Td><Td isNumeric>{row.finalizedBatchCount}</Td><Td isNumeric>{formatMoney(row.finalizedSourceAmount)}</Td><Td isNumeric>{formatMoney(row.netPayableMovement)}</Td></Tr>)}</Tbody>
      </Table></TableContainer>
    </Box>
    <Box borderWidth="1px" borderRadius="lg" p={5}><Heading size="sm" mb={3}>Daily Payable Movements</Heading>
      <TableContainer><Table size="sm"><Thead><Tr><Th>Date</Th><Th isNumeric>Movements</Th><Th isNumeric>Charges</Th><Th isNumeric>Reversals</Th><Th isNumeric>Net Payable</Th></Tr></Thead>
        <Tbody>{(report?.byDate || []).map((row) => <Tr key={row.transactionDate}><Td>{formatDate(row.transactionDate)}</Td><Td isNumeric>{row.movementCount}</Td><Td isNumeric>{formatMoney(row.chargeAmount)}</Td><Td isNumeric>{formatMoney(row.reversalAmount)}</Td><Td isNumeric>{formatMoney(row.netPayableMovement)}</Td></Tr>)}</Tbody>
      </Table></TableContainer>
    </Box>
    <Box borderWidth="1px" borderRadius="lg" p={5}><Heading size="sm" mb={3}>Batch Register</Heading>
      <TableContainer><Table size="sm"><Thead><Tr><Th>Batch</Th><Th>Date</Th><Th>Cost Center</Th><Th>Status</Th><Th isNumeric>Rows</Th><Th isNumeric>Total</Th><Th>Encoder / Finalizer</Th><Th /></Tr></Thead>
        <Tbody>{(report?.batches || []).map((batch) => <Tr key={batch.batchNo}><Td>{batch.batchNo}</Td><Td>{formatDate(batch.transactionDate)}</Td><Td>{batch.costCenterName}</Td><Td><Badge colorScheme={batch.status === "Finalized" ? "green" : "blue"}>{batch.status}</Badge></Td><Td isNumeric>{batch.entryCount}</Td><Td isNumeric>{formatMoney(batch.totalAmount)}</Td><Td>{batch.createdBy}<br />{batch.finalizedBy || "Not finalized"}</Td><Td><Button size="sm" onClick={() => openDetails(batch.batchNo)}>Drill Down</Button></Td></Tr>)}</Tbody>
      </Table></TableContainer>
    </Box>
    <Box borderWidth="1px" borderRadius="lg" p={5}><Heading size="sm" mb={3}>Member Movement Detail</Heading>
      <TableContainer><Table size="sm"><Thead><Tr><Th>Date</Th><Th>Member</Th><Th>Cost Center</Th><Th>Batch / Movement</Th><Th>Type</Th><Th isNumeric>Amount</Th><Th>Audit</Th></Tr></Thead>
        <Tbody>{(report?.movements || []).map((row) => <Tr key={row.movementNo}><Td>{formatDate(row.transactionDate)}</Td><Td>{row.memberName}<br /><Text fontSize="xs">{row.memberNo}</Text></Td><Td>{row.costCenterName}</Td><Td>{row.batchNo}<br /><Text fontSize="xs">{row.movementNo}</Text></Td><Td><Badge colorScheme={row.movementType === "Reversal" ? "red" : "green"}>{row.movementType}</Badge></Td><Td isNumeric>{formatMoney(row.amount)}</Td><Td>{row.createdBy}<br />{row.reason || "-"}</Td></Tr>)}</Tbody>
      </Table></TableContainer>
    </Box>
    {details ? <Box borderWidth="2px" borderColor="green.200" borderRadius="lg" p={5}><Flex justify="space-between" mb={3}><Heading size="sm">{details.batch.batchNo} Drill-down</Heading><Button size="sm" onClick={() => setDetails(null)}>Close</Button></Flex>
      <Text mb={3}>{details.batch.costCenterName} · {formatDate(details.batch.transactionDate)} · {details.batch.status}</Text>
      <TableContainer><Table size="sm"><Thead><Tr><Th>Member</Th><Th isNumeric>Source Amount</Th><Th>Reference</Th><Th>Remarks</Th></Tr></Thead><Tbody>{details.entries.map((row) => <Tr key={row.id}><Td>{row.memberName} ({row.memberNo})</Td><Td isNumeric>{formatMoney(row.amount)}</Td><Td>{row.referenceNo || "-"}</Td><Td>{row.remarks || "-"}</Td></Tr>)}</Tbody></Table></TableContainer>
    </Box> : null}
  </VStack>;
}

function MemberDuesPayments({ members, user }) {
  const today = new Date().toISOString().slice(0, 10);
  const [memberNo, setMemberNo] = useState("");
  const [position, setPosition] = useState(null);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({ paymentDate: today, referenceNo: "", remarks: "", allocations: {} });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canCreate = user.permissions.includes("member-dues-payments:create");
  const activeMembers = members.filter((member) => member.status === "Active");
  const loadPayments = useCallback(async () => {
    try { setPayments(await api("/api/member-dues-payments")); setError(""); }
    catch (requestError) { setError(requestError.message); }
  }, []);
  useEffect(() => { loadPayments(); }, [loadPayments]);
  async function selectMember(nextMemberNo) {
    setMemberNo(nextMemberNo); setMessage(""); setError("");
    setForm((current) => ({ ...current, allocations: {} }));
    if (!nextMemberNo) { setPosition(null); return; }
    try { setPosition(await api(`/api/member-dues-position/${nextMemberNo}`)); }
    catch (requestError) { setPosition(null); setError(requestError.message); }
  }
  const allocatedTotal = addMoney(...Object.values(form.allocations).map(Number));
  async function submit(event) {
    event.preventDefault(); setMessage(""); setError("");
    try {
      const result = await api("/api/member-dues-payments", {
        method: "POST",
        body: JSON.stringify({
          memberNo, paymentDate: form.paymentDate, referenceNo: form.referenceNo,
          remarks: form.remarks, cashReceived: allocatedTotal,
          allocations: Object.entries(form.allocations).map(([costCenterCode, amount]) => ({ costCenterCode, amount }))
        })
      });
      setMessage(`${result.payment.paymentNo} recorded in ${result.payment.batchId}.`);
      setForm({ paymentDate: today, referenceNo: "", remarks: "", allocations: {} });
      setPosition(result.position); await loadPayments();
    } catch (requestError) { setError(requestError.message); }
  }
  return <VStack align="stretch" spacing={5}>
    <Box as="form" onSubmit={submit} bg="white" borderWidth="1px" borderRadius="lg" p={5}>
      <Heading size="md">Cost Center Dues Collection</Heading>
      <Text color="gray.600" mt={1} mb={4}>
        Allocate a member&apos;s cash payment by cost center. Each allocation settles the oldest dues first.
      </Text>
      {message ? <Text color="green.700" mb={3}>{message}</Text> : null}
      {error ? <Text color="red.700" mb={3}>{error}</Text> : null}
      <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4} mb={4}>
        <FormControl isRequired><FormLabel>Member</FormLabel>
          <MemberCombobox members={activeMembers} value={memberNo} onChange={selectMember}
            placeholder="Search active member" /></FormControl>
        <FormControl isRequired><FormLabel>Payment Date</FormLabel>
          <Input type="date" max={today} value={form.paymentDate}
            onChange={(event) => setForm({ ...form, paymentDate: event.target.value })} /></FormControl>
        <FormControl isRequired><FormLabel>OR / Reference No.</FormLabel>
          <Input value={form.referenceNo}
            onChange={(event) => setForm({ ...form, referenceNo: event.target.value })} /></FormControl>
      </Grid>
      <TableContainer><Table size="sm">
        <Thead><Tr><Th>Cost Center</Th><Th isNumeric>Outstanding</Th><Th isNumeric>Payment Allocation</Th></Tr></Thead>
        <Tbody>
          {(position?.centers || []).map((center) => <Tr key={center.costCenterCode}>
            <Td>{center.costCenterName} ({center.costCenterCode})</Td>
            <Td isNumeric>{formatMoney(center.outstandingAmount)}</Td>
            <Td><NumberInput min={0} max={center.outstandingAmount} precision={2}
              value={form.allocations[center.costCenterCode] || 0}
              onChange={(value) => setForm((current) => ({ ...current, allocations: {
                ...current.allocations, [center.costCenterCode]: Number(value || 0)
              } }))}><NumberInputField textAlign="right" /></NumberInput></Td>
          </Tr>)}
          {memberNo && !(position?.centers || []).length ? <Tr><Td colSpan={3} color="gray.500">
            This member has no outstanding cost-center dues.
          </Td></Tr> : null}
        </Tbody>
      </Table></TableContainer>
      <Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap={4} mt={4}>
        <FormControl><FormLabel>Remarks</FormLabel><Input value={form.remarks}
          onChange={(event) => setForm({ ...form, remarks: event.target.value })} /></FormControl>
        <Box><Text color="gray.500" fontSize="sm">Cash received / allocated total</Text>
          <Heading size="md">{formatMoney(allocatedTotal)}</Heading></Box>
      </Grid>
      {canCreate ? <Button mt={4} type="submit" colorScheme="green"
        isDisabled={!memberNo || allocatedTotal <= 0}>Record Dues Payment</Button> : null}
    </Box>
    <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
      <Heading size="sm" mb={3}>Dues Payment History</Heading>
      <TableContainer><Table size="sm"><Thead><Tr><Th>Payment</Th><Th>Date</Th><Th>Member</Th>
        <Th>Allocation</Th><Th>Reference</Th><Th isNumeric>Cash</Th><Th>Status / Audit</Th></Tr></Thead>
        <Tbody>{payments.map((payment) => <Tr key={payment.paymentNo}>
          <Td>{payment.paymentNo}</Td><Td>{formatDate(payment.paymentDate)}</Td><Td>{payment.memberName}</Td>
          <Td>{payment.allocations.map((row) => `${row.costCenterName}: ${formatMoney(row.amount)}`).join(", ")}</Td>
          <Td>{payment.referenceNo}</Td><Td isNumeric>{formatMoney(payment.cashReceived)}</Td>
          <Td><Badge colorScheme={payment.status === "Posted" ? "green" : "blue"}>{payment.status}</Badge>
            <br />Received: {payment.receivedBy}<br />Posted: {payment.postedBy || "-"}</Td>
        </Tr>)}{!payments.length ? <Tr><Td colSpan={7} color="gray.500">No dues payments recorded.</Td></Tr> : null}</Tbody>
      </Table></TableContainer>
    </Box>
  </VStack>;
}

function Members({ user }) {
  const [members, setMembers] = useState([]);
  const [memberDirectorySearch, setMemberDirectorySearch] = useState("");
  const [memberDirectoryPage, setMemberDirectoryPage] = useState(1);
  const [memberDirectoryPageSize, setMemberDirectoryPageSize] = useState(25);
  const [applications, setApplications] = useState([]);
  const [initialPayments, setInitialPayments] = useState([]);
  const [shareCapitalContributions, setShareCapitalContributions] = useState([]);
  const [monthlyContributionBatches, setMonthlyContributionBatches] = useState([]);
  const [dailyRemittanceBatches, setDailyRemittanceBatches] = useState([]);
  const [dailyDisbursementBatches, setDailyDisbursementBatches] = useState([]);
  const [memberDuesPayments, setMemberDuesPayments] = useState([]);
  const [savingsDeposits, setSavingsDeposits] = useState([]);
  const [savingsWithdrawals, setSavingsWithdrawals] = useState([]);
  const [cbuWithdrawals, setCbuWithdrawals] = useState([]);
  const [securedSavingsWithdrawals, setSecuredSavingsWithdrawals] = useState([]);
  const [loanReleases, setLoanReleases] = useState([]);
  const [loanCollections, setLoanCollections] = useState([]);
  const [previousLoanProducts, setPreviousLoanProducts] = useState([]);
  const [openingFunding, setOpeningFunding] = useState(0);
  const [activeBatch, setActiveBatch] = useState(null);
  const [latestCashCount, setLatestCashCount] = useState(null);
  const [statement, setStatement] = useState(null);
  const [form, setForm] = useState({
    fullName: "",
    clusterName: memberClassifications[0],
    contactNumber: "",
    gender: "",
    idType: "",
    idNumber: "",
    spouseName: "",
    beneficiaries: [{ name: "", age: 0, relationship: "" }],
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
  const [cbuWithdrawalForm, setCbuWithdrawalForm] = useState({
    memberId: "", amount: 500, referenceNo: ""
  });
  const [cbuGuardrailDetails, setCbuGuardrailDetails] = useState(null);
  const [securedSavingsWithdrawalForm, setSecuredSavingsWithdrawalForm] = useState({
    memberId: "", amount: 500, referenceNo: ""
  });
  const [cashCountForm, setCashCountForm] = useState({
    actualCash: "0.00",
    tellerNote: ""
  });
  const [memberProfileForm, setMemberProfileForm] = useState({
    name: "",
    group: "",
    contactNumber: "",
    address: "",
    birthdate: "",
    gender: "",
    idType: "",
    idNumber: "",
    spouseName: "",
    beneficiaries: [{ name: "", age: 0, relationship: "" }],
    civilStatus: "",
    occupation: "",
    membershipDate: "",
    previousLoanBalance: 0,
    status: "Active"
  });
  const [previousLoanRows, setPreviousLoanRows] = useState([]);
  const [previousLoanUnlockReason, setPreviousLoanUnlockReason] = useState("");
  const [previousLoanDecisionRemarks, setPreviousLoanDecisionRemarks] = useState("");
  const [selectedTellerMemberId, setSelectedTellerMemberId] = useState("");
  const [tellerTransactionType, setTellerTransactionType] = useState("initial-payment");
  const [approvedMemberName, setApprovedMemberName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const approvalNotice = useDisclosure();
  const cbuGuardrailNotice = useDisclosure();
  const canCreateApplication = user.permissions.includes("members:applications:create");
  const canEditMemberProfile = user.permissions.includes("members:profile:edit");
  const canEditPreviousLoans = user.permissions.includes("members:previous-loans:edit");
  const canRequestPreviousLoanUnlock = user.permissions.includes("members:previous-loans:unlock-request");
  const canApprovePreviousLoanUnlock = user.permissions.includes("members:previous-loans:unlock-approve");
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
  const canViewCbuWithdrawals = user.permissions.includes("members:cbu-withdrawals:view");
  const canCreateCbuWithdrawal = user.permissions.includes("members:cbu-withdrawals:create");
  const canViewLoanReleases = user.permissions.includes("loans:releases:view");
  const canViewLoanCollections = user.permissions.includes("loans:collections:view");
  const canViewLoanProducts = user.permissions.includes("loans:products:view");
  const canViewTellerCashCount = user.permissions.includes("teller-cash-counts:view");
  const canCreateTellerCashCount = user.permissions.includes("teller-cash-counts:create");
  const canEncodeMemberCharges = user.permissions.includes("member-charges:encode");
  const canViewMemberCharges = user.permissions.includes("member-charges:view");
  const canViewMemberDuesPayments = user.permissions.includes("member-dues-payments:view");
  const canViewMonthlyContributions = user.permissions.includes("monthly-contributions:view");
  const canViewDailyRemittances = user.permissions.includes("daily-remittances:view");
  const canViewDailyDisbursements = user.permissions.includes("daily-disbursements:view");
  const pendingApplications = applications.filter((application) => application.status === "Pending Approval");
  const activeMembers = members.filter((member) => member.status === "Active");
  const memberDirectoryQuery = memberDirectorySearch.trim().toLowerCase();
  const filteredMembers = memberDirectoryQuery
    ? members.filter((member) =>
        [
          member.id,
          member.name,
          member.group,
          member.contactNumber,
          member.status,
          formatDate(member.membershipDate)
        ]
          .join(" ")
          .toLowerCase()
          .includes(memberDirectoryQuery)
      )
    : members;
  const memberDirectoryPageCount = Math.max(1, Math.ceil(filteredMembers.length / memberDirectoryPageSize));
  const currentMemberDirectoryPage = Math.min(memberDirectoryPage, memberDirectoryPageCount);
  const memberDirectoryStart = (currentMemberDirectoryPage - 1) * memberDirectoryPageSize;
  const pagedMembers = filteredMembers.slice(
    memberDirectoryStart,
    memberDirectoryStart + memberDirectoryPageSize
  );
  const memberDirectoryShowingStart = filteredMembers.length === 0 ? 0 : memberDirectoryStart + 1;
  const memberDirectoryShowingEnd = Math.min(memberDirectoryStart + memberDirectoryPageSize, filteredMembers.length);
  const canUseTellerWorkspace =
    canCreateInitialPayment ||
    canCreateShareCapitalContribution ||
    canCreateSavingsDeposit ||
    canCreateSavingsWithdrawal ||
    canCreateCbuWithdrawal;
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
      })),
    ...cbuWithdrawals
      .filter((withdrawal) => withdrawal.status === "Teller Batch")
      .map((withdrawal) => ({
        ...withdrawal, batchType: "CBU Withdrawal", cashReceived: 0,
        cashOut: withdrawal.amount, shareCapitalAmount: -withdrawal.amount,
        membershipFeeAmount: 0, savingsDepositAmount: 0
      })),
    ...loanReleases
      .filter((release) => release.status === "Teller Batch")
      .map((release) => ({
        id: release.releaseNo,
        memberName: release.memberName,
        batchId: release.batchId,
        batchType: "Loan Release",
        cashReceived: 0,
        cashOut: release.cashReleased,
        shareCapitalAmount: 0,
        membershipFeeAmount: 0,
        savingsDepositAmount: 0,
        status: release.status
      })),
    ...loanCollections
      .filter((collection) => collection.status === "Teller Batch")
      .map((collection) => ({
        id: collection.collectionNo,
        memberName: collection.memberName,
        batchId: collection.batchId,
        batchType: "Loan Collection",
        cashReceived: collection.amountReceived,
        cashOut: 0,
        shareCapitalAmount: 0,
        membershipFeeAmount: 0,
        savingsDepositAmount: 0,
        status: collection.status
      })),
    ...memberDuesPayments
      .filter((payment) => payment.status === "Teller Batch")
      .map((payment) => ({
        id: payment.paymentNo, memberName: payment.memberName, batchId: payment.batchId,
        batchType: "Cost Center Dues Payment", cashReceived: payment.cashReceived,
        cashOut: 0, shareCapitalAmount: 0, membershipFeeAmount: 0,
        savingsDepositAmount: 0, status: payment.status
      })),
    ...securedSavingsWithdrawals
      .filter((withdrawal) => withdrawal.status === "Teller Batch")
      .map((withdrawal) => ({ ...withdrawal, batchType: "Secured Savings Withdrawal",
        cashReceived: 0, cashOut: withdrawal.amount, shareCapitalAmount: 0,
        membershipFeeAmount: 0, savingsDepositAmount: 0 })),
    ...monthlyContributionBatches
      .filter((contribution) => contribution.status === "Teller Batch")
      .map((contribution) => ({ id: contribution.batchNo, batchId: contribution.tellerBatchNo,
        memberName: `${contribution.entryCount} member${contribution.entryCount === 1 ? "" : "s"}`,
        batchType: "Monthly Member Contributions", cashReceived: contribution.totalAmount, cashOut: 0,
        shareCapitalAmount: contribution.cbuTotal, membershipFeeAmount: 0,
        savingsDepositAmount: contribution.securedSavingsTotal, status: contribution.status }))
    ,...dailyRemittanceBatches
      .filter((batch) => batch.status === "Teller Batch")
      .map((batch) => ({ id: batch.batchNo, batchId: batch.tellerBatchNo,
        memberName: `${batch.entryCount} remittance source${batch.entryCount === 1 ? "" : "s"}`,
        batchType: "Daily Remittance", cashReceived: batch.totalAmount, cashOut: 0,
        shareCapitalAmount: 0, membershipFeeAmount: 0, savingsDepositAmount: 0, status: batch.status }))
    ,...dailyDisbursementBatches
      .filter((batch) => batch.status === "Teller Batch")
      .map((batch) => ({ id: batch.batchNo, batchId: batch.tellerBatchNo,
        memberName: `${batch.entryCount} disbursement categor${batch.entryCount === 1 ? "y" : "ies"}`,
        batchType: "Daily Disbursement", cashReceived: 0, cashOut: batch.totalAmount,
        shareCapitalAmount: 0, membershipFeeAmount: 0, savingsDepositAmount: 0, status: batch.status }))
  ].filter((row) => row.batchId === activeBatch?.id);
  const tellerBatchSummary = buildTellerBatchSummary(tellerBatchRows);
  const statementPreviousLoanTotal = statement
    ? previousLoanRows.reduce((total, row) => addMoney(total, row.outstandingBalance), 0)
    : 0;
  const statementCurrentLoans = statement?.currentLoans || [];
  const statementCurrentLoanTotal = statementCurrentLoans
    .reduce((total, row) => addMoney(total, row.outstandingBalance), 0);
  const statementCombinedLoanTotal = addMoney(statementPreviousLoanTotal, statementCurrentLoanTotal);
  const previousLoanControl = statement?.previousLoanControl || { status: "Not Set", revision: 0 };
  const previousLoanUnlockRequests = statement?.previousLoanUnlockRequests || [];
  const pendingPreviousLoanUnlockRequest = previousLoanUnlockRequests.find((item) => item.status === "Pending");
  const canModifyPreviousLoans = canEditPreviousLoans && previousLoanControl.status !== "Locked";
  const activePreviousLoanProducts = previousLoanProducts.filter((product) => product.status === "Active");

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
          cbuWithdrawalRows,
          securedWithdrawalRows,
          loanReleaseRows,
          loanCollectionRows,
          loanProductRows,
          monthlyContributionRows,
          dailyRemittanceRows,
          dailyDisbursementRows,
          memberDuesPaymentRows,
          cashCountData
        ] =
          await Promise.all([
          api("/api/members"),
          canViewApplications ? api("/api/member-applications") : [],
          canViewInitialPayments ? api("/api/initial-member-payments") : [],
          canViewShareCapitalContributions ? api("/api/share-capital-contributions") : [],
          canViewSavingsDeposits ? api("/api/savings-deposits") : [],
          canViewSavingsWithdrawals ? api("/api/savings-withdrawals") : [],
          canViewCbuWithdrawals ? api("/api/cbu-withdrawals") : [],
          canViewSavingsWithdrawals ? api("/api/secured-savings-withdrawals") : [],
          canViewLoanReleases ? api("/api/loan-releases") : [],
          canViewLoanCollections ? api("/api/loan-collections") : [],
          canViewLoanProducts ? api("/api/loan-products") : [],
          canViewMonthlyContributions ? api("/api/monthly-contribution-batches") : [],
          canViewDailyRemittances ? api("/api/daily-remittance-batches") : [],
          canViewDailyDisbursements ? api("/api/daily-disbursement-batches") : [],
          canViewMemberDuesPayments ? api("/api/member-dues-payments") : [],
          canViewTellerCashCount ? api("/api/teller-cash-count") : { latestCashCount: null }
        ]);
        setMembers(memberRows);
        setApplications(applicationRows);
        setInitialPayments(paymentRows);
        setShareCapitalContributions(contributionRows);
        setSavingsDeposits(savingsRows);
        setSavingsWithdrawals(withdrawalRows);
        setCbuWithdrawals(cbuWithdrawalRows);
        setSecuredSavingsWithdrawals(securedWithdrawalRows);
        setLoanReleases(loanReleaseRows);
        setLoanCollections(loanCollectionRows);
        setPreviousLoanProducts(loanProductRows);
        setMonthlyContributionBatches(monthlyContributionRows);
        setDailyRemittanceBatches(dailyRemittanceRows);
        setDailyDisbursementBatches(dailyDisbursementRows);
        setMemberDuesPayments(memberDuesPaymentRows);
        setActiveBatch(cashCountData.activeBatch);
        setOpeningFunding(Number(cashCountData.expected?.openingFunding || 0));
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
      canViewCbuWithdrawals,
      canViewLoanReleases,
      canViewLoanCollections,
      canViewLoanProducts,
      canViewMonthlyContributions,
      canViewDailyRemittances,
      canViewDailyDisbursements,
      canViewMemberDuesPayments,
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

  function updateBeneficiaryForm(index, field, value) {
    setForm((current) => ({ ...current, beneficiaries: current.beneficiaries.map((row, rowIndex) =>
      rowIndex === index ? { ...row, [field]: value } : row) }));
  }

  function updateProfileBeneficiary(index, field, value) {
    setMemberProfileForm((current) => ({ ...current, beneficiaries: current.beneficiaries.map((row, rowIndex) =>
      rowIndex === index ? { ...row, [field]: value } : row) }));
  }

  function selectTellerMember(memberId) {
    setSelectedTellerMemberId(memberId);
    updatePaymentForm("memberId", memberId);
    updateShareCapitalContributionForm("memberId", memberId);
    updateSavingsDepositForm("memberId", memberId);
    updateSavingsWithdrawalForm("memberId", memberId);
    setCbuWithdrawalForm((current) => ({ ...current, memberId }));
    setSecuredSavingsWithdrawalForm((current) => ({ ...current, memberId }));
  }

  function updatePaymentForm(field, value) {
    setPaymentForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "shareCapitalAmount" || field === "membershipFeeAmount" || field === "savingsDepositAmount") {
        next.cashReceived = addMoney(
          next.shareCapitalAmount,
          next.membershipFeeAmount,
          next.savingsDepositAmount
        );
      }

      return next;
    });
  }

  function updateSavingsDepositForm(field, value) {
    setSavingsDepositForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "amount") {
        next.cashReceived = moneyValue(next.amount);
      }

      return next;
    });
  }

  function updateShareCapitalContributionForm(field, value) {
    setShareCapitalContributionForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "amount") {
        next.cashReceived = moneyValue(next.amount);
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
        clusterName: memberClassifications[0],
        contactNumber: "",
        gender: "",
        idType: "",
        idNumber: "",
        spouseName: "",
        beneficiaries: [{ name: "", age: 0, relationship: "" }],
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

  async function submitCbuWithdrawal(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const data = await api("/api/cbu-withdrawals", {
        method: "POST",
        body: JSON.stringify(cbuWithdrawalForm)
      });
      setMessage(data.withdrawal.status === "For Funding"
        ? `${data.withdrawal.id} saved for funding. Cashier funding shortage: ${formatMoney(data.fundingShortage)}.`
        : `${data.withdrawal.id} released into the Teller batch for ${data.withdrawal.memberName}.`);
      setCbuWithdrawalForm((current) => ({ ...current, amount: 500, referenceNo: "" }));
      await loadMembersWorkflow();
    } catch (withdrawalError) {
      if (withdrawalError.code === "CBU_RETENTION_GUARDRAIL") {
        setCbuGuardrailDetails(withdrawalError.details || null);
        cbuGuardrailNotice.onOpen();
      } else setError(withdrawalError.message);
    }
  }

  async function releaseCbuWithdrawalRequest(withdrawalId) {
    setError("");
    setMessage("");
    try {
      const data = await api(`/api/cbu-withdrawals/${withdrawalId}/release`, { method: "POST" });
      setMessage(`${data.withdrawal.id} released into the current Teller batch.`);
      await loadMembersWorkflow();
    } catch (withdrawalError) {
      if (withdrawalError.code === "CBU_RETENTION_GUARDRAIL") {
        setCbuGuardrailDetails(withdrawalError.details || null);
        cbuGuardrailNotice.onOpen();
      } else setError(withdrawalError.message);
    }
  }

  async function submitSecuredSavingsWithdrawal(event) {
    event.preventDefault(); setError(""); setMessage("");
    try {
      const data = await api("/api/secured-savings-withdrawals", {
        method: "POST", body: JSON.stringify(securedSavingsWithdrawalForm)
      });
      setMessage(`${data.withdrawal.id} recorded for ${data.withdrawal.memberName}.`);
      setSecuredSavingsWithdrawalForm({ memberId: securedSavingsWithdrawalForm.memberId,
        amount: 500, referenceNo: "" });
      await loadMembersWorkflow();
    } catch (withdrawalError) { setError(withdrawalError.message); }
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
      setCashCountForm({ actualCash: "0.00", tellerNote: "" });
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
        gender: data.member.gender || "",
        idType: data.member.idType || "",
        idNumber: data.member.idNumber || "",
        spouseName: data.member.spouseName || "",
        beneficiaries: data.member.beneficiaries?.length
          ? data.member.beneficiaries.map((row) => ({
              name: row.name || "", age: Number(row.age || 0), relationship: row.relationship || ""
            }))
          : [{ name: "", age: 0, relationship: "" }],
        civilStatus: data.member.civilStatus || "",
        occupation: data.member.occupation || "",
        membershipDate: data.member.membershipDate ? String(data.member.membershipDate).slice(0, 10) : "",
        previousLoanBalance: Number(data.member.previousLoanBalance || 0),
        status: data.member.status || "Active"
      });
      setPreviousLoanRows(
        (data.previousLoans || []).map((row) => ({
          id: row.id,
          loanLabel: row.loanLabel || "",
          applicationDate: row.applicationDate ? String(row.applicationDate).slice(0, 10) : "",
          outstandingBalance: Number(row.outstandingBalance || 0),
          notes: row.notes || ""
        }))
      );
      setPreviousLoanUnlockReason("");
      setPreviousLoanDecisionRemarks("");
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

  function addPreviousLoanRow() {
    setPreviousLoanRows((current) => [
      ...current,
      {
        id: `new-${Date.now()}`,
        loanLabel: activePreviousLoanProducts[0]?.name || "",
        applicationDate: "",
        outstandingBalance: 0,
        notes: ""
      }
    ]);
  }

  function updatePreviousLoanRow(index, field, value) {
    setPreviousLoanRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
    );
  }

  function removePreviousLoanRow(index) {
    setPreviousLoanRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  async function submitPreviousLoans(event) {
    event.preventDefault();

    if (!statement) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const data = await api(`/api/members/${statement.member.id}/previous-loans`, {
        method: "PUT",
        body: JSON.stringify({ previousLoans: previousLoanRows })
      });
      setStatement((current) => ({
        ...current,
        previousLoans: data.previousLoans,
        previousLoanControl: data.control,
        previousLoanUnlockRequests: data.unlockRequests
      }));
      setPreviousLoanRows(
        data.previousLoans.map((row) => ({
          id: row.id,
          loanLabel: row.loanLabel || "",
          applicationDate: row.applicationDate ? String(row.applicationDate).slice(0, 10) : "",
          outstandingBalance: Number(row.outstandingBalance || 0),
          notes: row.notes || ""
        }))
      );
      setMessage(`${statement.member.id} previous loans updated.`);
      await loadMembersWorkflow();
    } catch (previousLoanError) {
      setError(previousLoanError.message);
    }
  }

  async function requestPreviousLoanUnlock() {
    if (!statement) return;
    setError(""); setMessage("");
    try {
      const data = await api(`/api/members/${statement.member.id}/previous-loans/unlock-requests`, {
        method: "POST", body: JSON.stringify({ reason: previousLoanUnlockReason })
      });
      setStatement((current) => ({ ...current, previousLoanControl: data.control,
        previousLoanUnlockRequests: data.unlockRequests }));
      setPreviousLoanUnlockReason("");
      setMessage("Unlock request submitted for Loan Officer approval.");
    } catch (unlockError) { setError(unlockError.message); }
  }

  async function decidePreviousLoanUnlock(decision) {
    if (!statement || !pendingPreviousLoanUnlockRequest) return;
    setError(""); setMessage("");
    try {
      const data = await api(
        `/api/members/${statement.member.id}/previous-loans/unlock-requests/${pendingPreviousLoanUnlockRequest.requestNo}/decision`,
        { method: "POST", body: JSON.stringify({ decision, remarks: previousLoanDecisionRemarks }) }
      );
      setStatement((current) => ({ ...current, previousLoanControl: data.control,
        previousLoanUnlockRequests: data.unlockRequests }));
      setPreviousLoanDecisionRemarks("");
      setMessage(decision === "Approved" ? "Previous loans unlocked for one revision." : "Unlock request rejected.");
    } catch (decisionError) { setError(decisionError.message); }
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
          {canViewMemberCharges ? <Tab flexShrink={0}>Cost Center Charges</Tab> : null}
          {canViewMemberDuesPayments ? <Tab flexShrink={0}>Cost Center Payments</Tab> : null}
          {canViewMonthlyContributions ? <Tab flexShrink={0}>Monthly Contributions</Tab> : null}
          {canViewDailyRemittances ? <Tab flexShrink={0}>Daily Remittance</Tab> : null}
          {canViewDailyDisbursements ? <Tab flexShrink={0}>Daily Disbursement</Tab> : null}
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
            Membership Officer encodes the application. Administrator or Manager approval creates the member record for Teller payment.
          </Text>
          <Grid templateColumns={{ base: "1fr", lg: "1.2fr 1fr" }} gap={4}>
            <FormControl isRequired>
              <FormLabel>Full name</FormLabel>
              <Input value={form.fullName} onChange={(event) => updateForm("fullName", event.target.value)} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Cluster</FormLabel>
              <Select value={form.clusterName} onChange={(event) => updateForm("clusterName", event.target.value)}>
                {memberClassifications.map((classification) => (
                  <option key={classification} value={classification}>{classification}</option>
                ))}
              </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Contact number</FormLabel>
              <Input
                value={form.contactNumber}
                onChange={(event) => updateForm("contactNumber", event.target.value)}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Gender</FormLabel>
              <Select
                placeholder="Select gender"
                value={form.gender}
                onChange={(event) => updateForm("gender", event.target.value)}
              >
                {memberApplicationGenders.map((gender) => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>ID Type</FormLabel>
              <OptionCombobox
                options={memberApplicationIdTypes}
                placeholder="Search ID type"
                value={form.idType}
                onChange={(idType) => updateForm("idType", idType)}
                noMatchesText="No ID types match."
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>ID Number</FormLabel>
              <Input value={form.idNumber} onChange={(event) => updateForm("idNumber", event.target.value)} />
            </FormControl>
            <Box gridColumn={{ base: "1", lg: "1 / -1" }} borderWidth="1px" borderRadius="md" p={4}>
              <FormControl>
                <FormLabel>Spouse</FormLabel>
                <Input placeholder="Full name (if applicable)" value={form.spouseName}
                  onChange={(event) => updateForm("spouseName", event.target.value)} />
              </FormControl>
            </Box>
            <Box gridColumn={{ base: "1", lg: "1 / -1" }} borderWidth="1px" borderRadius="md" p={4}>
              <Flex justify="space-between" align="center" mb={3}>
                <Box><FormLabel mb={0}>Beneficiaries</FormLabel><Text fontSize="xs" color="gray.500">Add one to three beneficiaries.</Text></Box>
                <Button type="button" size="sm" variant="outline" isDisabled={form.beneficiaries.length >= 3}
                  onClick={() => setForm((current) => ({ ...current, beneficiaries: [
                    ...current.beneficiaries, { name: "", age: 0, relationship: "" }
                  ] }))}>Add Beneficiary</Button>
              </Flex>
              <VStack align="stretch" spacing={3}>{form.beneficiaries.map((beneficiary, index) =>
                <Grid key={index} templateColumns={{ base: "1fr", md: "2fr 0.7fr 1.5fr auto" }} gap={3} alignItems="end">
                  <FormControl isRequired><FormLabel>Name</FormLabel><Input value={beneficiary.name}
                    onChange={(event) => updateBeneficiaryForm(index, "name", event.target.value)} /></FormControl>
                  <FormControl isRequired><FormLabel>Age</FormLabel><NumberInput min={0} max={150} precision={0}
                    value={beneficiary.age} onChange={(value) => updateBeneficiaryForm(index, "age", Number(value || 0))}>
                    <NumberInputField /></NumberInput></FormControl>
                  <FormControl isRequired><FormLabel>Relationship</FormLabel><Input value={beneficiary.relationship}
                    onChange={(event) => updateBeneficiaryForm(index, "relationship", event.target.value)} /></FormControl>
                  <Button type="button" variant="outline" colorScheme="red" isDisabled={form.beneficiaries.length === 1}
                    onClick={() => setForm((current) => ({ ...current,
                      beneficiaries: current.beneficiaries.filter((_, rowIndex) => rowIndex !== index)
                    }))}>Remove</Button>
                </Grid>)}</VStack>
            </Box>
            <FormControl>
              <FormLabel>Required Initial Share Capital</FormLabel>
              <NumberInput
                min={0}
                precision={2}
                step={0.01}
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
                  <Th>Gender</Th>
                  <Th>ID</Th>
                  <Th>Spouse</Th>
                  <Th>Beneficiary</Th>
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
                    <Td>{application.gender}</Td>
                    <Td>{application.idType}<br />{application.idNumber}</Td>
                    <Td>{application.spouseName || "—"}</Td>
                    <Td>{(application.beneficiaries || []).map((beneficiary, index) =>
                      <Text key={index}>{index + 1}. {beneficiary.name}, age {beneficiary.age} · {beneficiary.relationship}</Text>)}</Td>
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
                    <Td colSpan={canApproveApplication ? 10 : 9} color="gray.500">
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
          <Grid templateColumns={{ base: "1fr", lg: "1.2fr repeat(4, 1fr)" }} gap={4} mb={5}>
            <FormControl isRequired>
              <FormLabel>Member</FormLabel>
              <MemberCombobox
                members={activeMembers}
                value={selectedTellerMemberId}
                onChange={selectTellerMember}
                placeholder="Search active member name or number"
              />
              <Text color="gray.500" fontSize="xs" mt={1}>
                Search and select from {activeMembers.length} active members
              </Text>
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
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Secured Savings</Text>
              <Text fontWeight="bold">{selectedTellerMember ? formatMoney(selectedTellerMember.securedSavings) : "-"}</Text>
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
                {canCreateCbuWithdrawal ? <option value="cbu-withdrawal">CBU / Share Capital withdrawal</option> : null}
                {canCreateSavingsWithdrawal ? <option value="secured-savings-withdrawal">Secured savings withdrawal</option> : null}
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
                    precision={2}
                    step={0.01}
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
                    precision={2}
                    step={0.01}
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
                    precision={2}
                    step={0.01}
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
                    precision={2}
                    step={0.01}
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
                    min={0.01}
                    precision={2}
                    step={0.01}
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
                    precision={2}
                    step={0.01}
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
                    min={0.01}
                    precision={2}
                    step={0.01}
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
                    precision={2}
                    step={0.01}
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
                    min={0.01}
                    precision={2}
                    step={0.01}
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

          {tellerTransactionType === "secured-savings-withdrawal" && canCreateSavingsWithdrawal ? (
            <Box as="form" onSubmit={submitSecuredSavingsWithdrawal}>
              <Text color="gray.600" mb={4}>Withdraws only from the member's posted Secured Savings balance.</Text>
              <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={4}>
                <FormControl isRequired><FormLabel>Secured savings withdrawal</FormLabel>
                  <NumberInput min={0.01} precision={2} step={0.01} value={securedSavingsWithdrawalForm.amount}
                    onChange={(value) => setSecuredSavingsWithdrawalForm((current) => ({ ...current, amount: Number(value || 0) }))}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl isRequired><FormLabel>Voucher / reference no.</FormLabel>
                  <Input value={securedSavingsWithdrawalForm.referenceNo}
                    onChange={(event) => setSecuredSavingsWithdrawalForm((current) => ({ ...current, referenceNo: event.target.value }))} />
                </FormControl>
              </Grid>
              <HStack mt={5} spacing={4} align="center" flexWrap="wrap">
                <Button type="submit" colorScheme="green" isDisabled={!selectedTellerMemberId}>Record secured withdrawal</Button>
                {message ? <Text color="green.600">{message}</Text> : null}
                {error ? <Text color="red.500">{error}</Text> : null}
              </HStack>
            </Box>
          ) : null}

          {tellerTransactionType === "cbu-withdrawal" && canCreateCbuWithdrawal ? (
            <Box as="form" onSubmit={submitCbuWithdrawal}>
              <Text color="gray.600" mb={4}>
                The member must retain ₱5,000 plus current manual and system loan exposure.
                Pending CBU withdrawals are reserved until posted.
              </Text>
              <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={4}>
                <FormControl isRequired>
                  <FormLabel>CBU withdrawal amount</FormLabel>
                  <NumberInput min={0.01} precision={2} step={0.01} value={cbuWithdrawalForm.amount}
                    onChange={(value) => setCbuWithdrawalForm((current) => ({
                      ...current, amount: Number(value || 0)
                    }))}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Voucher / reference no.</FormLabel>
                  <Input value={cbuWithdrawalForm.referenceNo}
                    onChange={(event) => setCbuWithdrawalForm((current) => ({
                      ...current, referenceNo: event.target.value
                    }))} />
                </FormControl>
              </Grid>
              <HStack mt={5} spacing={4} align="center" flexWrap="wrap">
                <Button type="submit" colorScheme="green" isDisabled={!selectedTellerMemberId}>
                  Process CBU withdrawal
                </Button>
                {message ? <Text color="green.600">{message}</Text> : null}
                {error ? <Text color="red.500">{error}</Text> : null}
              </HStack>
            </Box>
          ) : null}

          <Box mt={6} borderTopWidth="1px" pt={5}>
            <TellerBatchCashPosition
              activeBatch={activeBatch}
              openingFunding={openingFunding}
              rows={tellerBatchRows}
            />
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
                    <Text color="gray.500" fontSize="sm">Opening Funding</Text>
                    <Text fontWeight="bold">{formatMoney(openingFunding)}</Text>
                  </Box>
                  <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Text color="gray.500" fontSize="sm">
                      Expected Ending Cash
                    </Text>
                    <Text fontWeight="bold">
                      {formatMoney(addMoney(openingFunding, tellerBatchSummary.cashIn, -tellerBatchSummary.cashOut))}
                    </Text>
                  </Box>
                  <FormControl isRequired>
                    <FormLabel>Actual cash counted</FormLabel>
                    <NumberInput
                      min={0}
                      precision={2}
                      step={0.01}
                      value={cashCountForm.actualCash}
                      onChange={(value) => setCashCountForm((current) => ({ ...current, actualCash: value }))}
                    >
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>
                  <Box borderWidth="1px" borderRadius="md" p={4}>
                    <Text color="gray.500" fontSize="sm">
                      Variance
                    </Text>
                    <Text fontWeight="bold">
                      {formatMoney(
                        addMoney(cashCountForm.actualCash, -tellerBatchSummary.cashIn, tellerBatchSummary.cashOut)
                      )}
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
                <FormControl mt={4}>
                  <FormLabel>Teller endorsement note</FormLabel>
                  <Textarea
                    value={cashCountForm.tellerNote}
                    maxLength={500}
                    onChange={(event) => setCashCountForm((current) => ({
                      ...current,
                      tellerNote: event.target.value
                    }))}
                    placeholder="Optional note for the Bookkeeper reviewing this cash count."
                  />
                  <Text color="gray.500" fontSize="xs" mt={1}>
                    {cashCountForm.tellerNote.length}/500 characters
                  </Text>
                </FormControl>
                {latestCashCount ? (
                  <Box mt={3}>
                    <Text color="gray.600" fontSize="sm">
                      Latest submitted by {latestCashCount.submittedBy}: expected {formatMoney(latestCashCount.expectedCash)},
                      actual {formatMoney(latestCashCount.actualCash)}, variance {formatMoney(latestCashCount.variance)}.
                    </Text>
                    {latestCashCount.tellerNote ? (
                      <Text color="gray.700" fontSize="sm" mt={1}>
                        Endorsement note: {latestCashCount.tellerNote}
                      </Text>
                    ) : null}
                  </Box>
                ) : null}
              </Box>
            ) : null}
          </Box>
        </Box>
      ) : null}
              </VStack>
            </TabPanel>
          ) : null}

          {canViewMemberCharges ? (
            <TabPanel px={0}>{canEncodeMemberCharges
              ? <MemberChargeCapture members={members} user={user} />
              : <MemberChargeReview />}</TabPanel>
          ) : null}
          {canViewMemberDuesPayments ? (
            <TabPanel px={0}><MemberDuesPayments members={members} user={user} /></TabPanel>
          ) : null}

          {canViewMonthlyContributions ? (
            <TabPanel px={0}><MonthlyContributionCapture members={members} user={user} /></TabPanel>
          ) : null}

          {canViewDailyRemittances ? (
            <TabPanel px={0}><DailyRemittanceCapture user={user} /></TabPanel>
          ) : null}

          {canViewDailyDisbursements ? (
            <TabPanel px={0}><DailyDisbursementCapture user={user} /></TabPanel>
          ) : null}

          <TabPanel px={0}>
            <VStack align="stretch" spacing={5}>
      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Flex justify="space-between" align="flex-start" gap={4} wrap="wrap" mb={4}>
          <Box>
            <Heading size="md">Active Members</Heading>
            <Text color="gray.600" fontSize="sm" mt={1}>
              Showing {memberDirectoryShowingStart}-{memberDirectoryShowingEnd} of {filteredMembers.length}
              {filteredMembers.length === members.length ? " members" : ` matches from ${members.length} members`}
            </Text>
          </Box>
          <Flex gap={3} wrap="wrap" justify={{ base: "flex-start", md: "flex-end" }}>
            <Input
              size="sm"
              value={memberDirectorySearch}
              onChange={(event) => {
                setMemberDirectorySearch(event.target.value);
                setMemberDirectoryPage(1);
              }}
              placeholder="Filter members"
              maxW={{ base: "100%", md: "260px" }}
            />
            <Select
              size="sm"
              value={memberDirectoryPageSize}
              onChange={(event) => {
                setMemberDirectoryPageSize(Number(event.target.value));
                setMemberDirectoryPage(1);
              }}
              w="110px"
            >
              {memberDirectoryPageSizeOptions.map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize} rows
                </option>
              ))}
            </Select>
          </Flex>
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
              {pagedMembers.map((member) => (
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
              {pagedMembers.length === 0 ? (
                <Tr>
                  <Td colSpan={9} color="gray.500">
                    No members match the current filter.
                  </Td>
                </Tr>
              ) : null}
            </Tbody>
          </Table>
        </TableContainer>
        <Flex justify="space-between" align="center" gap={4} wrap="wrap" mt={4}>
          <Text color="gray.600" fontSize="sm">
            Page {currentMemberDirectoryPage} of {memberDirectoryPageCount}
          </Text>
          <Flex gap={2} wrap="wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMemberDirectoryPage(1)}
              isDisabled={currentMemberDirectoryPage === 1}
            >
              First
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMemberDirectoryPage((page) => Math.max(1, page - 1))}
              isDisabled={currentMemberDirectoryPage === 1}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMemberDirectoryPage((page) => Math.min(memberDirectoryPageCount, page + 1))}
              isDisabled={currentMemberDirectoryPage === memberDirectoryPageCount}
            >
              Next
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMemberDirectoryPage(memberDirectoryPageCount)}
              isDisabled={currentMemberDirectoryPage === memberDirectoryPageCount}
            >
              Last
            </Button>
          </Flex>
        </Flex>
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
            <HStack>
              <Button size="sm" variant="outline" onClick={() => loadMemberStatement(statement.member.id)}>
                Refresh Profile
              </Button>
              <Button size="sm" onClick={() => setStatement(null)}>
                Close
              </Button>
            </HStack>
          </Flex>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap={4} mb={5}>
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
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Secured Savings</Text>
              <Text fontWeight="bold">{formatMoney(statement.member.securedSavings)}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">
                Historical Loans
              </Text>
              <Text fontWeight="bold">{formatMoney(statementPreviousLoanTotal)}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Current / System Loans</Text>
              <Text fontWeight="bold">{formatMoney(statementCurrentLoanTotal)}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Combined Loan Balance</Text>
              <Text fontWeight="bold">{formatMoney(statementCombinedLoanTotal)}</Text>
            </Box>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="gray.500" fontSize="sm">Cost Center Payables</Text>
              <Text fontWeight="bold">{formatMoney(statement.memberChargePayableBalance || 0)}</Text>
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
                {canEditMemberProfile ? (
                  <Select
                    value={memberProfileForm.group}
                    onChange={(event) => updateMemberProfileForm("group", event.target.value)}
                  >
                    {memberClassifications.map((classification) => (
                      <option key={classification} value={classification}>{classification}</option>
                    ))}
                  </Select>
                ) : (
                  <Input value={memberProfileForm.group} isReadOnly />
                )}
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
                <FormLabel>Gender</FormLabel>
                <Select
                  value={memberProfileForm.gender}
                  onChange={(event) => updateMemberProfileForm("gender", event.target.value)}
                  isDisabled={!canEditMemberProfile}
                >
                  <option value="">Unspecified</option>
                  {memberApplicationGenders.map((gender) => (
                    <option key={gender} value={gender}>{gender}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>ID Type</FormLabel>
                {canEditMemberProfile ? (
                  <OptionCombobox
                    options={memberApplicationIdTypes}
                    placeholder="Search ID type"
                    value={memberProfileForm.idType}
                    onChange={(idType) => updateMemberProfileForm("idType", idType)}
                    noMatchesText="No ID types match."
                    isRequired={false}
                  />
                ) : (
                  <Input value={memberProfileForm.idType} isReadOnly />
                )}
              </FormControl>
              <FormControl>
                <FormLabel>ID Number</FormLabel>
                <Input
                  value={memberProfileForm.idNumber}
                  onChange={(event) => updateMemberProfileForm("idNumber", event.target.value)}
                  isReadOnly={!canEditMemberProfile}
                />
              </FormControl>
              <Box gridColumn={{ base: "1", md: "1 / -1" }} borderWidth="1px" borderRadius="md" p={4}>
                <FormControl>
                  <FormLabel>Spouse</FormLabel>
                  <Input placeholder="Full name (if applicable)" value={memberProfileForm.spouseName}
                    onChange={(event) => updateMemberProfileForm("spouseName", event.target.value)}
                    isReadOnly={!canEditMemberProfile} />
                </FormControl>
              </Box>
              <Box gridColumn={{ base: "1", md: "1 / -1" }} borderWidth="1px" borderRadius="md" p={4}>
                <Flex justify="space-between" align="center" mb={3}>
                  <Box><FormLabel mb={0}>Beneficiaries</FormLabel><Text fontSize="xs" color="gray.500">One to three beneficiary records.</Text></Box>
                  {canEditMemberProfile ? <Button type="button" size="sm" variant="outline"
                    isDisabled={memberProfileForm.beneficiaries.length >= 3}
                    onClick={() => setMemberProfileForm((current) => ({ ...current, beneficiaries: [
                      ...current.beneficiaries, { name: "", age: 0, relationship: "" }
                    ] }))}>Add Beneficiary</Button> : null}
                </Flex>
                <VStack align="stretch" spacing={3}>{memberProfileForm.beneficiaries.map((beneficiary, index) =>
                  <Grid key={index} templateColumns={{ base: "1fr", md: "2fr 0.7fr 1.5fr auto" }} gap={3} alignItems="end">
                    <FormControl isRequired><FormLabel>Name</FormLabel><Input value={beneficiary.name}
                      onChange={(event) => updateProfileBeneficiary(index, "name", event.target.value)}
                      isReadOnly={!canEditMemberProfile} /></FormControl>
                    <FormControl isRequired><FormLabel>Age</FormLabel><NumberInput min={0} max={150} precision={0}
                      value={beneficiary.age} onChange={(value) => updateProfileBeneficiary(index, "age", Number(value || 0))}
                      isReadOnly={!canEditMemberProfile}><NumberInputField /></NumberInput></FormControl>
                    <FormControl isRequired><FormLabel>Relationship</FormLabel><Input value={beneficiary.relationship}
                      onChange={(event) => updateProfileBeneficiary(index, "relationship", event.target.value)}
                      isReadOnly={!canEditMemberProfile} /></FormControl>
                    {canEditMemberProfile ? <Button type="button" variant="outline" colorScheme="red"
                      isDisabled={memberProfileForm.beneficiaries.length === 1}
                      onClick={() => setMemberProfileForm((current) => ({ ...current,
                        beneficiaries: current.beneficiaries.filter((_, rowIndex) => rowIndex !== index)
                      }))}>Remove</Button> : null}
                  </Grid>)}</VStack>
              </Box>
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

          <Box borderWidth="1px" borderRadius="md" p={4} mb={5}>
            <Heading size="sm">Current / System Loans</Heading>
            <Text color="gray.600" mt={1} mb={4}>
              Loans created through the application workflow. Balances reflect recorded collections and cannot be edited here.
            </Text>
            <TableContainer>
              <Table size="sm">
                <Thead><Tr><Th>Loan</Th><Th>Product</Th><Th>Status</Th><Th>Next Due</Th>
                  <Th isNumeric>Principal</Th><Th isNumeric>Paid</Th><Th isNumeric>Outstanding</Th></Tr></Thead>
                <Tbody>
                  {statementCurrentLoans.map((loan) => (
                    <Tr key={loan.loanNo}>
                      <Td><Text fontWeight="bold">{loan.loanNo}</Text>
                        <Text color="gray.500" fontSize="xs">{loan.applicationNo}</Text></Td>
                      <Td>{loan.productName || loan.productCode}</Td>
                      <Td><Badge>{loan.status}</Badge></Td>
                      <Td>{loan.nextDueDate ? <>{formatDate(loan.nextDueDate)}<br />
                        <Text color="gray.500" fontSize="xs">{formatMoney(loan.nextDueAmount)}</Text></> : "-"}</Td>
                      <Td isNumeric>{formatMoney(loan.principal)}</Td>
                      <Td isNumeric>{formatMoney(loan.amountPaid)}</Td>
                      <Td isNumeric fontWeight="bold">{formatMoney(loan.outstandingBalance)}</Td>
                    </Tr>
                  ))}
                  {statementCurrentLoans.length === 0 ? (
                    <Tr><Td colSpan={7} color="gray.500">No system loans recorded.</Td></Tr>
                  ) : null}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>

          <Box
            as={canModifyPreviousLoans ? "form" : "div"}
            onSubmit={canModifyPreviousLoans ? submitPreviousLoans : undefined}
            borderWidth="1px"
            borderRadius="md"
            p={4}
            mb={5}
          >
            <Flex justify="space-between" align="center" gap={4} wrap="wrap" mb={4}>
              <Box>
                <Heading size="sm">Previous / Existing Loans</Heading>
                <Text color="gray.600" mt={1}>
                  Historical loan balances captured during member setup. These do not create new cash releases.
                </Text>
              </Box>
              {canModifyPreviousLoans ? (
                <HStack>
                  <Button type="button" size="sm" variant="outline" onClick={addPreviousLoanRow}>
                    Add Loan
                  </Button>
                  <Button type="submit" size="sm" colorScheme="green">
                    Save Loans
                  </Button>
                </HStack>
              ) : (
                <HStack>
                  <Badge colorScheme={previousLoanControl.status === "Locked" ? "red" : "gray"}>
                    {previousLoanControl.status}
                  </Badge>
                  {previousLoanControl.revision ? <Badge>Revision {previousLoanControl.revision}</Badge> : null}
                </HStack>
              )}
            </Flex>
            {previousLoanControl.status === "Locked" ? (
              <Box bg="orange.50" borderWidth="1px" borderColor="orange.200" borderRadius="md" p={3} mb={4}>
                <Text fontSize="sm">
                  Locked by {previousLoanControl.lockedBy || "system"} on {formatDateTime(previousLoanControl.lockedAt)}.
                  An approved unlock permits exactly one save, which creates the next locked revision.
                </Text>
                {pendingPreviousLoanUnlockRequest ? (
                  <Text mt={2} fontSize="sm" fontWeight="bold">
                    Pending {pendingPreviousLoanUnlockRequest.requestNo}: {pendingPreviousLoanUnlockRequest.reason}
                  </Text>
                ) : canRequestPreviousLoanUnlock ? (
                  <HStack mt={3} align="flex-end">
                    <FormControl>
                      <FormLabel fontSize="sm">Reason for unlock</FormLabel>
                      <Input value={previousLoanUnlockReason}
                        onChange={(event) => setPreviousLoanUnlockReason(event.target.value)} />
                    </FormControl>
                    <Button type="button" colorScheme="orange" onClick={requestPreviousLoanUnlock}>Request Unlock</Button>
                  </HStack>
                ) : null}
                {pendingPreviousLoanUnlockRequest && canApprovePreviousLoanUnlock ? (
                  <HStack mt={3} align="flex-end">
                    <FormControl>
                      <FormLabel fontSize="sm">Loan Officer decision remarks</FormLabel>
                      <Input value={previousLoanDecisionRemarks}
                        onChange={(event) => setPreviousLoanDecisionRemarks(event.target.value)} />
                    </FormControl>
                    <Button type="button" colorScheme="green" onClick={() => decidePreviousLoanUnlock("Approved")}>Approve</Button>
                    <Button type="button" colorScheme="red" variant="outline" onClick={() => decidePreviousLoanUnlock("Rejected")}>Reject</Button>
                  </HStack>
                ) : null}
              </Box>
            ) : previousLoanControl.status === "Unlocked" ? (
              <Text bg="green.50" borderRadius="md" p={3} mb={4} fontSize="sm">
                Unlocked by {previousLoanControl.unlockedBy} on {formatDateTime(previousLoanControl.unlockedAt)}. Saving will lock it again.
              </Text>
            ) : null}
            <TableContainer>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Loan Label</Th>
                    <Th>Application Date</Th>
                    <Th isNumeric>Outstanding Balance</Th>
                    <Th>Notes</Th>
                    {canModifyPreviousLoans ? <Th>Action</Th> : null}
                  </Tr>
                </Thead>
                <Tbody>
                  {previousLoanRows.map((row, index) => (
                    <Tr key={row.id || index}>
                      <Td minW="180px">
                        {canModifyPreviousLoans ? (
                          <Select
                            size="sm"
                            value={row.loanLabel}
                            onChange={(event) => updatePreviousLoanRow(index, "loanLabel", event.target.value)}
                            placeholder={activePreviousLoanProducts.length ? "Select loan product" : "No active loan products"}
                          >
                            {row.loanLabel && !activePreviousLoanProducts.some((product) => product.name === row.loanLabel) ? (
                              <option value={row.loanLabel}>{row.loanLabel} (historical / inactive)</option>
                            ) : null}
                            {activePreviousLoanProducts.map((product) => (
                              <option key={product.code} value={product.name}>{product.name} ({product.code})</option>
                            ))}
                          </Select>
                        ) : (
                          row.loanLabel || "-"
                        )}
                      </Td>
                      <Td minW="150px">
                        {canModifyPreviousLoans ? (
                          <Input
                            size="sm"
                            type="date"
                            value={row.applicationDate}
                            onChange={(event) => updatePreviousLoanRow(index, "applicationDate", event.target.value)}
                          />
                        ) : (
                          formatDate(row.applicationDate)
                        )}
                      </Td>
                      <Td isNumeric minW="160px">
                        {canModifyPreviousLoans ? (
                          <NumberInput
                            min={0}
                            precision={2}
                            step={0.01}
                            value={row.outstandingBalance}
                            onChange={(value) =>
                              updatePreviousLoanRow(index, "outstandingBalance", Number(value || 0))
                            }
                          >
                            <NumberInputField textAlign="right" />
                          </NumberInput>
                        ) : (
                          formatMoney(row.outstandingBalance)
                        )}
                      </Td>
                      <Td minW="220px">
                        {canModifyPreviousLoans ? (
                          <Input
                            size="sm"
                            value={row.notes}
                            onChange={(event) => updatePreviousLoanRow(index, "notes", event.target.value)}
                            placeholder="Reference or remarks"
                          />
                        ) : (
                          row.notes || "-"
                        )}
                      </Td>
                      {canModifyPreviousLoans ? (
                        <Td>
                          <Button type="button" size="sm" variant="outline" onClick={() => removePreviousLoanRow(index)}>
                            Remove
                          </Button>
                        </Td>
                      ) : null}
                    </Tr>
                  ))}
                  {previousLoanRows.length === 0 ? (
                    <Tr>
                      <Td colSpan={canModifyPreviousLoans ? 5 : 4} color="gray.500">
                        No previous loans recorded.
                      </Td>
                    </Tr>
                  ) : null}
                </Tbody>
              </Table>
            </TableContainer>
            <Flex justify="flex-end" mt={3}>
              <Text fontWeight="bold">Total: {formatMoney(statementPreviousLoanTotal)}</Text>
            </Flex>
            {previousLoanUnlockRequests.length ? (
              <Box mt={5}>
                <Heading size="xs" mb={2}>Unlock Audit Trail</Heading>
                <TableContainer>
                  <Table size="sm"><Thead><Tr><Th>Request</Th><Th>Reason</Th><Th>Requested</Th><Th>Status</Th><Th>Decision</Th></Tr></Thead>
                    <Tbody>{previousLoanUnlockRequests.map((item) => (
                      <Tr key={item.requestNo}><Td>{item.requestNo}</Td><Td>{item.reason}</Td>
                        <Td>{item.requestedBy}<br />{formatDateTime(item.requestedAt)}</Td>
                        <Td><Badge colorScheme={item.status === "Approved" ? "green" : item.status === "Rejected" ? "red" : "orange"}>{item.status}</Badge></Td>
                        <Td>{item.decidedBy || "-"}<br />{item.decisionRemarks || "-"}<br />{formatDateTime(item.decidedAt)}</Td></Tr>
                    ))}</Tbody></Table>
                </TableContainer>
              </Box>
            ) : null}
          </Box>

          <Box borderWidth="1px" borderRadius="md" p={4} mb={5}>
            <Heading size="sm" mb={1}>Cost Center Payable Movements</Heading>
            <Text color="gray.600" fontSize="sm" mb={3}>Original charge activity with its current payment status and remaining balance.</Text>
            <TableContainer><Table size="sm"><Thead><Tr><Th>Date</Th><Th>Cost Center</Th><Th>Batch / Movement</Th>
              <Th>Type</Th><Th isNumeric>Original</Th><Th isNumeric>Paid</Th><Th isNumeric>Balance</Th>
              <Th>Payment Status</Th><Th>Audit</Th></Tr></Thead>
              <Tbody>{(statement.memberCharges || []).map((movement) => <Tr key={movement.movementNo}>
                <Td>{formatDate(movement.transactionDate)}</Td><Td>{movement.costCenterName}</Td>
                <Td>{movement.batchNo}<br /><Text color="gray.500" fontSize="xs">{movement.movementNo}</Text></Td>
                <Td><Badge colorScheme={movement.movementType === "Reversal" ? "red" : "green"}>{movement.movementType}</Badge></Td>
                <Td isNumeric>{formatMoney(movement.amount)}</Td>
                <Td isNumeric>{movement.movementType === "Charge" ? formatMoney(movement.paidAmount || 0) : "-"}</Td>
                <Td isNumeric>{movement.movementType === "Charge" ? formatMoney(movement.outstandingAmount || 0) : "-"}</Td>
                <Td><Badge colorScheme={movement.paymentStatus === "Paid" ? "green" :
                  movement.paymentStatus === "Partially Paid" ? "orange" :
                  movement.paymentStatus === "Reversed" ? "red" : "gray"}>{movement.paymentStatus}</Badge></Td>
                <Td>{movement.createdBy}<br />{movement.reason || "-"}<br />{formatDateTime(movement.createdAt)}</Td>
              </Tr>)}{!(statement.memberCharges || []).length ? <Tr><Td colSpan={9} color="gray.500">No finalized cost-center payables.</Td></Tr> : null}</Tbody>
            </Table></TableContainer>
          </Box>

          <Box borderWidth="1px" borderRadius="md" p={4} mb={5}>
            <Heading size="sm" mb={1}>Cost Center Dues Payments</Heading>
            <Text color="gray.600" fontSize="sm" mb={3}>Cash settlements allocated against the oldest cost-center dues.</Text>
            <TableContainer><Table size="sm"><Thead><Tr><Th>Date</Th><Th>Payment / Reference</Th>
              <Th>Allocation</Th><Th isNumeric>Amount</Th><Th>Status / Audit</Th></Tr></Thead>
              <Tbody>{(statement.memberDuesPayments || []).map((payment) => <Tr key={payment.paymentNo}>
                <Td>{formatDate(payment.paymentDate)}</Td><Td>{payment.paymentNo}<br />{payment.referenceNo}</Td>
                <Td>{payment.allocations.map((row) => `${row.costCenterName}: ${formatMoney(row.amount)}`).join(", ")}</Td>
                <Td isNumeric>{formatMoney(payment.amount)}</Td><Td>{payment.status}<br />
                  Received: {payment.receivedBy}<br />Posted: {payment.postedBy || "-"}</Td>
              </Tr>)}{!(statement.memberDuesPayments || []).length ? <Tr><Td colSpan={5} color="gray.500">
                No cost-center dues payments.
              </Td></Tr> : null}</Tbody>
            </Table></TableContainer>
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
      {canViewSavingsWithdrawals ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="md" mb={4}>Secured Savings Withdrawal History</Heading>
          <TableContainer><Table size="sm"><Thead><Tr><Th>Withdrawal No.</Th><Th>Member</Th><Th isNumeric>Amount</Th><Th>Reference</Th><Th>Released By</Th><Th>Status</Th></Tr></Thead>
            <Tbody>{securedSavingsWithdrawals.map((withdrawal) => <Tr key={withdrawal.id}>
              <Td>{withdrawal.id}</Td><Td>{withdrawal.memberName}</Td><Td isNumeric>{formatMoney(withdrawal.amount)}</Td>
              <Td>{withdrawal.referenceNo}</Td><Td>{withdrawal.releasedBy}</Td>
              <Td><Badge colorScheme={withdrawal.status === "Posted" ? "green" : "blue"}>{withdrawal.status}</Badge></Td>
            </Tr>)}{securedSavingsWithdrawals.length === 0 ? <Tr><Td colSpan={6} color="gray.500">No secured savings withdrawals recorded.</Td></Tr> : null}</Tbody>
          </Table></TableContainer>
        </Box>
      ) : null}
      {canViewCbuWithdrawals ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="md" mb={4}>CBU Withdrawal History and Funding Queue</Heading>
          <TableContainer><Table size="sm">
            <Thead><Tr><Th>Withdrawal</Th><Th>Member</Th><Th isNumeric>Amount</Th>
              <Th>Reference</Th><Th>Audit</Th><Th>Status</Th><Th>Action</Th></Tr></Thead>
            <Tbody>
              {cbuWithdrawals.map((withdrawal) => <Tr key={withdrawal.id}>
                <Td>{withdrawal.id}</Td><Td>{withdrawal.memberName}</Td>
                <Td isNumeric>{formatMoney(withdrawal.amount)}</Td><Td>{withdrawal.referenceNo}</Td>
                <Td fontSize="sm">Requested: {withdrawal.requestedBy}<br />
                  Released: {withdrawal.releasedBy || "-"}<br />Posted: {withdrawal.postedBy || "-"}</Td>
                <Td><Badge colorScheme={withdrawal.status === "Posted" ? "green" :
                  withdrawal.status === "For Funding" ? "orange" : "blue"}>{withdrawal.status}</Badge></Td>
                <Td>{canCreateCbuWithdrawal && withdrawal.status === "For Funding" ?
                  <Button size="xs" colorScheme="green"
                    onClick={() => releaseCbuWithdrawalRequest(withdrawal.id)}>Release after funding</Button> : "-"}</Td>
              </Tr>)}
              {!cbuWithdrawals.length ? <Tr><Td colSpan={7} color="gray.500">
                No CBU withdrawals recorded.
              </Td></Tr> : null}
            </Tbody>
          </Table></TableContainer>
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
      <Modal isOpen={cbuGuardrailNotice.isOpen} onClose={cbuGuardrailNotice.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>CBU Withdrawal Not Allowed</ModalHeader>
          <ModalBody>
            <Text mb={4}>This withdrawal would reduce retained CBU below the required amount.
              Please refer this transaction to the System Administrator.</Text>
            <VStack align="stretch" spacing={2} fontSize="sm">
              {[
                ["Membership minimum", cbuGuardrailDetails?.membershipMinimum || 5000],
                ["Manual loan exposure", cbuGuardrailDetails?.manualLoanExposure || 0],
                ["System loan exposure", cbuGuardrailDetails?.systemLoanExposure || 0],
                ["Pending CBU withdrawals", cbuGuardrailDetails?.pendingWithdrawalExposure || 0],
                ["Maximum withdrawable", cbuGuardrailDetails?.withdrawableAmount || 0]
              ].map(([label, value]) => <Flex key={label} justify="space-between">
                <Text>{label}</Text><Text fontWeight="bold">{formatMoney(value)}</Text>
              </Flex>)}
            </VStack>
          </ModalBody>
          <ModalFooter><Button colorScheme="green" onClick={cbuGuardrailNotice.onClose}>Close</Button></ModalFooter>
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
  const [openingFunding, setOpeningFunding] = useState(0);
  const [unpostedFundingCount, setUnpostedFundingCount] = useState(0);
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
  const canViewCashFunding = user.permissions.includes("teller-fundings:view");
  const canPreviewOpeningBalances =
    user.username === "admin" ||
    user.role === "System Administrator" ||
    canReviewTellerBatch ||
    canPostTellerBatch;
  const canManageTellerBatches = canReviewTellerBatch || canPostTellerBatch || canCloseTellerBatch;
  const canViewLedgerHistory = canManageTellerBatches || canPreviewOpeningBalances;
  const canViewPostedEntries = canPostTellerBatch || canReviewTellerBatch || user.role === "System Administrator";
  const canViewMemberCharges = user.permissions.includes("member-charges:view");
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
      setOpeningFunding(Number(data.openingFunding || 0));
      setUnpostedFundingCount(Number(data.unpostedFundingCount || 0));
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
          ? `${data.transactionPostedCount} teller transaction${data.transactionPostedCount === 1 ? "" : "s"} and ${data.fundingPostedCount} funding transfer${data.fundingPostedCount === 1 ? "" : "s"} posted.`
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
          {canViewCashFunding ? <Tab flexShrink={0}>Cash Funding</Tab> : null}
          {canPreviewOpeningBalances ? <Tab flexShrink={0}>Opening Balances</Tab> : null}
          {canViewLedgerHistory ? <Tab flexShrink={0}>Batch History</Tab> : null}
          {canViewMemberCharges ? <Tab flexShrink={0}>Cost Center Charges</Tab> : null}
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
                          isDisabled={tellerBatch.length === 0 && unpostedFundingCount === 0}
                        >
                          Post reviewed batch
                        </Button>
                      ) : null}
                      {canCloseTellerBatch && activeBatch?.status === "Reviewed" ? (
                        <Button
                          size="sm"
                          colorScheme="green"
                          onClick={closeConfirmation.onOpen}
                          isDisabled={tellerBatch.length > 0 || unpostedFundingCount > 0}
                        >
                          Close and open next
                        </Button>
                      ) : null}
                    </HStack>
                  </Flex>
                  <Grid templateColumns={{ base: "1fr", md: "repeat(5, 1fr)" }} gap={4}>
                    <Box borderWidth="1px" borderRadius="md" p={4}>
                      <Text color="gray.500" fontSize="sm">
                        Opening Funding
                      </Text>
                      <Text fontWeight="bold">{formatMoney(openingFunding)}</Text>
                    </Box>
                    <Box borderWidth="1px" borderRadius="md" p={4}>
                      <Text color="gray.500" fontSize="sm">
                        Expected Cash
                      </Text>
                      <Text fontWeight="bold">
                        {formatMoney(
                          latestCashCount
                            ? latestCashCount.expectedCash
                            : openingFunding + tellerBatchSummary.cashIn - tellerBatchSummary.cashOut
                        )}
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
                  <Box mt={4} borderWidth="1px" borderRadius="md" p={4} bg="gray.50">
                    <Text color="gray.500" fontSize="sm">Teller Endorsement Note</Text>
                    <Text fontWeight="bold" whiteSpace="pre-wrap">{latestCashCount?.tellerNote || "-"}</Text>
                  </Box>
                  <Text mt={3} color="gray.600" fontSize="sm">
                    Post reviewed batch creates accounting entries for acknowledged funding and all unposted transaction rows. A non-zero variance requires a Bookkeeper note before review.
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
                          <Th isNumeric>Principal Applied</Th>
                          <Th isNumeric>Interest Applied</Th>
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
                            <Td isNumeric>
                              {payment.batchType === "Loan Collection" ? formatMoney(payment.principalAmount) : ""}
                            </Td>
                            <Td isNumeric>
                              {payment.batchType === "Loan Collection" ? formatMoney(payment.interestAmount) : ""}
                            </Td>
                            <Td>
                              <Badge colorScheme="blue">{payment.status}</Badge>
                            </Td>
                          </Tr>
                        ))}
                        {tellerBatch.length === 0 ? (
                          <Tr>
                            <Td colSpan={11} color="gray.500">
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

          {canViewCashFunding ? (
            <TabPanel px={0}>
              <TellerCashFunding user={user} />
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

          {canViewMemberCharges ? <TabPanel px={0}><MemberChargeReview /></TabPanel> : null}

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

                <Box>
                  <Heading size="sm" mb={3}>Acknowledged Funding</Heading>
                  <TableContainer>
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>Funding</Th>
                          <Th>Reference</Th>
                          <Th>Source</Th>
                          <Th isNumeric>Amount</Th>
                          <Th>Acknowledged By</Th>
                          <Th>Journal</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {selectedBatchDetails.fundings.map((funding) => (
                          <Tr key={funding.fundingNo}>
                            <Td>{funding.fundingNo}</Td>
                            <Td>{funding.referenceNo}</Td>
                            <Td>{funding.sourceAccountCode} - {funding.sourceAccountName}</Td>
                            <Td isNumeric>{formatMoney(funding.amount)}</Td>
                            <Td>{funding.acknowledgedBy}</Td>
                            <Td>{funding.postedEntryNo || "Unposted"}</Td>
                          </Tr>
                        ))}
                        {!selectedBatchDetails.fundings.length ? (
                          <Tr>
                            <Td colSpan={6} color="gray.500">No acknowledged opening funding.</Td>
                          </Tr>
                        ) : null}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>

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
                          <Th>Teller Note</Th>
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
                            <Td whiteSpace="pre-wrap">{cashCount.tellerNote || "-"}</Td>
                            <Td>{formatDateTime(cashCount.submittedAt)}</Td>
                          </Tr>
                        ))}
                        {selectedBatchDetails.cashCounts.length === 0 ? (
                          <Tr>
                            <Td colSpan={8} color="gray.500">No cash count submitted for this batch.</Td>
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
                          <Th isNumeric>Principal Applied</Th>
                          <Th isNumeric>Interest Applied</Th>
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
                            <Td isNumeric>
                              {transaction.batchType === "Loan Collection"
                                ? formatMoney(transaction.principalAmount)
                                : ""}
                            </Td>
                            <Td isNumeric>
                              {transaction.batchType === "Loan Collection"
                                ? formatMoney(transaction.interestAmount)
                                : ""}
                            </Td>
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
                            <Td colSpan={10} color="gray.500">No transactions found for this batch.</Td>
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

function SummoReport({ user }) {
  const defaultPeriod = new Date().toISOString().slice(0, 7);
  const [period, setPeriod] = useState(defaultPeriod);
  const [periodData, setPeriodData] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sourceLabel, setSourceLabel] = useState("SUMMO external movements");
  const [supersedesImportNo, setSupersedesImportNo] = useState("");
  const [supersedeReason, setSupersedeReason] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [selectedMemberNo, setSelectedMemberNo] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const canPrepare = user.permissions.includes("reports:summo:prepare");
  const canLock = user.permissions.includes("reports:summo:lock");

  const loadSummo = useCallback(async () => {
    setError("");
    try {
      const [periodRows, importRows] = await Promise.all([
        api("/api/reports/summo/periods"),
        api(`/api/reports/summo/imports?period=${period}`)
      ]);
      setPeriodData(periodRows.find((row) => row.period === period) || null);
      setBatches(importRows);
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [period]);

  useEffect(() => { loadSummo(); }, [loadSummo]);

  async function runAction(action) {
    setIsBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await action();
      await loadSummo();
      return result;
    } catch (actionError) {
      setError(actionError.message);
      return null;
    } finally {
      setIsBusy(false);
    }
  }

  async function uploadWorkbook() {
    if (!workbook) { setError("Choose a SUMMO XLSX workbook first."); return; }
    await runAction(async () => {
      const form = new FormData();
      form.append("period", period);
      form.append("sourceLabel", sourceLabel);
      if (supersedesImportNo) form.append("supersedesImportNo", supersedesImportNo);
      if (supersedesImportNo) form.append("supersedeReason", supersedeReason);
      form.append("workbook", workbook);
      const response = await fetch(`${apiBase}/api/reports/summo/imports`, {
        method: "POST", credentials: "include", body: form
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "SUMMO workbook upload failed.");
      setSelectedBatch(data);
      setMessage(`${data.batch.importNo} staged with ${data.batch.readyRows} ready row(s).`);
      return data;
    });
  }

  async function openBatch(importNo) {
    const result = await runAction(() => api(`/api/reports/summo/imports/${importNo}`));
    if (result) setSelectedBatch(result);
  }

  async function finalizeBatch(importNo) {
    const result = await runAction(() => api(`/api/reports/summo/imports/${importNo}/finalize`, { method: "POST" }));
    if (result) {
      setSelectedBatch(result);
      setMessage(`${importNo} finalized for SUMMO calculation.`);
    }
  }

  async function refreshDraft() {
    const result = await runAction(() => api(`/api/reports/summo/periods/${period}/refresh`, { method: "POST" }));
    if (result) setMessage(`${period} draft refreshed.`);
  }

  async function lockPeriod() {
    const result = await runAction(() => api(`/api/reports/summo/periods/${period}/lock`, { method: "POST" }));
    if (result) setMessage(`${period} locked as version ${result.version}.`);
  }

  async function reopenPeriod() {
    const result = await runAction(() => api(`/api/reports/summo/periods/${period}/reopen`, {
      method: "POST", body: JSON.stringify({ reason: reopenReason })
    }));
    if (result) setMessage(`Reopened ${result.affectedPeriods.join(", ")}.`);
  }

  async function downloadClientWorkbook(mode) {
    setIsBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/reports/summo/client-workbook/${period}/${mode}.xlsx`, {
        credentials: "include"
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Client-format SUMMO generation failed.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `TASETEMCO-SUMMO-${period}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage(`${mode === "locked" ? "Locked" : "Preview"} client-format workbook generated.`);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setIsBusy(false);
    }
  }

  const report = periodData?.snapshot;
  const reportMembers = (report?.rows || []).map((row) => ({
    id: row.memberNo, name: row.memberName, group: report?.cluster || "REGULAR MEMBERS CAPTURE", contactNumber: ""
  }));
  const visibleReportRows = selectedMemberNo
    ? (report?.rows || []).filter((row) => row.memberNo === selectedMemberNo)
    : report?.rows || [];
  const visibleSystemMovements = selectedMemberNo
    ? (report?.systemMovementDetails || []).filter((row) => row.memberNo === selectedMemberNo)
    : report?.systemMovementDetails || [];
  return (
    <VStack align="stretch" spacing={5}>
      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Flex justify="space-between" gap={4} wrap="wrap" align="end">
          <Box>
            <Heading size="md">Regular Members Capture SUMMO</Heading>
            <Text color="gray.600" mt={1}>Monthly payables assembled from finalized system transactions and remaining worksheet inputs.</Text>
          </Box>
          <FormControl maxW="220px">
            <FormLabel>Reporting month</FormLabel>
            <Input type="month" value={period} onChange={(event) => { setPeriod(event.target.value); setSelectedMemberNo(""); }} />
          </FormControl>
        </Flex>
        <HStack mt={4} spacing={3} wrap="wrap">
          <Badge colorScheme={periodData?.status === "Locked" ? "green" : periodData ? "blue" : "gray"}>
            {periodData?.status || "Not prepared"}
          </Badge>
          {periodData ? <Text fontSize="sm">Version {periodData.version} · prepared by {periodData.preparedBy || "-"}</Text> : null}
        </HStack>
        {error ? <Text color="red.500" mt={3}>{error}</Text> : null}
        {message ? <Text color="green.600" mt={3}>{message}</Text> : null}
      </Box>

      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Flex justify="space-between" gap={4} wrap="wrap" align="center">
          <Box>
            <Heading size="sm">Client-format Six-Cluster Workbook</Heading>
            <Text color="gray.600" fontSize="sm" mt={1}>
              Pilot output fills only REG_MEM_CAP member names, G-mar Capital from finalized G-mar Commercial, Canteen from finalized C1/C2, and WRS from finalized WRS movements. Protected formulas, manual cells, and the other five sheets remain unchanged.
            </Text>
          </Box>
          <HStack wrap="wrap">
            {canPrepare ? <Button size="sm" variant="outline" onClick={() => downloadClientWorkbook("preview")} isLoading={isBusy}>
              Generate Preview
            </Button> : null}
            <Button size="sm" colorScheme="green" onClick={() => downloadClientWorkbook("locked")}
              isLoading={isBusy} isDisabled={periodData?.status !== "Locked"}>
              Download Locked Version
            </Button>
          </HStack>
        </Flex>
        <Text color="gray.500" fontSize="xs" mt={3}>Preview reads current finalized movements. The official version requires a locked SUMMO period.</Text>
      </Box>

      {canPrepare ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Flex justify="space-between" gap={4} wrap="wrap" mb={4}>
            <Box>
              <Heading size="sm">External Movement Import</Heading>
              <Text color="gray.600" fontSize="sm">Use Excel only for categories not yet captured in the system. Finalized Canteen, WRS, and G-mar transactions are included automatically; importing the same category for the month blocks locking to prevent duplicate reporting.</Text>
            </Box>
            <Button size="sm" variant="outline" as="a" href={`${apiBase}/api/reports/summo/template?period=${period}`}>
              Download Template
            </Button>
          </Flex>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
            <FormControl><FormLabel>Source label</FormLabel><Input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} /></FormControl>
            <FormControl><FormLabel>XLSX workbook</FormLabel><Input type="file" accept=".xlsx" p={1} onChange={(e) => setWorkbook(e.target.files?.[0] || null)} /></FormControl>
            <FormControl>
              <FormLabel>Supersedes finalized batch (optional)</FormLabel>
              <Select value={supersedesImportNo} onChange={(e) => setSupersedesImportNo(e.target.value)}>
                <option value="">New batch</option>
                {batches.filter((batch) => batch.status === "Finalized").map((batch) => <option key={batch.importNo}>{batch.importNo}</option>)}
              </Select>
            </FormControl>
            <FormControl isDisabled={!supersedesImportNo}>
              <FormLabel>Supersession reason</FormLabel>
              <Input value={supersedeReason} onChange={(e) => setSupersedeReason(e.target.value)} />
            </FormControl>
          </Grid>
          <Button mt={4} onClick={uploadWorkbook} isLoading={isBusy}>Stage Workbook</Button>
        </Box>
      ) : null}

      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Heading size="sm" mb={3}>Import Batches</Heading>
        <TableContainer>
          <Table size="sm"><Thead><Tr><Th>Batch</Th><Th>Status</Th><Th isNumeric>Ready</Th><Th isNumeric>Issues</Th><Th>Source</Th><Th>Action</Th></Tr></Thead>
            <Tbody>{batches.map((batch) => (
              <Tr key={batch.importNo}><Td>{batch.importNo}</Td><Td><Badge>{batch.status}</Badge></Td><Td isNumeric>{batch.readyRows}</Td>
                <Td isNumeric>{batch.issueRows}</Td><Td>{batch.sourceLabel}</Td><Td><Button size="xs" onClick={() => openBatch(batch.importNo)}>Review</Button></Td></Tr>
            ))}{!batches.length ? <Tr><Td colSpan={6} color="gray.500">No SUMMO imports for this month.</Td></Tr> : null}</Tbody>
          </Table>
        </TableContainer>
        {selectedBatch ? (
          <Box mt={4} borderWidth="1px" borderRadius="md" p={4}>
            <Flex justify="space-between" wrap="wrap" gap={3}><Text fontWeight="bold">{selectedBatch.batch.importNo} rows</Text>
              {canPrepare && selectedBatch.batch.status === "Staged" ? <Button size="sm" onClick={() => finalizeBatch(selectedBatch.batch.importNo)} isDisabled={selectedBatch.batch.issueRows > 0}>Finalize</Button> : null}
            </Flex>
            <TableContainer mt={3}><Table size="sm"><Thead><Tr><Th>Row</Th><Th>Member</Th><Th>Category</Th><Th>Reference</Th><Th isNumeric>Amount</Th><Th>Result</Th></Tr></Thead>
              <Tbody>{selectedBatch.rows.map((row) => <Tr key={`${row.importNo}-${row.rowNumber}`}><Td>{row.rowNumber}</Td><Td>{row.memberNo}<br />{row.memberName}</Td><Td>{row.movementType}</Td><Td>{row.referenceNo}</Td><Td isNumeric>{formatMoney(row.amount)}</Td><Td><Badge colorScheme={row.issues.length ? "orange" : "green"}>{row.issues.join("; ") || row.rowStatus}</Badge></Td></Tr>)}</Tbody>
            </Table></TableContainer>
          </Box>
        ) : null}
      </Box>

      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Flex justify="space-between" wrap="wrap" gap={3} mb={4}>
          <Heading size="sm">Monthly Draft</Heading>
          <HStack wrap="wrap">
            {canPrepare ? <Button size="sm" onClick={refreshDraft} isLoading={isBusy} isDisabled={periodData?.status === "Locked"}>Refresh Draft</Button> : null}
            {canLock ? <Button size="sm" colorScheme="green" onClick={lockPeriod} isDisabled={!periodData || periodData.status !== "Draft" || periodData.validationIssues.length > 0}>Lock Period</Button> : null}
            {report?.rows ? <Button size="sm" variant="outline" as="a" href={`${apiBase}/api/reports/summo/periods/${period}.xlsx`}>Export XLSX</Button> : null}
          </HStack>
        </Flex>
        {periodData?.validationIssues?.length ? <Box bg="orange.50" p={3} borderRadius="md" mb={4}>{periodData.validationIssues.map((issue) => <Text key={issue} color="orange.700">• {issue}</Text>)}</Box> : null}
        {report?.rows ? <Flex gap={2} align="end" wrap="wrap" mb={4}>
          <FormControl maxW={{ base: "100%", md: "420px" }}><FormLabel>View one member (optional)</FormLabel>
            <MemberCombobox members={reportMembers} value={selectedMemberNo} onChange={setSelectedMemberNo}
              placeholder="Search report member name or number" />
          </FormControl>
          {selectedMemberNo ? <Button size="sm" variant="outline" onClick={() => setSelectedMemberNo("")}>Show All</Button> : null}
        </Flex> : null}
        {report?.sourceSummary ? <Grid templateColumns={{ base: "1fr", md: "repeat(5, 1fr)" }} gap={3} mb={4}>
          <Box borderWidth="1px" borderRadius="md" p={3}><Text color="gray.500" fontSize="sm">System Movements</Text><Text fontWeight="bold">{report.sourceSummary.systemMovementCount}</Text><Text fontSize="xs">{report.sourceSummary.pendingCostCenterBatchCount} draft batches pending</Text></Box>
          <Box borderWidth="1px" borderRadius="md" p={3}><Text color="gray.500" fontSize="sm">System Canteen</Text><Text fontWeight="bold">{formatMoney(report.sourceSummary.systemCanteenAmount)}</Text></Box>
          <Box borderWidth="1px" borderRadius="md" p={3}><Text color="gray.500" fontSize="sm">System WRS</Text><Text fontWeight="bold">{formatMoney(report.sourceSummary.systemWrsAmount)}</Text></Box>
          <Box borderWidth="1px" borderRadius="md" p={3}><Text color="gray.500" fontSize="sm">System G-mar</Text><Text fontWeight="bold">{formatMoney(report.sourceSummary.systemGmarAmount)}</Text></Box>
          <Box borderWidth="1px" borderRadius="md" p={3}><Text color="gray.500" fontSize="sm">System Reversals</Text><Text fontWeight="bold" color="red.600">-{formatMoney(report.sourceSummary.systemReversalAmount)}</Text></Box>
        </Grid> : null}
        {report?.rows ? (
          <TableContainer><Table size="sm"><Thead><Tr><Th>Member</Th><Th isNumeric>G-mar</Th><Th isNumeric>Canteen</Th><Th isNumeric>WRS</Th><Th isNumeric>Current Charges</Th><Th isNumeric>Previous Total</Th><Th isNumeric>Gross Payable</Th><Th isNumeric>Settlements</Th><Th isNumeric>Balance</Th></Tr></Thead>
            <Tbody>{visibleReportRows.map((row) => <Tr key={row.memberNo}><Td>{row.memberNo}<br />{row.memberName}</Td><Td isNumeric>{formatMoney(row.gmarCapital)}</Td><Td isNumeric>{formatMoney(row.canteen)}</Td><Td isNumeric>{formatMoney(row.wrs)}</Td><Td isNumeric>{formatMoney(row.currentCharges)}</Td><Td isNumeric>{formatMoney(row.previousBalanceTotal)}</Td><Td isNumeric>{formatMoney(row.grossPayable)}</Td><Td isNumeric>{formatMoney(row.settlements)}</Td><Td isNumeric fontWeight="bold">{formatMoney(row.endingBalance)}</Td></Tr>)}</Tbody>
          </Table></TableContainer>
        ) : <Text color="gray.500">Prepare the draft after finalizing the required movement imports.</Text>}
        {visibleSystemMovements.length ? <Box mt={5}><Heading size="sm" mb={2}>System Cost Center Drill-down</Heading>
          <TableContainer><Table size="sm"><Thead><Tr><Th>Date</Th><Th>Member</Th><Th>Cost Center</Th><Th>Batch / Movement</Th><Th>SUMMO Column</Th><Th isNumeric>Amount</Th><Th>Correction Link</Th></Tr></Thead>
            <Tbody>{visibleSystemMovements.map((movement) => <Tr key={movement.referenceNo}><Td>{formatDate(movement.movementDate)}</Td><Td>{movement.memberName}<br /><Text fontSize="xs">{movement.memberNo}</Text></Td><Td>{movement.costCenterName}</Td><Td>{movement.batchNo}<br /><Text fontSize="xs">{movement.referenceNo}</Text></Td><Td><Badge colorScheme={movement.movementType === "REVERSAL" ? "red" : "green"}>{movement.movementType}</Badge></Td><Td isNumeric>{formatMoney(movement.amount)}</Td><Td>{movement.reversesReference || "-"}</Td></Tr>)}</Tbody>
          </Table></TableContainer></Box> : null}
      </Box>

      {canLock && periodData?.status === "Locked" ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="sm">Reopen Forward Chain</Heading><Text color="gray.600" fontSize="sm" mt={1}>Reopening this month also unlocks every later locked SUMMO period.</Text>
          <Flex mt={3} gap={3} wrap="wrap"><Input value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="Required audit reason" maxW="520px" /><Button colorScheme="orange" onClick={reopenPeriod} isDisabled={!reopenReason.trim()}>Reopen</Button></Flex>
        </Box>
      ) : null}
    </VStack>
  );
}

function Reports({ user }) {
  const reportOptions = [
    {
      id: "summo-regular-capture",
      title: "SUMMO — Regular Members Capture",
      description: "Monthly member payables, settlements, carried balances, and Excel-supported movements."
    },
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

      {selectedReport === "summo-regular-capture" ? <SummoReport user={user} /> : null}

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
              <Text color="gray.500" fontSize="sm">Secured Savings</Text>
              <Text fontWeight="bold">{formatMoney(memberSummary.totalSecuredSavings)}</Text>
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
                  <Th isNumeric>Secured Savings</Th>
                  <Th isNumeric>Opening Share</Th>
                  <Th isNumeric>Opening Savings</Th>
                  <Th isNumeric>Initial Share</Th>
                  <Th isNumeric>Share Adds</Th>
                  <Th isNumeric>Savings Deposits</Th>
                  <Th isNumeric>Savings Withdrawals</Th>
                  <Th isNumeric>Secured Withdrawals</Th>
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
                    <Td isNumeric>{formatMoney(member.securedSavingsBalance)}</Td>
                    <Td isNumeric>{formatMoney(member.openingShareCapitalTotal)}</Td>
                    <Td isNumeric>{formatMoney(member.openingSavingsTotal)}</Td>
                    <Td isNumeric>{formatMoney(member.initialPaymentTotal)}</Td>
                    <Td isNumeric>{formatMoney(member.shareCapitalContributionTotal)}</Td>
                    <Td isNumeric>{formatMoney(member.savingsDepositTotal)}</Td>
                    <Td isNumeric>{formatMoney(member.savingsWithdrawalTotal)}</Td>
                    <Td isNumeric>{formatMoney(member.securedSavingsWithdrawalTotal)}</Td>
                    <Td isNumeric>{member.postedTransactionCount}</Td>
                    <Td isNumeric>{member.unpostedTransactionCount}</Td>
                  </Tr>
                ))}
                {memberLedgerReport.members.length === 0 ? (
                  <Tr>
                    <Td colSpan={15} color="gray.500">No member subsidiary rows found.</Td>
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
                Recorded system activity: subsidiary movement compared with posted general ledger control accounts.
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
                Posted journal entries: total debit and credit movement by general ledger account.
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

function MemberPortalAccountManagement({ user }) {
  const [accounts, setAccounts] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ memberNo: "", username: "" });
  const [credential, setCredential] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canManage = [user.role, ...(user.additionalRoles || [])].some((role) =>
    ["System Administrator", "General Manager", "Membership Officer"].includes(role));

  const load = useCallback(async () => {
    if (!canManage) return;
    try {
      const data = await api("/api/admin/member-portal-accounts");
      setAccounts(data.accounts || []);
      setMembers(data.members || []);
    } catch (requestError) { setError(requestError.message); }
  }, [canManage]);
  useEffect(() => { load(); }, [load]);

  async function provision(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const data = await api("/api/admin/member-portal-accounts", { method: "POST", body: JSON.stringify(form) });
      setCredential({ username: form.username, password: data.temporaryPassword });
      setMessage("Member portal account provisioned. Copy the temporary password now.");
      setForm({ memberNo: "", username: "" }); await load();
    } catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }
  async function setStatus(username, status) {
    setBusy(true); setError("");
    try { await api(`/api/admin/member-portal-accounts/${username}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setMessage(`${username} is now ${status.toLowerCase()}.`); await load();
    } catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }
  async function reset(username) {
    setBusy(true); setError("");
    try { const data = await api(`/api/admin/member-portal-accounts/${username}/reset-password`, { method: "POST" });
      setCredential({ username, password: data.temporaryPassword }); setMessage("Password reset. Copy the temporary password now."); await load();
    } catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }
  if (!canManage) return null;
  const availableMembers = members
    .filter((member) => !accounts.some((account) => account.memberNo === member.memberNo))
    .map((member) => ({ id: member.memberNo, name: member.name, group: member.status }));
  return <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
    <Heading size="md">Member Portal Accounts</Heading>
    <Text color="gray.600" mt={1}>Provision and control the separate self-service identities issued to members.</Text>
    {message ? <Text mt={4} color="green.700">{message}</Text> : null}
    {error ? <Text mt={4} color="red.600">{error}</Text> : null}
    {credential ? <Box mt={4} p={4} bg="orange.50" borderWidth="2px" borderColor="orange.300" borderRadius="md">
      <Text fontWeight="bold">One-time credential for @{credential.username}</Text>
      <Text mt={2} fontFamily="mono" fontSize="lg">{credential.password}</Text>
      <Text fontSize="sm" color="gray.600">This password will not be shown again and must be changed at first login.</Text>
      <Button size="xs" mt={2} onClick={() => setCredential(null)}>Dismiss</Button>
    </Box> : null}
    <Grid as="form" onSubmit={provision} mt={5} templateColumns={{ base: "1fr", md: "2fr 1fr auto" }} gap={3} alignItems="end">
      <FormControl isRequired><FormLabel>Member</FormLabel><MemberCombobox members={availableMembers}
        value={form.memberNo} onChange={(memberNo) => setForm((v) => ({ ...v, memberNo }))}
        placeholder="Search member name or number" maxResults={20} /></FormControl>
      <FormControl isRequired><FormLabel>Username</FormLabel><Input value={form.username} onChange={(event) => setForm((v) => ({ ...v, username: event.target.value }))} /></FormControl>
      <Button type="submit" colorScheme="green" isLoading={busy}>Provision</Button>
    </Grid>
    <TableContainer mt={5}><Table size="sm"><Thead><Tr><Th>Member</Th><Th>Username</Th><Th>Status</Th><Th>Activation</Th><Th>Actions</Th></Tr></Thead><Tbody>
      {accounts.map((account) => <Tr key={account.username}><Td>{account.memberNo}<br />{account.memberName}</Td><Td>@{account.username}</Td>
        <Td><Badge>{account.status}</Badge></Td><Td>{account.mustChangePassword ? "Password change required" : "Complete"}</Td><Td><HStack wrap="wrap">
          <Button size="xs" onClick={() => reset(account.username)} isDisabled={busy}>Reset password</Button>
          {account.status !== "Locked" ? <Button size="xs" onClick={() => setStatus(account.username, "Locked")}>Lock</Button> : null}
          {account.status !== "Disabled" ? <Button size="xs" onClick={() => setStatus(account.username, "Disabled")}>Disable</Button> : null}
          {account.status !== "Active" ? <Button size="xs" colorScheme="green" onClick={() => setStatus(account.username, "Active")}>Enable</Button> : null}
        </HStack></Td></Tr>)}
      {!accounts.length ? <Tr><Td colSpan={5} color="gray.500">No member portal accounts yet.</Td></Tr> : null}
    </Tbody></Table></TableContainer>
  </Box>;
}

function AdminUserManagement({ user }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(25);
  const [eventSearch, setEventSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [eventDateFrom, setEventDateFrom] = useState("");
  const [eventDateTo, setEventDateTo] = useState("");
  const [eventPage, setEventPage] = useState(1);
  const [eventPageSize, setEventPageSize] = useState(25);
  const [eventTotal, setEventTotal] = useState(0);
  const [eventTotalPages, setEventTotalPages] = useState(1);
  const [eventTypes, setEventTypes] = useState([]);
  const [eventsBusy, setEventsBusy] = useState(false);
  const [issuedCredential, setIssuedCredential] = useState(null);
  const [form, setForm] = useState({
    name: "",
    username: "",
    role: "Membership Officer",
    additionalRoles: [],
    defaultView: "members"
  });
  const [drafts, setDrafts] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canManageUsers = user.username === "admin" || user.permissions.includes("users:manage");
  const canViewUsers = canManageUsers || user.permissions.includes("users:view");
  const createUserDialog = useDisclosure();

  const roleOptions = useMemo(() => roles.map((role) => role.name)
    .filter((role) => user.username === "admin" || role !== "System Administrator"), [roles, user.username]);
  const roleMap = useMemo(() => new Map(roles.map((role) => [role.name, role])), [roles]);
  const getCombinedViews = useCallback(
    (role, additionalRoles = []) =>
      Array.from(
        new Set([role, ...additionalRoles].flatMap((roleName) => roleMap.get(roleName)?.defaultViews || []))
      ),
    [roleMap]
  );
  const defaultViews = useMemo(
    () => getCombinedViews(form.role, form.additionalRoles),
    [form.additionalRoles, form.role, getCombinedViews]
  );

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    return users.filter((item) => {
      const assignedRoles = [item.role, ...(item.additionalRoles || [])];
      return (!search || `${item.name} ${item.username}`.toLowerCase().includes(search))
        && (!userRoleFilter || assignedRoles.includes(userRoleFilter))
        && (!userStatusFilter || item.status === userStatusFilter);
    });
  }, [userRoleFilter, userSearch, userStatusFilter, users]);
  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / userPageSize));
  const currentUserPage = Math.min(userPage, userTotalPages);
  const pagedUsers = filteredUsers.slice((currentUserPage - 1) * userPageSize, currentUserPage * userPageSize);
  const userShowingStart = filteredUsers.length ? (currentUserPage - 1) * userPageSize + 1 : 0;
  const userShowingEnd = Math.min(currentUserPage * userPageSize, filteredUsers.length);

  const loadUsers = useCallback(async () => {
    setError("");

    try {
      const data = await api("/api/admin/users");
      setUsers(data.users);
      setRoles(data.roles);
      setDrafts(
        Object.fromEntries(
          data.users.map((item) => [
            item.username,
            {
              role: item.role,
              additionalRoles: item.additionalRoles || [],
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

  const loadSecurityEvents = useCallback(async () => {
    setEventsBusy(true);
    try {
      const query = new URLSearchParams({
        search: eventSearch.trim(), eventType: eventTypeFilter, dateFrom: eventDateFrom, dateTo: eventDateTo,
        page: String(eventPage), pageSize: String(eventPageSize)
      });
      const data = await api(`/api/admin/security-events?${query.toString()}`);
      setSecurityEvents(data.events || []);
      setEventTotal(Number(data.total || 0));
      setEventTotalPages(Number(data.totalPages || 1));
      setEventTypes(data.eventTypes || []);
      if (Number(data.page) !== eventPage) setEventPage(Number(data.page));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setEventsBusy(false);
    }
  }, [eventDateFrom, eventDateTo, eventPage, eventPageSize, eventSearch, eventTypeFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadSecurityEvents, 300);
    return () => window.clearTimeout(timeoutId);
  }, [loadSecurityEvents]);

  useEffect(() => {
    if (!defaultViews.includes(form.defaultView) && defaultViews[0]) {
      setForm((current) => ({ ...current, defaultView: defaultViews[0] }));
    }
  }, [defaultViews, form.defaultView]);

  function updateDraft(username, patch) {
    setDrafts((current) => {
      const nextDraft = { ...current[username], ...patch };
      nextDraft.additionalRoles = (nextDraft.additionalRoles || []).filter(
        (roleName) => roleName !== nextDraft.role
      );
      const nextRoleViews = getCombinedViews(nextDraft.role, nextDraft.additionalRoles);

      if (!nextRoleViews.includes(nextDraft.defaultView)) {
        nextDraft.defaultView = nextRoleViews[0] || "dashboard";
      }

      return { ...current, [username]: nextDraft };
    });
  }

  function toggleFormAdditionalRole(roleName, checked) {
    setForm((current) => {
      const additionalRoles = checked
        ? Array.from(new Set([...(current.additionalRoles || []), roleName]))
        : (current.additionalRoles || []).filter((item) => item !== roleName);
      const cleanAdditionalRoles = additionalRoles.filter((item) => item !== current.role);
      const nextViews = getCombinedViews(current.role, cleanAdditionalRoles);
      return {
        ...current,
        additionalRoles: cleanAdditionalRoles,
        defaultView: nextViews.includes(current.defaultView) ? current.defaultView : nextViews[0] || "dashboard"
      };
    });
  }

  function toggleDraftAdditionalRole(username, roleName, checked) {
    const draft = drafts[username] || {};
    const additionalRoles = checked
      ? Array.from(new Set([...(draft.additionalRoles || []), roleName]))
      : (draft.additionalRoles || []).filter((item) => item !== roleName);
    updateDraft(username, { additionalRoles });
  }

  async function createUser(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const data = await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setForm({
        name: "",
        username: "",
        role: "Membership Officer",
        additionalRoles: [],
        defaultView: "members"
      });
      setIssuedCredential({ username: form.username, password: data.temporaryPassword });
      setMessage(`Created ${form.username}. Copy the one-time temporary password shown below.`);
      createUserDialog.onClose();
      await loadUsers();
      await loadSecurityEvents();
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
      await loadSecurityEvents();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(username) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const data = await api(`/api/admin/users/${username}/reset-password`, { method: "POST" });
      setIssuedCredential({ username, password: data.temporaryPassword });
      setMessage(`Password reset for ${username}. Copy the one-time temporary password shown below.`);
      await loadUsers();
      await loadSecurityEvents();
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
              ? "Provision individual staff accounts, roles, activation status, and password resets."
              : "Read-only staff account directory for compliance and access review."}
          </Text>
        </Box>
        {canManageUsers ? (
          <Button colorScheme="green" onClick={createUserDialog.onOpen}>Create User</Button>
        ) : (
          <Badge colorScheme="purple">{users.length} users</Badge>
        )}
      </Flex>

      {message ? (
        <Box mb={4} borderWidth="1px" borderColor="green.200" bg="green.50" borderRadius="md" p={3}>
          <Text color="green.800">{message}</Text>
        </Box>
      ) : null}

      {issuedCredential ? <Box mb={4} borderWidth="2px" borderColor="orange.300" bg="orange.50" borderRadius="md" p={4}>
        <Text fontWeight="bold">One-time credential for @{issuedCredential.username}</Text>
        <Text fontFamily="mono" fontSize="lg" mt={2}>{issuedCredential.password}</Text>
        <Text fontSize="sm" color="gray.600" mt={2}>Copy this now. It will not be shown again, and the user must replace it on first login.</Text>
        <Button size="xs" mt={3} variant="outline" onClick={() => setIssuedCredential(null)}>Dismiss</Button>
      </Box> : null}

      {error ? (
        <Box mb={4} borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="md" p={3}>
          <Text color="red.800">{error}</Text>
        </Box>
      ) : null}

      <Tabs colorScheme="green" isLazy>
        <TabList>
          <Tab>User Accounts</Tab>
          <Tab>Account Security Events</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
      {canManageUsers && createUserDialog.isOpen ? (
      <Box as="form" onSubmit={createUser} borderWidth="1px" borderRadius="md" p={4} mb={5}>
        <Flex justify="space-between" align="center" gap={4} mb={4}>
          <Heading size="sm">Create Staff User</Heading>
          <Button size="sm" variant="ghost" onClick={createUserDialog.onClose}>Close</Button>
        </Flex>
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
              onChange={(event) =>
                setForm((current) => {
                  const role = event.target.value;
                  const additionalRoles = (current.additionalRoles || []).filter((item) => item !== role);
                  const nextViews = getCombinedViews(role, additionalRoles);
                  return {
                    ...current,
                    role,
                    additionalRoles,
                    defaultView: nextViews.includes(current.defaultView)
                      ? current.defaultView
                      : nextViews[0] || "dashboard"
                  };
                })
              }
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
        <Box borderWidth="1px" borderRadius="md" p={4} mt={4}>
          <Text fontWeight="semibold" mb={2}>Additional Roles</Text>
          <Text color="gray.600" fontSize="sm" mb={3}>
            Use this when one staff member performs more than one cooperative responsibility.
          </Text>
          <HStack spacing={4} flexWrap="wrap" align="flex-start">
            {roleOptions
              .filter((role) => role !== form.role)
              .map((role) => (
                <Checkbox
                  key={role}
                  isChecked={(form.additionalRoles || []).includes(role)}
                  onChange={(event) => toggleFormAdditionalRole(role, event.target.checked)}
                >
                  {role}
                </Checkbox>
              ))}
          </HStack>
        </Box>
        <Flex justify="space-between" align="center" gap={4} wrap="wrap" mt={4}>
          <Text color="gray.600" fontSize="sm">
            A unique temporary password is generated when the account is created.
          </Text>
          <Button colorScheme="green" type="submit" isLoading={busy}>
            Create User
          </Button>
        </Flex>
      </Box>
      ) : null}

      <Flex justify="space-between" align={{ base: "stretch", lg: "center" }} gap={3} wrap="wrap" mb={4}>
        <Text color="gray.600" fontSize="sm">
          Showing {userShowingStart}-{userShowingEnd} of {filteredUsers.length}
          {filteredUsers.length === users.length ? " users" : ` matches from ${users.length} users`}
        </Text>
        <Flex gap={2} wrap="wrap">
          <Input size="sm" value={userSearch} placeholder="Search name or username" maxW="240px"
            onChange={(event) => { setUserSearch(event.target.value); setUserPage(1); }} />
          <Select size="sm" value={userRoleFilter} w="210px"
            onChange={(event) => { setUserRoleFilter(event.target.value); setUserPage(1); }}>
            <option value="">All roles</option>
            {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
          </Select>
          <Select size="sm" value={userStatusFilter} w="150px"
            onChange={(event) => { setUserStatusFilter(event.target.value); setUserPage(1); }}>
            <option value="">All statuses</option>
            <option value="Pending Activation">Pending</option><option value="Active">Active</option>
            <option value="Locked">Locked</option><option value="Disabled">Disabled</option>
          </Select>
          <Select size="sm" value={userPageSize} w="110px"
            onChange={(event) => { setUserPageSize(Number(event.target.value)); setUserPage(1); }}>
            {[25, 50, 100].map((size) => <option key={size} value={size}>{size} rows</option>)}
          </Select>
        </Flex>
      </Flex>
      <TableContainer>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>User</Th>
              <Th>Primary Role</Th>
              <Th>Additional Roles</Th>
              <Th>Default Screen</Th>
              <Th>Status</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {pagedUsers.map((item) => {
              const draft = drafts[item.username] || item;
              const draftAdditionalRoles = draft.additionalRoles || [];
              const draftViews = getCombinedViews(draft.role, draftAdditionalRoles);
              const canManageAccount = canManageUsers &&
                (user.username === "admin" || (item.role !== "System Administrator" &&
                  !item.additionalRoles?.includes("System Administrator")));

              return (
                <Tr key={item.username}>
                  <Td>
                    <Box
                      bg="gray.50"
                      borderWidth="1px"
                      borderColor="gray.200"
                      borderRadius="md"
                      boxShadow="sm"
                      p={3}
                      minW="220px"
                    >
                      <HStack justify="space-between" align="flex-start" spacing={3}>
                        <Box minW={0}>
                          <Text fontWeight="semibold" noOfLines={2}>{item.name}</Text>
                          <Text color="gray.500" fontSize="sm">@{item.username}</Text>
                        </Box>
                        <Badge colorScheme={item.status === "Active" ? "green" : "gray"} flexShrink={0}>
                          {item.status}
                        </Badge>
                      </HStack>
                      <Text color="gray.600" fontSize="xs" mt={2} noOfLines={2}>
                        {item.role}
                      </Text>
                    </Box>
                  </Td>
                  <Td minW="220px">
                    {canManageAccount ? (
                      <Select size="sm" value={draft.role} onChange={(event) => updateDraft(item.username, { role: event.target.value })}>
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </Select>
                    ) : (
                      <Text>{item.role}</Text>
                    )}
                  </Td>
                  <Td minW="280px">
                    {canManageAccount ? (
                      <VStack align="stretch" spacing={1}>
                        {roleOptions
                          .filter((role) => role !== draft.role)
                          .map((role) => (
                            <Checkbox
                              key={role}
                              size="sm"
                              isChecked={draftAdditionalRoles.includes(role)}
                              onChange={(event) =>
                                toggleDraftAdditionalRole(item.username, role, event.target.checked)
                              }
                            >
                              {role}
                            </Checkbox>
                          ))}
                      </VStack>
                    ) : item.additionalRoles?.length ? (
                      <VStack align="stretch" spacing={1}>
                        {item.additionalRoles.map((role) => (
                          <Badge key={role} width="fit-content" colorScheme="blue">{role}</Badge>
                        ))}
                      </VStack>
                    ) : (
                      <Text color="gray.500">None</Text>
                    )}
                  </Td>
                  <Td minW="150px">
                    {canManageAccount ? (
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
                    {canManageAccount ? (
                      <Select
                        size="sm"
                        value={draft.status}
                        onChange={(event) => updateDraft(item.username, { status: event.target.value })}
                        isDisabled={item.username === "admin"}
                      >
                        <option value="Pending Activation">Pending Activation</option>
                        <option value="Active">Active</option>
                        <option value="Locked">Locked</option>
                        <option value="Disabled">Disabled</option>
                      </Select>
                    ) : (
                      <Badge colorScheme={item.status === "Active" ? "green" : "gray"}>{item.status}</Badge>
                    )}
                  </Td>
                  <Td textAlign="right">
                    {canManageAccount ? (
                      <VStack align="stretch" spacing={2}>
                        <Button size="sm" onClick={() => saveUser(item.username)} isLoading={busy}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => resetPassword(item.username)} isLoading={busy}>Reset Password</Button>
                      </VStack>
                    ) : (
                      <Text color="gray.500" fontSize="sm">Read only</Text>
                    )}
                  </Td>
                </Tr>
              );
            })}
            {pagedUsers.length === 0 ? <Tr><Td colSpan={6} color="gray.500">No users match the current filters.</Td></Tr> : null}
          </Tbody>
        </Table>
      </TableContainer>
      <Flex justify="space-between" align="center" gap={4} wrap="wrap" mt={4}>
        <Text color="gray.600" fontSize="sm">Page {currentUserPage} of {userTotalPages}</Text>
        <HStack>
          <Button size="sm" variant="outline" onClick={() => setUserPage((page) => Math.max(1, page - 1))}
            isDisabled={currentUserPage === 1}>Previous</Button>
          <Button size="sm" variant="outline" onClick={() => setUserPage((page) => Math.min(userTotalPages, page + 1))}
            isDisabled={currentUserPage === userTotalPages}>Next</Button>
        </HStack>
      </Flex>
          </TabPanel>
          <TabPanel px={0}>
      <Box>
        <Flex justify="space-between" align={{ base: "stretch", lg: "center" }} gap={3} wrap="wrap" mb={4}>
          <Text color="gray.600" fontSize="sm">
            {eventTotal ? `Showing ${(eventPage - 1) * eventPageSize + 1}-${Math.min(eventPage * eventPageSize, eventTotal)} of ${eventTotal} events` : "No matching events"}
          </Text>
          <Flex gap={2} wrap="wrap">
            <Input size="sm" value={eventSearch} placeholder="Search user, actor, or details" maxW="240px"
              onChange={(event) => { setEventSearch(event.target.value); setEventPage(1); }} />
            <Select size="sm" value={eventTypeFilter} w="190px"
              onChange={(event) => { setEventTypeFilter(event.target.value); setEventPage(1); }}>
              <option value="">All event types</option>
              {eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </Select>
            <Input size="sm" type="date" aria-label="Events from date" value={eventDateFrom} maxW="150px"
              onChange={(event) => { setEventDateFrom(event.target.value); setEventPage(1); }} />
            <Input size="sm" type="date" aria-label="Events through date" value={eventDateTo} maxW="150px"
              onChange={(event) => { setEventDateTo(event.target.value); setEventPage(1); }} />
            <Select size="sm" value={eventPageSize} w="110px"
              onChange={(event) => { setEventPageSize(Number(event.target.value)); setEventPage(1); }}>
              {[25, 50, 100].map((size) => <option key={size} value={size}>{size} rows</option>)}
            </Select>
          </Flex>
        </Flex>
        <TableContainer><Table size="sm"><Thead><Tr><Th>Date</Th><Th>User</Th><Th>Event</Th><Th>Performed By</Th><Th>Details</Th></Tr></Thead>
          <Tbody>{securityEvents.map((event, index) => <Tr key={`${event.createdAt}-${index}`}>
            <Td whiteSpace="nowrap">{event.createdAt ? new Date(event.createdAt).toLocaleString("en-PH") : "—"}</Td>
            <Td>@{event.username}</Td><Td>{event.eventType}</Td><Td>@{event.performedBy}</Td><Td>{event.details || "—"}</Td>
          </Tr>)}
          {!eventsBusy && securityEvents.length === 0 ? <Tr><Td colSpan={5} color="gray.500">No security events match the current filters.</Td></Tr> : null}
          </Tbody></Table></TableContainer>
        <Flex justify="space-between" align="center" gap={4} wrap="wrap" mt={4}>
          <Text color="gray.600" fontSize="sm">{eventsBusy ? "Loading events…" : `Page ${eventPage} of ${eventTotalPages}`}</Text>
          <HStack>
            <Button size="sm" variant="outline" onClick={() => setEventPage((page) => Math.max(1, page - 1))}
              isDisabled={eventsBusy || eventPage === 1}>Previous</Button>
            <Button size="sm" variant="outline" onClick={() => setEventPage((page) => Math.min(eventTotalPages, page + 1))}
              isDisabled={eventsBusy || eventPage === eventTotalPages}>Next</Button>
          </HStack>
        </Flex>
      </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
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
              Admin-only controls for the hosted demonstration data.
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
          This clears demonstration input and restores the original sample records.
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
};

function formatRateBps(value) {
  return `${(Number(value || 0) / 100).toFixed(2)}%`;
}

function percentTextFromBps(value) {
  return String(Number(value || 0) / 100);
}

function parsePercentTextToBps(value) {
  const text = String(value || "").trim();
  if (!text) {
    return 0;
  }
  const amount = Number(text);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function buildLoanBreakdownPrintHtml(loan, preparedBy = "") {
  const totalDeductions = addMoney(
    loan.processingFee,
    loan.insuranceFee,
    loan.cbuAmount,
    loan.savingsRetentionAmount
  );
  const generatedAt = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date());
  const deductionRows = [
    ["Service Fee", loan.processingFee, formatRateBps(loan.serviceFeeRateBps)],
    ["Insurance", loan.insuranceFee, formatRateBps(loan.insuranceFeeRateBps)],
    ["CBU / Capital Build-Up", loan.cbuAmount, loan.cbuApplied ? formatRateBps(loan.cbuRateBps) : "Not applied"],
    ["Savings Retention", loan.savingsRetentionAmount, formatRateBps(loan.savingsRetentionRateBps)]
  ];
  const scheduleRows = (loan.installments || [])
    .map(
      (installment) => `
        <tr>
          <td>${escapeHtml(installment.installmentNo)}</td>
          <td>${escapeHtml(formatDate(installment.dueDate))}</td>
          <td class="amount">${escapeHtml(formatMoney(installment.principalDue))}</td>
          <td class="amount">${escapeHtml(formatMoney(installment.interestDue))}</td>
          <td class="amount strong">${escapeHtml(formatMoney(installment.totalDue))}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(loan.loanNo)} Loan Breakdown</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #172018;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.35;
      }
      .page {
        width: 8.5in;
        min-height: 11in;
        margin: 0 auto;
        padding: 0.45in;
      }
      .header {
        border-bottom: 2px solid #014709;
        padding-bottom: 12px;
        margin-bottom: 18px;
      }
      .eyebrow {
        color: #014709;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      h1, h2, h3, p { margin: 0; }
      h1 { font-size: 20px; margin-top: 4px; }
      h2 { font-size: 14px; margin-bottom: 8px; }
      .muted { color: #667166; }
      .grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 14px;
      }
      .field {
        border: 1px solid #d9e2d9;
        padding: 8px;
      }
      .label {
        color: #667166;
        display: block;
        font-size: 10px;
        text-transform: uppercase;
      }
      .value {
        display: block;
        font-size: 12px;
        font-weight: 700;
        margin-top: 2px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 16px;
      }
      th, td {
        border: 1px solid #d9e2d9;
        padding: 6px 7px;
        text-align: left;
        vertical-align: top;
      }
      th {
        background: #eef6ef;
        color: #014709;
        font-size: 10px;
        text-transform: uppercase;
      }
      .amount { text-align: right; white-space: nowrap; }
      .strong { font-weight: 700; }
      .summary {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
      }
      .box {
        border: 1px solid #d9e2d9;
        padding: 10px;
      }
      .signature-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 28px;
        margin-top: 34px;
      }
      .signature-line {
        border-top: 1px solid #172018;
        padding-top: 6px;
        text-align: center;
      }
      .no-print {
        margin: 12px auto;
        max-width: 8.5in;
        text-align: right;
      }
      .print-button {
        background: #014709;
        border: 0;
        color: white;
        cursor: pointer;
        font-weight: 700;
        padding: 8px 12px;
      }
      @media print {
        .no-print { display: none; }
        .page { margin: 0; width: auto; min-height: auto; }
      }
    </style>
  </head>
  <body>
    <div class="no-print">
      <button class="print-button" onclick="window.print()">Print</button>
    </div>
    <main class="page">
      <section class="header">
        <p class="eyebrow">Member loan copy</p>
        <h1>TASETEMCO Loan Breakdown and Amortization</h1>
        <p class="muted">Tabon Secondary Teachers, Employees and Community Multi-Purpose Cooperative</p>
      </section>

      <section class="grid">
        <div class="field"><span class="label">Loan No.</span><span class="value">${escapeHtml(loan.loanNo)}</span></div>
        <div class="field"><span class="label">Application No.</span><span class="value">${escapeHtml(loan.applicationNo)}</span></div>
        <div class="field"><span class="label">Status</span><span class="value">${escapeHtml(loan.status)}</span></div>
        <div class="field"><span class="label">Prepared</span><span class="value">${escapeHtml(generatedAt)}</span></div>
        <div class="field"><span class="label">Member No.</span><span class="value">${escapeHtml(loan.memberNo)}</span></div>
        <div class="field"><span class="label">Member Name</span><span class="value">${escapeHtml(loan.memberName)}</span></div>
        <div class="field"><span class="label">Product</span><span class="value">${escapeHtml(loan.productName)}</span></div>
        <div class="field"><span class="label">Prepared By</span><span class="value">${escapeHtml(preparedBy || loan.computedBy || "-")}</span></div>
      </section>

      <section class="summary">
        <div class="box">
          <h2>Loan Terms</h2>
          <table>
            <tbody>
              <tr><td>Principal</td><td class="amount strong">${escapeHtml(formatMoney(loan.principal))}</td></tr>
              <tr><td>Term</td><td class="amount">${escapeHtml(loan.termMonths)} months</td></tr>
              <tr><td>Interest</td><td class="amount">${escapeHtml(formatRateBps(loan.annualInterestRateBps))} annual, ${escapeHtml(loan.interestMethod)}</td></tr>
              <tr><td>Payment Frequency</td><td class="amount">${escapeHtml(loan.paymentFrequency)}</td></tr>
              <tr><td>First Payment</td><td class="amount">${escapeHtml(formatDate(loan.firstPaymentDate))}</td></tr>
              <tr><td>Maturity</td><td class="amount">${escapeHtml(formatDate(loan.maturityDate))}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="box">
          <h2>Release Breakdown</h2>
          <table>
            <tbody>
              <tr><td>Approved Principal</td><td class="amount strong">${escapeHtml(formatMoney(loan.principal))}</td></tr>
              <tr><td>Total Deductions</td><td class="amount">${escapeHtml(formatMoney(totalDeductions))}</td></tr>
              <tr><td>Net Proceeds</td><td class="amount strong">${escapeHtml(formatMoney(loan.netProceeds))}</td></tr>
              <tr><td>Total Interest</td><td class="amount">${escapeHtml(formatMoney(loan.totalInterest))}</td></tr>
              <tr><td>Total Payable</td><td class="amount strong">${escapeHtml(formatMoney(loan.totalPayable))}</td></tr>
              <tr><td>Installments</td><td class="amount">${escapeHtml(loan.installmentCount)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Deductions From Principal</h2>
        <table>
          <thead>
            <tr><th>Deduction</th><th>Rate</th><th class="amount">Amount</th></tr>
          </thead>
          <tbody>
            ${deductionRows
              .map(
                ([label, amount, rate]) => `
                  <tr>
                    <td>${escapeHtml(label)}</td>
                    <td>${escapeHtml(rate)}</td>
                    <td class="amount">${escapeHtml(formatMoney(amount))}</td>
                  </tr>`
              )
              .join("")}
            <tr><td class="strong" colspan="2">Total Deductions</td><td class="amount strong">${escapeHtml(formatMoney(totalDeductions))}</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Amortization Schedule</h2>
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Due Date</th>
              <th class="amount">Principal</th>
              <th class="amount">Interest</th>
              <th class="amount">Monthly Obligation</th>
            </tr>
          </thead>
          <tbody>${scheduleRows}</tbody>
        </table>
      </section>

      <section class="signature-grid">
        <div class="signature-line">Member / Borrower</div>
        <div class="signature-line">Prepared / Explained By</div>
      </section>
    </main>
  </body>
</html>`;
}

function formCategoryMark(currentCategory, category) {
  return currentCategory === category ? "( X )" : "(  )";
}

function normalizeMemberClassification(value) {
  const normalizedValue = String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
  return memberClassifications.find((classification) => classification === normalizedValue) || "";
}

function buildLoanApplicationFormPrintHtml(application, formData, preparedBy = "") {
  const principal = Number(
    application.decision === "Approved" && application.recommendedPrincipal
      ? application.recommendedPrincipal
      : application.requestedPrincipal
  );
  const termMonths = Number(
    application.decision === "Approved" && application.recommendedTermMonths
      ? application.recommendedTermMonths
      : application.requestedTermMonths
  );
  const serviceFee = percentOfMoney(principal, application.serviceFeeRateBps);
  const insuranceFee = percentOfMoney(principal, application.insuranceFeeRateBps);
  const cbuAmount = percentOfMoney(principal, application.cbuRateBps);
  const savingsAmount = percentOfMoney(principal, application.savingsRetentionRateBps);
  const totalDeductions = addMoney(serviceFee, insuranceFee, cbuAmount, savingsAmount);
  const netProceeds = addMoney(principal, -totalDeductions);
  const cbuRateLabel = formatRateBps(application.cbuRateBps);
  const savingsRateLabel = formatRateBps(application.savingsRetentionRateBps);
  const serviceFeeRateLabel = formatRateBps(application.serviceFeeRateBps);
  const insuranceRateLabel = formatRateBps(application.insuranceFeeRateBps);
  const applicationDateLabel = formatDate(application.applicationDate);
  const manualPreviousLoanBalance = Number(application.manualPreviousLoanBalance || 0);
  const systemOutstandingLoanBalance = Number(application.systemOutstandingLoanBalance || 0);
  const previousLoanBalance = addMoney(manualPreviousLoanBalance, systemOutstandingLoanBalance);
  const cbuBalance = Number(application.cbuBalance || 0);
  const savingsBalance = Number(application.savingsBalance || 0);
  const securedSavingsBalance = Number(application.securedSavingsBalance || 0);
  const category = formData.loanCategory || "Providential";
  const logoSrc = `${window.location.origin}/brand/tasetemco-seal.png`;
  const cdaLogoSrc = `${window.location.origin}/brand/cda-pftec.jpeg`;
  const line = (value = "") => escapeHtml(value || "");
  const decision = String(application.decision || application.status || "");
  const approvedMark = decision === "Approved" ? "( X )" : "(  )";
  const disapprovedMark = decision === "Rejected" ? "( X )" : "(  )";
  const blank = (width = 180) => `<span class="fill" style="--fill-width:${width}px"></span>`;
  const field = (value = "", width = 180) =>
    `<span class="fill" style="--fill-width:${width}px">${line(value)}</span>`;
  const moneyField = (value, width = 150) =>
    `<span class="fill" style="--fill-width:${width}px">${escapeHtml(formatMoney(value))}</span>`;
  const pesoField = (value, width = 105) =>
    `<span class="peso">${moneyField(value, width)}</span>`;
  const pesoBlank = (width = 105) => `<span class="peso">${blank(width)}</span>`;
  const receivedAmountField = (value, width = 205) =>
    `<span class="fill received-amount" style="--fill-width:${width}px">${escapeHtml(formatMoney(value))}</span>`;
  const amortizationRows = Array.from(
    { length: 18 },
    () => "<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>"
  ).join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(application.applicationNo)} Loan Application Form</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #111;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.25;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      @page { size: 8.5in 13in; margin: 0; }
      .page {
        width: 8.5in;
        height: 13in;
        margin: 0 auto;
        overflow: hidden;
        padding: 0.46in 0.49in;
        position: relative;
        break-after: page;
        page-break-after: always;
      }
      .proceeds-page,
      .legal-copy,
      .schedule-page {
        break-before: page;
        page-break-before: always;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .page:last-child {
        break-after: auto;
        page-break-after: auto;
      }
      .no-print {
        margin: 12px auto;
        max-width: 8.5in;
        text-align: right;
      }
      .print-button {
        background: #014709;
        border: 0;
        color: white;
        cursor: pointer;
        font-weight: 700;
        padding: 8px 12px;
      }
      .page-one {
        padding-top: 0.55in;
      }
      .proceeds-page {
        padding: 0.85in 0.7in 0.55in;
      }
      .header {
        align-items: center;
        display: grid;
        grid-template-columns: 58px 1fr 58px;
        gap: 8px;
        margin: 0 auto 0.36in;
        width: 6.05in;
        text-align: center;
      }
      .seal { height: 52px; width: 52px; object-fit: contain; }
      .coop { font-size: 12px; font-weight: 700; white-space: nowrap; }
      .header p { font-size: 12px; line-height: 1.15; }
      h1, h2, h3, p { margin: 0; }
      h1 {
        font-size: 13px;
        letter-spacing: 0.28em;
        margin: 0 0 0.22in;
        text-decoration: underline;
        text-transform: uppercase;
        text-align: center;
      }
      table {
        border-collapse: collapse;
        width: 100%;
      }
      td, th {
        border: 1px solid #222;
        padding: 2px 4px;
        vertical-align: top;
      }
      .fill {
        border-bottom: 1px solid #333;
        display: inline-block;
        min-height: 15px;
        min-width: var(--fill-width, 180px);
        padding: 0 3px;
        vertical-align: bottom;
      }
      .center { text-align: center; }
      .right { text-align: right; }
      .strong { font-weight: 700; }
      .field-block {
        font-size: 12px;
        line-height: 1.32;
        margin: 0 auto 0.2in;
        width: 5.95in;
      }
      .field-line {
        display: grid;
        grid-template-columns: 1.28in 12px 1fr;
        align-items: end;
      }
      .field-line.split {
        grid-template-columns: 1.28in 12px 2.04in 0.18in 0.95in 12px 1.25in;
      }
      .field-line.split > .fill,
      .field-line.full-line > .fill,
      .field-line.split > .peso,
      .field-line.split > .peso > .fill {
        min-width: 0;
        width: 100%;
      }
      .field-line.split > span:nth-child(5) {
        white-space: nowrap;
      }
      .category-line {
        white-space: nowrap;
      }
      .signature-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 42px;
        margin: 0.25in auto 0.15in;
        width: 6.42in;
      }
      .signature {
        border-top: 1px solid #111;
        font-size: 11px;
        padding-top: 2px;
        text-align: center;
      }
      .bookkeeper-title {
        border-top: 1px solid #111;
        font-size: 11px;
        margin: 0 0 0.14in;
        padding-top: 2px;
      }
      .bookkeeper-table {
        font-size: 10.5px;
        margin-bottom: 0.12in;
      }
      .bookkeeper-table td {
        height: 15px;
        padding: 1px 5px;
      }
      .certified {
        margin: 0.06in auto 0.12in;
        text-align: center;
        width: 4.3in;
      }
      .cert-sign-space {
        height: 0.3in;
      }
      .cert-line {
        display: grid;
        grid-template-columns: 1.2in 0.2in 1.8in;
        justify-content: center;
        align-items: start;
      }
      .dash-rule {
        border-top: 1px dashed #111;
        margin: 0 auto 0.08in;
        width: 6.55in;
      }
      .action-title {
        font-size: 12px;
        margin-bottom: 0.02in;
        text-align: center;
      }
      .action-checks {
        margin-bottom: 0.13in;
        text-align: center;
      }
      .action-lines {
        display: grid;
        grid-template-columns: 2.05in 12px 1fr;
        line-height: 1.4;
        margin: 0 auto 0.12in;
        width: 4.35in;
      }
      .approval-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        margin-bottom: 0.1in;
      }
      .approval-label {
        font-size: 11px;
      }
      .approval-label:first-child {
        font-weight: 700;
      }
      .approval-names {
        display: grid;
        grid-template-columns: 1fr 1fr;
        margin: 0 auto 0.11in;
        text-align: center;
        width: 6.65in;
      }
      .approval-names > div:last-child {
        justify-self: end;
        min-width: 2.3in;
      }
      .approval-sign-space {
        height: 0.34in;
      }
      .name { font-weight: 700; text-transform: uppercase; }
      .committee-grid {
        margin: 0 auto 0.18in;
        width: 7.35in;
      }
      .committee-grid td {
        height: 0.42in;
      }
      .committee-grid .label-cell {
        font-weight: 700;
        width: 1.55in;
      }
      .deductions {
        display: grid;
        grid-template-columns: 2in 12px 1.75in;
        line-height: 1.22;
        margin: 0 auto 0.02in;
        width: 4.2in;
      }
      .deductions > span {
        min-height: 16px;
        white-space: nowrap;
      }
      .peso {
        display: inline-block;
        white-space: nowrap;
      }
      .deductions .fill {
        min-height: 13px;
      }
      .ack {
        font-size: 11px;
        line-height: 1.22;
        margin-top: 0.16in;
      }
      .received-amount {
        font-size: 15px;
        font-weight: 700;
        text-align: center;
      }
      .treasurer {
        margin: 0.18in 0.65in 0 0;
        text-align: right;
      }
      .payee-signature {
        margin: 0.22in 0 0 auto;
        text-align: center;
        width: 2.15in;
      }
      .payee-signature .signature-space {
        border-bottom: 1px solid #111;
        height: 0.36in;
      }
      .legal-copy {
        font-size: 12.8px;
        line-height: 1.25;
        padding: 0.96in 0.49in 0.28in;
      }
      .annex {
        font-family: "Times New Roman", Times, serif;
        font-size: 16px;
        font-weight: 700;
        position: absolute;
        right: 0.5in;
        top: 0.96in;
      }
      .legal-copy h1 {
        font-size: 18px;
        font-weight: 400;
        letter-spacing: 0.05em;
        margin: 0.12in 0 0.24in;
      }
      .legal-fields {
        line-height: 1.15;
        margin-bottom: 0.14in;
      }
      .legal-copy p {
        margin: 0 0 0.07in;
        text-align: justify;
        text-indent: 0.5in;
      }
      .legal-copy .assignment-title {
        font-size: 14px;
        font-weight: 700;
        margin: 0.28in 0 0.2in;
        text-align: center;
        text-decoration: underline;
      }
      .legal-signatures {
        display: grid;
        grid-template-columns: 1.85in 2.65in;
        column-gap: 0.12in;
        row-gap: 0.08in;
        line-height: 1.2;
        margin-top: 0.16in;
        width: 4.65in;
      }
      .legal-signatures .full {
        grid-column: 1 / 3;
        margin-bottom: 0.1in;
      }
      .legal-signature-label {
        align-self: end;
        padding-bottom: 2px;
      }
      .legal-signature-block {
        min-height: 0.58in;
        text-align: center;
      }
      .legal-signing-space {
        height: 0.34in;
      }
      .legal-printed-name {
        border-top: 1px solid #111;
        min-height: 16px;
        padding-top: 2px;
      }
      .schedule-page {
        padding: 1.05in 0.42in 0.52in;
      }
      .schedule-outer-title {
        font-family: "Times New Roman", Times, serif;
        font-size: 11px;
        font-style: italic;
        font-weight: 700;
        margin-left: 0.28in;
      }
      .schedule-box {
        border: 1px solid #222;
      }
      .schedule-box table {
        border: 0;
      }
      .schedule-box td,
      .schedule-box th {
        border-color: #333;
      }
      .schedule-main-title,
      .schedule-subtitle {
        font-family: "Arial Black", Arial, Helvetica, sans-serif;
        font-size: 12px;
        font-variant: small-caps;
        text-align: center;
      }
      .schedule-main-title {
        border-bottom: 1px solid #333;
        padding: 2px 0 9px;
      }
      .schedule-info td {
        font-size: 11px;
        height: 0.31in;
      }
      .schedule-subtitle {
        border-top: 0;
        padding: 1px 0;
      }
      .schedule-grid th {
        font-family: "Arial Black", Arial, Helvetica, sans-serif;
        font-size: 12px;
        height: 0.31in;
        line-height: 1.2;
        text-transform: uppercase;
      }
      .schedule-grid td {
        height: 0.3in;
      }
      .schedule-sign {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        font-size: 11px;
        min-height: 2.18in;
        padding: 3px 8px 0;
        text-align: center;
      }
      .schedule-sign .role {
        font-style: italic;
        text-align: left;
      }
      .schedule-sign .person {
        margin-top: 0.26in;
      }
      .borrower-consent {
        grid-column: 1 / 4;
        margin-top: 0.2in;
        text-align: center;
      }
      @media print {
        .no-print { display: none; }
        .page {
          width: 8.5in;
          height: 13in;
          margin: 0;
          overflow: hidden;
        }
        .proceeds-page,
        .legal-copy,
        .schedule-page {
          break-before: page;
          page-break-before: always;
        }
      }
    </style>
  </head>
  <body>
    <div class="no-print">
      <button class="print-button" onclick="window.print()">Print</button>
    </div>
    <main class="page page-one">
      <section class="header">
        <img class="seal" src="${escapeHtml(logoSrc)}" alt="TASETEMCO seal">
        <div>
          <p class="coop">Tabon Secondary Teachers, Employees and Community Multi-Purpose Cooperative</p>
          <p class="coop">(TASETEMCO MPC)</p>
          <p>Registered under the Laws of the Philippines</p>
          <p>RN: CARA-0146, 02.16.97 RN: RA9520-13005802, 01.07.10</p>
        </div>
        <img class="seal" src="${escapeHtml(cdaLogoSrc)}" alt="CDA logo">
      </section>

      <h1>Loan Application Form</h1>

      <div class="field-block">
        <div class="field-line split">
          <span>Name of Borrower</span><span>:</span>${field(application.memberName, 0)}
          <span></span><span>Date</span><span>:</span>${field(formatDate(application.applicationDate), 0)}
        </div>
        <div class="field-line full-line"><span>Address</span><span>:</span>${field(formData.borrowerAddress, 0)}</div>
        <div class="field-line full-line"><span>Name of Spouse</span><span>:</span>${field(formData.spouseName, 0)}</div>
        <div class="field-line full-line"><span>Co-maker</span><span>:</span>${field(formData.coMakerName, 0)}</div>
        <div class="field-line category-line">
          <span>Type of Loan Applied</span><span>:</span>
          <span>
            ${formCategoryMark(category, "Providential")} Providential
            ${formCategoryMark(category, "Entrepreneurial")} Entrepreneurial
            ${formCategoryMark(category, "Emergency")} Emergency
            ${formCategoryMark(category, "Other")} Others: ${formData.otherLoanType ? field(formData.otherLoanType, 120) : blank(120)}
          </span>
        </div>
        <div class="field-line split">
          <span>Purpose of Loan</span><span>:</span>${field(application.purpose, 0)}
          <span></span><span>Amount Applied</span><span>:</span>${moneyField(principal, 0)}
        </div>
        <div class="field-line"><span>Term of Payment</span><span>:</span><span>${field(termMonths, 90)} Months</span></div>
      </div>

      <section class="signature-row">
        <div class="signature">Signature of Borrower</div>
        <div class="signature">Signature of Spouse</div>
        <div class="signature">Signature over Printed Name - Co Maker</div>
      </section>

      <div class="bookkeeper-title">To be filled by the Bookkeeper</div>
      <table class="bookkeeper-table">
        <tr><td style="width: 1.7in">Capital Build-up (paid up)</td><td style="width: 1.7in">${escapeHtml(formatMoney(cbuBalance))}</td><td colspan="5">As of: ${escapeHtml(applicationDateLabel)}</td></tr>
        <tr><td>Savings</td><td>${escapeHtml(formatMoney(savingsBalance))}</td><td colspan="5">As of: ${escapeHtml(applicationDateLabel)}</td></tr>
        <tr><td>Secured Savings</td><td>${escapeHtml(formatMoney(securedSavingsBalance))}</td><td colspan="5">As of: ${escapeHtml(applicationDateLabel)}</td></tr>
        <tr><td>Outstanding Loan</td><td class="center">LBP/CCB</td><td class="center">Salary Loan</td><td class="center">Emergency Loan</td><td class="center">Educ.Loan</td><td class="center">Bonus Loan</td><td class="center">Others</td></tr>
        <tr><td>Balance</td><td colspan="6" class="right">${escapeHtml(formatMoney(previousLoanBalance))}</td></tr>
        <tr><td>%Repayment</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td>Date of last availment</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td>Due Date</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      </table>

      <div class="certified">
        <div class="cert-sign-space"></div>
        <div class="cert-line">
          <span>Certified Correct</span><span>:</span>
          <span><strong>ELLEN JOY P. LATIBAN</strong><br>Bookkeeper</span>
        </div>
      </div>
      <div class="dash-rule"></div>
      <div class="action-title">Action Taken</div>
      <div class="action-checks">${approvedMark} Approved &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${disapprovedMark} Disapproved</div>
      <div class="action-lines">
        <span>Amount Approved</span><span>:</span><span>${moneyField(principal, 145)}</span>
        <span>Interest Rate</span><span>:</span><span>${field(formatRateBps(application.annualInterestRateBps), 145)}</span>
        <span>Repayment Schedule</span><span>:</span><span>Amortization starts on ${blank(110)}</span>
        <span>Payable Every Months for</span><span>:</span><span>${field(termMonths, 85)}months.</span>
      </div>
      <div class="approval-row">
        <div class="approval-label">RECOMMENDING APPROVAL:</div>
        <div class="approval-label center"><strong>APPROVED BY:</strong></div>
      </div>
      <section class="approval-names">
        <div><div class="approval-sign-space"></div><div class="name">JOEL L. YPARRAGUIRRE</div><div>Coop manager</div></div>
        <div><div class="approval-sign-space"></div><div class="name">VIRGINIA V. LACUNA</div><div>BOD Chairman</div></div>
      </section>
      <table class="committee-grid">
        <tr><td class="label-cell">CREDIT COMMITTEE:</td><td></td><td></td><td></td></tr>
        <tr><td class="label-cell">BOARD of DIRECTORS:</td><td></td><td></td><td></td></tr>
      </table>
    </main>

    <section class="page proceeds-page">
      <div class="dash-rule"></div>
      <div class="deductions">
        <span>Amount Granted</span><span>:</span><span>${pesoField(principal)}</span>
        <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;CBU&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${cbuRateLabel}</span><span>:</span><span>${pesoField(cbuAmount)}</span>
        <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Savings&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${savingsRateLabel}</span><span>:</span><span>${pesoField(savingsAmount)}</span>
        <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Service Charge&nbsp;&nbsp;${serviceFeeRateLabel}</span><span>:</span><span>${pesoField(serviceFee)}</span>
        <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Insurance&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${insuranceRateLabel}</span><span>:</span><span>${pesoField(insuranceFee)}</span>
        <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Total GAS</span><span>:</span><span>${pesoField(totalDeductions)}</span>
        <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Total Net</span><span>:</span><span>${pesoField(netProceeds)}</span>
        <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Previous Loan Balance</span><span>:</span><span>${pesoField(previousLoanBalance)}</span>
        <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Undeducted</span><span>:</span><span>${pesoBlank()}</span>
        <span>Net Amount Received</span><span>:</span><span>${pesoField(netProceeds)}</span>
      </div>
      <div>Disbursed the amount of P ${blank(225)} in payment of the above loan</div>
      <div class="treasurer"><strong>FE B. PENALES</strong><br>Coop Treasurer</div>

      <p class="ack">
        I acknowledge receipt of the proceeds of my loan in the amount of ${receivedAmountField(netProceeds)}
        and I hereby authorize the TASETEMCO<br>
        thru TMENHS with its authorized representative to deduct the amortization from my salary.
      </p>
      <div class="payee-signature"><div class="signature-space"></div><div>Payee</div></div>
    </section>

    <section class="page legal-copy">
        <div class="annex">ANNEX I</div>
        <h1>PROMISSORY&nbsp;&nbsp; NOTE</h1>
        <div class="legal-fields">
          P.N. No. <span style="display:inline-block;width:78px"></span>: ${field(formData.promissoryNoteNo, 165)}<br>
          Date Released <span style="display:inline-block;width:32px"></span>: ${blank(165)}<br>
          Maturity Date <span style="display:inline-block;width:36px"></span>: ${blank(165)}<br>
          Amount Granted : ${moneyField(principal, 165)}
        </div>
        <p class="indent">
          For value received, I/we, jointly and severally, promised to pay to <strong>TASETEMCO</strong>, Tabon, Bislig City,
          the sum of ${blank(350)}Pesos, (${moneyField(principal, 90)}), Philippine Currency , with an
          interest rate of ${blank(72)} percent (${field(formatRateBps(application.annualInterestRateBps), 52)}) per annum from the date hereof until
          paid according to the attached amortization schedule.
        </p>
        <p class="indent">
          In case of default of the payment of any of the stated installment in the amortization schedule as it falls due,
          ALL OTHER INSTALLMENT SHALL IMMEDIATELY BECOME DUE AND PAYABLE; and the borrower agrees to pay a past due
          interest of 2% per month on the matured installments from due date until full payment is made.
        </p>
        <p class="indent">
          The cooperative is authorized to set-off or apply any deposits in the cooperative in borrower's name,
          account to the payment of the loan without need for prior notice or approval from the member-borrower
          and/or co-borrower.
        </p>
        <div class="assignment-title">ASSIGNMENT OF DEPOSITS and/or SHARE CAPITAL</div>
        <p class="indent">
          I/We, the undersigned, for and in consideration of the loan obtained by me/us from the Cooperative,
          in the amount of ${blank(210)}PESOS (${moneyField(principal, 70)}) as evidenced by the Promissory Note dated
          ${blank(80)},200 executed by me/us, do hereby assign in favor of the said Cooperative all my deposits,
          whether term or savings deposits, including share capital, which I/we now have hereafter may have except
          the amount of P ${blank(70)} share capital to qualify me/us to remain member/s of the Cooperative.
        </p>
        <p class="indent">
          Accordingly, I/We hereby agree not to withdraw said deposit or any part thereof as long as the said Loan
          together with its interests and penalty remain unpaid.
        </p>
        <p class="indent">
          Therefore, I/We, jointly and severally, empower and authorize the said Cooperative at their option and
          without notice to off-set or apply to the payment of my/our own aforementioned loan together with its
          interests and penalty, in the event of my/our failure to pay the same after its amortization and without
          necessary of prior demand.
        </p>
        <p class="indent">
          In Witness Whereof, I/We have hereunto signed our name/s this ${blank(80)} day of ${blank(90)}, 20__
          at ${field(formData.placeSigned || "", 160)}, Philippines.
        </p>
        <div class="legal-signatures">
          <div class="full">In joint-several capacity:</div>
          <div class="legal-signature-label">Name &amp; Signature of Maker</div>
          <div class="legal-signature-block"><div class="legal-signing-space"></div><div class="legal-printed-name">${line(application.memberName)}</div></div>
          <div class="legal-signature-label">Name &amp; Signature of Co-Maker</div>
          <div class="legal-signature-block"><div class="legal-signing-space"></div><div class="legal-printed-name">${line(formData.coMakerName)}</div></div>
          <div class="legal-signature-label">With Marital Consent</div>
          <div class="legal-signature-block"><div class="legal-signing-space"></div><div class="legal-printed-name">${line(formData.spouseName)}</div></div>
          <div class="legal-signature-label">Signed in the presence of</div>
          <div class="legal-signature-block"><div class="legal-signing-space"></div><div class="legal-printed-name">&nbsp;</div></div>
        </div>
      </section>

    <section class="page schedule-page">
        <div class="schedule-outer-title">Amortization Schedule</div>
        <div class="schedule-box">
          <div class="schedule-main-title">Loan Amortization Schedule</div>
          <table class="schedule-info">
            <tr><td style="width:45%">Name: ${line(application.memberName)}</td><td>Ref. No.: ${line(application.applicationNo)}</td></tr>
            <tr><td>Type of Loan: ${line(application.productName)}</td><td>Date Granted</td></tr>
            <tr><td>Amount Granted: ${escapeHtml(formatMoney(principal))}</td><td>Maturity Date:</td></tr>
            <tr><td>Interest: ${escapeHtml(formatRateBps(application.annualInterestRateBps))}</td><td>Terms: ${escapeHtml(termMonths)} months</td></tr>
          </table>
          <div class="schedule-subtitle">Amortization Schedule</div>
          <table class="schedule-grid">
            <tr>
              <th>Date of<br>Payment</th>
              <th>Monthly<br>Principal</th>
              <th>Principal<br>Balance</th>
              <th>Monthly<br>Interest</th>
              <th>Interest<br>Balance</th>
              <th>Monthly<br>Amortization</th>
              <th>Outstanding<br>Balance</th>
            </tr>
            ${amortizationRows}
          </table>
          <section class="schedule-sign">
            <div><div class="role">Prepared by:</div><div class="person"><strong>ELLEN JOY P. LATIBAN</strong><br>Bookkeeper</div></div>
            <div><div class="role">Verified by:</div><div class="person"><strong>JOEL L. YPARRAGUIRRE</strong><br>Coop Manager</div></div>
            <div><div class="role">NOTED:</div><div class="person"><strong>VIRGINIA V. LACUNA</strong><br>Board Chairman</div></div>
            <div class="borrower-consent">
              <em>I hereby agree on the forgoing amortization schedule of my loan:</em><br><br>
              ${blank(260)}<br><br>
              <em>Member-Borrower</em><br><br>
              <em>Date: ${blank(245)}</em>
            </div>
          </section>
        </div>
      </section>
  </body>
</html>`;
}

function LoanProducts({ user }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(defaultLoanProductForm);
  const [rateInputs, setRateInputs] = useState(() => ({
    annualInterestRateBps: percentTextFromBps(defaultLoanProductForm.annualInterestRateBps),
    serviceFeeRateBps: percentTextFromBps(defaultLoanProductForm.serviceFeeRateBps),
    insuranceFeeRateBps: percentTextFromBps(defaultLoanProductForm.insuranceFeeRateBps),
    cbuRateBps: percentTextFromBps(defaultLoanProductForm.cbuRateBps),
    savingsRetentionRateBps: percentTextFromBps(defaultLoanProductForm.savingsRetentionRateBps),
    penaltyRateBps: percentTextFromBps(defaultLoanProductForm.penaltyRateBps)
  }));
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

  function rateTextValues(product) {
    return {
      annualInterestRateBps: percentTextFromBps(product.annualInterestRateBps),
      serviceFeeRateBps: percentTextFromBps(product.serviceFeeRateBps),
      insuranceFeeRateBps: percentTextFromBps(product.insuranceFeeRateBps),
      cbuRateBps: percentTextFromBps(product.cbuRateBps),
      savingsRetentionRateBps: percentTextFromBps(product.savingsRetentionRateBps),
      penaltyRateBps: percentTextFromBps(product.penaltyRateBps)
    };
  }

  function updateRateField(field, value) {
    if (!/^\d{0,3}(\.\d{0,4})?$/.test(value)) {
      return;
    }
    const numericValue = Number(value || 0);
    if (numericValue > 100) {
      return;
    }
    setRateInputs((current) => ({ ...current, [field]: value }));
    updateForm(field, parsePercentTextToBps(value));
  }

  function startEdit(product) {
    setEditingCode(product.code);
    setForm({ ...product });
    setRateInputs(rateTextValues(product));
    setMessage("");
    setError("");
  }

  function cancelEdit() {
    setEditingCode("");
    setForm(defaultLoanProductForm);
    setRateInputs(rateTextValues(defaultLoanProductForm));
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
      setRateInputs(rateTextValues(defaultLoanProductForm));
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
              <NumberInput min={0} precision={2} step={0.01} value={form.minimumPrincipal} onChange={(value) => updateForm("minimumPrincipal", Number(value || 0))}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Maximum Principal</FormLabel>
              <NumberInput min={0.01} precision={2} step={0.01} value={form.maximumPrincipal} onChange={(value) => updateForm("maximumPrincipal", Number(value || 0))}>
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
              <Input
                inputMode="decimal"
                value={rateInputs.annualInterestRateBps}
                onChange={(event) => updateRateField("annualInterestRateBps", event.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Service Fee (%)</FormLabel>
              <Input
                inputMode="decimal"
                value={rateInputs.serviceFeeRateBps}
                onChange={(event) => updateRateField("serviceFeeRateBps", event.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Insurance (%)</FormLabel>
              <Input
                inputMode="decimal"
                value={rateInputs.insuranceFeeRateBps}
                onChange={(event) => updateRateField("insuranceFeeRateBps", event.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>CBU (%)</FormLabel>
              <Input
                inputMode="decimal"
                value={rateInputs.cbuRateBps}
                onChange={(event) => updateRateField("cbuRateBps", event.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Savings Retention (%)</FormLabel>
              <Input
                inputMode="decimal"
                value={rateInputs.savingsRetentionRateBps}
                onChange={(event) => updateRateField("savingsRetentionRateBps", event.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Penalty Rate (%)</FormLabel>
              <Input
                inputMode="decimal"
                value={rateInputs.penaltyRateBps}
                onChange={(event) => updateRateField("penaltyRateBps", event.target.value)}
              />
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
            <FormControl display="flex" alignItems="end">
              <Checkbox
                isChecked={Boolean(form.cbuOptional)}
                onChange={(event) => updateForm("cbuOptional", event.target.checked)}
              >
                CBU can be removed when fully subscribed
              </Checkbox>
            </FormControl>
          </Grid>
          <FormControl mt={4}>
            <FormLabel>Description</FormLabel>
            <Textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
          </FormControl>
          <Text color="gray.500" fontSize="sm" mt={3}>
            Enter rate fields as percentages, for example 1.5 for 1.5%.
          </Text>
          <Grid templateColumns={{ base: "1fr", md: "repeat(5, 1fr)" }} gap={4} mt={4}>
            {[
              ["loansReceivableAccount", "Loans Receivable"],
              ["interestIncomeAccount", "Interest Income"],
              ["processingFeeAccount", "Service Fee Income"],
              ["insuranceIncomeAccount", "Insurance Income"],
              ["shareCapitalAccount", "Share Capital"],
              ["savingsAccount", "Savings Payable"],
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
                <Th isNumeric>Service</Th>
                <Th>Deductions</Th>
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
                    <Td isNumeric>{formatRateBps(product.serviceFeeRateBps)}</Td>
                    <Td minW="180px">
                      <Text fontSize="xs">Insurance: {formatRateBps(product.insuranceFeeRateBps)}</Text>
                      <Text fontSize="xs">CBU: {formatRateBps(product.cbuRateBps)}{product.cbuOptional ? " optional" : ""}</Text>
                      <Text fontSize="xs">Savings: {formatRateBps(product.savingsRetentionRateBps)}</Text>
                    </Td>
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
          Account mapping: 1050 Loans Receivable, 4010 Interest Income, 4030 Service Fee Income,
          4050 Insurance Income, 3010 Share Capital, 2020 Savings Deposits Payable,
          4040 Penalty Income, and 1010 Cash on Hand.
        </Text>
      </Box>
    </VStack>
  );
}

const defaultLoanApplicationForm = {
  memberNo: "",
  productCode: "",
  requestedPrincipal: 5000,
  requestedTermMonths: 3,
  purpose: "",
  collateralType: "PDC",
  applicationDate: new Date().toISOString().slice(0, 10)
};
const commonLoanTermMonths = [1, 6, 9, 12, 18, 24, 36, 48, 60];
const loanCollateralTypes = ["PDC", "ATM Cards", "Payroll"];
const loanDocumentCategoryOptions = ["Providential", "Entrepreneurial", "Emergency", "Other"];

const defaultLoanDocumentForm = {
  loanCategory: "Providential",
  borrowerAddress: "",
  spouseName: "",
  coMakerName: "",
  otherLoanType: "",
  bookkeeperNotes: "",
  approvalNotes: "",
  promissoryNoteNo: "",
  placeSigned: "Bislig City"
};

function formatLoanTermLabel(months) {
  if (months === 1) {
    return "1 month";
  }
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} ${years === 1 ? "year" : "years"}`;
  }
  return `${months} months`;
}

function allowedCommonLoanTerms(product) {
  if (!product) {
    return commonLoanTermMonths;
  }

  return commonLoanTermMonths.filter(
    (term) => term >= Number(product.minimumTermMonths || 0) && term <= Number(product.maximumTermMonths || 0)
  );
}

function defaultLoanTermForProduct(product, currentTerm = 0) {
  const terms = allowedCommonLoanTerms(product);
  return terms.includes(Number(currentTerm)) ? Number(currentTerm) : terms[0] || Number(product?.minimumTermMonths || 1);
}

function LoanApplications({ user }) {
  const [applications, setApplications] = useState([]);
  const [members, setMembers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(defaultLoanApplicationForm);
  const [editingNo, setEditingNo] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [reviewApplication, setReviewApplication] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    creditAssessmentNotes: "",
    recommendedPrincipal: 0,
    recommendedTermMonths: 0,
    decision: "Approved",
    decisionRemarks: "",
    decisionDate: new Date().toISOString().slice(0, 10)
  });
  const [documentApplication, setDocumentApplication] = useState(null);
  const [documentForm, setDocumentForm] = useState(defaultLoanDocumentForm);
  const reviewModal = useDisclosure();
  const documentModal = useDisclosure();
  const canCreate = user.permissions.includes("loans:applications:create");
  const canEdit = user.permissions.includes("loans:applications:edit");
  const canSubmit = user.permissions.includes("loans:applications:submit");
  const canDecide = user.permissions.includes("loans:applications:decide");
  const canPrepareDocument = canCreate || canEdit || user.username === "admin";
  const activeProducts = products.filter((product) => product.status === "Active");
  const selectedProduct = products.find((product) => product.code === form.productCode);
  const termOptions = allowedCommonLoanTerms(selectedProduct);

  const loadWorkspace = useCallback(async () => {
    setError("");
    try {
      const [applicationRows, memberRows, productRows] = await Promise.all([
        api("/api/loan-applications"),
        api("/api/members"),
        api("/api/loan-products")
      ]);
      setApplications(applicationRows);
      setMembers(memberRows.filter((member) => member.status === "Active"));
      setProducts(productRows);
      setForm((current) => {
        if (current.productCode || !productRows.length) {
          return current;
        }
        const firstActive = productRows.find((product) => product.status === "Active");
        return firstActive
          ? {
              ...current,
              productCode: firstActive.code,
              requestedPrincipal: firstActive.minimumPrincipal,
              requestedTermMonths: defaultLoanTermForProduct(firstActive)
            }
          : current;
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectProduct(code) {
    const product = products.find((item) => item.code === code);
    setForm((current) => ({
      ...current,
      productCode: code,
      requestedPrincipal: product?.minimumPrincipal || current.requestedPrincipal,
      requestedTermMonths: product ? defaultLoanTermForProduct(product) : current.requestedTermMonths
    }));
  }

  function startEdit(application) {
    setEditingNo(application.applicationNo);
    setForm({
      memberNo: application.memberNo,
      productCode: application.productCode,
      requestedPrincipal: application.requestedPrincipal,
      requestedTermMonths: application.requestedTermMonths,
      purpose: application.purpose,
      collateralType: application.collateralType || "PDC",
      applicationDate: application.applicationDate
    });
    setMessage("");
    setError("");
  }

  function startReview(application) {
    setReviewApplication(application);
    setReviewForm({
      creditAssessmentNotes: application.creditAssessmentNotes || "",
      recommendedPrincipal: application.requestedPrincipal,
      recommendedTermMonths: application.requestedTermMonths,
      decision: "Approved",
      decisionRemarks: "",
      decisionDate: new Date().toISOString().slice(0, 10)
    });
    setMessage("");
    setError("");
    reviewModal.onOpen();
  }

  async function startDocumentForm(application) {
    setBusyAction(`document-${application.applicationNo}`);
    setMessage("");
    setError("");
    try {
      const result = await api(`/api/loan-applications/${application.applicationNo}/document-form`);
      setDocumentApplication(result.application);
      setDocumentForm({ ...defaultLoanDocumentForm, ...result.form });
      documentModal.onOpen();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  }

  function updateDocumentForm(field, value) {
    setDocumentForm((current) => ({ ...current, [field]: value }));
  }

  async function saveDocumentForm() {
    if (!documentApplication) {
      return;
    }

    setBusyAction("document-save");
    setMessage("");
    setError("");
    try {
      const result = await api(`/api/loan-applications/${documentApplication.applicationNo}/document-form`, {
        method: "PUT",
        body: JSON.stringify({ formData: documentForm })
      });
      setDocumentForm(result.form);
      setMessage(`${documentApplication.applicationNo} loan document form saved.`);
      documentModal.onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  }

  function printLoanApplicationDocument() {
    if (!documentApplication) {
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      setError("Allow pop-ups for this site to print the loan application form.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildLoanApplicationFormPrintHtml(documentApplication, documentForm, user.username));
    printWindow.document.close();
    printWindow.focus();
  }

  function resetForm() {
    const firstActive = activeProducts[0];
    setEditingNo("");
    setForm({
      ...defaultLoanApplicationForm,
      productCode: firstActive?.code || "",
      requestedPrincipal: firstActive?.minimumPrincipal || 5000,
      requestedTermMonths: firstActive ? defaultLoanTermForProduct(firstActive) : 3
    });
  }

  async function saveApplication(event) {
    event.preventDefault();
    setBusyAction("save");
    setMessage("");
    setError("");
    try {
      const result = await api(
        editingNo ? `/api/loan-applications/${editingNo}` : "/api/loan-applications",
        {
          method: editingNo ? "PATCH" : "POST",
          body: JSON.stringify(form)
        }
      );
      setMessage(`${result.application.applicationNo} saved as Draft.`);
      resetForm();
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  }

  async function submitApplication(applicationNo) {
    setBusyAction(applicationNo);
    setMessage("");
    setError("");
    try {
      const result = await api(`/api/loan-applications/${applicationNo}/submit`, {
        method: "POST"
      });
      setMessage(`${result.application.applicationNo} submitted for credit review.`);
      if (editingNo === applicationNo) {
        resetForm();
      }
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  }

  async function submitDecision() {
    if (!reviewApplication) {
      return;
    }

    setBusyAction("decision");
    setMessage("");
    setError("");
    try {
      const result = await api(
        `/api/loan-applications/${reviewApplication.applicationNo}/decision`,
        {
          method: "POST",
          body: JSON.stringify(reviewForm)
        }
      );
      setMessage(`${result.application.applicationNo} marked ${result.application.status}.`);
      reviewModal.onClose();
      setReviewApplication(null);
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  }

  function statusColor(status) {
    return {
      Draft: "yellow",
      Submitted: "blue",
      Approved: "green",
      Rejected: "red",
      Returned: "orange",
      "For Release": "purple",
      Released: "teal"
    }[status] || "gray";
  }

  return (
    <VStack align="stretch" spacing={5} minW={0} maxW="100%">
      <Flex justify="space-between" gap={4} align="center" wrap="wrap">
        <Box>
          <Heading size="md">Loan Applications</Heading>
          <Text color="gray.600" mt={1}>
            Loan Officers prepare and submit applications. Admin records the credit decision.
          </Text>
        </Box>
        <Button size="sm" variant="outline" onClick={loadWorkspace}>
          Refresh
        </Button>
      </Flex>

      {message ? <Text color="green.600">{message}</Text> : null}
      {error ? <Text color="red.500">{error}</Text> : null}

      {canCreate ? (
        <Box as="form" onSubmit={saveApplication} bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="sm" mb={4}>
            {editingNo ? `Edit Draft - ${editingNo}` : "New Loan Application"}
          </Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap={4}>
            <FormControl isRequired>
              <FormLabel>Active Member</FormLabel>
              <MemberCombobox
                members={members}
                value={form.memberNo}
                onChange={(memberNo) => updateForm("memberNo", memberNo)}
                placeholder="Search active member name or number"
              />
              <Text color="gray.500" fontSize="xs" mt={1}>
                Search and select from {members.length} active members
              </Text>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Loan Product</FormLabel>
              <Select value={form.productCode} onChange={(event) => selectProduct(event.target.value)}>
                <option value="">Select product</option>
                {activeProducts.map((product) => (
                  <option key={product.code} value={product.code}>{product.code} - {product.name}</option>
                ))}
              </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Requested Principal</FormLabel>
              <NumberInput
                min={selectedProduct?.minimumPrincipal || 0.01}
                max={selectedProduct?.maximumPrincipal}
                precision={2}
                step={0.01}
                value={form.requestedPrincipal}
                onChange={(value) => updateForm("requestedPrincipal", Number(value || 0))}
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Term (months)</FormLabel>
              <Select
                value={form.requestedTermMonths}
                onChange={(event) => updateForm("requestedTermMonths", Number(event.target.value))}
                isDisabled={!selectedProduct || termOptions.length <= 1}
              >
                {!selectedProduct ? <option value="">Select product first</option> : null}
                {termOptions.map((term) => (
                  <option key={term} value={term}>
                    {formatLoanTermLabel(term)}
                  </option>
                ))}
              </Select>
              {selectedProduct ? (
                <Text color="gray.500" fontSize="xs" mt={1}>
                  {termOptions.length === 1
                    ? `${selectedProduct.name} is fixed at ${formatLoanTermLabel(termOptions[0])}.`
                    : `Common terms allowed for ${selectedProduct.name}: ${termOptions
                        .map(formatLoanTermLabel)
                        .join(", ")}.`}
                </Text>
              ) : null}
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Application Date</FormLabel>
              <Input type="date" value={form.applicationDate} onChange={(event) => updateForm("applicationDate", event.target.value)} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Collateral Type</FormLabel>
              <Select value={form.collateralType} onChange={(event) => updateForm("collateralType", event.target.value)}>
                {loanCollateralTypes.map((collateralType) => (
                  <option key={collateralType} value={collateralType}>{collateralType}</option>
                ))}
              </Select>
            </FormControl>
            <FormControl isRequired gridColumn={{ md: "span 2", xl: "span 2" }}>
              <FormLabel>Loan Purpose</FormLabel>
              <Input value={form.purpose} onChange={(event) => updateForm("purpose", event.target.value)} />
            </FormControl>
          </Grid>
          {selectedProduct ? (
            <Text color="gray.600" fontSize="sm" mt={4}>
              Limits: {formatMoney(selectedProduct.minimumPrincipal)} to {formatMoney(selectedProduct.maximumPrincipal)};
              {" "}{selectedProduct.minimumTermMonths}-{selectedProduct.maximumTermMonths} months;
              {" "}{formatRateBps(selectedProduct.annualInterestRateBps)} annual {selectedProduct.interestMethod.toLowerCase()};
              {" "}service fee {formatRateBps(selectedProduct.serviceFeeRateBps)}.
            </Text>
          ) : null}
          <Flex justify="flex-end" gap={3} mt={5}>
            {editingNo ? <Button variant="outline" onClick={resetForm}>Cancel</Button> : null}
            <Button type="submit" colorScheme="green" isLoading={busyAction === "save"}>
              {editingNo ? "Save Draft" : "Create Draft"}
            </Button>
          </Flex>
        </Box>
      ) : null}

      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <TableContainer>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Application</Th>
                <Th>Member</Th>
                <Th>Product</Th>
                <Th isNumeric>Principal</Th>
                <Th>Term</Th>
                <Th>Collateral</Th>
                <Th>Purpose</Th>
                <Th>Status</Th>
                <Th>Prepared By</Th>
                <Th>Latest Review</Th>
                {(canPrepareDocument || canEdit || canSubmit || canDecide) ? <Th>Action</Th> : null}
              </Tr>
            </Thead>
            <Tbody>
              {applications.map((application) => {
                const ownsEditable =
                  ["Draft", "Returned"].includes(application.status) &&
                  application.createdBy === user.username;
                const ownsDraft = application.status === "Draft" && application.createdBy === user.username;
                return (
                  <Tr key={application.applicationNo}>
                    <Td minW="150px">
                      <Text fontWeight="bold">{application.applicationNo}</Text>
                      <Text color="gray.500" fontSize="xs">{application.applicationDate}</Text>
                    </Td>
                    <Td minW="190px">
                      <Text>{application.memberName}</Text>
                      <Text color="gray.500" fontSize="xs">{application.memberNo}</Text>
                    </Td>
                    <Td minW="180px">
                      <Text>{application.productName}</Text>
                      <Text color="gray.500" fontSize="xs">
                        {formatRateBps(application.annualInterestRateBps)} / {application.interestMethod}
                      </Text>
                    </Td>
                    <Td isNumeric>{formatMoney(application.requestedPrincipal)}</Td>
                    <Td>{application.requestedTermMonths} months</Td>
                    <Td>{application.collateralType || "PDC"}</Td>
                    <Td minW="220px">{application.purpose}</Td>
                    <Td>
                      <Badge colorScheme={statusColor(application.status)}>
                        {application.status}
                      </Badge>
                    </Td>
                    <Td>{application.createdBy}</Td>
                    <Td minW="220px">
                      {application.decision ? (
                        <>
                          <Text fontWeight="bold">{application.decision} by {application.decidedBy}</Text>
                          <Text color="gray.500" fontSize="xs">
                            {application.decisionDate}
                            {application.decisionRemarks ? ` - ${application.decisionRemarks}` : ""}
                          </Text>
                          {application.decision === "Approved" ? (
                            <Text color="gray.500" fontSize="xs">
                              Recommended: {formatMoney(application.recommendedPrincipal)} / {application.recommendedTermMonths} months
                            </Text>
                          ) : null}
                        </>
                      ) : <Text color="gray.500">Awaiting decision</Text>}
                    </Td>
                    {(canPrepareDocument || canEdit || canSubmit || canDecide) ? (
                      <Td>
                        {ownsEditable ? (
                          <Flex gap={2} wrap="wrap">
                            {canPrepareDocument ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startDocumentForm(application)}
                                isLoading={busyAction === `document-${application.applicationNo}`}
                              >
                                Prepare Form
                              </Button>
                            ) : null}
                            {canEdit ? <Button size="sm" onClick={() => startEdit(application)}>Edit</Button> : null}
                            {canSubmit && ownsDraft ? (
                              <Button
                                size="sm"
                                colorScheme="green"
                                onClick={() => submitApplication(application.applicationNo)}
                                isLoading={busyAction === application.applicationNo}
                              >
                                Submit
                              </Button>
                            ) : null}
                          </Flex>
                        ) : canDecide && application.status === "Submitted" ? (
                          <Flex gap={2} wrap="wrap">
                            {canPrepareDocument ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startDocumentForm(application)}
                                isLoading={busyAction === `document-${application.applicationNo}`}
                              >
                                Prepare Form
                              </Button>
                            ) : null}
                            <Button size="sm" colorScheme="green" onClick={() => startReview(application)}>
                              Review
                            </Button>
                          </Flex>
                        ) : canPrepareDocument ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startDocumentForm(application)}
                            isLoading={busyAction === `document-${application.applicationNo}`}
                          >
                            Prepare Form
                          </Button>
                        ) : <Text color="gray.500">Read only</Text>}
                      </Td>
                    ) : null}
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      <Modal isOpen={reviewModal.isOpen} onClose={reviewModal.onClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Credit Review {reviewApplication ? `- ${reviewApplication.applicationNo}` : ""}
          </ModalHeader>
          <ModalBody>
            {reviewApplication ? (
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Text fontWeight="bold">{reviewApplication.memberName}</Text>
                  <Text color="gray.600">
                    Requested {formatMoney(reviewApplication.requestedPrincipal)} for {reviewApplication.requestedTermMonths} months
                  </Text>
                  <Text color="gray.600">Collateral: {reviewApplication.collateralType || "PDC"}</Text>
                  <Text color="gray.600">{reviewApplication.productName} - {reviewApplication.purpose}</Text>
                </Box>
                <Box borderWidth="1px" borderRadius="md" p={3}>
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    Balances as of application date ({formatDate(reviewApplication.applicationDate)})
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={2}>
                    <Text fontSize="sm">Manual previous loan: {formatMoney(reviewApplication.manualPreviousLoanBalance)}</Text>
                    <Text fontSize="sm">System outstanding loans: {formatMoney(reviewApplication.systemOutstandingLoanBalance)}</Text>
                    <Text fontSize="sm">Total previous loan balance: {formatMoney(reviewApplication.previousLoanBalance)}</Text>
                    <Text fontSize="sm">CBU / share capital: {formatMoney(reviewApplication.cbuBalance)}</Text>
                    <Text fontSize="sm">Regular savings: {formatMoney(reviewApplication.savingsBalance)}</Text>
                    <Text fontSize="sm">Secured savings: {formatMoney(reviewApplication.securedSavingsBalance)}</Text>
                  </Grid>
                </Box>
                <FormControl isRequired>
                  <FormLabel>Credit Assessment Notes</FormLabel>
                  <Textarea
                    value={reviewForm.creditAssessmentNotes}
                    onChange={(event) => setReviewForm((current) => ({
                      ...current,
                      creditAssessmentNotes: event.target.value
                    }))}
                  />
                </FormControl>
                <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
                  <FormControl isRequired>
                    <FormLabel>Decision</FormLabel>
                    <Select
                      value={reviewForm.decision}
                      onChange={(event) => setReviewForm((current) => ({
                        ...current,
                        decision: event.target.value
                      }))}
                    >
                      <option>Approved</option>
                      <option>Rejected</option>
                      <option>Returned</option>
                    </Select>
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Decision Date</FormLabel>
                    <Input
                      type="date"
                      value={reviewForm.decisionDate}
                      onChange={(event) => setReviewForm((current) => ({
                        ...current,
                        decisionDate: event.target.value
                      }))}
                    />
                  </FormControl>
                  <FormControl isRequired={reviewForm.decision === "Approved"}>
                    <FormLabel>Recommended Principal</FormLabel>
                    <NumberInput
                      min={0.01}
                      max={reviewApplication.requestedPrincipal}
                      precision={2}
                      step={0.01}
                      value={reviewForm.recommendedPrincipal}
                      isDisabled={reviewForm.decision !== "Approved"}
                      onChange={(value) => setReviewForm((current) => ({
                        ...current,
                        recommendedPrincipal: Number(value || 0)
                      }))}
                    >
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>
                  <FormControl isRequired={reviewForm.decision === "Approved"}>
                    <FormLabel>Recommended Term (months)</FormLabel>
                    <NumberInput
                      min={1}
                      max={reviewApplication.requestedTermMonths}
                      value={reviewForm.recommendedTermMonths}
                      isDisabled={reviewForm.decision !== "Approved"}
                      onChange={(value) => setReviewForm((current) => ({
                        ...current,
                        recommendedTermMonths: Number(value || 0)
                      }))}
                    >
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>
                </Grid>
                <FormControl isRequired={["Rejected", "Returned"].includes(reviewForm.decision)}>
                  <FormLabel>Decision Remarks</FormLabel>
                  <Textarea
                    value={reviewForm.decisionRemarks}
                    onChange={(event) => setReviewForm((current) => ({
                      ...current,
                      decisionRemarks: event.target.value
                    }))}
                  />
                </FormControl>
                <Text color="gray.500" fontSize="sm">
                  This decision does not release cash or create accounting entries.
                </Text>
              </VStack>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={reviewModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={submitDecision} isLoading={busyAction === "decision"}>
              Record Decision
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={documentModal.isOpen} onClose={documentModal.onClose} size="3xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Loan Document Form {documentApplication ? `- ${documentApplication.applicationNo}` : ""}
          </ModalHeader>
          <ModalBody>
            {documentApplication ? (
              <VStack align="stretch" spacing={4}>
                <Box borderWidth="1px" borderRadius="md" p={4}>
                  <Text fontWeight="bold">{documentApplication.memberName}</Text>
                  <Text color="gray.600" fontSize="sm">
                    {documentApplication.productName} / {formatMoney(documentApplication.requestedPrincipal)} /
                    {" "}{documentApplication.requestedTermMonths} months
                  </Text>
                  <Text color="gray.600" fontSize="sm">{documentApplication.purpose}</Text>
                </Box>
                <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
                  <FormControl>
                    <FormLabel>Loan Form Category</FormLabel>
                    <Select
                      value={documentForm.loanCategory}
                      onChange={(event) => updateDocumentForm("loanCategory", event.target.value)}
                    >
                      {loanDocumentCategoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Borrower Address</FormLabel>
                    <Textarea
                      value={documentForm.borrowerAddress}
                      onChange={(event) => updateDocumentForm("borrowerAddress", event.target.value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Name of Spouse</FormLabel>
                    <Input
                      value={documentForm.spouseName}
                      onChange={(event) => updateDocumentForm("spouseName", event.target.value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Co-maker</FormLabel>
                    <Input
                      value={documentForm.coMakerName}
                      onChange={(event) => updateDocumentForm("coMakerName", event.target.value)}
                    />
                    <Text color="gray.500" fontSize="xs" mt={1}>
                      Manual entry for this phase. Member-linked co-maker selection can come later.
                    </Text>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Other Loan Type Label</FormLabel>
                    <Input
                      value={documentForm.otherLoanType}
                      onChange={(event) => updateDocumentForm("otherLoanType", event.target.value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Promissory Note No.</FormLabel>
                    <Input
                      value={documentForm.promissoryNoteNo}
                      onChange={(event) => updateDocumentForm("promissoryNoteNo", event.target.value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Place Signed</FormLabel>
                    <Input
                      value={documentForm.placeSigned}
                      onChange={(event) => updateDocumentForm("placeSigned", event.target.value)}
                    />
                  </FormControl>
                </Grid>
                <FormControl>
                  <FormLabel>Bookkeeper Notes</FormLabel>
                  <Textarea
                    value={documentForm.bookkeeperNotes}
                    onChange={(event) => updateDocumentForm("bookkeeperNotes", event.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Approval / Routing Notes</FormLabel>
                  <Textarea
                    value={documentForm.approvalNotes}
                    onChange={(event) => updateDocumentForm("approvalNotes", event.target.value)}
                  />
                </FormControl>
              </VStack>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={documentModal.onClose}>
              Cancel
            </Button>
            <Button variant="outline" mr={3} onClick={printLoanApplicationDocument}>
              Print Paper Form
            </Button>
            <Button colorScheme="green" onClick={saveDocumentForm} isLoading={busyAction === "document-save"}>
              Save Form
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}

function defaultFirstPaymentDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

function LoanComputations({ user }) {
  const [applications, setApplications] = useState([]);
  const [loans, setLoans] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [firstPaymentDate, setFirstPaymentDate] = useState(defaultFirstPaymentDate());
  const [applyCbu, setApplyCbu] = useState(true);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const computationModal = useDisclosure();
  const canCreate = user.permissions.includes("loans:computations:create");

  const loadComputations = useCallback(async () => {
    setError("");
    try {
      const [applicationRows, loanRows] = await Promise.all([
        api("/api/loan-applications"),
        api("/api/loans")
      ]);
      setApplications(applicationRows);
      setLoans(loanRows);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    loadComputations();
  }, [loadComputations]);

  function startComputation(application) {
    setSelectedApplication(application);
    setFirstPaymentDate(defaultFirstPaymentDate());
    setApplyCbu(Number(application.cbuRateBps || 0) > 0);
    setPreview(null);
    setMessage("");
    setError("");
    computationModal.onOpen();
  }

  async function previewComputation() {
    if (!selectedApplication) {
      return;
    }
    setBusyAction("preview");
    setError("");
    try {
      const result = await api(
        `/api/loan-applications/${selectedApplication.applicationNo}/computation-preview`,
        {
          method: "POST",
          body: JSON.stringify({ firstPaymentDate, applyCbu })
        }
      );
      setPreview(result.computation);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  }

  async function saveComputation() {
    if (!selectedApplication || !preview) {
      return;
    }
    setBusyAction("save");
    setError("");
    try {
      const result = await api(
        `/api/loan-applications/${selectedApplication.applicationNo}/computation`,
        {
          method: "POST",
          body: JSON.stringify({ firstPaymentDate, applyCbu })
        }
      );
      setMessage(`${result.loan.loanNo} saved as For Release.`);
      computationModal.onClose();
      setSelectedApplication(null);
      setPreview(null);
      await loadComputations();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  }

  function printLoanBreakdown(loan) {
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      setError("Allow pop-ups for this site to print the loan breakdown.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildLoanBreakdownPrintHtml(loan, user.username));
    printWindow.document.close();
    printWindow.focus();
  }

  function scheduleTable(schedule) {
    return (
      <TableContainer>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Installment</Th>
              <Th>Due Date</Th>
              <Th isNumeric>Principal</Th>
              <Th isNumeric>Interest</Th>
              <Th isNumeric>Total Due</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {schedule.map((installment) => (
              <Tr key={installment.installmentNo}>
                <Td>{installment.installmentNo}</Td>
                <Td>{installment.dueDate}</Td>
                <Td isNumeric>{formatMoney(installment.principalDue)}</Td>
                <Td isNumeric>{formatMoney(installment.interestDue)}</Td>
                <Td isNumeric fontWeight="bold">{formatMoney(installment.totalDue)}</Td>
                <Td><Badge>{installment.status}</Badge></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    );
  }

  function computationSummary(computation) {
    return (
      <Grid templateColumns={{ base: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={4}>
        {[
          ["Principal", formatMoney(computation.principal)],
          ["Total Interest", formatMoney(computation.totalInterest)],
          ["Total Payable", formatMoney(computation.totalPayable)],
          ["Net Proceeds", formatMoney(computation.netProceeds)],
          ["Service Fee", formatMoney(computation.processingFee)],
          ["Insurance", formatMoney(computation.insuranceFee)],
          ["CBU", `${formatMoney(computation.cbuAmount)}${computation.cbuApplied ? "" : " (not applied)"}`],
          ["Savings Retention", formatMoney(computation.savingsRetentionAmount)],
          ["Installments", computation.installmentCount],
          ["First Payment", computation.firstPaymentDate],
          ["Maturity", computation.maturityDate]
        ].map(([label, value]) => (
          <Box key={label}>
            <Text color="gray.500" fontSize="xs">{label}</Text>
            <Text fontWeight="bold">{value}</Text>
          </Box>
        ))}
      </Grid>
    );
  }

  function loanBreakdownPreview(loan) {
    const totalDeductions = addMoney(
      loan.processingFee,
      loan.insuranceFee,
      loan.cbuAmount,
      loan.savingsRetentionAmount
    );

    return (
      <VStack align="stretch" spacing={5}>
        <Box borderBottomWidth="2px" borderColor="green.700" pb={4}>
          <Text color="green.700" fontSize="xs" fontWeight="bold" textTransform="uppercase">
            Member loan copy
          </Text>
          <Heading size="md" mt={1}>TASETEMCO Loan Breakdown and Amortization</Heading>
          <Text color="gray.600" fontSize="sm" mt={1}>
            Tabon Secondary Teachers, Employees and Community Multi-Purpose Cooperative
          </Text>
        </Box>

        <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3}>
          {[
            ["Loan No.", loan.loanNo],
            ["Application No.", loan.applicationNo],
            ["Status", loan.status],
            ["Prepared By", user.username],
            ["Member No.", loan.memberNo],
            ["Member Name", loan.memberName],
            ["Product", loan.productName],
            ["Prepared", formatDate(new Date().toISOString())]
          ].map(([label, value]) => (
            <Box key={label} borderWidth="1px" borderRadius="md" p={3}>
              <Text color="gray.500" fontSize="xs" textTransform="uppercase">{label}</Text>
              <Text fontWeight="bold">{value}</Text>
            </Box>
          ))}
        </Grid>

        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
          <Box borderWidth="1px" borderRadius="md" p={4}>
            <Heading size="sm" mb={3}>Loan Terms</Heading>
            <VStack align="stretch" spacing={2}>
              <Flex justify="space-between"><Text>Principal</Text><Text fontWeight="bold">{formatMoney(loan.principal)}</Text></Flex>
              <Flex justify="space-between"><Text>Term</Text><Text>{loan.termMonths} months</Text></Flex>
              <Flex justify="space-between"><Text>Interest</Text><Text>{formatRateBps(loan.annualInterestRateBps)} annual</Text></Flex>
              <Flex justify="space-between"><Text>Method</Text><Text>{loan.interestMethod}</Text></Flex>
              <Flex justify="space-between"><Text>First Payment</Text><Text>{formatDate(loan.firstPaymentDate)}</Text></Flex>
              <Flex justify="space-between"><Text>Maturity</Text><Text>{formatDate(loan.maturityDate)}</Text></Flex>
            </VStack>
          </Box>
          <Box borderWidth="1px" borderRadius="md" p={4}>
            <Heading size="sm" mb={3}>Release Breakdown</Heading>
            <VStack align="stretch" spacing={2}>
              <Flex justify="space-between"><Text>Total Deductions</Text><Text>{formatMoney(totalDeductions)}</Text></Flex>
              <Flex justify="space-between"><Text>Net Proceeds</Text><Text fontWeight="bold">{formatMoney(loan.netProceeds)}</Text></Flex>
              <Flex justify="space-between"><Text>Total Interest</Text><Text>{formatMoney(loan.totalInterest)}</Text></Flex>
              <Flex justify="space-between"><Text>Total Payable</Text><Text fontWeight="bold">{formatMoney(loan.totalPayable)}</Text></Flex>
              <Flex justify="space-between"><Text>Installments</Text><Text>{loan.installmentCount}</Text></Flex>
            </VStack>
          </Box>
        </Grid>

        <Box>
          <Heading size="sm" mb={3}>Deductions From Principal</Heading>
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Deduction</Th>
                  <Th>Rate</Th>
                  <Th isNumeric>Amount</Th>
                </Tr>
              </Thead>
              <Tbody>
                {[
                  ["Service Fee", formatRateBps(loan.serviceFeeRateBps), loan.processingFee],
                  ["Insurance", formatRateBps(loan.insuranceFeeRateBps), loan.insuranceFee],
                  ["CBU / Capital Build-Up", loan.cbuApplied ? formatRateBps(loan.cbuRateBps) : "Not applied", loan.cbuAmount],
                  ["Savings Retention", formatRateBps(loan.savingsRetentionRateBps), loan.savingsRetentionAmount]
                ].map(([label, rate, amount]) => (
                  <Tr key={label}>
                    <Td>{label}</Td>
                    <Td>{rate}</Td>
                    <Td isNumeric>{formatMoney(amount)}</Td>
                  </Tr>
                ))}
                <Tr>
                  <Td colSpan={2} fontWeight="bold">Total Deductions</Td>
                  <Td isNumeric fontWeight="bold">{formatMoney(totalDeductions)}</Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>
        </Box>

        <Box>
          <Heading size="sm" mb={3}>Amortization Schedule</Heading>
          {scheduleTable(loan.installments)}
        </Box>
      </VStack>
    );
  }

  const approvedApplications = applications.filter(
    (application) =>
      application.status === "Approved" &&
      application.createdBy === user.username &&
      !loans.some((loan) => loan.applicationNo === application.applicationNo)
  );

  return (
    <VStack align="stretch" spacing={5} minW={0} maxW="100%">
      <Flex justify="space-between" gap={4} align="center" wrap="wrap">
        <Box>
          <Heading size="md">Loan Computations</Heading>
          <Text color="gray.600" mt={1}>
            Preview and save repayment schedules for approved applications before loan release.
          </Text>
        </Box>
        <Button size="sm" variant="outline" onClick={loadComputations}>Refresh</Button>
      </Flex>

      {message ? <Text color="green.600">{message}</Text> : null}
      {error ? <Text color="red.500">{error}</Text> : null}

      {canCreate && approvedApplications.length ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="sm" mb={4}>Approved Applications Ready for Computation</Heading>
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Application</Th>
                  <Th>Member</Th>
                  <Th>Product</Th>
                  <Th isNumeric>Approved Principal</Th>
                  <Th>Term</Th>
                  <Th>Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {approvedApplications.map((application) => (
                  <Tr key={application.applicationNo}>
                    <Td>{application.applicationNo}</Td>
                    <Td>{application.memberName}</Td>
                    <Td>{application.productName}</Td>
                    <Td isNumeric>{formatMoney(application.recommendedPrincipal)}</Td>
                    <Td>{application.recommendedTermMonths} months</Td>
                    <Td>
                      <Button size="sm" colorScheme="green" onClick={() => startComputation(application)}>
                        Compute
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      ) : null}

      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Heading size="sm" mb={4}>Saved Computations</Heading>
        <TableContainer>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Loan</Th>
                <Th>Member</Th>
                <Th>Product</Th>
                <Th isNumeric>Principal</Th>
                <Th isNumeric>Total Payable</Th>
                <Th>Maturity</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loans.map((loan) => (
                <Tr key={loan.loanNo}>
                  <Td>
                    <Text fontWeight="bold">{loan.loanNo}</Text>
                    <Text color="gray.500" fontSize="xs">{loan.applicationNo}</Text>
                  </Td>
                  <Td>{loan.memberName}</Td>
                  <Td>{loan.productName}</Td>
                  <Td isNumeric>{formatMoney(loan.principal)}</Td>
                  <Td isNumeric>{formatMoney(loan.totalPayable)}</Td>
                  <Td>{loan.maturityDate}</Td>
                  <Td><Badge colorScheme="purple">{loan.status}</Badge></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
        {!loans.length ? <Text color="gray.500">No saved loan computations yet.</Text> : null}
      </Box>

      <Modal isOpen={computationModal.isOpen} onClose={computationModal.onClose} size="6xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Amortization Preview {selectedApplication ? `- ${selectedApplication.applicationNo}` : ""}
          </ModalHeader>
          <ModalBody>
            {selectedApplication ? (
              <VStack align="stretch" spacing={5}>
                <Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap={4}>
                  <Box>
                    <Text fontWeight="bold">{selectedApplication.memberName}</Text>
                    <Text color="gray.600">
                      {selectedApplication.productName} / {formatMoney(selectedApplication.recommendedPrincipal)} /
                      {" "}{selectedApplication.recommendedTermMonths} months
                    </Text>
                    <Text color="gray.600">
                      {formatRateBps(selectedApplication.annualInterestRateBps)} annual /
                      {" "}{selectedApplication.interestMethod} / {selectedApplication.paymentFrequency}
                    </Text>
                  </Box>
                  <FormControl isRequired>
                    <FormLabel>First Payment Date</FormLabel>
                    <Input
                      type="date"
                      value={firstPaymentDate}
                      onChange={(event) => {
                        setFirstPaymentDate(event.target.value);
                        setPreview(null);
                      }}
                    />
                  </FormControl>
                </Grid>
                {Number(selectedApplication.cbuRateBps || 0) > 0 ? (
                  <Checkbox
                    isChecked={applyCbu}
                    isDisabled={!selectedApplication.cbuOptional}
                    onChange={(event) => {
                      setApplyCbu(event.target.checked);
                      setPreview(null);
                    }}
                  >
                    Apply CBU retention ({formatRateBps(selectedApplication.cbuRateBps)})
                    {selectedApplication.cbuOptional ? " - remove only when member is fully subscribed" : ""}
                  </Checkbox>
                ) : null}
                <Flex justify="flex-end">
                  <Button onClick={previewComputation} isLoading={busyAction === "preview"}>
                    Preview Schedule
                  </Button>
                </Flex>
                {preview ? (
                  <>
                    {computationSummary(preview)}
                    {scheduleTable(preview.installments)}
                  </>
                ) : null}
              </VStack>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={computationModal.onClose}>Cancel</Button>
            <Button
              colorScheme="green"
              onClick={saveComputation}
              isDisabled={!preview}
              isLoading={busyAction === "save"}
            >
              Save for Release
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </VStack>
  );
}

function TellerCashFunding({ user, onFundingAcknowledged }) {
  const [fundings, setFundings] = useState([]);
  const [tellers, setTellers] = useState([]);
  const [position, setPosition] = useState(null);
  const [form, setForm] = useState({
    tellerUsername: "teller01",
    amount: 20000,
    sourceAccountCode: "1020",
    sourceAccountName: "Cash in Bank",
    referenceNo: "",
    fundingDate: new Date().toISOString().slice(0, 10)
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const canPrepare = user.permissions.includes("teller-fundings:prepare");
  const canApprove = user.permissions.includes("teller-fundings:approve");
  const canAcknowledge = user.permissions.includes("teller-fundings:acknowledge");

  const loadFundings = useCallback(async () => {
    setError("");
    try {
      const [data, fundingPosition] = await Promise.all([
        api("/api/teller-fundings"),
        api("/api/teller-funding-position")
      ]);
      setFundings(data.fundings);
      setTellers(data.tellers);
      setPosition(fundingPosition);
      setForm((current) => ({
        ...current,
        tellerUsername:
          data.tellers.some((item) => item.username === current.tellerUsername)
            ? current.tellerUsername
            : data.tellers[0]?.username || ""
      }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    loadFundings();
  }, [loadFundings]);

  async function prepareFunding(event) {
    event.preventDefault();
    setBusyAction("prepare");
    setMessage("");
    setError("");
    try {
      const result = await api("/api/teller-fundings", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setMessage(`${result.funding.fundingNo} prepared for Manager approval.`);
      setForm((current) => ({ ...current, referenceNo: "" }));
      await loadFundings();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  }

  async function changeFundingStatus(fundingNo, action) {
    setBusyAction(`${action}-${fundingNo}`);
    setMessage("");
    setError("");
    try {
      const result = await api(`/api/teller-fundings/${fundingNo}/${action}`, {
        method: "POST"
      });
      setMessage(
        action === "approve"
          ? `${result.funding.fundingNo} approved for Teller acknowledgment.`
          : `${result.funding.fundingNo} acknowledged into ${result.funding.batchId}.`
      );
      await loadFundings();
      if (action === "acknowledge") {
        onFundingAcknowledged?.();
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAction("");
    }
  }

  const acknowledgedTotal = addMoney(
    ...fundings.filter((funding) => funding.status === "Acknowledged").map((funding) => funding.amount)
  );

  return (
    <VStack align="stretch" spacing={5} minW={0} maxW="100%">
      <Box>
        <Heading size="md">Teller Cash Funding</Heading>
        <Text color="gray.600" mt={1}>
          Establish controlled Teller custody before cash payouts and retain the related accounting evidence.
        </Text>
      </Box>

      {message ? <Text color="green.600">{message}</Text> : null}
      {error ? <Text color="red.500">{error}</Text> : null}

      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Flex justify="space-between" gap={4} wrap="wrap" mb={4}>
          <Box>
            <Heading size="sm">Release Funding Demand</Heading>
            <Text color="gray.600" fontSize="sm" mt={1}>
              Current loan releases and CBU withdrawals compared with acknowledged cash in the Open teller batch.
            </Text>
          </Box>
          <Badge colorScheme={position?.fundingShortage > 0 ? "orange" : "green"} alignSelf="start">
            {position?.fundingShortage > 0
              ? `Shortage: ${formatMoney(position.fundingShortage)}`
              : "Demand covered"}
          </Badge>
        </Flex>
        <Grid templateColumns={{ base: "repeat(2, 1fr)", lg: "repeat(5, 1fr)" }} gap={4} mb={5}>
          {[
            ["Total Payout Demand", position?.totalReleaseDemand || 0],
            ["Acknowledged Funding", position?.openingFunding || 0],
            ["Other Cash Receipts", position?.cashIn || 0],
            ["Existing Cash Payouts", position?.cashOut || 0],
            ["Available Teller Cash", position?.availableCash || 0]
          ].map(([label, value]) => (
            <Box key={label} minW={0}>
              <Text color="gray.500" fontSize="xs">{label}</Text>
              <Text fontWeight="bold">{formatMoney(value)}</Text>
            </Box>
          ))}
        </Grid>
        {canPrepare && position?.fundingShortage > 0 ? (
          <Flex justify="flex-end" mb={4}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setForm((current) => ({
                ...current,
                amount: position.fundingShortage
              }))}
            >
              Use Current Shortage
            </Button>
          </Flex>
        ) : null}
        <TableContainer>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Request</Th>
                <Th>Member</Th>
                <Th>Date Computed</Th>
                <Th isNumeric>Net Proceeds</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(position?.releaseQueue || []).map((loan) => (
                <Tr key={loan.loanNo}>
                  <Td>{loan.loanNo}</Td>
                  <Td>{loan.memberName}</Td>
                  <Td>{formatDateTime(loan.computedAt)}</Td>
                  <Td isNumeric fontWeight="bold">{formatMoney(loan.netProceeds)}</Td>
                  <Td><Badge colorScheme="purple">{loan.status}</Badge></Td>
                </Tr>
              ))}
              {(position?.cbuWithdrawalQueue || []).map((withdrawal) => (
                <Tr key={withdrawal.id}>
                  <Td>{withdrawal.id}<br /><Text fontSize="xs">CBU Withdrawal</Text></Td>
                  <Td>{withdrawal.memberName}</Td>
                  <Td>{formatDateTime(withdrawal.requestedAt)}</Td>
                  <Td isNumeric fontWeight="bold">{formatMoney(withdrawal.amount)}</Td>
                  <Td><Badge colorScheme="orange">{withdrawal.status}</Badge></Td>
                </Tr>
              ))}
              {!position?.releaseQueue?.length && !position?.cbuWithdrawalQueue?.length ? (
                <Tr>
                  <Td colSpan={5} color="gray.500">No payouts currently require funding.</Td>
                </Tr>
              ) : null}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      {canPrepare ? (
        <Box as="form" onSubmit={prepareFunding} bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="sm" mb={4}>Prepare Funding</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }} gap={4}>
            <FormControl isRequired>
              <FormLabel>Teller</FormLabel>
              <Select
                value={form.tellerUsername}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  tellerUsername: event.target.value
                }))}
              >
                {tellers.map((teller) => (
                  <option key={teller.username} value={teller.username}>
                    {teller.name} (@{teller.username})
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Funding Amount</FormLabel>
              <NumberInput
                min={0.01}
                precision={2}
                step={0.01}
                value={form.amount}
                onChange={(value) => setForm((current) => ({ ...current, amount: Number(value || 0) }))}
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Funding Date</FormLabel>
              <Input
                type="date"
                value={form.fundingDate}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  fundingDate: event.target.value
                }))}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Source Account Code</FormLabel>
              <Input
                value={form.sourceAccountCode}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  sourceAccountCode: event.target.value
                }))}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Source Account Name</FormLabel>
              <Input
                value={form.sourceAccountName}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  sourceAccountName: event.target.value
                }))}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Funding Reference</FormLabel>
              <Input
                value={form.referenceNo}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  referenceNo: event.target.value.toUpperCase()
                }))}
              />
            </FormControl>
          </Grid>
          <Flex justify="flex-end" mt={5}>
            <Button type="submit" colorScheme="green" isLoading={busyAction === "prepare"}>
              Prepare Funding
            </Button>
          </Flex>
        </Box>
      ) : null}

      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Flex justify="space-between" gap={4} wrap="wrap" mb={4}>
          <Heading size="sm">Funding Lifecycle</Heading>
          <HStack>
            <Badge colorScheme="green">Acknowledged: {formatMoney(acknowledgedTotal)}</Badge>
            <Button size="sm" variant="outline" onClick={loadFundings}>Refresh</Button>
          </HStack>
        </Flex>
        <TableContainer>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Funding</Th>
                <Th>Teller</Th>
                <Th isNumeric>Amount</Th>
                <Th>Source</Th>
                <Th>Reference</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th>Batch</Th>
                <Th>Control Evidence</Th>
                <Th>Journal</Th>
                <Th>Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {fundings.map((funding) => (
                <Tr key={funding.fundingNo}>
                  <Td>{funding.fundingNo}</Td>
                  <Td>@{funding.tellerUsername}</Td>
                  <Td isNumeric>{formatMoney(funding.amount)}</Td>
                  <Td>{funding.sourceAccountCode} - {funding.sourceAccountName}</Td>
                  <Td>{funding.referenceNo}</Td>
                  <Td>{funding.fundingDate}</Td>
                  <Td>
                    <Badge colorScheme={
                      funding.status === "Acknowledged"
                        ? "green"
                        : funding.status === "Approved"
                          ? "blue"
                          : "yellow"
                    }>
                      {funding.status}
                    </Badge>
                  </Td>
                  <Td>{funding.batchId || "-"}</Td>
                  <Td minW="220px">
                    <Text fontSize="xs">Prepared: {funding.preparedBy}</Text>
                    <Text fontSize="xs">Approved: {funding.approvedBy || "-"}</Text>
                    <Text fontSize="xs">Acknowledged: {funding.acknowledgedBy || "-"}</Text>
                    <Text fontSize="xs">Posted: {funding.postedBy || "-"}</Text>
                  </Td>
                  <Td>{funding.postedEntryNo || "Unposted"}</Td>
                  <Td>
                    {canApprove && funding.status === "Prepared" ? (
                      <Button
                        size="sm"
                        onClick={() => changeFundingStatus(funding.fundingNo, "approve")}
                        isLoading={busyAction === `approve-${funding.fundingNo}`}
                      >
                        Approve
                      </Button>
                    ) : null}
                    {canAcknowledge &&
                    funding.status === "Approved" &&
                    funding.tellerUsername === user.username ? (
                      <Button
                        size="sm"
                        colorScheme="green"
                        onClick={() => changeFundingStatus(funding.fundingNo, "acknowledge")}
                        isLoading={busyAction === `acknowledge-${funding.fundingNo}`}
                      >
                        Acknowledge
                      </Button>
                    ) : null}
                    {!(
                      (canApprove && funding.status === "Prepared") ||
                      (canAcknowledge &&
                        funding.status === "Approved" &&
                        funding.tellerUsername === user.username)
                    ) ? <Text color="gray.500">Read only</Text> : null}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
        {!fundings.length ? <Text color="gray.500">No teller funding prepared yet.</Text> : null}
      </Box>
    </VStack>
  );
}

function LoanReleases({ user }) {
  const [loans, setLoans] = useState([]);
  const [releases, setReleases] = useState([]);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedDetailLoan, setSelectedDetailLoan] = useState(null);
  const [form, setForm] = useState({
    releaseDate: new Date().toISOString().slice(0, 10),
    referenceNo: "",
    cashReleased: 0
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const releaseModal = useDisclosure();
  const scheduleModal = useDisclosure();
  const printModal = useDisclosure();
  const canCreate = user.permissions.includes("loans:releases:create");

  const loadReleases = useCallback(async () => {
    setError("");
    try {
      const [loanRows, releaseRows, fundingPosition] = await Promise.all([
        api("/api/loans"),
        api("/api/loan-releases"),
        canCreate ? api("/api/teller-funding-position") : Promise.resolve(null)
      ]);
      setLoans(loanRows);
      setReleases(releaseRows);
      setPosition(fundingPosition);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [canCreate]);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  function startRelease(loan) {
    setSelectedLoan(loan);
    setForm({
      releaseDate: new Date().toISOString().slice(0, 10),
      referenceNo: "",
      cashReleased: loan.netProceeds
    });
    setMessage("");
    setError("");
    releaseModal.onOpen();
  }

  function viewSchedule(loan) {
    setSelectedDetailLoan(loan);
    scheduleModal.onOpen();
  }

  function previewPrintBreakdown(loan) {
    setSelectedDetailLoan(loan);
    printModal.onOpen();
  }

  function printLoanBreakdown(loan) {
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      setError("Allow pop-ups for this site to print the loan breakdown.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildLoanBreakdownPrintHtml(loan, user.username));
    printWindow.document.close();
    printWindow.focus();
  }

  function releaseComputationSummary(loan) {
    return (
      <Grid templateColumns={{ base: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={4}>
        {[
          ["Principal", formatMoney(loan.principal)],
          ["Total Interest", formatMoney(loan.totalInterest)],
          ["Total Payable", formatMoney(loan.totalPayable)],
          ["Net Proceeds", formatMoney(loan.netProceeds)],
          ["Service Fee", formatMoney(loan.processingFee)],
          ["Insurance", formatMoney(loan.insuranceFee)],
          ["CBU", `${formatMoney(loan.cbuAmount)}${loan.cbuApplied ? "" : " (not applied)"}`],
          ["Savings Retention", formatMoney(loan.savingsRetentionAmount)],
          ["Installments", loan.installmentCount],
          ["First Payment", loan.firstPaymentDate],
          ["Maturity", loan.maturityDate]
        ].map(([label, value]) => (
          <Box key={label}>
            <Text color="gray.500" fontSize="xs">{label}</Text>
            <Text fontWeight="bold">{value}</Text>
          </Box>
        ))}
      </Grid>
    );
  }

  function releaseScheduleTable(schedule = []) {
    return (
      <TableContainer>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Installment</Th>
              <Th>Due Date</Th>
              <Th isNumeric>Principal</Th>
              <Th isNumeric>Interest</Th>
              <Th isNumeric>Total Due</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {schedule.map((installment) => (
              <Tr key={installment.installmentNo}>
                <Td>{installment.installmentNo}</Td>
                <Td>{installment.dueDate}</Td>
                <Td isNumeric>{formatMoney(installment.principalDue)}</Td>
                <Td isNumeric>{formatMoney(installment.interestDue)}</Td>
                <Td isNumeric fontWeight="bold">{formatMoney(installment.totalDue)}</Td>
                <Td><Badge>{installment.status}</Badge></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    );
  }

  function releaseBreakdownPreview(loan) {
    const totalDeductions = addMoney(
      loan.processingFee,
      loan.insuranceFee,
      loan.cbuAmount,
      loan.savingsRetentionAmount
    );
    return (
      <VStack align="stretch" spacing={5}>
        {releaseComputationSummary(loan)}
        <TableContainer>
          <Table size="sm">
            <Thead><Tr><Th>Deduction</Th><Th>Rate</Th><Th isNumeric>Amount</Th></Tr></Thead>
            <Tbody>
              {[
                ["Service Fee", formatRateBps(loan.serviceFeeRateBps), loan.processingFee],
                ["Insurance", formatRateBps(loan.insuranceFeeRateBps), loan.insuranceFee],
                ["CBU / Capital Build-Up", loan.cbuApplied ? formatRateBps(loan.cbuRateBps) : "Not applied", loan.cbuAmount],
                ["Savings Retention", formatRateBps(loan.savingsRetentionRateBps), loan.savingsRetentionAmount]
              ].map(([label, rate, amount]) => (
                <Tr key={label}><Td>{label}</Td><Td>{rate}</Td><Td isNumeric>{formatMoney(amount)}</Td></Tr>
              ))}
              <Tr>
                <Td colSpan={2} fontWeight="bold">Total Deductions</Td>
                <Td isNumeric fontWeight="bold">{formatMoney(totalDeductions)}</Td>
              </Tr>
            </Tbody>
          </Table>
        </TableContainer>
        {releaseScheduleTable(loan.installments)}
      </VStack>
    );
  }

  async function confirmRelease() {
    if (!selectedLoan) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api(`/api/loans/${selectedLoan.loanNo}/release`, {
        method: "POST",
        body: JSON.stringify(form)
      });
      setMessage(`${result.release.releaseNo} recorded in teller batch ${result.release.batchId}.`);
      releaseModal.onClose();
      setSelectedLoan(null);
      await loadReleases();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const normalizedSearch = search.trim().toLowerCase();
  const matchesLoanSearch = (item) => !normalizedSearch || [item.loanNo, item.memberNo, item.memberName]
    .join(" ").toLowerCase().includes(normalizedSearch);
  const readyLoans = loans.filter((loan) => loan.status === "For Release" && matchesLoanSearch(loan));
  const filteredReleases = releases.filter(matchesLoanSearch);

  return (
    <VStack align="stretch" spacing={5} minW={0} maxW="100%">
      <Flex justify="space-between" gap={4} align="center" wrap="wrap">
        <Box>
          <Heading size="md">Loan Releases</Heading>
          <Text color="gray.600" mt={1}>
            Teller confirms computed proceeds and records the cash release into the open teller batch.
          </Text>
        </Box>
        <Button size="sm" variant="outline" onClick={loadReleases}>Refresh</Button>
      </Flex>

      {message ? <Text color="green.600">{message}</Text> : null}
      {error ? <Text color="red.500">{error}</Text> : null}

      <FormControl maxW={{ base: "100%", md: "420px" }}>
        <FormLabel>Find loan or member</FormLabel>
        <Input value={search} onChange={(event) => setSearch(event.target.value)}
          placeholder="Search loan no., member name, or member no." />
      </FormControl>

      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Flex justify="space-between" gap={4} wrap="wrap" mb={4}>
            <Box>
              <Heading size="sm">For Release Queue</Heading>
              {canCreate ? <Text color="gray.600" fontSize="sm" mt={1}>
                Available teller cash: {formatMoney(position?.availableCash || 0)}
              </Text> : null}
            </Box>
            {canCreate ? <Badge colorScheme={position?.fundingShortage > 0 ? "orange" : "green"} alignSelf="start">
              Queue shortage: {formatMoney(position?.fundingShortage || 0)}
            </Badge> : null}
          </Flex>
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Loan</Th>
                  <Th>Member</Th>
                  <Th isNumeric>Principal</Th>
                  <Th isNumeric>Service</Th>
                  <Th isNumeric>Insurance</Th>
                  <Th isNumeric>CBU</Th>
                  <Th isNumeric>Savings</Th>
                  <Th isNumeric>Net Proceeds</Th>
                  <Th>Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {readyLoans.map((loan) => {
                  const shortage = Math.max(
                    0,
                    addMoney(loan.netProceeds, -Number(position?.availableCash || 0))
                  );
                  return (
                    <Tr key={loan.loanNo}>
                      <Td>{loan.loanNo}</Td>
                      <Td>{loan.memberName}</Td>
                      <Td isNumeric>{formatMoney(loan.principal)}</Td>
                      <Td isNumeric>{formatMoney(loan.processingFee)}</Td>
                      <Td isNumeric>{formatMoney(loan.insuranceFee)}</Td>
                      <Td isNumeric>{formatMoney(loan.cbuAmount)}</Td>
                      <Td isNumeric>{formatMoney(loan.savingsRetentionAmount)}</Td>
                      <Td isNumeric fontWeight="bold">{formatMoney(loan.netProceeds)}</Td>
                      <Td>
                        <Flex gap={2} wrap="wrap">
                          <Button size="sm" onClick={() => viewSchedule(loan)}>View Schedule</Button>
                          <Button size="sm" variant="outline" onClick={() => previewPrintBreakdown(loan)}>
                            Print Breakdown
                          </Button>
                          {canCreate ? (
                            <Button
                              size="sm"
                              colorScheme="green"
                              onClick={() => startRelease(loan)}
                              isDisabled={shortage > 0}
                              title={shortage > 0 ? `Funding shortage: ${formatMoney(shortage)}` : ""}
                            >
                              {shortage > 0 ? `Short ${formatMoney(shortage)}` : "Release"}
                            </Button>
                          ) : null}
                        </Flex>
                      </Td>
                    </Tr>
                  );
                })}
                {!readyLoans.length ? (
                  <Tr>
                    <Td colSpan={9} color="gray.500">
                      {normalizedSearch ? "No release-ready loans match the search." : "No computed loans are currently marked For Release."}
                    </Td>
                  </Tr>
                ) : null}
              </Tbody>
            </Table>
      </TableContainer>
    </Box>

      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Heading size="sm" mb={4}>Release History</Heading>
        <TableContainer>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Release</Th>
                <Th>Loan</Th>
                <Th>Member</Th>
                <Th>Batch</Th>
                <Th>Reference</Th>
                <Th isNumeric>Cash Released</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th>Journal</Th>
                <Th>Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredReleases.map((release) => {
                const loan = loans.find((item) => item.loanNo === release.loanNo);
                return <Tr key={release.releaseNo}>
                  <Td>{release.releaseNo}</Td>
                  <Td>{release.loanNo}</Td>
                  <Td>{release.memberName}</Td>
                  <Td>{release.batchId}</Td>
                  <Td>{release.referenceNo}</Td>
                  <Td isNumeric>{formatMoney(release.cashReleased)}</Td>
                  <Td>{release.releaseDate}</Td>
                  <Td><Badge colorScheme={release.status === "Posted" ? "green" : "orange"}>{release.status}</Badge></Td>
                  <Td>{release.postedEntryNo || "-"}</Td>
                  <Td>
                    {loan ? <Flex gap={2} wrap="wrap">
                      <Button size="sm" onClick={() => viewSchedule(loan)}>View Schedule</Button>
                      <Button size="sm" variant="outline" onClick={() => previewPrintBreakdown(loan)}>
                        Print Breakdown
                      </Button>
                    </Flex> : "-"}
                  </Td>
                </Tr>;
              })}
            </Tbody>
          </Table>
        </TableContainer>
        {!filteredReleases.length ? <Text color="gray.500">{normalizedSearch ? "No release history matches the search." : "No loan releases recorded yet."}</Text> : null}
      </Box>

      <Modal isOpen={releaseModal.isOpen} onClose={releaseModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{selectedLoan ? `Release ${selectedLoan.loanNo}` : "Release Loan"}</ModalHeader>
          <ModalBody>
            {selectedLoan ? (
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Text fontWeight="bold">{selectedLoan.memberName}</Text>
                  <Text color="gray.600">Principal: {formatMoney(selectedLoan.principal)}</Text>
                  <Text color="gray.600">Service fee: {formatMoney(selectedLoan.processingFee)}</Text>
                  <Text color="gray.600">Insurance: {formatMoney(selectedLoan.insuranceFee)}</Text>
                  <Text color="gray.600">CBU: {formatMoney(selectedLoan.cbuAmount)}</Text>
                  <Text color="gray.600">Savings retention: {formatMoney(selectedLoan.savingsRetentionAmount)}</Text>
                  <Text fontWeight="bold">Net proceeds: {formatMoney(selectedLoan.netProceeds)}</Text>
                </Box>
                <FormControl isRequired>
                  <FormLabel>Release Date</FormLabel>
                  <Input
                    type="date"
                    value={form.releaseDate}
                    onChange={(event) => setForm((current) => ({ ...current, releaseDate: event.target.value }))}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Release Voucher / Reference Number</FormLabel>
                  <Input
                    value={form.referenceNo}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      referenceNo: event.target.value.toUpperCase()
                    }))}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Cash Released</FormLabel>
                  <NumberInput
                    min={0}
                    precision={2}
                    step={0.01}
                    value={form.cashReleased}
                    onChange={(value) => setForm((current) => ({
                      ...current,
                      cashReleased: Number(value || 0)
                    }))}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <Text color="gray.500" fontSize="sm">
                  Cash must exactly match net proceeds. Posting to the general ledger remains a Bookkeeper step.
                </Text>
                <Text color="gray.500" fontSize="sm">
                  Available teller cash after existing batch activity: {formatMoney(position?.availableCash || 0)}
                </Text>
              </VStack>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={releaseModal.onClose}>Cancel</Button>
            <Button colorScheme="green" onClick={confirmRelease} isLoading={busy}>
              Confirm Release
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={scheduleModal.isOpen} onClose={scheduleModal.onClose} size="6xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedDetailLoan ? `${selectedDetailLoan.loanNo} Repayment Schedule` : "Repayment Schedule"}
          </ModalHeader>
          <ModalBody>
            {selectedDetailLoan ? (
              <VStack align="stretch" spacing={5}>
                {releaseComputationSummary(selectedDetailLoan)}
                {releaseScheduleTable(selectedDetailLoan.installments)}
              </VStack>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button onClick={scheduleModal.onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal isOpen={printModal.isOpen} onClose={printModal.onClose} size="6xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedDetailLoan ? `${selectedDetailLoan.loanNo} Member Copy` : "Loan Breakdown"}
          </ModalHeader>
          <ModalBody>
            {selectedDetailLoan ? releaseBreakdownPreview(selectedDetailLoan) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={printModal.onClose}>Close</Button>
            <Button
              colorScheme="green"
              onClick={() => selectedDetailLoan && printLoanBreakdown(selectedDetailLoan)}
            >
              Print
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}

function LoanCollections({ user }) {
  const [loans, setLoans] = useState([]);
  const [collections, setCollections] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [form, setForm] = useState({
    collectionDate: new Date().toISOString().slice(0, 10),
    referenceNo: "",
    amountReceived: 0
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const collectionModal = useDisclosure();
  const canCreate = user.permissions.includes("loans:collections:create");

  const loadCollections = useCallback(async () => {
    setError("");
    try {
      const [loanRows, collectionRows] = await Promise.all([
        api("/api/loans"),
        api("/api/loan-collections")
      ]);
      setLoans(loanRows);
      setCollections(collectionRows);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  function nextInstallment(loan) {
    return loan.installments.find((installment) => installment.status !== "Paid" && installment.totalRemaining > 0) || null;
  }

  function startCollection(loan) {
    const installment = nextInstallment(loan);
    if (!installment) {
      return;
    }
    setSelectedLoan(loan);
    setForm({
      collectionDate: new Date().toISOString().slice(0, 10),
      referenceNo: "",
      amountReceived: installment.totalRemaining
    });
    setMessage("");
    setError("");
    collectionModal.onOpen();
  }

  async function confirmCollection() {
    if (!selectedLoan) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api(`/api/loans/${selectedLoan.loanNo}/collections`, {
        method: "POST",
        body: JSON.stringify(form)
      });
      setMessage(
        `${result.collection.collectionNo} recorded for installment ${result.collection.installmentNo} in ${result.collection.batchId}.`
      );
      collectionModal.onClose();
      setSelectedLoan(null);
      await loadCollections();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const normalizedSearch = search.trim().toLowerCase();
  const matchesLoanSearch = (item) => !normalizedSearch || [item.loanNo, item.memberNo, item.memberName]
    .join(" ").toLowerCase().includes(normalizedSearch);
  const collectibleLoans = loans
    .filter((loan) => loan.status === "Posted")
    .map((loan) => ({ ...loan, nextInstallment: nextInstallment(loan) }))
    .filter((loan) => loan.nextInstallment && matchesLoanSearch(loan));
  const filteredCollections = collections.filter(matchesLoanSearch);
  const selectedInstallment = selectedLoan ? nextInstallment(selectedLoan) : null;
  const selectedOutstandingBalance = selectedLoan
    ? selectedLoan.installments.reduce((total, installment) => addMoney(total, installment.totalRemaining), 0)
    : 0;
  const collectionPreview = previewLoanCollectionAllocation(
    form.amountReceived,
    selectedLoan?.installments || []
  );

  return (
    <VStack align="stretch" spacing={5} minW={0} maxW="100%">
      <Flex justify="space-between" gap={4} align="center" wrap="wrap">
        <Box>
          <Heading size="md">Loan Collections</Heading>
          <Text color="gray.600" mt={1}>
            Record actual loan payments. The system suggests the amount due, but Teller may accept partial or advance payments.
          </Text>
        </Box>
        <Button size="sm" variant="outline" onClick={loadCollections}>Refresh</Button>
      </Flex>

      {message ? <Text color="green.600">{message}</Text> : null}
      {error ? <Text color="red.500">{error}</Text> : null}

      <FormControl maxW={{ base: "100%", md: "420px" }}>
        <FormLabel>Find loan or member</FormLabel>
        <Input value={search} onChange={(event) => setSearch(event.target.value)}
          placeholder="Search loan no., member name, or member no." />
      </FormControl>

      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Heading size="sm" mb={4}>Next Scheduled Installments</Heading>
        <TableContainer>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Loan</Th>
                <Th>Member</Th>
                <Th>Installment</Th>
                <Th>Due Date</Th>
                <Th isNumeric>Principal</Th>
                <Th isNumeric>Interest</Th>
                <Th isNumeric>Amount Due</Th>
                <Th>Status</Th>
                {canCreate ? <Th>Action</Th> : null}
              </Tr>
            </Thead>
            <Tbody>
              {collectibleLoans.map((loan) => (
                <Tr key={loan.loanNo}>
                  <Td>{loan.loanNo}</Td>
                  <Td>{loan.memberName}</Td>
                  <Td>{loan.nextInstallment.installmentNo} of {loan.installmentCount}</Td>
                  <Td>{loan.nextInstallment.dueDate}</Td>
                  <Td isNumeric>{formatMoney(loan.nextInstallment.principalRemaining)}</Td>
                  <Td isNumeric>{formatMoney(loan.nextInstallment.interestRemaining)}</Td>
                  <Td isNumeric fontWeight="bold">{formatMoney(loan.nextInstallment.totalRemaining)}</Td>
                  <Td>
                    <Badge colorScheme={loan.nextInstallment.status === "Partial" ? "orange" : "blue"}>
                      {loan.nextInstallment.status}
                    </Badge>
                  </Td>
                  {canCreate ? (
                    <Td>
                      <Button size="sm" colorScheme="green" onClick={() => startCollection(loan)}>
                        Collect
                      </Button>
                    </Td>
                  ) : null}
                </Tr>
              ))}
              {!collectibleLoans.length ? (
                <Tr>
                  <Td colSpan={canCreate ? 9 : 8} color="gray.500">
                    {normalizedSearch ? "No collectible loans match the search." : "No posted loan currently has an unpaid scheduled installment."}
                  </Td>
                </Tr>
              ) : null}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Heading size="sm" mb={4}>Collection History</Heading>
        <TableContainer>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Collection</Th>
                <Th>Loan</Th>
                <Th>Member</Th>
                <Th>Installment</Th>
                <Th>Reference</Th>
                <Th isNumeric>Principal Applied</Th>
                <Th isNumeric>Interest Applied</Th>
                <Th isNumeric>Received</Th>
                <Th>Batch</Th>
                <Th>Status</Th>
                <Th>Journal</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredCollections.map((collection) => (
                <Tr key={collection.collectionNo}>
                  <Td>{collection.collectionNo}</Td>
                  <Td>{collection.loanNo}</Td>
                  <Td>{collection.memberName}</Td>
                  <Td>
                    {collection.allocations?.length > 1
                      ? `${collection.allocations[0].installmentNo}–${collection.allocations.at(-1).installmentNo}`
                      : collection.installmentNo}
                  </Td>
                  <Td>{collection.referenceNo}</Td>
                  <Td isNumeric>{formatMoney(collection.principalAmount)}</Td>
                  <Td isNumeric>{formatMoney(collection.interestAmount)}</Td>
                  <Td isNumeric fontWeight="bold">{formatMoney(collection.amountReceived)}</Td>
                  <Td>{collection.batchId}</Td>
                  <Td>
                    <Badge colorScheme={collection.status === "Posted" ? "green" : "orange"}>
                      {collection.status}
                    </Badge>
                  </Td>
                  <Td>{collection.postedEntryNo || "-"}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
        {!filteredCollections.length ? <Text color="gray.500">{normalizedSearch ? "No collection history matches the search." : "No loan collections recorded yet."}</Text> : null}
      </Box>

      <Modal isOpen={collectionModal.isOpen} onClose={collectionModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{selectedLoan ? `Collect ${selectedLoan.loanNo}` : "Collect Installment"}</ModalHeader>
          <ModalBody>
            {selectedLoan && selectedInstallment ? (
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Text fontWeight="bold">{selectedLoan.memberName}</Text>
                  <Text color="gray.600">
                    Installment {selectedInstallment.installmentNo} due {selectedInstallment.dueDate}
                  </Text>
                  <Text color="gray.600">Remaining principal: {formatMoney(selectedInstallment.principalRemaining)}</Text>
                  <Text color="gray.600">Remaining interest: {formatMoney(selectedInstallment.interestRemaining)}</Text>
                  <Text fontWeight="bold">Amount due now: {formatMoney(selectedInstallment.totalRemaining)}</Text>
                  <Text color="gray.600">Total loan balance remaining: {formatMoney(selectedOutstandingBalance)}</Text>
                </Box>
                <FormControl isRequired>
                  <FormLabel>Collection Date</FormLabel>
                  <Input
                    type="date"
                    value={form.collectionDate}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      collectionDate: event.target.value
                    }))}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Official Receipt / Reference Number</FormLabel>
                  <Input
                    value={form.referenceNo}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      referenceNo: event.target.value.toUpperCase()
                    }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Actual Amount Received</FormLabel>
                  <NumberInput
                    min={0.01}
                    max={selectedOutstandingBalance || undefined}
                    precision={2}
                    step={0.01}
                    value={form.amountReceived}
                    onChange={(value) => setForm((current) => ({
                      ...current,
                      amountReceived: Number(value || 0)
                    }))}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <Box borderWidth="1px" borderRadius="md" p={4} bg="gray.50">
                  <Flex justify="space-between" gap={4} wrap="wrap" mb={3}>
                    <Box>
                      <Text fontWeight="bold">Payment Allocation Preview</Text>
                      <Text color="gray.600" fontSize="sm">
                        This is how the receipt will be applied when confirmed.
                      </Text>
                    </Box>
                    <Badge colorScheme={collectionPreview.paymentTypeColor} alignSelf="flex-start">
                      {collectionPreview.paymentType}
                    </Badge>
                  </Flex>
                  <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3}>
                    <Box>
                      <Text color="gray.500" fontSize="sm">Interest Applied</Text>
                      <Text fontWeight="bold">{formatMoney(collectionPreview.interestApplied)}</Text>
                    </Box>
                    <Box>
                      <Text color="gray.500" fontSize="sm">Principal Applied</Text>
                      <Text fontWeight="bold">{formatMoney(collectionPreview.principalApplied)}</Text>
                    </Box>
                    <Box>
                      <Text color="gray.500" fontSize="sm">Received</Text>
                      <Text fontWeight="bold">{formatMoney(collectionPreview.amount)}</Text>
                    </Box>
                    <Box>
                      <Text color="gray.500" fontSize="sm">Balance After Receipt</Text>
                      <Text fontWeight="bold">{formatMoney(collectionPreview.remainingAfterReceipt)}</Text>
                    </Box>
                  </Grid>
                  {collectionPreview.allocations.length ? (
                    <TableContainer mt={4}>
                      <Table size="sm" bg="white">
                        <Thead>
                          <Tr>
                            <Th>Installment</Th>
                            <Th isNumeric>Interest</Th>
                            <Th isNumeric>Principal</Th>
                            <Th isNumeric>Applied</Th>
                            <Th>Result</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {collectionPreview.allocations.map((allocation) => (
                            <Tr key={allocation.installmentNo}>
                              <Td>{allocation.installmentNo}</Td>
                              <Td isNumeric>{formatMoney(allocation.interestApplied)}</Td>
                              <Td isNumeric>{formatMoney(allocation.principalApplied)}</Td>
                              <Td isNumeric>{formatMoney(allocation.amountApplied)}</Td>
                              <Td>
                                <Badge colorScheme={allocation.result === "Paid" ? "green" : "orange"}>
                                  {allocation.result}
                                </Badge>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  ) : null}
                </Box>
                <Text color="gray.500" fontSize="sm">
                  Collections apply to the oldest unpaid installment first, then continue through future installments. Each installment applies interest before principal; the original schedule is not recomputed.
                </Text>
              </VStack>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={collectionModal.onClose}>Cancel</Button>
            <Button
              colorScheme="green"
              onClick={confirmCollection}
              isLoading={busy}
              isDisabled={!form.referenceNo.trim() || form.amountReceived <= 0 || form.amountReceived > selectedOutstandingBalance}
            >
              Confirm Collection
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}

function CashTurnovers({ user }) {
  const [batches, setBatches] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const canSubmit = user.permissions.includes("teller-turnovers:create");
  const canAccept = user.permissions.includes("teller-turnovers:accept");

  const load = useCallback(async () => {
    try {
      setError("");
      setBatches(await api("/api/teller-batches"));
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ownBatch = batches.find((batch) =>
    batch.tellerUsername === user.username && ["Open", "Pending Turnover"].includes(batch.status)
  );
  const pending = batches.filter((batch) => batch.status === "Pending Turnover");

  async function submitTurnover() {
    if (!window.confirm("Submit this collection batch for physical cash turnover to the Cashier?")) return;
    setBusy("submit"); setError(""); setMessage("");
    try {
      const result = await api("/api/teller-turnovers/submit", { method: "POST", body: JSON.stringify({}) });
      setMessage(`${result.batch.id} submitted: ${formatMoney(result.summary.cashIn)} for Cashier count.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  async function acceptTurnover(batch) {
    const entered = window.prompt(
      `Count the physical cash from ${batch.tellerUsername}, then enter the amount. Expected ${formatMoney(batch.turnoverAmount)}:`,
      Number(batch.turnoverAmount || 0).toFixed(2)
    );
    if (entered === null) return;
    const countedCash = Number(entered);
    setBusy(batch.id); setError(""); setMessage("");
    try {
      const result = await api(`/api/teller-turnovers/${batch.id}/accept`, {
        method: "POST",
        body: JSON.stringify({ countedCash })
      });
      setMessage(
        `${batch.id} accepted into Cashier batch ${result.targetBatch.id}. Final cash count remains with the Cashier.`
      );
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <Heading size="md">Cash Turnover</Heading>
        <Text color="gray.600" mt={1}>
          Loan Officer collections remain separate until the Cashier physically counts and accepts the turnover.
        </Text>
      </Box>
      {message ? <Text color="green.600">{message}</Text> : null}
      {error ? <Text color="red.500">{error}</Text> : null}
      {canSubmit ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="sm" mb={3}>My Collection Batch</Heading>
          {ownBatch ? (
            <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
              <Box>
                <Text fontWeight="bold">{ownBatch.id}</Text>
                <Text color="gray.600">
                  {ownBatch.status === "Pending Turnover"
                    ? `${formatMoney(ownBatch.turnoverAmount)} awaiting Cashier acceptance`
                    : `${ownBatch.unpostedTransactionCount || 0} encoded cash-in transaction(s)`}
                </Text>
              </Box>
              <Button colorScheme="green" onClick={submitTurnover}
                isLoading={busy === "submit"} isDisabled={ownBatch.status !== "Open"}>
                Submit Cash Turnover
              </Button>
            </HStack>
          ) : <Text color="gray.500">Your next cash-in transaction will open a collection batch.</Text>}
        </Box>
      ) : null}
      {canAccept ? (
        <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="sm" mb={3}>Pending Loan Officer Turnovers</Heading>
          <TableContainer>
            <Table size="sm">
              <Thead><Tr><Th>Batch</Th><Th>Loan Officer</Th><Th isNumeric>Transactions</Th>
                <Th isNumeric>Cash to Count</Th><Th>Submitted</Th><Th>Action</Th></Tr></Thead>
              <Tbody>
                {pending.map((batch) => (
                  <Tr key={batch.id}>
                    <Td>{batch.id}</Td><Td>{batch.tellerUsername}</Td>
                    <Td isNumeric>{batch.turnoverTransactionCount}</Td>
                    <Td isNumeric fontWeight="bold">{formatMoney(batch.turnoverAmount)}</Td>
                    <Td>{formatDateTime(batch.turnoverSubmittedAt)}</Td>
                    <Td><Button size="sm" colorScheme="green" onClick={() => acceptTurnover(batch)}
                      isLoading={busy === batch.id}>Count & Accept</Button></Td>
                  </Tr>
                ))}
                {!pending.length ? <Tr><Td colSpan={6} color="gray.500">No cash turnovers awaiting acceptance.</Td></Tr> : null}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      ) : null}
    </VStack>
  );
}

function Loans({ user }) {
  const canViewApplications = user.permissions.includes("loans:applications:view");
  const canViewComputations = user.permissions.includes("loans:computations:view");
  const canViewReleases = user.permissions.includes("loans:releases:view");
  const canViewCollections = user.permissions.includes("loans:collections:view");
  const canViewCashFunding = user.permissions.includes("teller-fundings:acknowledge");
  const canViewCashTurnover = user.permissions.includes("teller-turnovers:create") ||
    user.permissions.includes("teller-turnovers:accept");
  const canViewProducts = user.permissions.includes("loans:products:view");
  const tabs = [
    canViewApplications ? { key: "applications", label: "Applications" } : null,
    canViewComputations ? { key: "computations", label: "Computations" } : null,
    canViewReleases ? { key: "releases", label: "Releases" } : null,
    canViewCollections ? { key: "collections", label: "Collections" } : null,
    canViewCashTurnover ? { key: "cash-turnover", label: "Cash Turnover" } : null,
    canViewCashFunding ? { key: "cash-funding", label: "Cash Funding" } : null,
    canViewProducts ? { key: "products", label: "Loan Products" } : null
  ].filter(Boolean);
  const [activeTabKey, setActiveTabKey] = useState(tabs[0]?.key || "");
  const activeTabIndex = Math.max(0, tabs.findIndex((tab) => tab.key === activeTabKey));

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTabKey)) {
      setActiveTabKey(tabs[0]?.key || "");
    }
  }, [activeTabKey, tabs]);

  if (!canViewApplications && !canViewComputations && !canViewReleases && !canViewCollections && !canViewCashFunding && !canViewProducts) {
    return <Placeholder view="loans" />;
  }

  return (
    <Tabs
      colorScheme="green"
      variant="enclosed"
      isLazy
      index={activeTabIndex}
      onChange={(index) => setActiveTabKey(tabs[index]?.key || "")}
    >
      <TabList overflowX="auto" overflowY="hidden">
        {tabs.map((tab) => <Tab key={tab.key} flexShrink={0}>{tab.label}</Tab>)}
      </TabList>
      <TabPanels>
        {canViewApplications ? <TabPanel px={0}><LoanApplications user={user} /></TabPanel> : null}
        {canViewComputations ? <TabPanel px={0}><LoanComputations user={user} /></TabPanel> : null}
        {canViewReleases ? <TabPanel px={0}><LoanReleases user={user} /></TabPanel> : null}
        {canViewCollections ? <TabPanel px={0}><LoanCollections user={user} /></TabPanel> : null}
        {canViewCashTurnover ? <TabPanel px={0}><CashTurnovers user={user} /></TabPanel> : null}
        {canViewCashFunding ? (
          <TabPanel px={0}>
            <TellerCashFunding
              user={user}
              onFundingAcknowledged={() => setActiveTabKey("releases")}
            />
          </TabPanel>
        ) : null}
        {canViewProducts ? <TabPanel px={0}><LoanProducts user={user} /></TabPanel> : null}
      </TabPanels>
    </Tabs>
  );
}

function Placeholder({ view }) {
  return (
    <Box bg="white" borderWidth="1px" borderRadius="lg" p={6}>
      <Heading size="md">{viewTitles[view]}</Heading>
      <Text mt={3} color="gray.600">
        This module is reserved for a future phase of the cooperative workflow.
      </Text>
    </Box>
  );
}

function Shell({ user, onLogout }) {
  const [view, setView] = useState(user.defaultView);
  const navItems = useMemo(() => user.allowedViews.filter((item) => viewTitles[item]), [user]);

  function renderView() {
    if (view === "dashboard") {
      return <Dashboard user={user} />;
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
      return <Reports user={user} />;
    }

    if (view === "users") {
      return <VStack align="stretch" spacing={5}><MemberPortalAccountManagement user={user} /><AdminUserManagement user={user} /></VStack>;
    }

    if (view === "setup") {
      return (
        <VStack align="stretch" spacing={5}>
          <CostCenterAdministration user={user} />
          <RemittanceSourceAdministration user={user} />
          <DisbursementCategoryAdministration user={user} />
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
          Cooperative Management System
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
          <Box borderTopWidth="1px" borderColor="whiteAlpha.400" pt={4} mt={4}>
            <Button
              as="a"
              href="https://docs.tasetem.co/"
              target="_blank"
              rel="noopener noreferrer"
              width="full"
              justifyContent="flex-start"
              colorScheme="whiteAlpha"
              variant="ghost"
            >
              <Box as="span" aria-hidden="true" mr={2}>
                🛟
              </Box>
              Workflow Help
            </Button>
          </Box>
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

function RequiredPasswordChange({ user, onChanged, onLogout }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api("/api/change-password", { method: "POST", body: JSON.stringify(form) });
      onChanged(data.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(username) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const data = await api(`/api/admin/users/${username}/reset-password`, { method: "POST" });
      setIssuedCredential({ username, password: data.temporaryPassword });
      setMessage(`Password reset for ${username}. Copy the one-time temporary password shown below.`);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return <Flex minH="100vh" bg="gray.50" align="center" justify="center" p={6}>
    <Box as="form" onSubmit={submit} bg="white" borderWidth="1px" borderRadius="lg" boxShadow="lg" p={7} w="full" maxW="480px">
      <Badge colorScheme="orange">Activation required</Badge>
      <Heading size="lg" mt={3}>Create your password</Heading>
      <Text color="gray.600" mt={2} mb={6}>Welcome, {user.name}. Replace your temporary password before accessing TASETEMCO.</Text>
      <VStack spacing={4}>
        <FormControl isRequired><FormLabel>Temporary password</FormLabel><PasswordInput autoComplete="current-password"
          value={form.currentPassword} onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))} /></FormControl>
        <FormControl isRequired><FormLabel>New password</FormLabel><PasswordInput autoComplete="new-password"
          value={form.newPassword} onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))} /></FormControl>
        <FormControl isRequired><FormLabel>Confirm new password</FormLabel><PasswordInput autoComplete="new-password"
          value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} /></FormControl>
        <Text fontSize="sm" color="gray.600">Use at least 10 characters with uppercase, lowercase, a number, and a special character.</Text>
        {error ? <Text color="red.500" alignSelf="stretch">{error}</Text> : null}
        <Button type="submit" colorScheme="green" width="full" isLoading={busy}>Change Password and Continue</Button>
        <Button type="button" variant="ghost" width="full" onClick={onLogout}>Logout</Button>
      </VStack>
    </Box>
  </Flex>;
}

function MemberPortal({ onStaffLogin }) {
  const [member, setMember] = useState(null);
  const [overview, setOverview] = useState(null);
  const [ready, setReady] = useState(false);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [change, setChange] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  useEffect(() => { api("/api/member-portal/me").then((data) => setMember(data.member)).finally(() => setReady(true)); }, []);
  useEffect(() => { if (member && !member.mustChangePassword) api("/api/member-portal/overview").then(setOverview).catch((e) => setError(e.message)); }, [member]);
  async function login(event) { event.preventDefault(); setError(""); try {
    const data = await api("/api/member-portal/login", { method: "POST", body: JSON.stringify(credentials) }); setMember(data.member);
  } catch (e) { setError(e.message); } }
  async function changePassword(event) { event.preventDefault(); setError(""); try {
    const data = await api("/api/member-portal/change-password", { method: "POST", body: JSON.stringify(change) }); setMember(data.member);
  } catch (e) { setError(e.message); } }
  async function logout() { await api("/api/member-portal/logout", { method: "POST" }); setMember(null); setOverview(null); }
  if (!ready) return <Box p={8}>Loading...</Box>;
  if (!member) return <Flex minH="100vh" bg="green.900" align="center" justify="center" p={6}><Box as="form" onSubmit={login} bg="white" p={8} borderRadius="lg" w="full" maxW="440px">
    <Image src="/brand/tasetemco-seal.png" alt="TASETEMCO seal" boxSize="72px" mx="auto" /><Text color="green.700" fontWeight="bold" mt={4}>MEMBER PORTAL</Text><Heading size="lg" mt={1}>Member Login</Heading>
    <VStack mt={6} spacing={4}><FormControl isRequired><FormLabel>Username</FormLabel><Input autoComplete="username" value={credentials.username} onChange={(e) => setCredentials((v) => ({ ...v, username: e.target.value }))} /></FormControl>
      <FormControl isRequired><FormLabel>Password</FormLabel><PasswordInput autoComplete="current-password" value={credentials.password} onChange={(e) => setCredentials((v) => ({ ...v, password: e.target.value }))} /></FormControl>
      {error ? <Text color="red.600" alignSelf="stretch">{error}</Text> : null}<Button type="submit" colorScheme="green" w="full">Login</Button><Button variant="ghost" w="full" onClick={onStaffLogin}>Staff Login</Button></VStack>
    <CooperativeContact compact />
  </Box></Flex>;
  if (member.mustChangePassword) return <Flex minH="100vh" bg="gray.50" align="center" justify="center" p={6}><Box as="form" onSubmit={changePassword} bg="white" p={8} borderRadius="lg" borderWidth="1px" w="full" maxW="480px">
    <Badge colorScheme="orange">Required</Badge><Heading size="lg" mt={3}>Create your portal password</Heading><Text mt={2} color="gray.600">Replace the temporary password before viewing your account.</Text>
    <VStack mt={6} spacing={4}>{[["currentPassword","Temporary password","current-password"],["newPassword","New password","new-password"],["confirmPassword","Confirm new password","new-password"]].map(([key,label,autoComplete]) => <FormControl isRequired key={key}><FormLabel>{label}</FormLabel><PasswordInput autoComplete={autoComplete} value={change[key]} onChange={(e) => setChange((v) => ({ ...v, [key]: e.target.value }))} /></FormControl>)}
      <Text fontSize="sm" color="gray.600">At least 10 characters with uppercase, lowercase, a number, and a special character.</Text>{error ? <Text color="red.600">{error}</Text> : null}<Button type="submit" colorScheme="green" w="full">Change Password</Button><Button variant="ghost" onClick={logout}>Logout</Button></VStack>
  </Box></Flex>;
  return <Box minH="100vh" bg="gray.50"><Flex bg="green.900" color="white" p={5} justify="space-between"><Box><Heading size="md">TASETEMCO Member Portal</Heading><Text fontSize="sm" color="green.100">Read-only account overview</Text></Box><Button onClick={logout}>Logout</Button></Flex>
    <Container maxW="6xl" py={8}>{error ? <Text color="red.600">{error}</Text> : null}{overview ? <VStack align="stretch" spacing={5}>
      <Box bg="white" p={6} borderRadius="lg" borderWidth="1px"><Flex justify="space-between" wrap="wrap" gap={3}><Box><Text color="gray.500">{overview.member.memberNo}</Text><Heading>{overview.member.name}</Heading><Text mt={2}>{overview.member.classification} · {overview.member.status}</Text><Text fontSize="sm">Member since {overview.member.membershipDate || "Not recorded"}</Text></Box><Text fontSize="sm" color="gray.500">As of {formatDateTime(overview.asOf)}</Text></Flex></Box>
      <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4}>{[["CBU",overview.balances.cbu],["Regular savings",overview.balances.regularSavings],["Secured savings",overview.balances.securedSavings],["Outstanding system loans",overview.balances.outstandingSystemLoans]].map(([label,value]) => <Stat key={label} bg="white" borderWidth="1px" borderRadius="lg" p={4}><StatLabel>{label}</StatLabel><StatNumber fontSize="xl">{formatMoney(value)}</StatNumber></Stat>)}</Grid>
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={5}><Box bg="white" p={5} borderWidth="1px" borderRadius="lg"><Heading size="md">Existing system loans</Heading>{overview.existingLoans.length ? overview.existingLoans.map((loan) => <Flex key={loan.loanNo} py={3} borderBottomWidth="1px" justify="space-between"><Box><Text fontWeight="bold">{loan.productName}</Text><Text fontSize="sm">{loan.status}</Text></Box><Text>{formatMoney(loan.outstandingBalance)}</Text></Flex>) : <Text mt={3} color="gray.500">No system loans.</Text>}</Box>
      <Box bg="white" p={5} borderWidth="1px" borderRadius="lg"><Heading size="md">Previous loans</Heading>{overview.previousLoans.length ? overview.previousLoans.map((loan,index) => <Flex key={`${loan.loanLabel}-${index}`} py={3} borderBottomWidth="1px" justify="space-between"><Box><Text fontWeight="bold">{loan.loanLabel}</Text><Text fontSize="sm">{loan.status}</Text></Box><Text>{formatMoney(loan.outstandingBalance)}</Text></Flex>) : <Text mt={3} color="gray.500">No previous loans recorded.</Text>}</Box></Grid>
      <Box bg="white" p={5} borderWidth="1px" borderRadius="lg"><Flex justify="space-between"><Heading size="md">Cost-center dues</Heading><Text fontWeight="bold">{formatMoney(overview.totalCostCenterDues)}</Text></Flex>{overview.costCenterDues.map((due) => <Flex key={due.costCenterCode} py={3} borderBottomWidth="1px" justify="space-between"><Text>{due.costCenterName}</Text><Text>{formatMoney(due.outstandingAmount)}</Text></Flex>)}{!overview.costCenterDues.length ? <Text mt={3} color="gray.500">No outstanding cost-center dues.</Text> : null}</Box>
      <Box bg="white" p={5} borderWidth="1px" borderRadius="lg"><CooperativeContact /></Box>
      <Text fontSize="sm" color="gray.500">This portal is strictly read-only. ID numbers and beneficiary information are not displayed.</Text>
    </VStack> : <Text>Loading account overview...</Text>}</Container></Box>;
}

function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [memberPortal, setMemberPortal] = useState(window.location.pathname.startsWith("/member-portal"));

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

  if (memberPortal) return <MemberPortal onStaffLogin={() => setMemberPortal(false)} />;

  if (!user) {
    return <Login onLogin={setUser} onMemberPortal={() => setMemberPortal(true)} />;
  }

  if (user.mustChangePassword) {
    return <RequiredPasswordChange user={user} onChanged={setUser} onLogout={logout} />;
  }

  return <Shell user={user} onLogout={logout} />;
}

createReactRoot(document.getElementById("root")).render(
  <ChakraProvider theme={theme}>
    <App />
  </ChakraProvider>
);
