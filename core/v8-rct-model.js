(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.JJKV8RCTModel=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const VERSION="8.1.0";
  const RANK=Object.freeze({"E-":0,E:1,D:2,C:3,B:4,A:5,S:6,SS:7,SSS:8,"EX-":9,EX:10});
  const MASTERY=Object.freeze({none:0,basic:1,skilled:2,advanced:3,top:4});
  const LABEL=Object.freeze({none:"未掌握",basic:"初步",skilled:"熟练",advanced:"高级",top:"顶尖"});
  const HEAL=Object.freeze({
    basic:{fraction:.14,ceCost:20,aiHp:.28,block:5,stability:10},
    skilled:{fraction:.20,ceCost:18,aiHp:.38,block:7,stability:14},
    advanced:{fraction:.28,ceCost:16,aiHp:.48,block:9,stability:18},
    top:{fraction:.36,ceCost:14,aiHp:.58,block:11,stability:22}
  });

  const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,Number(v)||0));
  function rankValue(v,fallback=4){
    if(Number.isFinite(Number(v))&&String(v).trim()!=="")return Math.max(0,Number(v));
    const m=String(v||"").trim().toUpperCase().match(/^(EX-|EX|SSS|SS|S|A|B|C|D|E-|E)/);
    return m?RANK[m[1]]:fallback;
  }
  function textOf(input={}){
    return [input.text,input.name,input.traits,input.advancedTechniques,input.specialHandTags,input.tags]
      .flat(Infinity).filter(Boolean).join(" ");
  }
  function deriveProfile(input={}){
    const text=textOf(input);
    const positive=/反转术式|反転術式|reverse[_\s-]?cursed[_\s-]?technique|\brct\b|rct_user|反转恢复|反转治疗|疗伤/i.test(text);
    const negative=/无反转术式|未掌握反转术式|不会反转术式|无法使用反转术式/i.test(text);
    const hasRct=input.hasRct===true||(positive&&!negative);
    if(!hasRct)return Object.freeze({version:VERSION,hasRct:false,mastery:"none",masteryLabel:LABEL.none,selfHeal:false,externalOutput:false,combatRegen:false,organRepair:false,limbRepair:false,brainRepair:false,burnoutRepair:false,soulRepair:false,control:rankValue(input.control),efficiency:rankValue(input.efficiency),talent:rankValue(input.talent)});
    const control=rankValue(input.control),efficiency=rankValue(input.efficiency),talent=rankValue(input.talent);
    const technique=rankValue(input.techniquePower,4);
    const skill=control*.42+efficiency*.38+talent*.12+technique*.08;
    let mastery="basic";
    if(/顶尖反转|顶级反转|极致反转|超高速再生|反转术式.*顶尖|反转术式.*顶级/i.test(text)||skill>=9.0)mastery="top";
    else if(/高级反转|高阶反转|断肢再生|肢体再生|反转术式.*高级/i.test(text)||skill>=7.0)mastery="advanced";
    else if(/熟练反转|精通反转|反转术式.*熟练|反转术式.*精通/i.test(text)||skill>=5.6)mastery="skilled";
    const externalOutput=Boolean(input.externalOutput)||/反转术式外放|反转输出|正能量外放|输出正能量|治疗他人|reverse[_\s-]?output|rct[_\s-]?output|healer/i.test(text);
    const burnoutExplicit=Boolean(input.burnoutRepair)||/术式熔断.*修复|修复.*术式熔断|大脑.*修复.*术式|烧毁.*修复.*术式|burnout[_\s-]?repair/i.test(text);
    const soulExplicit=Boolean(input.soulRepair)||/灵魂.*反转|反转.*灵魂|灵魂修复|soul[_\s-]?repair/i.test(text);
    const m=MASTERY[mastery];
    return Object.freeze({
      version:VERSION,hasRct:true,mastery,masteryLabel:LABEL[mastery],selfHeal:true,externalOutput,
      combatRegen:m>=MASTERY.skilled,organRepair:m>=MASTERY.skilled,limbRepair:m>=MASTERY.advanced,
      brainRepair:m>=MASTERY.top,burnoutRepair:m>=MASTERY.top&&burnoutExplicit,soulRepair:m>=MASTERY.top&&soulExplicit,
      control,efficiency,talent,techniquePower:technique,skillScore:skill
    });
  }
  function healPlan(profile={},resource={}){
    if(!profile.hasRct)return Object.freeze({available:false,reason:"no_rct",healing:0,ceCost:0,apCost:0});
    const cfg=HEAL[profile.mastery]||HEAL.basic;
    const maxHp=Math.max(1,Number(resource.maxHp)||1),hp=clamp(resource.hp,0,maxHp),missing=Math.max(0,maxHp-hp);
    const maxCe=Math.max(0,Number(resource.maxCe)||0),ce=Math.max(0,Number(resource.ce??resource.currentCe??maxCe)||0);
    if(missing<=0)return Object.freeze({available:false,reason:"full_hp",healing:0,ceCost:cfg.ceCost,apCost:1});
    const controlBonus=1+Math.max(0,(Number(profile.control)||4)-4)*.018;
    const efficiencyBonus=1+Math.max(0,(Number(profile.efficiency)||4)-4)*.012;
    const healing=Math.max(1,Math.round(Math.min(missing,maxHp*cfg.fraction*controlBonus*efficiencyBonus)));
    const ceCost=Math.max(8,Math.round(cfg.ceCost*Math.exp(-.025*((Number(profile.efficiency)||4)-4))));
    return Object.freeze({available:ce>=ceCost,reason:ce>=ceCost?"ok":"insufficient_ce",healing,ceCost,apCost:1,block:cfg.block,stabilityRestore:cfg.stability,missingHp:missing,hpRatio:hp/maxHp,ceRatio:maxCe>0?ce/maxCe:0});
  }
  function classifyInjury(value=""){
    const t=String(value||"");
    if(/灵魂|无为转变|魂魄/.test(t))return Object.freeze({kind:"soul",severity:5,label:"灵魂损伤"});
    if(/术式熔断|术式烧断|烧毁术式/.test(t))return Object.freeze({kind:"burnout",severity:4,label:"术式熔断"});
    if(/大脑|脑部|脑损伤|颅脑/.test(t))return Object.freeze({kind:"brain",severity:5,label:"脑部损伤"});
    if(/断肢|断臂|断腿|肢体|失去.*(?:手|臂|腿|脚)|截肢/.test(t))return Object.freeze({kind:"limb",severity:4,label:"肢体缺损"});
    if(/器官|内脏|贯穿|肺|肝|肾|心脏|腹部|胸腔/.test(t))return Object.freeze({kind:"organ",severity:3,label:"器官损伤"});
    if(/咒力漏损|经脉|回路|效率永久|术式回路/.test(t))return Object.freeze({kind:"systemic",severity:3,label:"咒力系统损伤"});
    if(/重伤|永久伤害|骨折|撕裂|失血|创伤/.test(t))return Object.freeze({kind:"heavy",severity:2,label:"重度肉体伤势"});
    return Object.freeze({kind:"light",severity:1,label:"一般伤势"});
  }
  function treatmentPlan(profile={},injuryInput="",resource={}){
    const injury=typeof injuryInput==="object"&&injuryInput.kind?injuryInput:classifyInjury(injuryInput);
    if(!profile.hasRct)return Object.freeze({available:false,repair:"none",reason:"no_rct",injury});
    const level=MASTERY[profile.mastery]||0;
    let repair="none",reason="insufficient_mastery";
    if(injury.kind==="soul"){
      if(profile.soulRepair){repair="partial";reason="soul_aware_rct"}else reason="soul_damage_resists_normal_rct";
    }else if(injury.kind==="burnout"){
      if(profile.burnoutRepair){repair="partial";reason="elite_burnout_repair"}else reason="burnout_repair_not_unlocked";
    }else if(injury.kind==="brain"){
      if(profile.brainRepair){repair="partial";reason="top_rct_brain_repair"}else reason="brain_damage_too_severe";
    }else if(injury.kind==="limb"){
      if(profile.limbRepair){repair="full";reason:"limb_regeneration";reason="limb_regeneration"}else reason="limb_regeneration_not_unlocked";
    }else if(injury.kind==="organ"){
      if(profile.organRepair){repair=level>=MASTERY.advanced?"full":"partial";reason="organ_repair"}
    }else if(injury.kind==="systemic"){
      if(level>=MASTERY.advanced){repair="partial";reason="systemic_rct_stabilization"}
    }else if(injury.kind==="heavy"){
      if(level>=MASTERY.skilled){repair=level>=MASTERY.advanced?"full":"partial";reason="heavy_injury_repair"}
      else {repair="partial";reason="basic_rct_stabilization"}
    }else {repair="full";reason="routine_rct_repair"}
    const maxCe=Math.max(0,Number(resource.maxCe)||0),ce=Math.max(0,Number(resource.ce??resource.currentCe??maxCe)||0);
    const baseCost={light:.08,heavy:.16,organ:.22,systemic:.24,limb:.32,brain:.38,burnout:.28,soul:.42}[injury.kind]||.16;
    const efficiencyFactor=Math.exp(-.045*((Number(profile.efficiency)||4)-4));
    const ceCost=maxCe>0?Math.max(8,Math.round(maxCe*baseCost*efficiencyFactor)):0;
    if(repair!=="none"&&maxCe>0&&ce<ceCost)return Object.freeze({available:false,repair:"none",reason:"insufficient_ce",injury,ceCost});
    return Object.freeze({available:repair!=="none",repair,reason,injury,ceCost});
  }
  function shouldCpuHeal(profile={},resource={},opponent={}){
    const plan=healPlan(profile,resource);if(!plan.available)return false;
    const cfg=HEAL[profile.mastery]||HEAL.basic;
    const hpRatio=plan.hpRatio;
    const oppMax=Math.max(1,Number(opponent.maxHp)||1),oppHp=clamp(opponent.hp??oppMax,0,oppMax),oppRatio=oppHp/oppMax;
    if(oppRatio<.16&&hpRatio>.16)return false;
    if(hpRatio<=.20)return true;
    return hpRatio<cfg.aiHp&&plan.missingHp>=plan.healing*.55;
  }
  function externalHealScale(profile={}){
    if(!profile.externalOutput)return 0;
    return ({basic:.65,skilled:.8,advanced:1,top:1.18})[profile.mastery]||.65;
  }
  return Object.freeze({VERSION,RANK,MASTERY,LABEL,rankValue,deriveProfile,healPlan,classifyInjury,treatmentPlan,shouldCpuHeal,externalHealScale});
});