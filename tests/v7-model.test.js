const assert = require("node:assert/strict");
const M = require("../core/v7-model.js");
const approx = (a, e, t = 1e-9) => assert.ok(Math.abs(a - e) <= t, `${a} != ${e}`);

assert.equal(M.VERSION, "7.2.0");
assert.equal(M.rankValue("E-"), 0);
assert.equal(M.rankValue("B"), 4);
assert.equal(M.rankValue("EX-"), 9);
assert.equal(M.rankValue("EX"), 10);
assert.equal(M.parseGrade("准一级（二级上位）"), 4);
assert.equal(M.parseGrade("三级"), 2);
assert.equal(M.parseGrade("特级"), 7);
assert.equal(M.parseGrade("grade3_utility"), 2);

approx(M.transcendStepValue(1), 0.24);
assert.ok(M.transcendStepValue(2) < M.transcendStepValue(1));
assert.ok(M.transcendTotal(4) > M.transcendTotal(3));

const make = r =>
  M.derive({
    cursedEnergy: r,
    control: r,
    efficiency: r,
    martial: r,
    body: r,
    talent: r,
    techniquePower: r
  });
const b = make("B");
const s = make("S");
const sss = make("SSS");
const ex = make("EX");
assert.equal(b.maxHp, 268);
assert.equal(b.maxCe, 144);
assert.equal(s.maxHp, 332);
assert.equal(s.maxCe, 202);
assert.equal(sss.maxHp, 419);
assert.equal(sss.maxCe, 292);
assert.equal(ex.maxHp, 552);
assert.equal(ex.maxCe, 446);

const exPlus = M.derive({
  cursedEnergy: "EX",
  control: "EX",
  efficiency: "EX",
  martial: "EX",
  body: "EX",
  talent: "EX",
  techniquePower: "EX",
  transcendence: { body: 3, martial: 3, cursedEnergy: 3 }
});
assert.ok(exPlus.maxHp > ex.maxHp);
assert.ok(exPlus.maxCe > ex.maxCe);

const low = M.derive({
  cursedEnergy: "E-",
  control: "B",
  efficiency: "E-",
  martial: "B",
  body: "B",
  talent: "B",
  techniquePower: "EX"
});
const high = M.derive({
  cursedEnergy: "E-",
  control: "B",
  efficiency: "EX",
  martial: "B",
  body: "B",
  talent: "B",
  techniquePower: "EX"
});
assert.equal(low.maxCe, high.maxCe);
assert.ok(high.ceCostMultiplier < low.ceCostMultiplier);
assert.equal(
  M.derive({
    cursedEnergy: "EX",
    control: "EX",
    efficiency: "EX",
    martial: "EX",
    body: "EX",
    talent: "EX",
    techniquePower: "EX",
    zeroCe: true
  }).maxCe,
  0
);

assert.ok(M.bodyResistance(2) < M.bodyResistance(4));
assert.ok(M.bodyResistance(4) < M.bodyResistance(8));
assert.ok(M.bodyResistance(20) < 0.42);
assert.equal(M.projectionRatio("normal"), 0.72);
assert.equal(M.projectionRatio("high"), 0.8);
assert.equal(M.projectionRatio("ultimate"), 0.9);
assert.ok(M.projectionRatio("normal", { noCT: true, gradeRank: 4 }) > 0.72);

const d500 = M.softBurstDamage(500, 400, "normal", 6, 6);
const d1000 = M.softBurstDamage(1000, 400, "normal", 6, 6);
assert.ok(d500 > 0 && d500 < 500);
assert.ok(d1000 > d500, "soft burst must not be a hard cap");
assert.ok(M.softBurstDamage(500, 400, "normal", 10, 6) > M.softBurstDamage(500, 400, "normal", 6, 6));
assert.equal(M.tierFromText("虚式 茈"), "ultimate");
assert.equal(M.tierFromText("高输出术式"), "high");
assert.equal(M.tierFromText("普通拳击"), "normal");

// Core bugfix: quasi-1 no-CT must outrate Nanako-like grade3 utility
const quasi1NoCT = M.derive({
  cursedEnergy: "C",
  control: "B",
  efficiency: "B",
  martial: "C",
  body: "C",
  talent: "B",
  techniquePower: 1,
  hasInnateTechnique: false,
  noInnateTechnique: true,
  grade: "准一级（二级上位）"
});
const nanakoLike = M.derive({
  cursedEnergy: "C",
  control: "B",
  efficiency: "C",
  martial: "C",
  body: "C",
  talent: "B",
  techniquePower: 4,
  hasInnateTechnique: true,
  grade: "三级",
  utilityRole: true,
  traits: "grade3_utility 照片操控"
});
assert.equal(quasi1NoCT.gradeRank, 4);
assert.equal(nanakoLike.gradeRank, 2);
assert.equal(quasi1NoCT.explicitNoCT, true);
assert.ok(quasi1NoCT.combatRating > nanakoLike.combatRating, "quasi-1 no-CT must outrate grade3 utility");
const match = M.matchupMultiplier(quasi1NoCT.gradeRank, nanakoLike.gradeRank, {
  attackerNoCT: true,
  defenderUtility: true
});
assert.ok(match >= 1.35, `matchup floor too low: ${match}`);

// No-CT must not fake full technique offense from default B
const fakeTech = M.derive({
  cursedEnergy: "C",
  control: "B",
  efficiency: "B",
  martial: "C",
  body: "C",
  talent: "B",
  techniquePower: 4,
  hasInnateTechnique: true,
  grade: "准一级"
});
assert.ok(quasi1NoCT.techniqueOffense < fakeTech.techniqueOffense);
assert.ok(quasi1NoCT.physicalOffense >= fakeTech.physicalOffense * 0.9);

console.log("v7-model tests passed");
