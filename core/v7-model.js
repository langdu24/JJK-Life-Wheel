(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.JJKV7Model = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "7.2.0";
  const RANK = Object.freeze({
    "E-": 0, E: 1, D: 2, C: 3, B: 4, A: 5, S: 6, SS: 7, SSS: 8, "EX-": 9, EX: 10
  });

  // 等级轴：用于匹配期望与战力底盘，不再只是文本标签
  const GRADE = Object.freeze({
    grade5: 0,
    grade4: 1,
    grade3: 2,
    grade2: 3,
    semi1: 4,
    grade1: 5,
    specialCandidate: 6,
    special: 7
  });

  const num = (value, fallback = 0) =>
    Number.isFinite(Number(value)) ? Number(value) : fallback;

  const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, num(value)));

  function rankValue(value, fallback = NaN) {
    if (Number.isFinite(Number(value)) && String(value).trim() !== "") {
      return Math.max(0, Number(value));
    }
    const m = String(value || "")
      .trim()
      .toUpperCase()
      .match(/^(EX-|EX|SSS|SS|S|A|B|C|D|E-|E)/);
    return m ? RANK[m[1]] : fallback;
  }

  function parseGrade(value) {
    if (Number.isFinite(Number(value))) return Math.max(0, Math.trunc(Number(value)));
    const t = String(value || "");
    if (!t) return 0;
    if (/特级/.test(t) && !/准特级|特级候补|特级候选/.test(t)) return GRADE.special;
    if (/准特级|特级候补|特级候选|specialCandidate/i.test(t)) return GRADE.specialCandidate;
    if (/(^|[^准])一级|grade\s*1\b/i.test(t) && !/准一级/.test(t)) return GRADE.grade1;
    if (/准一级|二级上位|semi\s*-?\s*grade\s*1|semigrade1/i.test(t)) return GRADE.semi1;
    if (/二级|grade\s*2\b/i.test(t)) return GRADE.grade2;
    if (/三级|grade\s*3\b/i.test(t)) return GRADE.grade3;
    if (/四级|grade\s*4\b/i.test(t)) return GRADE.grade4;
    if (/五级|grade\s*5\b/i.test(t)) return GRADE.grade5;
    return 0;
  }

  function isUtilityRole(value) {
    return /utility|support|辅助|工具|照片|写真|定格|帧移|玩偶|拘束|支援/i.test(
      String(value || "")
    );
  }

  function transcendStepValue(step) {
    const n = Math.max(1, Math.trunc(num(step, 1)));
    return 0.24 / (1 + 0.55 * (n - 1));
  }

  function transcendTotal(count) {
    const n = Math.max(0, Math.trunc(num(count, 0)));
    let total = 0;
    for (let i = 1; i <= n; i += 1) total += transcendStepValue(i);
    return total;
  }

  function statValue(value, transcendCount = 0, fallback = 4) {
    return rankValue(value, fallback) + transcendTotal(transcendCount);
  }

  function efficiencyCostMultiplier(efficiency) {
    return Math.exp(-0.105 * (num(efficiency, 4) - 4));
  }

  function bodyResistance(body) {
    const b = Math.max(0, num(body, 4));
    return 0.015 + 0.39 * (1 - Math.exp(-b / 11.5));
  }

  /**
   * 等级差匹配倍率。
   * 准一级(4) vs 三级工具人(2) => 基础约 1.35，工具人再放大。
   * 用于输出增益 / 承伤削减，避免“称号和实战脱节”。
   */
  function matchupMultiplier(attackerGrade, defenderGrade, options = {}) {
    const atk = parseGrade(attackerGrade);
    const def = parseGrade(defenderGrade);
    if (atk <= 0 || def <= 0) return 1;

    const gap = atk - def;
    let mult = 1 + 0.14 * gap;
    if (options.defenderUtility && gap > 0) mult += 0.09 * gap;
    if (options.attackerNoCT && gap > 0) mult += 0.06 * gap;
    if (options.defenderNoCT && gap < 0) mult -= 0.04 * Math.abs(gap);
    return clamp(mult, 0.52, 1.95);
  }

  function derive(input = {}) {
    const tr = input.transcendence || {};
    const cursedEnergy = statValue(input.cursedEnergy, tr.cursedEnergy);
    const control = statValue(input.control, tr.control);
    const efficiency = statValue(input.efficiency, tr.efficiency);
    const martial = statValue(input.martial, tr.martial);
    const body = statValue(input.body, tr.body);
    const talent = statValue(input.talent, tr.talent);
    const rawTechniquePower = statValue(
      input.techniquePower,
      tr.techniquePower,
      rankValue(input.techniquePower, 4)
    );
    const zeroCe = Boolean(input.zeroCe);
    const hasInnateTechnique =
      input.hasInnateTechnique === false || input.noInnateTechnique === true
        ? false
        : input.hasInnateTechnique === true || input.noInnateTechnique === false
          ? Boolean(input.hasInnateTechnique) || !input.noInnateTechnique
          : input.hasInnateTechnique == null && input.noInnateTechnique == null
            ? true
            : Boolean(input.hasInnateTechnique);

    // 明确无生得术式：绝不把“默认 B 术式威力”当成真实术式输出
    const explicitNoCT =
      input.hasInnateTechnique === false || input.noInnateTechnique === true;
    const techniquePower = explicitNoCT
      ? Math.min(rawTechniquePower, 1.5)
      : rawTechniquePower;

    const gradeRank = parseGrade(input.gradeRank ?? input.grade ?? input.gradeLabel);
    const utilityRole = Boolean(input.utilityRole) || isUtilityRole(input.roleText || input.traits || "");

    const bodyOver = Math.max(0, body - 6);
    const martialOver = Math.max(0, martial - 6);
    const maxHp = Math.round(
      Math.max(
        60,
        140 + 24 * body + 8 * martial + 4 * bodyOver * bodyOver + 1.75 * martialOver * martialOver
      )
    );

    const ceOver = Math.max(0, cursedEnergy - 6);
    const ceBase = 28 + 26 * cursedEnergy + 8 * ceOver * ceOver;
    const techniqueCapacityBonus = explicitNoCT
      ? 0
      : Math.min(ceBase * 0.12, techniquePower * 3);
    const maxCe = zeroCe ? 0 : Math.round(Math.max(12, ceBase + techniqueCapacityBonus));

    let physicalOffense = 0.68 * martial + 0.32 * body;
    let techniqueOffense =
      0.46 * techniquePower + 0.24 * cursedEnergy + 0.2 * control + 0.1 * talent;

    if (explicitNoCT) {
      // 无术式：体术主轴 + 等级底盘，不再虚空吃术式公式
      const gradeFloor = Math.max(0, gradeRank - 2) * 0.22;
      physicalOffense = 0.74 * martial + 0.26 * body + gradeFloor;
      techniqueOffense = 0.18 * control + 0.12 * cursedEnergy + 0.08 * talent;
    }

    // 工具人/辅助向在正面对决中的输出与生存略降，避免“辅助面板=决斗面板”
    if (utilityRole) {
      physicalOffense *= 0.9;
      techniqueOffense *= 0.88;
    }

    // 等级底盘：准一级必须比三级工具人更耐打、更有压迫
    if (gradeRank > 0) {
      physicalOffense += 0.11 * gradeRank;
      techniqueOffense += explicitNoCT ? 0.04 * gradeRank : 0.08 * gradeRank;
    }

    const defense = 0.74 * body + 0.26 * martial + (gradeRank > 0 ? 0.09 * gradeRank : 0);
    const utility = 0.42 * control + 0.32 * efficiency + 0.26 * talent;
    const major = Math.max(physicalOffense, techniqueOffense);
    const minor = Math.min(physicalOffense, techniqueOffense);
    const gradeComponent = gradeRank > 0 ? gradeRank : major * 0.35;
    const combatRating =
      0.48 * major +
      0.12 * minor +
      0.14 * defense +
      0.11 * utility +
      0.15 * gradeComponent;

    return Object.freeze({
      cursedEnergy,
      control,
      efficiency,
      martial,
      body,
      talent,
      techniquePower,
      rawTechniquePower,
      zeroCe,
      hasInnateTechnique: !explicitNoCT,
      explicitNoCT,
      gradeRank,
      utilityRole,
      maxHp,
      maxCe,
      ceCostMultiplier: efficiencyCostMultiplier(efficiency),
      bodyResistance: bodyResistance(body),
      physicalOffense,
      techniqueOffense,
      defense,
      utility,
      combatRating
    });
  }

  function projectionRatio(tier, options = {}) {
    let ratio = tier === "ultimate" ? 0.9 : tier === "high" ? 0.8 : 0.72;
    // 无术式高阶角色的通用近战需要更高兑现，否则永远打不过有卡组的低阶术师
    if (options.noCT) {
      const gradeRank = parseGrade(options.gradeRank);
      ratio += 0.04 + Math.max(0, gradeRank - 2) * 0.03;
      if (tier === "normal") ratio = Math.min(0.92, ratio);
      if (tier === "high") ratio = Math.min(0.95, ratio);
      if (tier === "ultimate") ratio = Math.min(0.98, ratio);
    }
    return ratio;
  }

  function softBurstDamage(rawDamage, maxHp, tier, attackerRating, defenderRating) {
    const raw = Math.max(0, num(rawDamage, 0));
    const hp = Math.max(1, num(maxHp, 1));
    if (raw <= 0) return 0;
    const ratio = Math.max(0.2, num(attackerRating, 4) / Math.max(0.5, num(defenderRating, 4)));
    const gap = Math.max(0, ratio - 1);
    const gapEase = 1 - Math.exp(-gap);
    const baseThreshold = tier === "ultimate" ? 0.62 : tier === "high" ? 0.46 : 0.34;
    const baseRetention = tier === "ultimate" ? 0.86 : tier === "high" ? 0.56 : 0.35;
    const thresholdFraction = baseThreshold + (tier === "ultimate" ? 0.2 : 0.17) * gapEase;
    const retention = baseRetention + (1 - baseRetention) * 0.62 * gapEase;
    const threshold = hp * thresholdFraction;
    return raw <= threshold ? raw : threshold + (raw - threshold) * retention;
  }

  function tierFromText(text, risk = "") {
    const t = String(text || "").toLowerCase();
    if (
      /茈|虚式|hollow.?purple|极之番|極ノ番|maximum|最大出力|最大输出|终结|終結|finisher|ultimate|世界斩|world.?slash|fuga|灶/.test(
        t
      )
    ) {
      return "ultimate";
    }
    if (
      /high|critical|burst|爆发|大功率|高出力|高输出|领域|domain/.test(t) ||
      /high|critical/.test(String(risk || "").toLowerCase())
    ) {
      return "high";
    }
    return "normal";
  }

  return Object.freeze({
    VERSION,
    RANK,
    GRADE,
    rankValue,
    parseGrade,
    isUtilityRole,
    transcendStepValue,
    transcendTotal,
    statValue,
    efficiencyCostMultiplier,
    bodyResistance,
    matchupMultiplier,
    derive,
    projectionRatio,
    softBurstDamage,
    tierFromText
  });
});
