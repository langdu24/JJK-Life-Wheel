const assert = require("node:assert/strict");
const fs = require("node:fs");

assert.ok(fs.existsSync("game.html"), "clean game.html is missing");
assert.ok(!fs.existsSync(" game.html"), "legacy spaced game filename still exists");

const index = fs.readFileSync("index.html", "utf8");
const readme = fs.readFileSync("README.md", "utf8");
const v7App = fs.readFileSync("core/v7-app.js", "utf8");
const v7Data = fs.readFileSync("core/v7-data.js", "utf8");
const v8State = fs.readFileSync("core/v8-state.js", "utf8");
const v8App = fs.readFileSync("core/v8-app.js", "utf8");

for (const runtime of [
  "./patches/v5.js",
  "./core/v7-model.js",
  "./core/v7-data.js",
  "./core/v7-app.js",
  "./core/v8-state.js",
  "./core/v8-app.js"
]) assert.ok(index.includes(runtime), `index missing ${runtime}`);

for (const legacy of [
  "./patches/current.js",
  "./patches/v3.js",
  "./patches/v3b.js",
  "./patches/v4.js",
  "./patches/v6.js"
]) assert.ok(!index.includes(legacy), `index still loads legacy ${legacy}`);

assert.ok(readme.includes("core/v7-model.js"));
assert.ok(readme.includes("core/v8-state.js"));
assert.ok(readme.includes("GitHub Actions"));
assert.ok(!readme.includes("current → v3 → v3b → v4 → v5"));

assert.ok(!v7App.includes("setInterval("), "v7-app must not permanently poll with setInterval");
assert.ok(!v7Data.includes("setInterval("), "v7-data must not permanently poll with setInterval");
assert.ok(!v8App.includes("setInterval("), "v8-app must not permanently poll with setInterval");
assert.ok(v7App.includes("jjk-life-wheel-sl-slot-v1-"), "legacy SL migration prefix missing");
assert.ok(v7App.includes("JJKV7Lifecycle"), "V7 lifecycle bridge missing");
assert.ok(v8State.includes("WORLD_FLAG_KEYS"), "V8 core world flags missing");
assert.ok(v8State.includes("validateConsistency"), "V8 consistency validator missing");
assert.ok(v8App.includes("v8CriticalShibuyaIntent"), "V8 critical choice framework missing");
assert.ok(v8App.includes("命运面板"), "V8 destiny panel missing");
assert.ok(index.includes("JJK Life Wheel V8"), "V8 branding missing from launcher");

console.log("runtime structure checks passed");
