(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.JJKV8State=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const VERSION="8.0.0";
  const RANKS=Object.freeze(["E-","E","D","C","B","A","S","SS","SSS","EX-","EX"]);
  const STAT_KEYS=Object.freeze(["cursedEnergy","control","efficiency","martial","body","talent","techniquePower"]);
  const WORLD_FLAG_KEYS=Object.freeze([
    "junpei","mahito","gojoSeal","kenjaku","sukunaVessel","megumi",
    "nobara","todo","yuta","cullingGame","tengen","sukunaFinal"
  ]);
  const OBSESSION_TEMPLATES=Object.freeze([
    {id:"strongest",label:"成为最强",tags:["最强","战斗","好战","锻炼","挑战"]},
    {id:"kill_sukuna",label:"杀死宿傩",tags:["宿傩","复仇","守护","高专"]},
    {id:"protect_someone",label:"守护重要之人",tags:["仁慈","守护","正直","家人","朋友"]},
    {id:"revenge",label:"复仇",tags:["仇","死亡","失去","心结"]},
    {id:"understand_ce",label:"理解咒力本质",tags:["研究","求道","术式","经学","学问"]},
    {id:"create_domain",label:"创造自己的领域",tags:["领域","术式","天赋","创造"]},
    {id:"build_org",label:"建立自己的组织",tags:["组织","家主","高层","领导","资产"]},
    {id:"expose_jujutsu",label:"让普通人知道咒术存在",tags:["普通人","社会","记者","公开"]},
    {id:"freedom",label:"获得自由",tags:["自由","诅咒师","功利","利己","御三家"]},
    {id:"survive",label:"活到最后",tags:["普通人","保命","谨慎","体弱","生存"]},
    {id:"challenge_all",label:"挑战所有强敌",tags:["战斗，爽","好战","猛攻","挑战"]},
    {id:"legacy",label:"留下传承",tags:["老师","家主","传承","流派","后代"]}
  ]);

  const clone=v=>{try{return structuredClone(v)}catch{try{return JSON.parse(JSON.stringify(v))}catch{return v&&typeof v==="object"?{...v}:v}}};
  const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,Number(v)||0));
  const now=()=>new Date().toISOString();
  function rankIndex(value){
    if(Number.isFinite(Number(value))&&String(value).trim()!=="")return Number(value);
    const m=String(value||"").trim().toUpperCase().match(/^(EX-|EX|SSS|SS|S|A|B|C|D|E-|E)(?:\+(\d+))?/);
    if(!m)return NaN;
    const base=RANKS.indexOf(m[1]);
    return base<0?NaN:base+(m[2]?Number(m[2])*.18:0);
  }
  function formatRank(value){
    const n=Math.max(0,Number(value)||0);
    if(n<=10){const i=Math.round(n);return RANKS[Math.max(0,Math.min(10,i))]}
    const extra=Math.max(1,Math.round((n-10)/.18));
    return `EX+${extra}`;
  }
  function emptyWorldFlags(){return Object.fromEntries(WORLD_FLAG_KEYS.map(k=>[k,"unknown"]))}
  function createCharacter(base={}){
    const clean={};
    for(const key of STAT_KEYS)if(base[key]!=null)clean[key]=String(base[key]);
    return {base:clean,permanent:[],temporary:[],current:{...clean},forcedZeroCe:false,domainLevel:"unknown",history:[]};
  }
  function createState(seed={}){
    const s={
      schema:"jjk-v8-destiny-state",
      version:VERSION,
      createdAt:seed.createdAt||now(),
      character:createCharacter(seed.base||{}),
      world:{flags:emptyWorldFlags(),history:[]},
      obsession:null,
      choices:[],
      local:{},
      anomalies:[],
      consistency:{issues:[],lastCheckedAt:null}
    };
    if(seed.world&&typeof seed.world==="object")for(const key of WORLD_FLAG_KEYS)if(seed.world[key]!=null)s.world.flags[key]=seed.world[key];
    return s;
  }
  function computeCurrent(character){
    const out={};
    const permanent=Array.isArray(character?.permanent)?character.permanent:[];
    const temporary=Array.isArray(character?.temporary)?character.temporary:[];
    for(const key of STAT_KEYS){
      const base=rankIndex(character?.base?.[key]);
      if(!Number.isFinite(base))continue;
      let total=base;
      for(const m of permanent)if(m?.stat===key)total+=Number(m.delta||0);
      for(const m of temporary)if(m?.stat===key&&Number(m.remainingBattles??1)>0)total+=Number(m.delta||0);
      out[key]=formatRank(Math.max(0,total));
    }
    if(character?.forcedZeroCe)out.cursedEnergy="0";
    return out;
  }
  function recompute(state){const s=clone(state);s.character.current=computeCurrent(s.character);return s}
  function upsertModifier(list,modifier){
    const arr=Array.isArray(list)?list.slice():[];
    const id=String(modifier.id||`${modifier.kind||"modifier"}:${modifier.stat}:${modifier.source||"unknown"}`);
    const next={id,stat:modifier.stat,delta:Number(modifier.delta||0),source:String(modifier.source||"未知来源"),kind:modifier.kind||"permanent",createdAt:modifier.createdAt||now()};
    if(modifier.remainingBattles!=null)next.remainingBattles=Math.max(0,Math.trunc(Number(modifier.remainingBattles)||0));
    const i=arr.findIndex(x=>x?.id===id);if(i>=0)arr[i]=next;else arr.push(next);return arr;
  }
  function applyPermanent(state,modifier){const s=clone(state);s.character.permanent=upsertModifier(s.character.permanent,{...modifier,kind:"permanent"});s.character.history.push({at:now(),type:"permanent",modifier:clone(modifier)});return recompute(s)}
  function applyTemporary(state,modifier){const s=clone(state);s.character.temporary=upsertModifier(s.character.temporary,{...modifier,kind:"temporary",remainingBattles:modifier.remainingBattles??1});s.character.history.push({at:now(),type:"temporary",modifier:clone(modifier)});return recompute(s)}
  function advanceBattle(state){const s=clone(state);s.character.temporary=(s.character.temporary||[]).map(m=>({...m,remainingBattles:Math.max(0,Number(m.remainingBattles??1)-1)})).filter(m=>m.remainingBattles>0);return recompute(s)}
  function setWorldFlag(state,key,value,source="system"){
    if(!WORLD_FLAG_KEYS.includes(key))throw new Error(`unknown core world flag: ${key}`);
    const s=clone(state),before=s.world.flags[key];
    if(before===value)return s;
    s.world.flags[key]=value;s.world.history.push({at:now(),key,before,after:value,source});return s;
  }
  function addAnomaly(state,id,label,detail=""){
    const s=clone(state);if((s.anomalies||[]).some(x=>x.id===id))return s;
    s.anomalies.push({id,label,detail,createdAt:now(),status:"unresolved"});return s;
  }
  function obsessionCandidates(contextText=""){
    const text=String(contextText||"");
    return OBSESSION_TEMPLATES.map(t=>({template:t,score:t.tags.reduce((n,tag)=>n+(text.includes(tag)?2:0),0)})).sort((a,b)=>b.score-a.score);
  }
  function chooseObsession(contextText="",roll=.5){
    const ranked=obsessionCandidates(contextText),best=ranked[0]?.score||0,pool=best>0?ranked.filter(x=>x.score===best).slice(0,4):ranked;
    const i=Math.min(pool.length-1,Math.max(0,Math.floor(clamp(roll,0,.999999)*pool.length))),t=pool[i]?.template||OBSESSION_TEMPLATES[0];
    return {id:t.id,label:t.label,progress:0,status:"active",points:0,maxPoints:5,milestones:{33:false,66:false,100:false},history:[{at:now(),type:"created",label:t.label}]};
  }
  function ensureObsession(state,contextText="",roll=.5){const s=clone(state);if(!s.obsession)s.obsession=chooseObsession(contextText,roll);return s}
  function progressObsession(state,delta,source="event"){
    const s=clone(state);if(!s.obsession)return s;
    const before=Number(s.obsession.progress||0),after=clamp(before+Number(delta||0),0,100);s.obsession.progress=after;
    for(const milestone of[33,66,100])if(after>=milestone&&!s.obsession.milestones[milestone]){s.obsession.milestones[milestone]=true;s.obsession.points=Math.min(s.obsession.maxPoints,Number(s.obsession.points||0)+1);s.obsession.history.push({at:now(),type:"milestone",milestone,source})}
    s.obsession.history.push({at:now(),type:"progress",before,after,source});return s;
  }
  function spendObsessionPoint(state,cost=1,reason="opportunity"){
    const s=clone(state);if(!s.obsession)return{state:s,ok:false};const c=Math.max(1,Math.trunc(Number(cost)||1));if(Number(s.obsession.points||0)<c)return{state:s,ok:false};s.obsession.points-=c;s.obsession.history.push({at:now(),type:"spend",cost:c,reason});return{state:s,ok:true};
  }
  function transformObsession(state,nextId,nextLabel,reason="major_event"){
    const s=clone(state);if(!s.obsession)return s;s.obsession.history.push({at:now(),type:"transform",from:s.obsession.label,to:nextLabel,reason});s.obsession.id=nextId;s.obsession.label=nextLabel;s.obsession.status="transformed";s.obsession.progress=Math.min(50,Number(s.obsession.progress||0));return s;
  }
  function recordChoice(state,choice){
    let s=clone(state);const entry={id:String(choice.id),title:String(choice.title||choice.id),optionId:String(choice.optionId||""),optionText:String(choice.optionText||""),at:choice.at||now(),effects:clone(choice.effects||{})};s.choices.push(entry);
    if(choice.effects?.world)for(const[key,value]of Object.entries(choice.effects.world))if(WORLD_FLAG_KEYS.includes(key))s=setWorldFlag(s,key,value,`choice:${choice.id}`);
    if(Number(choice.effects?.obsessionProgress||0))s=progressObsession(s,Number(choice.effects.obsessionProgress),`choice:${choice.id}`);
    return s;
  }
  function validateConsistency(snapshot={}){
    const hard=[],soft=[];
    if(snapshot.zeroCe===true&&Number(snapshot.cursedEnergyValue||0)>0)hard.push({id:"zero-ce-conflict",message:"肉体强化型完全体天与咒缚与正常咒力冲突",repair:{forcedZeroCe:true}});
    if(Number.isFinite(Number(snapshot.advancedTechniqueCount))&&Array.isArray(snapshot.advancedTechniques)&&Number(snapshot.advancedTechniqueCount)!==snapshot.advancedTechniques.length)hard.push({id:"advanced-technique-count",message:"高级技巧数量与实际技巧列表不一致",repair:{advancedTechniqueCount:snapshot.advancedTechniques.length}});
    if(snapshot.hasInnateTechnique===false&&Array.isArray(snapshot.innateTechniques)&&snapshot.innateTechniques.length)hard.push({id:"innate-technique-conflict",message:"标记为无生得术式，但存在生得术式列表",repair:{hasInnateTechnique:true}});
    if(snapshot.domainLevel==="incomplete"&&snapshot.battleDomainLevel==="complete")hard.push({id:"domain-completion-conflict",message:"未完成领域被战斗系统按完整领域使用",repair:{battleDomainLevel:"incomplete"}});
    const location=String(snapshot.location||""),traits=String(snapshot.traits||"");
    if(/欧洲|美洲|非洲|海外/.test(location)&&/六眼/.test(traits))soft.push({id:"six-eyes-origin",label:"世界观异常：六眼来源不明",detail:`地点=${location}`});
    return{hard,soft,checkedAt:now()};
  }

  return Object.freeze({VERSION,RANKS,STAT_KEYS,WORLD_FLAG_KEYS,OBSESSION_TEMPLATES,rankIndex,formatRank,createState,computeCurrent,recompute,applyPermanent,applyTemporary,advanceBattle,setWorldFlag,addAnomaly,chooseObsession,ensureObsession,progressObsession,spendObsessionPoint,transformObsession,recordChoice,validateConsistency});
});
