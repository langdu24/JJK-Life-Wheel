const assert = require("node:assert/strict");
const fs = require("node:fs");

assert.ok(fs.existsSync("game.html"), "clean game.html is missing");
assert.ok(!fs.existsSync(" game.html"), "legacy spaced game filename still exists");

const index = fs.readFileSync("index.html", "utf8");
const readme = fs.readFileSync("README.md", "utf8");
const app = fs.readFileSync("core/v7-app.js", "utf8");
const data = fs.readFileSync("core/v7-data.js", "utf8");

for (const runtime of [
  "./patches/v5.js",
  "./core/v7-model.js",
  "./core/v7-data.js",
  "./core/v7-app.js"
]) {
  assert.ok(index.includes(runtime), `index missing ${runtime}`);
}

for (const legacy of [
  "./patches/current.js",
  "./patches/v3.js",
  "./patches/v3b.js",
  "./patches/v4.js",
  "./patches/v6.js"
]) {
  assert.ok(!index.includes(legacy), `index still loads legacy ${legacy}`);
}

assert.ok(readme.includes("core/v7-model.js"));
assert.ok(readme.includes("GitHub Actions"));
assert.ok(!readme.includes("current → v3 → v3b → v4 → v5"));

assert.ok(!app.includes("setInterval("), "v7-app must not permanently poll with setInterval");
assert.ok(!data.includes("setInterval("), "v7-data must not permanently poll with setInterval");
assert.ok(app.includes("jjk-life-wheel-sl-slot-v1-"), "legacy SL migration prefix missing");
assert.ok(app.includes("JJKV7Lifecycle"), "V7 lifecycle bridge missing");
assert.ok(index.includes("JJK Life Wheel V7"), "V7 branding missing from launcher");

console.log("runtime structure checks passed");
