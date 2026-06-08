import React, { useEffect, useMemo, useState } from "react";
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
  NumberInput,
  NumberInputField,
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
  extendTheme
} from "@chakra-ui/react";
import { createRoot as createReactRoot } from "react-dom/client";

const apiBase = import.meta.env.VITE_API_BASE_URL || "";

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
  const [form, setForm] = useState({
    fullName: "",
    clusterName: "General Membership",
    contactNumber: "",
    initialShareCapital: 5000
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canCreateApplication = user.permissions.includes("members:applications:create");
  const canViewApplications = user.permissions.includes("members:applications:view");
  const canApproveApplication = user.permissions.includes("members:applications:approve");

  async function loadMembersWorkflow() {
    const [memberRows, applicationRows] = await Promise.all([
      api("/api/members"),
      canViewApplications ? api("/api/member-applications") : []
    ]);
    setMembers(memberRows);
    setApplications(applicationRows);
  }

  useEffect(() => {
    loadMembersWorkflow();
  }, []);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
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
      await loadMembersWorkflow();
    } catch (approveError) {
      setError(approveError.message);
    }
  }

  return (
    <VStack align="stretch" spacing={5}>
      {canCreateApplication ? (
        <Box as="form" onSubmit={submitApplication} bg="white" borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="md" mb={1}>
            New Member Application
          </Heading>
          <Text color="gray.600" mb={5}>
            Membership Officer encodes the application. Approval will become the next workflow slice.
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
              <FormLabel>Initial share capital</FormLabel>
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
                <Th isNumeric>Initial Share</Th>
                <Th>Status</Th>
                {canApproveApplication ? <Th>Action</Th> : null}
                </Tr>
              </Thead>
              <Tbody>
                {applications.map((application) => (
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
              </Tbody>
            </Table>
          </TableContainer>
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
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
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
