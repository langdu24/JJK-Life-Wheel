const assert=require("node:assert/strict");
const V8=require("../core/v8-state.js");

assert.equal(V8.VERSION,"8.0.0");
assert.equal(V8.WORLD_FLAG_KEYS.length,12,"V8.0 core world flags must stay intentionally small");

let s=V8.createState({base:{martial:"SSS",body:"C",efficiency:"S",cursedEnergy:"E-"}});
assert.equal(s.character.base.martial,"SSS");
assert.equal(s.character.current.martial,"SSS");

s=V8.applyPermanent(s,{id:"injury:martial",stat:"martial",delta:-1,source:"永久伤势"});
assert.equal(s.character.base.martial,"SSS","Base must not be overwritten by permanent damage");
assert.equal(s.character.current.martial,"SS","Current must reflect permanent damage");

s=V8.applyTemporary(s,{id:"overload:eff",stat:"efficiency",delta:-1,source:"术式过载",remainingBattles:2});
assert.equal(s.character.current.efficiency,"A");
s=V8.advanceBattle(s);
assert.equal(s.character.current.efficiency,"A");
s=V8.advanceBattle(s);
assert.equal(s.character.current.efficiency,"S","temporary modifier must expire without touching Base");

s=V8.setWorldFlag(s,"mahito","dead","test");
assert.equal(s.world.flags.mahito,"dead");
assert.throws(()=>V8.setWorldFlag(s,"randomFlag","x"),/unknown core world flag/);

s=V8.ensureObsession(s,"战斗，爽！ 锻炼",0);
assert.ok(s.obsession&&s.obsession.label);
const startPoints=s.obsession.points;
s=V8.progressObsession(s,34,"milestone test");
assert.equal(s.obsession.points,startPoints+1,"obsession milestones grant scarce points");
const spent=V8.spendObsessionPoint(s,1,"购买一次机会");
assert.equal(spent.ok,true);
assert.equal(spent.state.obsession.points,startPoints,"obsession points spend opportunities, not stats");

const report=V8.validateConsistency({zeroCe:true,cursedEnergyValue:5,location:"欧洲",traits:"六眼",advancedTechniqueCount:2,advancedTechniques:["A","B","C"],domainLevel:"incomplete",battleDomainLevel:"complete"});
assert.ok(report.hard.some(x=>x.id==="zero-ce-conflict"));
assert.ok(report.hard.some(x=>x.id==="advanced-technique-count"));
assert.ok(report.hard.some(x=>x.id==="domain-completion-conflict"));
assert.ok(report.soft.some(x=>x.id==="six-eyes-origin"),"soft lore conflicts should become anomalies instead of deletion");

const before=s.character.current.martial;
s=V8.recordChoice(s,{id:"shibuya_intent",title:"涩谷事变的立场",optionId:"rescue",optionText:"救援普通人",effects:{obsessionProgress:4}});
assert.equal(s.character.current.martial,before,"choices must not directly buy combat stats");
assert.equal(s.choices.at(-1).optionId,"rescue");

console.log("V8 destiny state tests passed");
