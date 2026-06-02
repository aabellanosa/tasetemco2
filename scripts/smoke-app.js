const { spawn } = require("node:child_process");

const port = String(3100 + Math.floor(Math.random() * 1000));
const baseUrl = `http://127.0.0.1:${port}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json();
  return { response, body };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const { response, body } = await fetchJson("/api/health");

      if (response.ok && body.ok === true && body.app === "TASETEMCO") {
        return;
      }
    } catch (error) {
      await wait(300);
    }
  }

  throw new Error("Server did not become healthy.");
}

async function run() {
  const server = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: port
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  server.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  try {
    await waitForServer();

    const home = await fetch(baseUrl);
    if (!home.ok) {
      throw new Error(`Homepage returned ${home.status}`);
    }

    const homeText = await home.text();
    if (!homeText.includes("TASETEMCO")) {
      throw new Error("Homepage did not include TASETEMCO branding.");
    }

    const { response, body } = await fetchJson("/api/me");
    if (!response.ok || body.user !== null) {
      throw new Error("/api/me should return an empty user before login.");
    }

    console.log("Working app smoke test passed.");
  } finally {
    server.kill();
    await wait(200);
  }

  if (server.exitCode && server.exitCode !== 0) {
    throw new Error(`Server exited unexpectedly.\n${output}`);
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
