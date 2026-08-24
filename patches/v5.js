(() => {
  "use strict";

  const VERSION = "2026-08-24-flow-stability-v5";
  const REMOVED_NODE_IDS = new Set(["final-endingMeta", "easter-endingMeta"]);

  window.JJK_LIFE_WHEEL_PATCH_V5 = VERSION;

  function isRemovedCoinItem(item) {
    return REMOVED_NODE_IDS.has(String(item?.nodeId || "")) || String(item?.title || "") === "观众是否会投币";
  }

  function scrubRemovedCoinItem() {
    if (typeof state === "undefined") return false;
    let changed = false;

    if (Array.isArray(state.records)) {
      const records = state.records.filter((record) => !isRemovedCoinItem(record));
      if (records.length !== state.records.length) {
        state.records = records;
        changed = true;
      }
    }
    if (Array.isArray(state.taskQueue)) {
      const queue = state.taskQueue.filter((task) => !isRemovedCoinItem(task));
      if (queue.length !== state.taskQueue.length) {
        state.taskQueue = queue;
        changed = true;
      }
    }
    if (state.answers && typeof state.answers === "object") {
      for (const nodeId of REMOVED_NODE_IDS) {
        if (Object.prototype.hasOwnProperty.call(state.answers, nodeId)) {
          delete state.answers[nodeId];
          changed = true;
        }
      }
    }
    if (state.flags && Object.prototype.hasOwnProperty.call(state.flags, "hadCoinFlip")) {
      delete state.flags.hadCoinFlip;
      changed = true;
    }
    if (isRemovedCoinItem(state.currentTask) && typeof globalThis.advanceToNextTask === "function") {
      state.pendingResult = null;
      globalThis.advanceToNextTask();
      changed = true;
    }
    return changed;
  }

  function recoverCompletedAutoLife() {
    if (typeof state === "undefined") return false;
    const session = globalThis.__JJK_FULL_LIFE_SESSION__;
    if (!session || session.active || session.__v5Recovered || globalThis.__JJK_AUTO_FULL_LIFE_ACTIVE__) return false;
    const hadLock = Boolean(state.isSpinning || state.spinModeSnapshot || state.pendingResult);
    try { globalThis.JJKBattleStoryBridge?.setAutoFullLife?.(false); } catch {}
    state.isSpinning = false;
    state.spinModeSnapshot = null;
    state.pendingResult = null;
    if (hadLock) state.spinToken = Number(state.spinToken || 0) + 1;
    const button = document.querySelector("#runAllBtn");
    if (button && /停止自动人生|正在/.test(String(button.textContent || ""))) button.textContent = "一键转完整人生";
    session.__v5Recovered = true;
    return hadLock;
  }

  function makePrisonRealmBattleTask(sourceTask, recordId) {
    return {
      type: "wheel",
      nodeId: `story-duel-prison-realm-${recordId}`,
      title: "剧情实战｜夺取狱门疆",
      stage: sourceTask.stage || "涩谷：实战",
      why: "夺取五条悟所在的狱门疆必然要突破羂索本人；胜负将反写涩谷世界线，不能先抽到成功再跳过实战。",
      timelinePeriod: sourceTask.timelinePeriod || "shibuya",
      options: [{ text: "战斗胜利", weight: 1 }, { text: "战斗失败", weight: 1 }],
      battleBridgeEncounter: true,
      battleBridgeOpponents: ["羂索"],
      battleBridgeSourceRecordId: recordId,
      battleBridgeStoryConsequence: "shibuya-prison-realm-seizure"
    };
  }

  function applyPrisonRealmBattleConsequence(task, result) {
    if (task?.battleBridgeStoryConsequence !== "shibuya-prison-realm-seizure") return;
    const won = result?.battleBridgeMeta?.playerWon === true;
    const sourceRecord = (state.records || []).find((record) => Number(record?.id) === Number(task.battleBridgeSourceRecordId));
    const sourceAnswer = state.answers?.shibuyaHighSchoolImpact;
    state.flags.shibuyaGojoRescueAttempt = true;
    if (won) {
      state.flags.prisonRealmSecured = true;
      state.flags.gojoShibuyaState = "prisonRealmSecured";
      if (sourceRecord && !/实战验证/.test(String(sourceRecord.result || ""))) {
        sourceRecord.result = `${sourceRecord.result}｜实战验证：击退羂索后夺取成功`;
      }
      return;
    }
    const failedText = "直奔地下尝试夺取五条盒，但实战败给羂索，夺取失败";
    state.flags.prisonRealmSecured = false;
    if (state.flags.gojoShibuyaState === "prisonRealmSecured") state.flags.gojoShibuyaState = "sealedCanon";
    if (sourceRecord) sourceRecord.result = failedText;
    if (sourceAnswer && typeof sourceAnswer === "object") {
      sourceAnswer.text = failedText;
      if ("rawText" in sourceAnswer) sourceAnswer.rawText = failedText;
      if ("result" in sourceAnswer) sourceAnswer.result = failedText;
    }
  }

  function installStoryHook() {
    const wheel = globalThis.JJKPersonalWheel;
    const current = wheel?.afterCommit;
    if (typeof current !== "function") return false;
    if (current.__jjkFlowStabilityV5) return true;
    const wrapped = function (payload) {
      const result = current.apply(this, arguments);
      try {
        const task = payload?.task;
        const picked = payload?.result;
        applyPrisonRealmBattleConsequence(task, picked);
        const isSeizure = /对涩谷事变的影响/.test(String(task?.title || "")) && /抢到五条盒/.test(String(picked?.text || ""));
        const alreadyQueued = (state.taskQueue || []).some((queued) => queued?.battleBridgeStoryConsequence === "shibuya-prison-realm-seizure");
        const alreadyResolved = (state.records || []).some((record) => record?.battleBridgeStoryConsequence === "shibuya-prison-realm-seizure");
        if (isSeizure && picked?.selectionMode !== "battle" && !alreadyQueued && !alreadyResolved) {
          state.taskQueue.unshift(makePrisonRealmBattleTask(task, payload?.recordId));
        }
      } catch (error) {
        console.error("涩谷狱门疆实战接入失败", error);
      }
      return result;
    };
    Object.defineProperty(wrapped, "__jjkFlowStabilityV5", { value: true });
    wheel.afterCommit = wrapped;
    return true;
  }

  function installAdvanceGuard() {
    const current = globalThis.advanceToNextTask;
    if (typeof current !== "function") return false;
    if (current.__jjkFlowStabilityV5) return true;
    const wrapped = function (...args) {
      let result = current.apply(this, args);
      let guard = 0;
      while (typeof state !== "undefined" && isRemovedCoinItem(state.currentTask) && guard < 4) {
        state.pendingResult = null;
        result = current.apply(this, args);
        guard += 1;
      }
      scrubRemovedCoinItem();
      return result;
    };
    Object.defineProperty(wrapped, "__jjkFlowStabilityV5", { value: true });
    globalThis.advanceToNextTask = wrapped;
    return true;
  }

  function installBattleTimeoutGuard() {
    const bridge = globalThis.JJKBattleStoryBridge;
    const current = bridge?.autoResolveCurrentTask;
    if (typeof current !== "function") return false;
    if (current.__jjkFlowStabilityV5) return true;
    const wrapped = async function (...args) {
      const result = await current.apply(this, args);
      if (result?.timedOut) {
        try { globalThis.JJKDuelRuntime?.clearCurrentDuelBattle?.({ render: false }); } catch {}
        if (typeof state !== "undefined") {
          state.isSpinning = false;
          state.spinModeSnapshot = null;
          state.pendingResult = null;
          state.spinToken = Number(state.spinToken || 0) + 1;
        }
        throw new Error("剧情实战代理超时，已恢复原剧情节点");
      }
      return result;
    };
    Object.defineProperty(wrapped, "__jjkFlowStabilityV5", { value: true });
    bridge.autoResolveCurrentTask = wrapped;
    return true;
  }

  function install() {
    const ready = installAdvanceGuard() && installStoryHook() && installBattleTimeoutGuard();
    const changed = scrubRemovedCoinItem() || recoverCompletedAutoLife();
    if (changed) {
      try { globalThis.saveLifeWheelRunDraft?.(); } catch {}
      try { globalThis.renderAll?.(); } catch {}
    }
    if (ready) {
      document.documentElement.dataset.jjkFlowStability = VERSION;
    }
    return ready;
  }

  window.setInterval(install, 250);
  install();
  console.info(`[JJK-Life-Wheel] flow stability loaded: ${VERSION}`);
})();
