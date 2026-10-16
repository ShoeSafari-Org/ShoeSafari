import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const manifest = JSON.parse(read("contracts/checkout/interface/checkout-v1.json"));
const contract = read("contracts/checkout/src/lib.rs");
const events = read("contracts/checkout/src/events.rs");
const order = read("contracts/checkout/src/order.rs");
const failures = [];
const fail = (message) => failures.push(message);
const compact = (text) => text.replace(/\s+/g, " ").trim();

function splitTopLevel(text) {
  const values = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    if ("<([{".includes(text[index])) depth += 1;
    else if (">)]}".includes(text[index])) depth -= 1;
    else if (text[index] === "," && depth === 0) {
      values.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (text.slice(start).trim()) values.push(text.slice(start).trim());
  return values;
}

function readParenGroup(text, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    if (text[index] === "(") depth += 1;
    if (text[index] === ")" && --depth === 0) return [text.slice(openIndex + 1, index), index + 1];
  }
  throw new Error("Unclosed Rust parameter list");
}

const actualMethods = [];
const methodPattern = /pub fn\s+(\w+)\s*\(/g;
for (const match of contract.matchAll(methodPattern)) {
  const name = match[1];
  const open = match.index + match[0].lastIndexOf("(");
  const [params, afterParams] = readParenGroup(contract, open);
  const tail = contract.slice(afterParams).match(/^\s*(?:->\s*([^{]+?))?\s*\{/);
  if (!tail) continue;
  const args = splitTopLevel(params).filter((arg) => !/^env:\s*Env$/.test(compact(arg))).map(compact);
  actualMethods.push({ name, arguments: args, returns: compact(tail[1] ?? "()") });
}
if (JSON.stringify(actualMethods) !== JSON.stringify(manifest.methods)) {
  fail(`contract methods/signatures differ from ${manifest.interfaceVersion} manifest`);
}

function parseStructFields(source, type) {
  const start = source.indexOf(`pub struct ${type}`);
  if (start < 0) return null;
  const open = source.indexOf("{", start);
  const close = source.indexOf("}", open);
  return source.slice(open + 1, close).split(",").map((sourceField) => {
    const topic = sourceField.includes("#[topic]");
    const field = compact(sourceField.replace(/#\[topic\]/g, "").replace(/^\s*\/\/.*$/gm, "")).replace(/^pub\s+/, "");
    return field ? { field, topic } : null;
  }).filter(Boolean);
}
for (const event of manifest.events) {
  const fields = parseStructFields(events, event.type);
  if (!fields) {
    fail(`missing event type ${event.type}`);
    continue;
  }
  const names = fields.map(({ field }) => field.split(":")[0].trim());
  if (JSON.stringify(names) !== JSON.stringify([...event.topics, ...event.data])) fail(`${event.type} field order differs from manifest`);
  const topicNames = fields.filter(({ topic }) => topic).map(({ field }) => field.split(":")[0].trim());
  if (JSON.stringify(topicNames) !== JSON.stringify(event.topics)) fail(`${event.type} topic fields differ from manifest`);
  const start = events.indexOf(`pub struct ${event.type}`);
  const leadingDocs = events.slice(0, start).split("\n").slice(-12).join("\n");
  if (!new RegExp("Topics:\\s+`" + event.name + "`").test(leadingDocs)) {
    fail(`${event.type} event topic differs from manifest name ${event.name}`);
  }
}

const statusMatch = order.match(/pub enum Status\s*\{([\s\S]*?)\n\}/);
const actualStatuses = statusMatch?.[1].split(",").map((item) => item.trim()).filter(Boolean).map((item) => {
  const match = item.match(/(\w+)\s*=\s*(\d+)/);
  return match ? { name: match[1], value: Number(match[2]) } : null;
}).filter(Boolean) ?? [];
if (JSON.stringify(actualStatuses) !== JSON.stringify(manifest.statuses)) fail("Status names/values differ from manifest");

for (const callSite of manifest.frontendCallSites ?? []) {
  const source = read(callSite.path);
  for (const method of callSite.methods ?? []) {
    if (!source.includes(`"${method}"`)) fail(`frontend method call ${method} is missing from ${callSite.path}`);
  }
  for (const event of callSite.events ?? []) {
    if (!source.includes(`"${event}"`)) fail(`frontend event decoder ${event} is missing from ${callSite.path}`);
  }
}

if (failures.length) {
  console.error(`Checkout interface check failed:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(`Checkout interface ${manifest.interfaceVersion} matches Rust contract source.`);
}
