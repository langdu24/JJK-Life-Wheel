import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const input = process.argv[2] || "game.html";
const outputRoot = process.argv[3] || "data/extracted-v7";
const listOnly = process.argv.includes("--list");

function extractEncodedObject(source) {
  const marker = "const encoded =";
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error("single-file encoded resource object not found");
  let start = markerIndex + marker.length;
  while (/\s/.test(source[start] || "")) start += 1;
  if (source[start] !== "{") throw new Error("encoded resource object does not start with {");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error("encoded resource object is not balanced");
}

function shouldExtract(resourcePath) {
  return resourcePath.startsWith("data/battle/")
    || resourcePath.startsWith("data/duel/")
    || (resourcePath.startsWith("assets/duel-dynamics/") && resourcePath.endsWith(".json"));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

const source = fs.readFileSync(input, "utf8");
const encoded = JSON.parse(extractEncodedObject(source));
const selected = Object.entries(encoded)
  .filter(([resourcePath]) => shouldExtract(resourcePath))
  .sort(([a], [b]) => a.localeCompare(b));

if (!selected.length) throw new Error("no battle/card/domain data resources matched extraction rules");
console.log(`found ${selected.length} extractable data resources`);

if (listOnly) {
  for (const [resourcePath, base64] of selected) {
    console.log(`${resourcePath}\t${Buffer.byteLength(base64, "base64")} bytes`);
  }
  process.exit(0);
}

const manifest = {
  schema: "jjk-v7-extracted-data-manifest",
  generatedFrom: path.basename(input),
  sourceSha256: sha256(Buffer.from(source, "utf8")),
  files: []
};

for (const [resourcePath, base64] of selected) {
  const bytes = Buffer.from(base64, "base64");
  const destination = path.join(outputRoot, resourcePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
  manifest.files.push({
    path: resourcePath,
    bytes: bytes.length,
    sha256: sha256(bytes)
  });
}

fs.mkdirSync(outputRoot, { recursive: true });
fs.writeFileSync(
  path.join(outputRoot, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n"
);
console.log(`wrote ${manifest.files.length} files to ${outputRoot}`);
