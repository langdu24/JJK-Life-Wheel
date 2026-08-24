(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.JJKV7Model = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "7.1.0";
  const RANK = Object.freeze({"E-":0,E:1,D:2,C:3,B:4,A:5,S:6,SS:7,SSS:8,"EX-":9,EX:10});
  const num=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  function rankValue(value,fallback=NaN){if(Number.isFinite(Number(value))&&String(value).trim()!=="")return Math.max(0,Number(value));const m=String(value||"").trim().toUpperCase().match(/^(EX-|EX|SSS|SS|S|A|B|C|D|E-|E)/);return m?RANK[m[1]]:fallback}
  function transcendStepValue(step){const n=Math.max(1,Math.trunc(num(step,1)));return .24/(1+.55*(n-1))}
  function transcendTotal(count){const n=Math.max(0,Math.trunc(num(count,0)));let total=0;for(let i=1;i<=n;i+=1)total+=transcendStepValue(i);return total}
  function statValue(value,transcendCount=0,fallback=4){return rankValue(value,fallback)+transcendTotal(transcendCount)}
  function efficiencyCostMultiplier(efficiency){return Math.exp(-.105*(num(efficiency,4)-4))}
  function bodyResistance(body){const b=Math.max(0,num(body,4));return .015+.39*(1-Math.exp(-b/11.5))}
  function derive(input={}){const tr=input.transcendence||{};const cursedEnergy=statValue(input.cursedEnergy,tr.cursedEnergy),control=statValue(input.control,tr.control),efficiency=statValue(input.efficiency,tr.efficiency),martial=statValue(input.martial,tr.martial),body=statValue(input.body,tr.body),talent=statValue(input.talent,tr.talent),techniquePower=statValue(input.techniquePower,tr.techniquePower,rankValue(input.techniquePower,4)),zeroCe=Boolean(input.zeroCe);const bodyOver=Math.max(0,body-6),martialOver=Math.max(0,martial-6);const maxHp=Math.round(Math.max(60,140+24*body+8*martial+4*bodyOver*bodyOver+1.75*martialOver*martialOver));const ceOver=Math.max(0,cursedEnergy-6),ceBase=28+26*cursedEnergy+8*ceOver*ceOver,techniqueCapacityBonus=Math.min(ceBase*.12,techniquePower*3),maxCe=zeroCe?0:Math.round(Math.max(12,ceBase+techniqueCapacityBonus));const physicalOffense=.68*martial+.32*body,techniqueOffense=.46*techniquePower+.24*cursedEnergy+.20*control+.10*talent,defense=.74*body+.26*martial,utility=.42*control+.32*efficiency+.26*talent,major=Math.max(physicalOffense,techniqueOffense),minor=Math.min(physicalOffense,techniqueOffense),combatRating=.56*major+.14*minor+.16*defense+.14*utility;return Object.freeze({cursedEnergy,control,efficiency,martial,body,talent,techniquePower,zeroCe,maxHp,maxCe,ceCostMultiplier:efficiencyCostMultiplier(efficiency),bodyResistance:bodyResistance(body),physicalOffense,techniqueOffense,defense,utility,combatRating})}
  function projectionRatio(tier){return tier==="ultimate"?.90:tier==="high"?.80:.72}
  function softBurstDamage(rawDamage,maxHp,tier,attackerRating,defenderRating){const raw=Math.max(0,num(rawDamage,0)),hp=Math.max(1,num(maxHp,1));if(raw<=0)return 0;const ratio=Math.max(.2,num(attackerRating,4)/Math.max(.5,num(defenderRating,4))),gap=Math.max(0,ratio-1),gapEase=1-Math.exp(-gap),baseThreshold=tier==="ultimate"?.62:tier==="high"?.46:.34,baseRetention=tier==="ultimate"?.86:tier==="high"?.56:.35,thresholdFraction=baseThreshold+(tier==="ultimate"?.20:.17)*gapEase,retention=baseRetention+(1-baseRetention)*.62*gapEase,threshold=hp*thresholdFraction;return raw<=threshold?raw:threshold+(raw-threshold)*retention}
  function tierFromText(text,risk=""){const t=String(text||"").toLowerCase();if(/茈|虚式|hollow.?purple|极之番|極ノ番|maximum|最大出力|最大输出|终结|終結|finisher|ultimate|世界斩|world.?slash|fuga|灶/.test(t))return"ultimate";if(/high|critical|burst|爆发|大功率|高出力|高输出|领域|domain/.test(t)||/high|critical/.test(String(risk||"").toLowerCase()))return"high";return"normal"}
  return Object.freeze({VERSION,RANK,rankValue,transcendStepValue,transcendTotal,statValue,efficiencyCostMultiplier,bodyResistance,derive,projectionRatio,softBurstDamage,tierFromText});
});