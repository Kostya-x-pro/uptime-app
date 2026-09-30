import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = fileURLToPath(new URL("..", import.meta.url));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const processes = [];
let stopping = false;

function loadLocalEnvironment() {
  const envPath = resolve(rootDirectory, ".env");
  if (!existsSync(envPath)) {
    return;
  }

  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }
    const [, name, rawValue] = match;
    const value = rawValue.trim().replace(/^("|')(.*)\1$/, "$2");
    if (process.env[name] === undefined) {
      process.env[name] = value;
    }
  }
}

loadLocalEnvironment();

const missingVariables = ["DATABASE_URL", "JWT_SECRET"].filter((name) => !process.env[name]);
if (missingVariables.length > 0) {
  console.error(`Перед запуском задайте переменные окружения: ${missingVariables.join(", ")}.`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET должен содержать не менее 32 символов.");
  process.exit(1);
}

function start(name, command, args, cwd, shell = false) {
  const child = spawn(command, args, {
    cwd: resolve(rootDirectory, cwd),
    env: process.env,
    stdio: "inherit",
    shell,
  });

  processes.push(child);
  child.on("error", (error) => {
    console.error(`Не удалось запустить ${name}: ${error.message}`);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(`${name} завершился (${signal ?? `код ${code ?? 1}`}).`);
      stop(code ?? 1);
    }
  });
}

function stop(exitCode) {
  if (stopping) {
    return;
  }
  stopping = true;
  for (const child of processes) {
    if (!child.killed) {
      if (process.platform === "win32" && child.pid) {
        spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
      } else {
        child.kill("SIGTERM");
      }
    }
  }
  process.exitCode = exitCode;
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

console.log("Запуск backend на http://localhost:8080 и frontend на http://localhost:3000...");
start("Backend", "go", ["run", "./cmd/server"], "backend/");
start("Frontend", npmCommand, ["run", "dev"], "frontend/", process.platform === "win32");
