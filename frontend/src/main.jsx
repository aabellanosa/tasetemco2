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
  const pendingApplications = applications.filter((application) => application.status === "Pending Approval");
  const activeMembers = members.filter((member) => member.status === "Active");

  const loadMembersWorkflow = useCallback(
    async ({ silent = false } = {}) => {
      setIsRefreshing(true);

      try {
        const [memberRows, applicationRows, paymentRows] = await Promise.all([
          api("/api/members"),
          canViewApplications ? api("/api/member-applications") : [],
          canViewInitialPayments ? api("/api/initial-member-payments") : []
        ]);
        setMembers(memberRows);
        setApplications(applicationRows);
        setInitialPayments(paymentRows);
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
    [canViewApplications, canViewInitialPayments]
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

      {canCreateInitialPayment ? (
        <Box as="form" onSubmit={submitInitialPayment} bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="md" mb={1}>
            Record Initial Member Payment
          </Heading>
          <Text color="gray.600" mb={5}>
            Teller receives the opening share capital, membership fee, and savings. Accounting posting follows in a later slice.
          </Text>
          <Grid templateColumns={{ base: "1fr", lg: "1.2fr repeat(3, 1fr)" }} gap={4}>
            <FormControl isRequired>
              <FormLabel>Member</FormLabel>
              <Select
                placeholder="Select active member"
                value={paymentForm.memberId}
                onChange={(event) => updatePaymentForm("memberId", event.target.value)}
              >
                {activeMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.id} - {member.name}
                  </option>
                ))}
              </Select>
            </FormControl>
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
            <Button type="submit" colorScheme="green">
              Record payment
            </Button>
            {message ? <Text color="green.600">{message}</Text> : null}
            {error ? <Text color="red.500">{error}</Text> : null}
          </HStack>
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
  const [journalEntries, setJournalEntries] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const canPostTellerBatch = user.permissions.includes("ledger:teller-batches:post");

  async function loadLedger() {
    setIsRefreshing(true);
    setError("");

    try {
      const data = await api("/api/ledger");
      setTellerBatch(data.tellerBatch);
      setJournalEntries(data.journalEntries);
    } catch (ledgerError) {
      setError(ledgerError.message);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadLedger();
  }, []);

  async function postPayment(paymentId) {
    setError("");
    setMessage("");

    try {
      const data = await api(`/api/ledger/teller-batches/${paymentId}/post`, {
        method: "POST"
      });
      setMessage(`${data.entry.id} posted for ${data.payment.memberName}.`);
      await loadLedger();
    } catch (postError) {
      setError(postError.message);
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
        <Heading size="md" mb={4}>
          Unposted Teller Batch
        </Heading>
        <TableContainer>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Payment No.</Th>
                <Th>Member</Th>
                <Th isNumeric>Cash</Th>
                <Th isNumeric>Share Capital</Th>
                <Th isNumeric>Fee</Th>
                <Th isNumeric>Savings</Th>
                <Th>Status</Th>
                {canPostTellerBatch ? <Th>Action</Th> : null}
              </Tr>
            </Thead>
            <Tbody>
              {tellerBatch.map((payment) => (
                <Tr key={payment.id}>
                  <Td>{payment.id}</Td>
                  <Td>{payment.memberName}</Td>
                  <Td isNumeric>{formatMoney(payment.cashReceived)}</Td>
                  <Td isNumeric>{formatMoney(payment.shareCapitalAmount)}</Td>
                  <Td isNumeric>{formatMoney(payment.membershipFeeAmount)}</Td>
                  <Td isNumeric>{formatMoney(payment.savingsDepositAmount)}</Td>
                  <Td>
                    <Badge colorScheme="blue">{payment.status}</Badge>
                  </Td>
                  {canPostTellerBatch ? (
                    <Td>
                      <Button size="sm" colorScheme="green" onClick={() => postPayment(payment.id)}>
                        Post
                      </Button>
                    </Td>
                  ) : null}
                </Tr>
              ))}
              {tellerBatch.length === 0 ? (
                <Tr>
                  <Td colSpan={canPostTellerBatch ? 8 : 7} color="gray.500">
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
