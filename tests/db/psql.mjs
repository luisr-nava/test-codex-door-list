import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { setTimeout as delay } from "node:timers/promises";

const args = [
  "--context", "default", "exec", "-i", "supabase_db_door-list",
  "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres",
];

const fixtures = readFileSync("tests/db/event-deletion-fixtures.sql", "utf8");

export function sqlLiteral(value) {
  return "'" + value.replaceAll("'", "''") + "'";
}

export function runSql(sql) {
  const result = spawnSync("docker", [...args, "-v", "ON_ERROR_STOP=1"], {
    input: fixtures + "\n" + sql + "\n",
    encoding: "utf8",
    timeout: 15_000,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.error?.message || "Local psql failed");
  }
  return result.stdout.trim();
}

export function openSession() {
  const child = spawn("docker", args, { windowsHide: true });
  const lines = createInterface({ input: child.stdout });
  let pending;
  let diagnostics = "";
  let sequence = 0;
  let closed = false;
  const exit = new Promise((resolve) => child.once("close", resolve));

  child.stderr.setEncoding("utf8").on("data", (chunk) => { diagnostics += chunk; });
  child.stdin.on("error", (error) => pending?.reject(error));
  child.on("error", (error) => pending?.reject(error));
  child.on("close", () => {
    closed = true;
    pending?.reject(new Error(diagnostics.trim() || "Local psql session closed"));
  });

  lines.on("line", (line) => {
    if (!pending) return;
    if (line.startsWith(pending.marker + " ")) {
      pending.resolve({ state: line.slice(pending.marker.length + 1), rows: pending.rows, diagnostics });
    } else {
      pending.rows.push(line);
    }
  });

  return {
    query(sql) {
      if (pending || closed) throw new Error("Local psql session is busy or closed");
      return new Promise((resolve, reject) => {
        diagnostics = "";
        const marker = "door_list_sql_" + ++sequence;
        const timer = setTimeout(() => {
          child.kill();
          pending?.reject(new Error("Local psql command timed out"));
        }, 20_000);
        function finish(callback, value) {
          clearTimeout(timer);
          pending = undefined;
          callback(value);
        }
        pending = {
          marker,
          rows: [],
          resolve: (value) => finish(resolve, value),
          reject: (error) => finish(reject, error),
        };
        child.stdin.write(sql + "\n\\echo " + marker + " :SQLSTATE\n");
      });
    },
    close() {
      if (!closed) child.stdin.end();
      return exit;
    },
  };
}

export async function waitForBlockedSession(observer, blocker, blocked) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    const result = await observer.query(
      "select exists (select 1 from pg_stat_activity where " +
      (blocked === undefined ? "" : "pid = " + Number(blocked) + " and ") +
      Number(blocker) + " = any(pg_blocking_pids(pid)));",
    );
    if (result.state !== "00000") throw new Error("Could not observe the local SQL lock");
    if (result.rows[0] === "t") return;
    await delay(50);
  }
  throw new Error("Expected database session did not block");
}
