((() => {
  "use strict";

  const VERSION = "7.2.0";
  const STORY_TYPE = "lifeWheelBattleBridge";
  const M = globalThis.JJKV7Model;
  if (!M) throw new Error("JJKV7Model must load before v7-data.js");

  const LEGACY_TOJI_HEAVY = new Set([
    "card_inverted_spear_of_heaven_pierce",
    "card_chain_of_thousand_miles_bind",
    "card_soul_split_katana_slash"
  ]);

  const STAT_KEYS = Object.freeze({
    cursedEnergy: ["cursedEnergyScore", "cursedEnergy", "ce"],
    control: ["controlScore", "control"],
    efficiency: ["efficiencyScore", "efficiency"],
    martial: ["martialScore", "martial"],
    body: ["bodyScore", "body"],
    talent: ["talentScore", "talent"]
  });

  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, num(v, 0)));
  const arr = v => (Array.isArray(v) ? v : v == null ? [] : [v]);

  function clone(v) {
    try {
      return structuredClone(v);
    } catch {
      try {
        return JSON.parse(JSON.stringify(v));
      } catch {
        return v && typeof v === "object" ? { ...v } : v;
      }
    }
  }

  function profileOf(v) {
    return v?.characterCardProfile || v?.profile || v || {};
  }

  function profileText(v) {
    const p = profileOf(v);
    return [
      v?.id,
      v?.name,
      p.id,
      p.characterId,
      p.displayName,
      p.name,
      p.visibleGrade,
      p.officialGrade,
      p.powerTier,
      p.grade,
      p.gradeLabel,
      p.notes,
      ...arr(p.traits),
      ...arr(p.innateTraits),
      ...arr(p.cardTags),
      ...arr(p.specialHandTags)
    ]
      .filter(Boolean)
      .join(" ");
  }

  function isLifeWheelProfile(p) {
    p = p || {};
    const t = [p.displayName, p.name, p.notes, p.source, p.sourceType]
      .filter(Boolean)
      .join(" ");
    return (
      /^战力导入：/.test(String(p.displayName || p.name || "")) ||
      /life[-_ ]?wheel|人生转盘|转盘导入/i.test(t) ||
      Boolean(p.encodedCombatProfile)
    );
  }

  function isZeroCe(p) {
    const f = p?.flags;
    const ft = Array.isArray(f)
      ? f.join(" ")
      : f && typeof f === "object"
        ? Object.keys(f)
            .filter(k => f[k])
            .join(" ")
        : String(f || "");
    return /zero.?ce|零咒力|天与咒缚（肉体强化型）|天与暴君|domainSureHitInvalid/i.test(
      `${profileText(p)} ${ft}`
    );
  }

  function detectNoInnateTechnique(p) {
    p = p || {};
    const text = profileText(p);
    const flags = p.flags || {};
    if (flags.hasInnateTechnique === false || flags.noInnateTechnique === true) return true;
    if (flags.hasInnateTechnique === true) return false;
    if (/无生得术式|没有生得术式|不具备生得术式|无固有术式/.test(text)) return true;
    if (/是否拥有生得术式[^\n]{0,12}否|生得术式[^\n]{0,8}否/.test(text)) return true;
    try {
      if (typeof state !== "undefined" && state?.answers) {
        const keys = Object.keys(state.answers);
        for (const key of keys) {
          if (!/innate|technique|生得术式|术式/.test(key)) continue;
          const ans = state.answers[key];
          const blob = [ans?.text, ans?.rawText, ans?.result, key].filter(Boolean).join(" ");
          if (/否|没有|无/.test(blob) && /生得术式|innate/i.test(blob + key)) return true;
        }
      }
    } catch {}
    if (
      isLifeWheelProfile(p) &&
      !p.techniquePower &&
      !p.technique &&
      !(p.techniques && p.techniques.length) &&
      /准一级|一级|二级|三级|特级/.test(text) &&
      !/生得术式|固有术式|innate technique/i.test(text)
    ) {
      return true;
    }
    return false;
  }

  function detectGrade(p) {
    p = p || {};
    const direct =
      p.gradeRank ??
      p.grade ??
      p.gradeLabel ??
      p.visibleGrade ??
      p.officialGrade ??
      p.powerTier;
    const fromDirect = M.parseGrade(direct);
    if (fromDirect > 0) return fromDirect;

    const text = profileText(p);
    const fromText = M.parseGrade(text);
    if (fromText > 0) return fromText;

    if (typeof state !== "undefined") {
      const flagGrade = M.parseGrade(
        state?.flags?.sorcererGradeLabel || state?.flags?.sorcererGrade || ""
      );
      if (flagGrade > 0 && isLifeWheelProfile(p)) return flagGrade;
    }
    return 0;
  }

  function detectUtilityRole(p) {
    p = p || {};
    const text = profileText(p);
    if (M.isUtilityRole(text)) return true;
    if (arr(p.traits).some(t => M.isUtilityRole(t))) return true;
    if (arr(p.cardTags).some(t => M.isUtilityRole(t))) return true;
    return false;
  }

  function readFromObject(o, names) {
    if (!o || typeof o !== "object") return NaN;
    for (const name of names) {
      if (!Object.prototype.hasOwnProperty.call(o, name)) continue;
      const n = M.rankValue(o[name]);
      if (Number.isFinite(n)) return n;
    }
    return NaN;
  }

  function readStat(p, id) {
    p = p || {};
    for (const s of [p.raw, p.baseStats, p.stats, p]) {
      const n = readFromObject(s, STAT_KEYS[id] || [id]);
      if (Number.isFinite(n)) return n;
    }
    return 4;
  }

  function readTechniquePower(p) {
    p = p || {};
    if (detectNoInnateTechnique(p)) return 1;
    for (const v of [
      p.techniquePower,
      p.technique?.power,
      p.techniques?.[0]?.power,
      p.raw?.techniquePower
    ]) {
      const n = M.rankValue(v);
      if (Number.isFinite(n)) return n;
    }
    return 4;
  }

  function transcendenceFor(p) {
    if (!isLifeWheelProfile(p) || typeof state === "undefined") return {};
    const a = state.flags?.battleBridgeTranscendence || {};
    const b = state.flags?.v7Transcendence || {};
    const ids = [
      "cursedEnergy",
      "control",
      "efficiency",
      "martial",
      "body",
      "talent",
      "techniquePower"
    ];
    return Object.fromEntries(
      ids.map(id => [id, Math.max(0, Math.trunc(num(b[id] ?? a[id], 0)))])
    );
  }

  function model(p) {
    p = p || {};
    const noCT = detectNoInnateTechnique(p);
    return M.derive({
      cursedEnergy: readStat(p, "cursedEnergy"),
      control: readStat(p, "control"),
      efficiency: readStat(p, "efficiency"),
      martial: readStat(p, "martial"),
      body: readStat(p, "body"),
      talent: readStat(p, "talent"),
      techniquePower: readTechniquePower(p),
      zeroCe: isZeroCe(p),
      hasInnateTechnique: !noCT,
      noInnateTechnique: noCT,
      gradeRank: detectGrade(p),
      grade: detectGrade(p),
      utilityRole: detectUtilityRole(p),
      roleText: profileText(p),
      traits: arr(p.traits).join(" "),
      transcendence: transcendenceFor(p)
    });
  }

  function actionText(a) {
    return [
      a?.id,
      a?.actionId,
      a?.cardId,
      a?.name,
      a?.label,
      a?.type,
      a?.cardType,
      a?.damageType,
      a?.scalingProfile,
      a?.risk,
      a?.effectSummary,
      ...arr(a?.tags),
      ...arr(a?.specialHandTags)
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function actionTier(a) {
    return M.tierFromText(actionText(a), a?.risk);
  }

  function actionArchetype(a) {
    const t = actionText(a);
    if (/heal|healing|rct|reverse|治疗|疗伤|回复|support|resource|防御|guard|block/.test(t))
      return "utility";
    const p = /melee|physical|martial|体术|近身|拳|踢|咒具|cursed_tool|weapon|刀|剑|chain/.test(t);
    const q =
      /technique|innate|术式|咒法|curse|beam|projectile|domain|领域|必中|blue|red|purple|苍|赫|茈|御厨子|shrine|maximum/.test(
        t
      );
    if (p && q) return "hybrid";
    if (p) return "physical";
    return q ? "technique" : "generic";
  }

  function genericTechniqueMultiplier(p, a) {
    const k = actionArchetype(a);
    const m = model(p);
    if (k === "physical" || k === "utility") return 1;
    if (m.explicitNoCT) return 0.85 + Math.max(0, m.gradeRank - 2) * 0.05;
    const f = Math.exp(0.085 * (m.techniqueOffense - 4));
    return k === "hybrid" ? Math.sqrt(Math.max(0.45, f)) : f;
  }

  function directTechniqueMultiplier(actor, card) {
    const w = globalThis.JJKBattleDataDirect?.getBattleCardCoreWeights?.(card) || {
      martial: 0,
      technique: 1
    };
    const tw = clamp(w.technique, 0, 1);
    if (tw <= 0) return 1;
    const m = model(profileOf(actor));
    if (m.explicitNoCT) return 0.9;
    return Math.exp(0.07 * (m.techniquePower - m.control) * tw);
  }

  function normalizeScaling(card) {
    if (!card?.scaling) return card;
    const c = clone(card);
    c.scaling = { ...c.scaling };
    const s = c.scaling;
    s.bodyResistanceBase = 0.1;
    s.bodyResistancePerRank = 0.025;
    s.bodyResistanceMin = 0.025;
    s.bodyResistanceMax = 0.42;
    s.martialEvasionPerRank = 0.025;
    s.efficiencyCostPerRank = 0.07;
    s.efficiencyCostMin = 0.48;
    s.efficiencyCostMax = 1.55;
    s.sourceDamageMin = Math.min(num(s.sourceDamageMin, 0.25), 0.25);
    s.sourceDamageMax = Math.max(num(s.sourceDamageMax, 2.5), 3.2);
    return c;
  }

  function isStoryBattle(b) {
    return String(b?.activityContext?.type || "") === STORY_TYPE;
  }

  function isPlayerActor(a) {
    return String(a?.side || "") === "left" || isLifeWheelProfile(profileOf(a));
  }

  function scaleDamageFields(a, m) {
    m = num(m, 1);
    for (const [o, k] of [
      [a, "damage"],
      [a, "baseDamage"],
      [a?.effect, "damage"]
    ]) {
      if (o && Number.isFinite(Number(o[k])) && Number(o[k]) > 0) {
        o[k] = Number((Number(o[k]) * m).toFixed(4));
      }
    }
  }

  function neutralizeEmbeddedTojiHotfix(a, actor) {
    const id = String(a?.id || a?.actionId || a?.cardId || "");
    if (
      !LEGACY_TOJI_HEAVY.has(id) ||
      !/伏黑甚尔（怀玉|toji_fushiguro_hidden_inventory/i.test(profileText(actor))
    ) {
      return a;
    }
    const c = clone(a);
    scaleDamageFields(c, 1 / 0.82);
    c.v7LegacyCompatibility = "neutralized-toji-0.82";
    return c;
  }

  function mutateResultHp(r, h, d) {
    if (!r || typeof r !== "object") return;
    const seen = new Set();
    const walk = o => {
      if (!o || typeof o !== "object" || seen.has(o)) return;
      seen.add(o);
      if ("afterHp" in o && Number.isFinite(Number(o.afterHp))) o.afterHp = Number(h.toFixed(1));
      if ("defeated" in o) o.defeated = h <= 0;
      if ("overkill" in o && h > 0) o.overkill = 0;
      Array.isArray(o) ? o.forEach(walk) : Object.values(o).forEach(walk);
    };
    walk(r);
    r.v7AppliedDamage = Number(d.toFixed(1));
  }

  function applyMatchupToLoss(loss, attacker, defender) {
    const am = model(profileOf(attacker));
    const dm = model(profileOf(defender));
    const mult = M.matchupMultiplier(am.gradeRank, dm.gradeRank, {
      attackerNoCT: am.explicitNoCT,
      defenderNoCT: dm.explicitNoCT,
      defenderUtility: dm.utilityRole
    });
    return {
      adjusted: Math.max(0, loss * mult),
      mult,
      attackerModel: am,
      defenderModel: dm
    };
  }

  function installResourceModel() {
    const api = globalThis.JJKDuelResource;
    if (!api || typeof api.deriveDuelResourcesFromProfile !== "function") return false;
    if (api.deriveDuelResourcesFromProfile.__jjkV7Data) return true;
    const old = api.deriveDuelResourcesFromProfile;
    const w = function (p, c, side) {
      const r = old.call(this, p, c, side);
      if (!r) return r;
      const m = model(p);
      r.maxHp = m.maxHp;
      r.hp = m.maxHp;
      r.maxCe = m.maxCe;
      r.ce = m.maxCe;
      r.ceCostMultiplier = m.ceCostMultiplier;
      if (m.explicitNoCT && m.gradeRank >= 4) {
        r.ceCostMultiplier = Number((r.ceCostMultiplier * 0.9).toFixed(4));
      }
      if (m.utilityRole && m.gradeRank > 0 && m.gradeRank <= 2) {
        r.ceCostMultiplier = Number((r.ceCostMultiplier * 1.08).toFixed(4));
      }
      r.bodyResistance = m.bodyResistance;
      r.regenRatio = m.zeroCe
        ? 0
        : 0.02 + 0.11 * (1 - Math.exp(-(m.control + m.efficiency) / 16));
      r.ceRegen = m.zeroCe ? 0 : Number((r.maxCe * r.regenRatio).toFixed(1));
      r.v7Model = { ...m };
      r.raw = {
        ...(r.raw || {}),
        cursedEnergyScore: m.cursedEnergy,
        controlScore: m.control,
        efficiencyScore: m.efficiency,
        martialScore: m.martial,
        bodyScore: m.body,
        talentScore: m.talent,
        gradeRank: m.gradeRank,
        explicitNoCT: m.explicitNoCT
      };
      return r;
    };
    Object.defineProperty(w, "__jjkV7Data", { value: true });
    api.deriveDuelResourcesFromProfile = w;
    return true;
  }

  function installDirectCardModel() {
    const api = globalThis.JJKBattleDataDirect;
    if (!api || typeof api.calculateBattleCardSettlement !== "function") return false;
    if (api.calculateBattleCardSettlement.__jjkV7Data) return true;
    const old = api.calculateBattleCardSettlement;
    const w = function (card, actor, opponent, options) {
      const c = normalizeScaling(card);
      const r = old.call(this, c, actor, opponent, options);
      if (!r || num(r.damage, 0) <= 0) return r;
      let damage = num(r.damage, 0);
      const techMult = directTechniqueMultiplier(actor, c);
      if (Math.abs(techMult - 1) >= 0.002) damage *= techMult;
      const am = model(profileOf(actor));
      const dm = model(profileOf(opponent));
      const match = M.matchupMultiplier(am.gradeRank, dm.gradeRank, {
        attackerNoCT: am.explicitNoCT,
        defenderUtility: dm.utilityRole,
        defenderNoCT: dm.explicitNoCT
      });
      if (Math.abs(match - 1) >= 0.002) damage *= match;
      r.damage = Number(damage.toFixed(1));
      if (r.damageBreakdown && typeof r.damageBreakdown === "object") {
        r.damageBreakdown.v7TechniquePowerMultiplier = Number(techMult.toFixed(4));
        r.damageBreakdown.v7MatchupMultiplier = Number(match.toFixed(4));
      }
      r.v7TechniquePowerMultiplier = Number(techMult.toFixed(4));
      r.v7MatchupMultiplier = Number(match.toFixed(4));
      return r;
    };
    Object.defineProperty(w, "__jjkV7Data", { value: true });
    try {
      globalThis.JJKBattleDataDirect = Object.freeze({ ...api, calculateBattleCardSettlement: w });
      return true;
    } catch {
      try {
        api.calculateBattleCardSettlement = w;
        return true;
      } catch {
        return false;
      }
    }
  }

  function installActionModel() {
    const api = globalThis.JJKDuelActions;
    if (!api || typeof api.applyDuelActionEffect !== "function") return false;
    if (api.applyDuelActionEffect.__jjkV7Data) return true;
    const old = api.applyDuelActionEffect;
    const w = function (action, actor, opponent, battle) {
      let a = neutralizeEmbeddedTojiHotfix(action, actor);
      const p = profileOf(actor);
      const actorModel = model(p);

      if (isStoryBattle(battle) && isPlayerActor(actor)) {
        a = clone(a);
        if (!a.scaling && a.type !== "card_template_runtime") {
          const tier = actionTier(a);
          const ratio = M.projectionRatio(tier, {
            noCT: actorModel.explicitNoCT,
            gradeRank: actorModel.gradeRank
          });
          a.projectionRuntime = {
            ...(a.projectionRuntime || {}),
            active: true,
            damageSettlementRatio: ratio
          };
          a.projectionDamageSettlementRatio = ratio;
          const mult = genericTechniqueMultiplier(p, a);
          if (Math.abs(mult - 1) >= 0.002) {
            scaleDamageFields(a, mult);
            a.v7TechniquePowerMultiplier = Number(mult.toFixed(4));
          }
          const defModel = model(profileOf(opponent));
          const match = M.matchupMultiplier(actorModel.gradeRank, defModel.gradeRank, {
            attackerNoCT: actorModel.explicitNoCT,
            defenderUtility: defModel.utilityRole
          });
          if (match > 1.02) {
            scaleDamageFields(a, match);
            a.v7MatchupMultiplier = Number(match.toFixed(4));
          }
        }
      }

      const before = num(opponent?.hp, 0);
      const maxHp = Math.max(1, num(opponent?.maxHp, before || 1));
      const r = old.call(this, a, actor, opponent, battle);
      if (!opponent || before <= 0) return r;

      const after = num(opponent.hp, 0);
      let loss = Math.max(0, before - after);
      if (loss <= 0) return r;

      const matchInfo = applyMatchupToLoss(loss, actor, opponent);
      if (Math.abs(matchInfo.mult - 1) >= 0.02) loss = matchInfo.adjusted;

      const soft = Math.min(
        before,
        M.softBurstDamage(
          loss,
          maxHp,
          actionTier(a),
          matchInfo.attackerModel.combatRating,
          matchInfo.defenderModel.combatRating
        )
      );

      if (soft + 0.5 < before - after || Math.abs(matchInfo.mult - 1) >= 0.02) {
        opponent.hp = Math.max(0, Number((before - soft).toFixed(1)));
        mutateResultHp(r, opponent.hp, soft);
        try {
          (battle?.resourceLog || battle?.log)?.unshift?.({
            side: opponent.side || "right",
            title: "V7 等级/无术式匹配",
            detail: `匹配倍率 ${matchInfo.mult.toFixed(2)}｜原损失 ${(before - after).toFixed(1)} → 结算 ${soft.toFixed(1)}｜攻击方等级${matchInfo.attackerModel.gradeRank || "?"}${matchInfo.attackerModel.explicitNoCT ? "(无术式)" : ""} vs 防守方等级${matchInfo.defenderModel.gradeRank || "?"}${matchInfo.defenderModel.utilityRole ? "(工具/辅助)" : ""}`,
            type: "system",
            delta: {
              v7Matchup: true,
              mult: matchInfo.mult,
              rawLoss: before - after,
              softened: soft
            }
          });
        } catch {}
      }
      return r;
    };
    Object.defineProperty(w, "__jjkV7Data", { value: true });
    api.applyDuelActionEffect = w;
    return true;
  }

  function installAll() {
    return Object.freeze({
      resource: installResourceModel(),
      directCards: installDirectCardModel(),
      actions: installActionModel()
    });
  }

  function ready(r) {
    return Boolean(r.resource && r.directCards && r.actions);
  }

  let attempts = 0;
  function boot() {
    const report = installAll();
    globalThis.JJKV7Data.installReport = report;
    if (ready(report)) {
      document.documentElement?.setAttribute("data-jjk-v7-data", VERSION);
      try {
        document.dispatchEvent(
          new CustomEvent("jjk:v7-data-ready", { detail: { version: VERSION, report } })
        );
      } catch {}
      return;
    }
    attempts += 1;
    if (attempts < 40) setTimeout(boot, 100);
    else console.error("[JJK V7] data adapters did not fully install", report);
  }

  globalThis.JJKV7Data = {
    version: VERSION,
    model,
    detectGrade,
    detectNoInnateTechnique,
    detectUtilityRole,
    installAll,
    installReport: null,
    actionTier,
    actionArchetype
  };
  boot();
})();
