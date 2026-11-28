import { readFileSync } from "node:fs";
import { runSql } from "./psql.mjs";

const suites = [
  "sold-event-deletion.test.sql",
  "unsold-event-deletion.test.sql",
  "event-deletion-regressions.test.sql",
];

for (const suite of process.argv.length > 2 ? process.argv.slice(2) : suites) {
  if (!suites.includes(suite)) throw new Error("Unknown event deletion SQL suite: " + suite);
  runSql(readFileSync(new URL("./" + suite, import.meta.url), "utf8"));
  console.log("PASS " + suite);
}
