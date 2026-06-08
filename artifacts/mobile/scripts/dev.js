#!/usr/bin/env node
/**
 * Dev startup script that:
 * 1. Patches app.json with the correct Replit domain (fixes Expo CORS)
 * 2. Starts a reverse-proxy on port 5000 → Expo dev server on port 18115
 * 3. Launches Expo
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const net = require("net");
const { spawn, execSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const appJsonPath = path.join(projectRoot, "app.json");

const EXPO_PORT = parseInt(process.env.EXPO_PORT || "18116", 10);
const PROXY_PORT = 5000;

// ── 1. Patch app.json origin ──────────────────────────────────────────────

function getOrigin() {
  const expoDomain = process.env.REPLIT_EXPO_DEV_DOMAIN;
  if (expoDomain) {
    const domain = expoDomain.replace(/^https?:\/\//, "");
    return `https://${domain}`;
  }
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) {
    const domain = devDomain.replace(/^https?:\/\//, "");
    return `https://${domain}`;
  }
  return "https://replit.com/";
}

function patchAppJson() {
  const origin = getOrigin();
  console.log(`[dev] Setting Expo origin to: ${origin}`);

  const raw = fs.readFileSync(appJsonPath, "utf-8");
  const appJson = JSON.parse(raw);

  const plugins = appJson.expo.plugins || [];
  const patched = plugins.map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === "expo-router") {
      return [plugin[0], { ...plugin[1], origin }];
    }
    return plugin;
  });

  appJson.expo.plugins = patched;
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n");
}

patchAppJson();

// ── 1b. Free port 18115 so Expo always starts there ──────────────────────
try {
  execSync(`fuser -k ${EXPO_PORT}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
  // brief pause for OS to release the port
  execSync('sleep 0.5', { stdio: 'ignore' });
} catch (_) {}

// ── 2. Start reverse-proxy (port 5000 → Expo port 18115) ─────────────────

function startProxy() {
  const server = http.createServer((clientReq, clientRes) => {
    const forwardedHeaders = { ...clientReq.headers };
    const expoDomain = process.env.REPLIT_EXPO_DEV_DOMAIN || "";
    if (expoDomain && forwardedHeaders["origin"]) {
      forwardedHeaders["origin"] = `https://${expoDomain.replace(/^https?:\/\//, "")}`;
    }
    if (expoDomain && forwardedHeaders["referer"]) {
      forwardedHeaders["referer"] = `https://${expoDomain.replace(/^https?:\/\//, "")}/`;
    }
    const options = {
      hostname: "127.0.0.1",
      port: EXPO_PORT,
      path: clientReq.url,
      method: clientReq.method,
      headers: forwardedHeaders,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(clientRes, { end: true });
    });

    proxyReq.on("error", () => {
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { "Content-Type": "text/plain" });
        clientRes.end("Expo is starting up, please wait...");
      }
    });

    clientReq.pipe(proxyReq, { end: true });
  });

  // WebSocket upgrade proxying
  server.on("upgrade", (req, clientSocket, head) => {
    const proxySocket = net.connect(EXPO_PORT, "127.0.0.1", () => {
      proxySocket.write(
        `${req.method} ${req.url} HTTP/1.1\r\n` +
          Object.entries(req.headers)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\r\n") +
          "\r\n\r\n"
      );
      proxySocket.write(head);
      clientSocket.pipe(proxySocket);
      proxySocket.pipe(clientSocket);
    });
    proxySocket.on("error", () => clientSocket.destroy());
    clientSocket.on("error", () => proxySocket.destroy());
  });

  server.listen(PROXY_PORT, "0.0.0.0", () => {
    console.log(
      `[dev] Proxy on port ${PROXY_PORT} → Expo on port ${EXPO_PORT}`
    );
  });

  return server;
}

// ── 3. Launch Expo ────────────────────────────────────────────────────────

function startExpo() {
  const expoDomain = process.env.REPLIT_EXPO_DEV_DOMAIN || "";
  const devDomain = process.env.REPLIT_DEV_DOMAIN || "";
  const replId = process.env.REPL_ID || "";

  const env = {
    ...process.env,
    EXPO_PUBLIC_DOMAIN: devDomain.replace(/^https?:\/\//, ""),
    EXPO_PUBLIC_REPL_ID: replId,
    REACT_NATIVE_PACKAGER_HOSTNAME: devDomain.replace(/^https?:\/\//, ""),
  };

  if (expoDomain) {
    env.EXPO_PACKAGER_PROXY_URL = `https://${expoDomain.replace(/^https?:\/\//, "")}`;
  }

  console.log(`[dev] Starting Expo on port ${EXPO_PORT}...`);

  const expoBin = path.join(projectRoot, "node_modules", ".bin", "expo");

  const proc = spawn(
    expoBin,
    ["start", "--localhost", "--port", String(EXPO_PORT)],
    {
      stdio: "inherit",
      cwd: projectRoot,
      env,
    }
  );

  proc.on("exit", (code) => process.exit(code ?? 0));
  return proc;
}

// ── Main ──────────────────────────────────────────────────────────────────

const proxyServer = startProxy();
const expoProc = startExpo();

["SIGINT", "SIGTERM"].forEach((sig) => {
  process.on(sig, () => {
    proxyServer.close();
    expoProc.kill(sig);
    process.exit(0);
  });
});
