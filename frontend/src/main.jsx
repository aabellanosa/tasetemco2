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
  Table,
  TableContainer,
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

function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api("/api/dashboard").then(setData);
  }, []);

  if (!data) {
    return <Text>Loading dashboard...</Text>;
  }

  return (
    <VStack align="stretch" spacing={5}>
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
  const [selectedTellerMemberId, setSelectedTellerMemberId] = useState("");
  const [tellerTransactionType, setTellerTransactionType] = useState("initial-payment");
  const [approvedMemberName, setApprovedMemberName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const approvalNotice = useDisclosure();
  const canCreateApplication = user.permissions.includes("members:applications:create");
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
    } catch (statementError) {
      setError(statementError.message);
    }
  }

  return (
    <VStack align="stretch" spacing={5}>
      <Flex justify="space-between" align="center" gap={4} wrap="wrap">
        <Text color="gray.500" fontSize="sm">
          Last refreshed: {formatTime(lastRefreshedAt)}
        </Text>
        <Button size="sm" onClick={() => loadMembersWorkflow()} isLoading={isRefreshing}>
          Refresh
        </Button>
      </Flex>

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
          <HStack mt={5} spacing={4} align="center">
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
              <HStack mt={5} spacing={4} align="center">
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
              <HStack mt={5} spacing={4} align="center">
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
              <HStack mt={5} spacing={4} align="center">
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
              <HStack mt={5} spacing={4} align="center">
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
              <HStack alignSelf="flex-start">
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
          <TableContainer>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Transaction</Th>
                  <Th>Reference</Th>
                  <Th isNumeric>Share Capital</Th>
                  <Th isNumeric>Savings</Th>
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
                      <Badge colorScheme={transaction.status === "Posted" ? "green" : "blue"}>
                        {transaction.status}
                      </Badge>
                    </Td>
                    <Td>{transaction.journalEntryNo || "Not posted"}</Td>
                  </Tr>
                ))}
                {statement.transactions.length === 0 ? (
                  <Tr>
                    <Td colSpan={6} color="gray.500">
                      No member transactions recorded.
                    </Td>
                  </Tr>
                ) : null}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      ) : null}

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
  const needsVarianceNote = activeBatch?.status === "Submitted" && Number(activeBatch.variance || 0) !== 0;
  const tellerBatchSummary = buildTellerBatchSummary(tellerBatch);
  const activeBatchHistory = activeBatch ? tellerBatches.find((batch) => batch.id === activeBatch.id) : null;

  async function loadLedger() {
    setIsRefreshing(true);
    setError("");

    try {
      const data = await api("/api/ledger");
      setActiveBatch(data.activeBatch);
      setTellerBatch(data.tellerBatch);
      setTellerBatches(data.tellerBatches || []);
      setLatestCashCount(data.latestCashCount);
      setJournalEntries(data.journalEntries);
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
    <VStack align="stretch" spacing={5}>
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

      <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
        <Flex justify="space-between" gap={4} wrap="wrap" mb={4}>
          <Box>
            <Heading size="md">Teller Cash Count</Heading>
            <Text color="gray.600" mt={1}>
              Latest teller-submitted cash count for the unposted batch.
            </Text>
          </Box>
          <HStack>
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

    if (view === "ledger") {
      return <Ledger user={user} />;
    }

    return <Placeholder view={view} />;
  }

  return (
    <Grid minH="100vh" templateColumns={{ base: "1fr", lg: "280px 1fr" }} bg="gray.50">
      <GridItem bg="green.900" color="white" p={5}>
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
      <GridItem p={{ base: 4, md: 8 }}>
        <Flex justify="space-between" align="center" mb={7} gap={4} wrap="wrap">
          <Box>
            <Text color="gray.500" fontSize="sm">
              {user.role}
            </Text>
            <Heading>{viewTitles[view]}</Heading>
          </Box>
          <Flex align="center" gap={3}>
            <Box textAlign="right">
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
