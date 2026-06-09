const { spawn } = require("child_process");
const net = require("net");
const path = require("path");

const PREVIEW_HOST = "127.0.0.1";
const NEXT_BIN = require.resolve("next/dist/bin/next");
const ELECTRON_CLI = require.resolve("electron/cli.js");
const PORT_FALLBACK_TIMEOUT_MS = 60_000;

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.unref();
    server.once("error", reject);
    server.listen(0, PREVIEW_HOST, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;

      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(port);
      });
    });
  }).catch(
    () =>
      new Promise((resolve, reject) => {
        const server = net.createServer();

        server.unref();
        server.once("error", reject);
        server.listen(0, PREVIEW_HOST, () => {
          const address = server.address();
          const port = typeof address === "object" && address ? address.port : null;

          server.close((closeError) => {
            if (closeError) {
              reject(closeError);
              return;
            }

            resolve(port);
          });
        });
      })
  );
}

async function waitForUrl(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "GET" });

      if (response.ok || response.status === 200) {
        return;
      }
    } catch {
      // Keep polling until the dev server becomes reachable.
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

async function main() {
  const port = await findAvailablePort();
  const repoRoot = path.resolve(__dirname, "..");

  if (!port) {
    throw new Error("Could not find a free local port for the dev server.");
  }

  const rendererUrl = `http://${PREVIEW_HOST}:${port}`;
  console.log(`Launching Book Bible Desktop dev server on ${rendererUrl}`);

  const sharedEnv = {
    ...process.env,
    HOSTNAME: PREVIEW_HOST,
    PORT: String(port),
  };

  const nextProcess = spawn(process.execPath, [NEXT_BIN, "dev", "--hostname", PREVIEW_HOST, "--port", String(port)], {
    cwd: repoRoot,
    env: sharedEnv,
    stdio: "inherit",
  });

  const shutdown = (exitCode = 0) => {
    if (nextProcess.exitCode === null) {
      nextProcess.kill();
    }

    if (electronProcess && electronProcess.exitCode === null) {
      electronProcess.kill();
    }

    process.exit(exitCode);
  };

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  nextProcess.once("exit", (code, signal) => {
    if (!electronProcess || electronProcess.exitCode === null) {
      const exitCode = code ?? (signal ? 1 : 0);
      shutdown(exitCode);
    }
  });

  try {
    await waitForUrl(rendererUrl, PORT_FALLBACK_TIMEOUT_MS);

    const electronEnv = {
      ...sharedEnv,
      NODE_ENV: "development",
      ELECTRON_RENDERER_URL: rendererUrl,
    };

    electronProcess = spawn(process.execPath, [ELECTRON_CLI, "."], {
      cwd: repoRoot,
      env: electronEnv,
      stdio: "inherit",
    });

    electronProcess.once("exit", (code, signal) => {
      const exitCode = code ?? (signal ? 1 : 0);
      shutdown(exitCode);
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    shutdown(1);
  }
}

let electronProcess = null;

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
