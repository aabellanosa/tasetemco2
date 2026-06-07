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
  Grid,
  GridItem,
  Heading,
  Input,
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

function Members() {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    api("/api/members").then(setMembers);
  }, []);

  return (
    <Box bg="white" borderWidth="1px" borderRadius="lg" p={5}>
      <Flex justify="space-between" mb={4}>
        <Heading size="md">Members</Heading>
        <Button colorScheme="green">Add member application</Button>
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
      return <Members />;
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
