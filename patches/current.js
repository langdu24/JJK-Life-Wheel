(() => {
  "use strict";

  const PATCH_VERSION = "2026-08-24-toji-burst-v1";
  const TOJI_HEAVY_TOOL_IDS = new Set([
    "card_inverted_spear_of_heaven_pierce",
    "card_chain_of_thousand_miles_bind",
    "card_soul_split_katana_slash"
  ]);
  const TOJI_RUNTIME_DAMAGE_SCALE = 0.82;

  window.JJK_LIFE_WHEEL_PATCH_VERSION = PATCH_VERSION;

  function cloneAction(action) {
    try {
      return typeof structuredClone === "function"
        ? structuredClone(action)
        : JSON.parse(JSON.stringify(action));
    } catch {
      return { ...action, effect: { ...(action?.effect || {}) }, effects: { ...(action?.effects || {}) } };
    }
  }

  function actionId(action) {
    return String(action?.id || action?.actionId || action?.cardId || "");
  }

  function isHiddenInventoryToji(actor) {
    const profile = actor?.characterCardProfile || actor?.profile || actor || {};
    const text = [
      actor?.id,
      actor?.name,
      profile?.id,
      profile?.characterId,
      profile?.name,
      profile?.displayName,
      ...(profile?.traits || []),
      ...(profile?.cardTags || []),
      ...(profile?.specialHandTags || [])
    ].filter(Boolean).join(" ");
    return /toji_fushiguro_hidden_inventory|伏黑甚尔（怀玉|伏黑甚尔.*完整咒具/i.test(text);
  }

  function scaleDirectDamage(action, scale) {
    const next = cloneAction(action);
    const scaleNumber = (obj, key) => {
      if (!obj || !Number.isFinite(Number(obj[key]))) return;
      obj[key] = Number((Number(obj[key]) * scale).toFixed(3));
    };
    scaleNumber(next, "damage");
    scaleNumber(next.effect, "damage");
    scaleNumber(next.effects, "damage");
    return next;
  }

  function patchRuntimeData() {
    if (typeof state === "undefined") return false;

    // 旧版 460 HP 硬上限会把 EX/EX- 肉体和标准特级压成同一血条。
    // 提高硬上限，不凭空给低体质角色加血，只允许高面板继续兑现。
    if (state.duelResourceRules?.hp) {
      state.duelResourceRules.hp.max = Math.max(Number(state.duelResourceRules.hp.max || 0), 680);
    }

    // 甚尔三张完整咒具重击原本都是 AP1，可在基础 AP2 下一回合连续轰两张，
    // 配合零咒力咒具倍率很容易形成两回合固定秒杀。改成重击 AP2。
    const cards = state.duelSpecialCards?.cards || state.battleCards?.cards || [];
    for (const card of cards) {
      if (!TOJI_HEAVY_TOOL_IDS.has(String(card?.id || ""))) continue;
      card.cost ||= {};
      card.cost.ap = Math.max(2, Number(card.cost.ap || 0));
      card.hotfix ||= {};
      card.hotfix.tojiBurstV1 = true;
    }

    try { globalThis.JJKDuelActions?.invalidateDuelActionTemplateCache?.(); } catch {}
    try { globalThis.JJKDuelActions?.invalidateDuelActionChoices?.(state.duelBattle); } catch {}
    return true;
  }

  function patchActionRuntime() {
    const api = globalThis.JJKDuelActions;
    if (!api || typeof api.applyDuelActionEffect !== "function") return false;
    if (api.applyDuelActionEffect.__jjkTojiBurstV1) return true;

    const original = api.applyDuelActionEffect;
    const wrapped = function patchedApplyDuelActionEffect(action, actor, opponent, duelState) {
      let runtimeAction = action;
      if (isHiddenInventoryToji(actor) && TOJI_HEAVY_TOOL_IDS.has(actionId(action))) {
        // 只削怀玉完整咒具甚尔的连续爆发，不削玩家抽到同一咒具时的伤害。
        runtimeAction = scaleDirectDamage(action, TOJI_RUNTIME_DAMAGE_SCALE);
      }
      return original.call(this, runtimeAction, actor, opponent, duelState);
    };
    Object.defineProperty(wrapped, "__jjkTojiBurstV1", { value: true });
    api.applyDuelActionEffect = wrapped;
    return true;
  }

  function install() {
    const dataReady = patchRuntimeData();
    const actionReady = patchActionRuntime();
    if (dataReady && actionReady) {
      console.info(`[JJK-Life-Wheel] patch loaded: ${PATCH_VERSION}`);
      document.documentElement.dataset.jjkGithubPatch = PATCH_VERSION;
      return true;
    }
    return false;
  }

  if (!install()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts >= 120) clearInterval(timer);
    }, 250);
  }
})();
