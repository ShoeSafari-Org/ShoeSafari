import { existsSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const budgets = JSON.parse(await readFile("performance-budgets.json", "utf8"));
const failures = [];

function visit(directory, predicate, limit, label) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) visit(path, predicate, limit, label);
    else if (predicate(entry.name) && statSync(path).size > limit) {
      failures.push(`${label} ${path} exceeds ${limit} bytes`);
    }
  }
}

visit(".next/static/chunks", (name) => name.endsWith(".js"), budgets.javascriptChunkBytes, "JavaScript chunk");
visit("public", (name) => /\.(avif|gif|jpe?g|png|webp)$/i.test(name), budgets.imageBytes, "Image");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Performance budgets passed.");
