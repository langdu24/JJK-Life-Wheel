(()=>{
  "use strict";

  const VERSION="8.0.0";
  const V8=globalThis.JJKV8State;
  if(!V8){console.error("[JJK V8] v8-state.js missing");return}

  const STAT_LABELS={cursedEnergy:"咒力总量",control:"咒力操纵",efficiency:"咒力效率",martial:"体术",body:"体质",talent:"天赋",techniquePower:"术式威力"};
  const FLAG_LABELS={junpei:"顺平",mahito:"真人",gojoSeal:"五条封印",kenjaku:"羂索",sukunaVessel:"宿傩容器",megumi:"伏黑惠",nobara:"野蔷薇",todo:"东堂",yuta:"乙骨",cullingGame:"死灭回游",tengen:"天元",sukunaFinal:"宿傩最终状态"};
  const WORLD_LABEL={unknown:"未知",alive:"存活",dead:"死亡",active:"进行中",inactive:"未启动",ended:"结束",sealed:"被封印",free:"自由",possessed:"被受肉",safe:"安全",injured:"受伤",changed:"已改变",yuji:"虎杖悠仁",megumi:"伏黑惠",failed:"失败",defeated:"被击败"};

  const C=v=>{try{return structuredClone(v)}catch{try{return JSON.parse(JSON.stringify(v))}catch{return v}}};
  const text=v=>String(v??"");
  const allText=()=>((state?.records||[]).map(r=>`${r?.stage||""} ${r?.title||""} ${r?.result||""}`).join("\n"));
  const graded=()=>!!(state?.answers?.grade||(state?.records||[]).some(r=>text(r?.title).includes("等级判定")));
  function root(){
    if(typeof state==="undefined")return null;
    state.flags||={};
    if(!state.flags.v8||state.flags.v8.schema!=="jjk-v8-destiny-state")state.flags.v8=V8.createState();
    return state.flags.v8;
  }
  function put(next,{save=true}={}){if(typeof state==="undefined")return next;state.flags||={};state.flags.v8=next;if(save)try{globalThis.saveLifeWheelRunDraft?.()}catch{}return next}
  function answerRank(id){
    const a=state?.answers?.[id];
    const sources=[a?.rawText,a?.text,a?.result,a,state?.flags?.[`${id}Rank`]];
    for(const v of sources){const m=text(v).toUpperCase().match(/^(EX-|EX|SSS|SS|S|A|B|C|D|E-|E)/);if(m)return m[1]}
    return null;
  }
  function currentRank(id){
    const p=state?.flags?.battleBridgePersistentRanks?.[id];
    const m=text(p).toUpperCase().match(/^(EX-|EX|SSS|SS|S|A|B|C|D|E-|E)(?:\+\d+)?/);return m?m[0]:answerRank(id);
  }
  function syncCharacterLayers(){
    let s=root();if(!s||!graded())return s;
    const ch=C(s.character||{});ch.base||={};ch.permanent=Array.isArray(ch.permanent)?ch.permanent:[];ch.temporary=Array.isArray(ch.temporary)?ch.temporary:[];
    for(const id of V8.STAT_KEYS){
      const base=answerRank(id)||currentRank(id);if(base&&!ch.base[id])ch.base[id]=base;
      const cur=currentRank(id);if(!base||!cur)continue;
      const delta=V8.rankIndex(cur)-V8.rankIndex(ch.base[id]);
      const mid=`legacy-current:${id}`,old=ch.permanent.find(x=>x.id===mid);
      if(Math.abs(delta)>.001){
        const mod={id:mid,stat:id,delta,source:"V7既有长期成长/伤势",kind:"permanent",createdAt:old?.createdAt||new Date().toISOString()};
        const i=ch.permanent.findIndex(x=>x.id===mid);if(i>=0)ch.permanent[i]=mod;else ch.permanent.push(mod);
      }else ch.permanent=ch.permanent.filter(x=>x.id!==mid);
    }
    let zero=false;try{zero=Boolean(globalThis.isZeroCursedEnergyHeavenlyRestriction?.())}catch{}
    zero=zero||/零咒力|天与咒缚（肉体强化型）|天与暴君/.test(allText());ch.forcedZeroCe=zero;
    const records=allText();
    if(/未完成领域|领域[^\n]{0,20}未完成/.test(records))ch.domainLevel="incomplete";
    else if(/完整领域|完整的领域展开/.test(records))ch.domainLevel="complete";
    s.character=ch;s=V8.recompute(s);return put(s,{save:false});
  }
  function consistencyCheck(){
    let s=root();if(!s)return null;const txt=allText(),ce=s.character?.current?.cursedEnergy;
    let location="";const lm=txt.match(/穿越后的地点[：:]([^\n]+)/);if(lm)location=lm[1];
    const report=V8.validateConsistency({zeroCe:Boolean(s.character?.forcedZeroCe),cursedEnergyValue:ce==="0"?0:V8.rankIndex(ce)+1,location,traits:txt,domainLevel:s.character?.domainLevel,battleDomainLevel:s.character?.battleDomainLevel});
    s.consistency={issues:[...report.hard,...report.soft],lastCheckedAt:report.checkedAt};
    for(const issue of report.soft)s=V8.addAnomaly(s,issue.id,issue.label,issue.detail);
    if(report.hard.some(x=>x.repair?.forcedZeroCe)){s.character.forcedZeroCe=true;s=V8.recompute(s)}
    return put(s,{save:false});
  }
  function ensureObsession(){
    let s=root();if(!s||!graded())return s;if(!s.obsession)s=V8.ensureObsession(s,allText(),Math.random());return put(s,{save:false});
  }
  function setFlag(key,value,source){let s=root();if(!s)return;s=V8.setWorldFlag(s,key,value,source);put(s,{save:false})}
  function syncWorldFlags(commitText=""){
    const t=text(commitText);if(!t)return;
    if(/顺平/.test(t)&&/(死亡|身亡|死去)/.test(t))setFlag("junpei","dead",t);else if(/顺平/.test(t)&&/(存活|生还|救下|活下来)/.test(t))setFlag("junpei","alive",t);
    if(/真人/.test(t)&&/(死亡|祓除|消灭|击杀|被杀)/.test(t))setFlag("mahito","dead",t);else if(/真人/.test(t)&&/(逃走|存活|继续行动)/.test(t))setFlag("mahito","alive",t);
    if(/五条/.test(t)&&/(破封|解除封印|成功解封)/.test(t))setFlag("gojoSeal","free",t);else if(/五条/.test(t)&&/(被封印|封印成功|狱门疆封印)/.test(t))setFlag("gojoSeal","sealed",t);
    if(/羂索/.test(t)&&/(死亡|击杀|清算|被杀)/.test(t))setFlag("kenjaku","dead",t);else if(/羂索/.test(t)&&/(计划继续|备用方案|逃走)/.test(t))setFlag("kenjaku","alive",t);
    if(/宿傩夺取伏黑惠/.test(t)&&/(成功|夺取伏黑惠成功)/.test(t)&&!/(失败|未能)/.test(t)){setFlag("sukunaVessel","megumi",t);setFlag("megumi","possessed",t)}
    if(/宿傩夺取伏黑惠/.test(t)&&/(失败|未能)/.test(t))setFlag("megumi","safe",t);
    if(/野蔷薇/.test(t)&&/(死亡|身亡)/.test(t))setFlag("nobara","dead",t);else if(/野蔷薇/.test(t)&&/(存活|恢复|生还)/.test(t))setFlag("nobara","alive",t);
    if(/东堂/.test(t)&&/(死亡|身亡)/.test(t))setFlag("todo","dead",t);else if(/东堂/.test(t)&&/(断手|重伤|受伤)/.test(t))setFlag("todo","injured",t);else if(/东堂/.test(t)&&/(存活|生还)/.test(t))setFlag("todo","alive",t);
    if(/乙骨/.test(t)&&/(死亡|身亡)/.test(t))setFlag("yuta","dead",t);else if(/乙骨/.test(t)&&/(存活|生还|参战)/.test(t))setFlag("yuta","alive",t);
    if(/死灭回游/.test(t)&&/(削弱或跳过|跳过|未启动)/.test(t))setFlag("cullingGame","inactive",t);else if(/死灭回游/.test(t)&&/(结束|终止)/.test(t))setFlag("cullingGame","ended",t);else if(/死灭回游/.test(t)&&/(启动|参加|进入结界)/.test(t))setFlag("cullingGame","active",t);
    if(/天元/.test(t)&&/(死亡|被吸收|同化失败)/.test(t))setFlag("tengen","dead",t);else if(/天元/.test(t)&&/(存活|安全)/.test(t))setFlag("tengen","alive",t);
    if(/宿傩/.test(t)&&/(被虎杖封印|无法复活|未能复活|被击败|死亡)/.test(t))setFlag("sukunaFinal","defeated",t);else if(/宿傩/.test(t)&&/(复活|完全受肉)/.test(t))setFlag("sukunaFinal","active",t);
  }
  function obsessionDelta(eventText){
    const o=root()?.obsession;if(!o)return 0;const t=text(eventText);
    if(o.id==="strongest"||o.id==="challenge_all")return /(战斗胜利|击败|胜利|挑战.*成功)/.test(t)?6:/(挑战|强敌)/.test(t)?2:0;
    if(o.id==="kill_sukuna")return /宿傩.*(失败|封印|击败|死亡|无法复活)/.test(t)?18:/宿傩/.test(t)?3:0;
    if(o.id==="protect_someone")return /(救下|救援|保护).*(存活|成功)|存活.*救/.test(t)?8:0;
    if(o.id==="survive")return /(重伤生还|濒死生还|逃离成功|活到68年后)/.test(t)?7:0;
    if(o.id==="understand_ce"||o.id==="create_domain")return /(领域|反转术式|黑闪|成长.*突破|术式.*突破)/.test(t)?5:0;
    if(o.id==="build_org")return /(家主|建立组织|成为高层|组织)/.test(t)?5:0;
    if(o.id==="expose_jujutsu")return /(公开|普通人.*知道|社会.*咒术)/.test(t)?8:0;
    if(o.id==="freedom")return /(脱离|拒绝|自由|不加入)/.test(t)?5:0;
    if(o.id==="legacy")return /(传承|后代|学生|老师|流派)/.test(t)?5:0;
    if(o.id==="revenge")return /(复仇|击杀.*仇|杀死)/.test(t)?6:0;return 0;
  }
  function progressFromEvent(eventText){const d=obsessionDelta(eventText);if(!d)return;put(V8.progressObsession(root(),d,eventText),{save:false})}

  function criticalTask(){return{type:"choice",nodeId:"v8CriticalShibuyaIntent",title:"关键抉择｜涩谷事变",stage:"V8·命运与抉择",v8CriticalChoice:true,options:[
    {text:"A｜进入涩谷救援普通人｜风险高",v8Choice:{id:"rescue",label:"进入涩谷救援普通人"}},
    {text:"B｜攻击高专一方｜风险中",v8Choice:{id:"attack_high_school",label:"攻击高专"}},
    {text:"C｜保持中立，优先活下来｜风险低",v8Choice:{id:"neutral",label:"保持中立"}},
    {text:"D｜主动寻找真人｜风险极高",v8Choice:{id:"hunt_mahito",label:"主动寻找真人"}}
  ]}}
  function hasShibuyaChoice(){return (root()?.choices||[]).some(x=>x.id==="shibuya_intent")}
  function isFirstShibuyaTask(task){return task&&!task.v8CriticalChoice&&/涩谷/.test(text(task.title||task.stage))}
  function injectCriticalChoice(task=state?.currentTask){
    let s=root();if(!s||hasShibuyaChoice()||s.local?.shibuyaChoiceInjected||!isFirstShibuyaTask(task)||state?.flags?.dead)return false;
    state.taskQueue=Array.isArray(state.taskQueue)?state.taskQueue:[];state.taskQueue.unshift(task);state.currentTask=criticalTask();s.local=s.local||{};s.local.shibuyaChoiceInjected=true;put(s,{save:false});try{globalThis.renderAll?.()}catch{}return true;
  }
  function choiceProgress(intent){const id=root()?.obsession?.id;if(intent==="rescue")return id==="protect_someone"?10:4;if(intent==="neutral")return id==="survive"?10:2;if(intent==="hunt_mahito")return ["revenge","strongest","challenge_all","kill_sukuna"].includes(id)?10:5;if(intent==="attack_high_school")return ["freedom","build_org"].includes(id)?8:3;return 0}
  function commitCritical(result){
    const option=result?.option||result||{},choice=option.v8Choice||{};if(!choice.id)return;
    let s=root();s.local=s.local||{};s.local.shibuyaIntent=choice.id;
    s=V8.recordChoice(s,{id:"shibuya_intent",title:"涩谷事变的立场",optionId:choice.id,optionText:choice.label,effects:{obsessionProgress:choiceProgress(choice.id)}});put(s,{save:false});showFeedback(`你选择了：${choice.label}`,`【执念】${s.obsession?.label||"未形成"} ${Math.round(s.obsession?.progress||0)}%｜这个选择会改变后续涩谷事件权重，但不会直接购买胜利。`);
  }
  function intentWeight(task,item,weight){
    const intent=root()?.local?.shibuyaIntent;if(!intent||!/涩谷/.test(text(task?.title||task?.stage)))return weight;const t=text(item?.text||item?.label),yes=/(参加|进入|前往|是|高专|救援)/.test(t),no=/(不参加|中立|观望|撤离)/.test(t);
    if(intent==="rescue"){if(/救援|普通人|高专|保护|车站/.test(t))return weight*9;if(/诅咒师|攻击高专|中立/.test(t))return weight*.12;if(/是否参加/.test(text(task?.title))&&yes)return weight*8}
    if(intent==="attack_high_school"){if(/诅咒师|攻击高专|敌对高专/.test(t))return weight*10;if(/高专方|救援/.test(t))return weight*.08;if(/是否参加/.test(text(task?.title))&&yes)return weight*8}
    if(intent==="neutral"){if(no)return weight*12;if(/是否参加/.test(text(task?.title))&&yes)return weight*.08}
    if(intent==="hunt_mahito"){if(/真人|寻找|追击|主动/.test(t))return weight*12;if(/中立|不参加/.test(t))return weight*.06;if(/是否参加/.test(text(task?.title))&&yes)return weight*9}
    return weight;
  }
  function installWeights(){const f=globalThis.getAdjustedWeight;if(typeof f!=="function"||f.__v8Destiny)return false;const old=f,w=function(task,item,index,base,ctx){return intentWeight(task,item,Number(old.call(this,task,item,index,base,ctx))||0)};Object.defineProperty(w,"__v8Destiny",{value:true});globalThis.getAdjustedWeight=w;return true}
  function installAutoPause(){const f=globalThis.getAutoResultForTask;if(typeof f!=="function"||f.__v8Destiny)return false;const old=f,w=function(task,...rest){if(task?.v8CriticalChoice)return null;if(isFirstShibuyaTask(task)&&!hasShibuyaChoice()){injectCriticalChoice(task);return null}return old.call(this,task,...rest)};Object.defineProperty(w,"__v8Destiny",{value:true});globalThis.getAutoResultForTask=w;return true}
  function handleCommit(payload={}){
    const task=payload.task,result=payload.result;if(task?.nodeId==="v8CriticalShibuyaIntent")commitCritical(result);
    const event=`${task?.title||""} ${result?.text||result?.option?.text||""}`;syncCharacterLayers();ensureObsession();syncWorldFlags(event);progressFromEvent(event);consistencyCheck();try{globalThis.saveLifeWheelRunDraft?.()}catch{}setTimeout(()=>injectCriticalChoice(),0);renderPanelBadge();
  }
  function installCommitHook(){const wheel=globalThis.JJKPersonalWheel,f=wheel?.afterCommit;if(typeof f!=="function"||f.__v8Destiny)return false;const old=f,w=function(payload){const out=old.apply(this,arguments);try{handleCommit(payload)}catch(e){console.error("[JJK V8] afterCommit",e)}return out};Object.defineProperty(w,"__v8Destiny",{value:true});wheel.afterCommit=w;return true}

  function labelValue(v){return WORLD_LABEL[v]||text(v)}
  function panelHtml(){const s=root(),cur=s?.character?.current||{},obs=s?.obsession,flags=s?.world?.flags||{};return `<div class="v8-card"><div class="v8-head"><b>🧭 V8 命运与抉择</b><button data-v8-close>×</button></div><section><h3>当前有效属性</h3><div class="v8-grid">${V8.STAT_KEYS.map(k=>cur[k]?`<span>${STAT_LABELS[k]||k}</span><b>${cur[k]}</b>`:"").join("")}</div></section><section><h3>人生执念</h3><p>${obs?`<b>${obs.label}</b>｜${Math.round(obs.progress)}%｜执念点 ${obs.points}/${obs.maxPoints}`:"角色确定后生成"}</p></section><section><h3>核心世界状态</h3><div class="v8-flags">${V8.WORLD_FLAG_KEYS.map(k=>`<span><b>${FLAG_LABELS[k]||k}</b>：${labelValue(flags[k])}</span>`).join("")}</div></section><section><h3>关键抉择</h3><p>${(s?.choices||[]).length?(s.choices||[]).map(x=>`${x.title}：${x.optionText}`).join("<br>"):"尚无"}</p></section><section><h3>世界观异常 / 一致性</h3><p>${(s?.anomalies||[]).length?s.anomalies.map(x=>x.label).join("<br>"):"未发现已登记的世界观异常"}</p></section></div>`}
  function openPanel(){document.getElementById("jjkV8Panel")?.remove();const d=document.createElement("div");d.id="jjkV8Panel";d.innerHTML=panelHtml();document.body.appendChild(d);d.onclick=e=>{if(e.target===d||e.target.closest("[data-v8-close]"))d.remove()}}
  function showFeedback(title,detail){document.getElementById("jjkV8Feedback")?.remove();const d=document.createElement("div");d.id="jjkV8Feedback";d.innerHTML=`<b>${title}</b><span>${detail}</span>`;document.body.appendChild(d);setTimeout(()=>d.remove(),6500)}
  function css(){if(document.getElementById("jjkV8Css"))return;const s=document.createElement("style");s.id="jjkV8Css";s.textContent='#jjkV8Panel{position:fixed;inset:0;z-index:2147483600;background:#000b;display:grid;place-items:center;padding:16px}.v8-card{width:min(680px,100%);max-height:88vh;overflow:auto;background:#14141b;color:#f6f4ff;border:1px solid #ffffff30;border-radius:20px;padding:18px}.v8-head{display:flex;justify-content:space-between;align-items:center;font-size:20px}.v8-head button{border:0;background:transparent;color:#fff;font-size:30px}.v8-card section{border-top:1px solid #ffffff18;margin-top:14px;padding-top:10px}.v8-card h3{margin:0 0 8px;font-size:14px;opacity:.75}.v8-grid{display:grid;grid-template-columns:1fr auto;gap:6px 16px}.v8-flags{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 12px}#jjkV8Feedback{position:fixed;z-index:2147483599;left:50%;bottom:18px;transform:translateX(-50%);width:min(620px,calc(100% - 24px));background:#1d1d27ee;color:#fff;border:1px solid #ffffff30;border-radius:14px;padding:12px 14px;box-shadow:0 16px 50px #0008}#jjkV8Feedback b,#jjkV8Feedback span{display:block}#jjkV8Feedback span{opacity:.78;margin-top:4px}@media(max-width:600px){.v8-flags{grid-template-columns:1fr}}';document.head.appendChild(s)}
  function ui(){if(document.getElementById("jjkV8DestinyBtn"))return true;const r=document.getElementById("runAllBtn");if(!r?.parentElement)return false;const b=document.createElement("button");b.id="jjkV8DestinyBtn";b.className="secondary";b.textContent="命运面板";b.onclick=openPanel;const anchor=document.getElementById("jjkV7Difficulty")||document.getElementById("jjkV7RunChar")||r;anchor.after(b);return true}
  function renderPanelBadge(){const b=document.getElementById("jjkV8DestinyBtn"),s=root();if(b&&s?.obsession)b.title=`执念：${s.obsession.label} ${Math.round(s.obsession.progress)}%`}

  function initialize(){if(typeof state==="undefined")return false;css();root();syncCharacterLayers();ensureObsession();consistencyCheck();installWeights();installAutoPause();installCommitHook();ui();injectCriticalChoice();renderPanelBadge();globalThis.JJK_V8_VERSION=VERSION;return true}
  let attempts=0;function boot(){if(initialize()){console.info(`[JJK V8] 命运与抉择 ${VERSION} loaded`);return}if(attempts++<24)setTimeout(boot,150)}boot();
  globalThis.JJKV8=Object.freeze({version:VERSION,getState:()=>C(root()),openPanel,injectCriticalChoice,syncCharacterLayers,consistencyCheck,setWorldFlag:(k,v,src)=>put(V8.setWorldFlag(root(),k,v,src||"api")),progressObsession:(d,src)=>put(V8.progressObsession(root(),d,src||"api"))});
})();
