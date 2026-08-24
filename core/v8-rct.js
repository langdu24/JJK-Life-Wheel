(()=>{
  "use strict";
  const VERSION="8.1.0";
  const R=globalThis.JJKV8RCTModel;
  if(!R){console.error("[JJK V8.1 RCT] model missing");return}

  const STAT_MAP={"咒力总量":"cursedEnergy","咒力操纵":"control","咒力效率":"efficiency","体术":"martial","体质":"body","天赋":"talent","术式威力":"techniquePower"};
  const RANK_RE="(EX-|EX|SSS|SS|S|A|B|C|D|E-|E)";
  const clone=v=>{try{return structuredClone(v)}catch{try{return JSON.parse(JSON.stringify(v))}catch{return v&&typeof v==="object"?{...v}:v}}};
  const asText=v=>Array.isArray(v)?v.map(asText).join(" "):v&&typeof v==="object"?Object.values(v).filter(x=>typeof x==="string"||Array.isArray(x)).map(asText).join(" "):String(v??"");
  function lifeText(){
    if(typeof state==="undefined")return "";
    const records=(state.records||[]).map(r=>`${r?.stage||""} ${r?.title||""} ${r?.result||""}`).join(" ");
    return [records,state.flags?.advancedTechniques,state.flags?.specialTalent,state.flags?.specialHandTags].map(asText).join(" ");
  }
  function stateRoot(){return typeof state!=="undefined"?state.flags?.v8:null}
  function currentStats(){
    const v8=stateRoot()?.character?.current||{},legacy=typeof state!=="undefined"?state.flags?.battleBridgePersistentRanks||{}:{};
    return {control:v8.control||legacy.control||"B",efficiency:v8.efficiency||legacy.efficiency||"B",talent:v8.talent||legacy.talent||"B",techniquePower:v8.techniquePower||legacy.techniquePower||"B"};
  }
  function syncPlayerProfile(){
    const root=stateRoot();if(!root)return null;
    const stats=currentStats(),text=lifeText(),advanced=asText(state?.flags?.advancedTechniques||[]);
    const explicitRct=/反转术式|reverse[_\s-]?cursed[_\s-]?technique|\brct\b/i.test(advanced);
    const denied=/无反转术式|未掌握反转术式|不会反转术式/.test(text);
    const profile=R.deriveProfile({...stats,text,hasRct:explicitRct||(!denied&&/反转术式|reverse[_\s-]?cursed[_\s-]?technique|\brct\b/i.test(text)),externalOutput:/反转术式外放|反转输出|正能量外放|reverse[_\s-]?output|rct[_\s-]?output/i.test(advanced+" "+text)});
    const prev=root.rct?.profile;
    root.rct=root.rct||{history:[],treatments:[],treatedEvents:[]};
    root.rct.profile=profile;root.rct.version=VERSION;
    if(profile.hasRct&&!prev?.hasRct)root.rct.history.push({at:new Date().toISOString(),type:"unlocked",mastery:profile.mastery,label:"掌握反转术式"});
    if(prev?.hasRct&&prev.mastery!==profile.mastery)root.rct.history.push({at:new Date().toISOString(),type:"mastery",from:prev.mastery,to:profile.mastery});
    return profile;
  }
  function actorText(actor={}){
    return [actor.id,actor.characterId,actor.name,actor.label,actor.title,actor.traits,actor.tags,actor.specialHandTags,actor.explicitSpecialHandTags,actor.advancedTechniques,actor.profile?.traits,actor.raw?.name].map(asText).join(" ");
  }
  function actorProfile(actor={}){
    const t=actorText(actor),base=actor.baseStats||{},raw=actor.raw||{};
    let profile=R.deriveProfile({text:t,control:raw.controlScore??base.control,efficiency:raw.efficiencyScore??base.efficiency,talent:raw.talentScore??base.talent,techniquePower:raw.techniquePowerScore??base.techniquePower});
    if(actor.side==="left"){
      const player=syncPlayerProfile();if(player?.hasRct&&!profile.hasRct)profile=player;
      else if(player?.hasRct&&profile.hasRct&&R.MASTERY[player.mastery]>R.MASTERY[profile.mastery])profile=player;
    }
    return profile;
  }
  function resourceView(actor={}){
    return {maxHp:Number(actor.maxHp||actor.hpMax||0),hp:Number(actor.hp??actor.currentHp??0),maxCe:Number(actor.maxCe||actor.ceMax||0),ce:Number(actor.ce??actor.currentCe??0)};
  }
  function isHeal(action={}){return Boolean(action.rctHealing)||/reverse_cursed_technique_heal|反转术式疗伤|反转治疗/i.test([action.id,action.actionId,action.label,action.name].join(" "))}
  function isOutput(action={}){return Boolean(action.rctOutput||action.rctOutputExternal||action.effects?.rctOutputExternal)||/reverse_output|rct_output|反转术式外放|反转输出|正能量外放/i.test([action.id,action.actionId,action.label,action.name].join(" "))}
  function tuneAction(action,actor){
    if(!action||(!isHeal(action)&&!isOutput(action)))return action;
    const profile=actorProfile(actor);if(!profile.hasRct)return action;
    const next={...action,effect:{...(action.effect||{})},effects:{...(action.effects||{})},cost:{...(action.cost||{})},v8RctMastery:profile.mastery};
    if(isHeal(next)){
      const plan=R.healPlan(profile,resourceView(actor));
      next.apCost=1;next.ceCost=plan.ceCost;next.cost.ce=plan.ceCost;next.healing=plan.healing;next.baseHealing=plan.healing;next.block=Math.max(Number(next.block||0),plan.block||0);next.stabilityRestore=Math.max(Number(next.stabilityRestore||0),plan.stabilityRestore||0);
      next.effect={...next.effect,healing:plan.healing,block:next.block,stabilityRestore:next.stabilityRestore};
      next.effects={...next.effects,healing:plan.healing,block:next.block,stabilityRestore:next.stabilityRestore};
      const hpRatio=plan.hpRatio??1;next.weight=Math.max(Number(next.weight||0),hpRatio<.25?14:hpRatio<.4?11:hpRatio<.65?7:4.5);
      next.effectSummary=`V8 RCT ${profile.masteryLabel}：消耗约 ${plan.ceCost} CE，恢复约 ${plan.healing} 体势。`;
    }
    if(isOutput(next)&&profile.externalOutput){
      const scale=R.externalHealScale(profile);
      next.rctOutputHealScale=scale;next.effects.rctOutputHealScale=scale;next.effect.rctOutputHealScale=scale;
    }
    return next;
  }
  function makeHeal(actor){
    const p=actorProfile(actor),plan=R.healPlan(p,resourceView(actor));if(!p.hasRct||plan.missingHp<=0)return null;
    return tuneAction({id:"reverse_cursed_technique_heal",actionId:"reverse_cursed_technique_heal",label:"反转术式疗伤",name:"反转术式疗伤",description:"把咒力反转为正向能量修复自身伤势。",cardType:"healing",type:"rct_healing",rctHealing:true,normalHandOnly:true,tags:["反转术式","rct","正能量","疗伤","治疗","支援","resource"],requiresCe:true,requirements:{requiresMissingHp:true},apCost:1,cost:{ce:20},ceCost:20,healing:20,baseHealing:20,block:5,stabilityRestore:10,durationRounds:1,damageType:"none",scalingProfile:"healing",accuracyProfile:"none",evasionAllowed:false,effect:{incomingHpScale:.9,stabilityDelta:.024},effects:{incomingHpScale:.9,stabilityDelta:.024},risk:"medium",rarity:"uncommon",weight:6.1,logTemplate:"你使用反转术式疗伤，把咒力转为正向能量修复伤势。",v8Injected:true},actor);
  }
  function installPool(){
    const m=globalThis.JJKDuelActions,f=m?.buildDuelActionPool;if(typeof f!=="function")return false;if(f.__v8Rct)return true;
    const w=function(actor,opponent,duelState){
      const out=f.apply(this,arguments),list=Array.isArray(out)?out.map(a=>tuneAction(a,actor)):out;if(!Array.isArray(list))return list;
      const p=actorProfile(actor),view=resourceView(actor);if(p.hasRct&&view.maxHp>0&&view.hp<view.maxHp&&!list.some(isHeal)){const h=makeHeal(actor);if(h)list.push(h)}return list;
    };Object.defineProperty(w,"__v8Rct",{value:true});m.buildDuelActionPool=w;return true;
  }
  function installAvailability(){
    const m=globalThis.JJKDuelActions,f=m?.getDuelActionAvailability;if(typeof f!=="function")return false;if(f.__v8Rct)return true;
    const w=function(action,actor,opponent,duelState){const tuned=tuneAction(action,actor),out=f.call(this,tuned,actor,opponent,duelState);if(isHeal(tuned)&&actorProfile(actor).hasRct){const plan=R.healPlan(actorProfile(actor),resourceView(actor));if(plan.reason==="full_hp")return{available:false,reason:"体势已满",costCe:plan.ceCost};if(!plan.available)return{available:false,reason:"咒力不足以发动反转术式疗伤",costCe:plan.ceCost};if(out?.available===false&&/反转|rct|资格|requires/i.test(String(out.reason||"")))return{available:true,reason:"",costCe:plan.ceCost}}return out};
    Object.defineProperty(w,"__v8Rct",{value:true});m.getDuelActionAvailability=w;return true;
  }
  function battleOf(duelState){return duelState?.left||duelState?.right?duelState:(typeof state!=="undefined"?state.duelBattle:null)}
  function installCpu(){
    const m=globalThis.JJKDuelActions,f=m?.getDuelCpuAction;if(typeof f!=="function")return false;if(f.__v8Rct)return true;
    const w=function(actor,opponent,duelState){
      const old=f.apply(this,arguments),p=actorProfile(actor),view=resourceView(actor),battle=battleOf(duelState);if(!p.hasRct||!R.shouldCpuHeal(p,view,resourceView(opponent)))return old;
      const round=Number(battle?.round||0),last=Number(battle?.v8RctLastHealRound?.[actor?.side]??-99);if(round-last<2&&view.hp/Math.max(1,view.maxHp)>.2)return old;
      const pool=globalThis.JJKDuelActions?.buildDuelActionPool?.(actor,opponent,duelState)||[],heal=pool.find(isHeal);if(!heal)return old;
      const av=globalThis.JJKDuelActions?.getDuelActionAvailability?.(heal,actor,opponent,duelState);return av?.available===false?old:heal;
    };Object.defineProperty(w,"__v8Rct",{value:true});m.getDuelCpuAction=w;return true;
  }
  function installApply(){
    const m=globalThis.JJKDuelActions,f=m?.applyDuelActionEffect;if(typeof f!=="function")return false;if(f.__v8Rct)return true;
    const w=function(action,actor,opponent,duelState){const tuned=tuneAction(action,actor),out=f.call(this,tuned,actor,opponent,duelState);if(isHeal(tuned)){const b=battleOf(duelState);if(b){b.v8RctLastHealRound=b.v8RctLastHealRound||{};b.v8RctLastHealRound[actor?.side||"left"]=Number(b.round||0);b.v8RctLog=b.v8RctLog||[];b.v8RctLog.unshift({round:Number(b.round||0)+1,side:actor?.side||"",mastery:tuned.v8RctMastery||"basic",healing:Number(tuned.healing||0),ceCost:Number(tuned.ceCost||0)});if(b.v8RctLog.length>30)b.v8RctLog.length=30}}return out};
    Object.defineProperty(w,"__v8Rct",{value:true});m.applyDuelActionEffect=w;return true;
  }
  function lastBattleResource(){
    if(typeof state==="undefined")return{};const b=state.duelBattle||{};const a=b.left||b.player||b.leftResource||b.resources?.left||{};return resourceView(a);
  }
  function parseRankDrop(eventText){
    const re=new RegExp(`(咒力总量|咒力操纵|咒力效率|体术|体质|天赋|术式威力)[^\\n]{0,28}?${RANK_RE}\\s*(?:→|->|＞|>)\\s*${RANK_RE}`,'i'),m=String(eventText||"").match(re);if(!m)return null;return{stat:STAT_MAP[m[1]],label:m[1],before:m[2].toUpperCase(),after:m[3].toUpperCase()};
  }
  function notify(title,detail){document.getElementById("jjkV8RctFeedback")?.remove();const d=document.createElement("div");d.id="jjkV8RctFeedback";d.innerHTML=`<b>${title}</b><span>${detail}</span>`;d.style.cssText="position:fixed;z-index:2147483640;left:50%;bottom:18px;transform:translateX(-50%);width:min(620px,calc(100% - 24px));background:#17231fee;color:#fff;border:1px solid #8ce0ba66;border-radius:14px;padding:12px 14px;box-shadow:0 16px 50px #0008";const b=d.querySelector('b'),s=d.querySelector('span');if(b)b.style.display='block';if(s)s.style.cssText='display:block;opacity:.8;margin-top:4px';document.body.appendChild(d);setTimeout(()=>d.remove(),6500)}
  function processTreatment(eventText){
    const root=stateRoot(),profile=syncPlayerProfile();if(!root||!profile?.hasRct||!/伤势|重伤|永久伤害|断肢|断臂|断腿|灵魂|咒力漏损|器官|骨折|贯穿/.test(eventText))return;
    root.rct=root.rct||{history:[],treatments:[],treatedEvents:[]};const key=String(eventText).slice(0,500);if(root.rct.treatedEvents.includes(key))return;
    const plan=R.treatmentPlan(profile,eventText,lastBattleResource());root.rct.treatedEvents.push(key);if(root.rct.treatedEvents.length>30)root.rct.treatedEvents.shift();
    const drop=parseRankDrop(eventText),entry={at:new Date().toISOString(),injury:plan.injury,repair:plan.repair,reason:plan.reason,ceCost:plan.ceCost||0,rankDrop:drop};root.rct.treatments.push(entry);if(root.rct.treatments.length>40)root.rct.treatments.shift();
    if(plan.available&&plan.repair==="full"&&drop?.stat){state.flags.battleBridgePersistentRanks=state.flags.battleBridgePersistentRanks||{};state.flags.battleBridgePersistentRanks[drop.stat]=drop.before;notify("反转术式介入伤势结算",`${plan.injury.label}被${profile.masteryLabel}反转术式及时修复，${drop.label}永久下降被阻止。`) }
    else if(plan.available&&plan.repair==="partial")notify("反转术式稳定伤势",`${plan.injury.label}得到处理，但没有无条件抹去永久后果。${plan.injury.kind==="soul"?"灵魂损伤仍然残留。":""}`);
  }
  function installLifeHook(){
    const wheel=globalThis.JJKPersonalWheel,f=wheel?.afterCommit;if(typeof f!=="function")return false;if(f.__v8Rct)return true;
    const w=function(payload){const out=f.apply(this,arguments);try{const event=`${payload?.task?.title||""} ${payload?.result?.text||payload?.result?.option?.text||payload?.result?.result||""}`;syncPlayerProfile();processTreatment(event);setTimeout(enrichDestinyPanel,0)}catch(e){console.warn("[JJK V8.1 RCT] life hook",e)}return out};Object.defineProperty(w,"__v8Rct",{value:true});wheel.afterCommit=w;return true;
  }
  function enrichDestinyPanel(){
    const card=document.querySelector("#jjkV8Panel .v8-card");if(!card||card.querySelector("[data-v8-rct]"))return;const p=syncPlayerProfile(),s=document.createElement("section");s.dataset.v8Rct="1";const treatment=stateRoot()?.rct?.treatments?.at(-1);s.innerHTML=`<h3>反转术式</h3><p>${p?.hasRct?`<b>${p.masteryLabel}</b>｜自愈：可用｜战斗再生：${p.combatRegen?"可用":"未解锁"}｜外放：${p.externalOutput?"可用":"未解锁"}<br>器官修复：${p.organRepair?"可":"否"}｜断肢再生：${p.limbRepair?"可":"否"}｜术式熔断修复：${p.burnoutRepair?"可":"否"}`:"未掌握"}${treatment?`<br><span style="opacity:.72">最近治疗：${treatment.injury?.label||"伤势"}｜${treatment.repair==="full"?"完全修复":treatment.repair==="partial"?"部分稳定":"无法修复"}</span>`:""}</p>`;card.appendChild(s)
  }
  document.addEventListener("click",e=>{if(e.target?.id==="jjkV8DestinyBtn"||e.target?.closest?.("#jjkV8DestinyBtn"))setTimeout(enrichDestinyPanel,0)},true);
  function install(){syncPlayerProfile();const ok=[installPool(),installAvailability(),installCpu(),installApply(),installLifeHook()];globalThis.JJK_V8_RCT_VERSION=VERSION;return ok.every(Boolean)}
  let tries=0;function boot(){try{if(install()){console.info(`[JJK V8.1 RCT] ${VERSION} loaded`);return}}catch(e){console.warn("[JJK V8.1 RCT] boot",e)}if(tries++<30)setTimeout(boot,180)}boot();
  globalThis.JJKV8RCT=Object.freeze({version:VERSION,getPlayerProfile:()=>clone(syncPlayerProfile()),profileForActor:a=>clone(actorProfile(a)),healPlan:a=>R.healPlan(actorProfile(a),resourceView(a)),treatmentPlan:(text,res)=>R.treatmentPlan(syncPlayerProfile()||{},text,res||lastBattleResource()),enrichDestinyPanel});
})();