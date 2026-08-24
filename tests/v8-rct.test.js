const assert=require('node:assert/strict');
const R=require('../core/v8-rct-model.js');

let p=R.deriveProfile({text:'普通术师'});
assert.equal(p.hasRct,false);

p=R.deriveProfile({text:'高级技巧：反转术式',control:'B',efficiency:'B',talent:'B'});
assert.equal(p.mastery,'basic');

const skilled=R.deriveProfile({text:'高级技巧：反转术式',control:'S',efficiency:'S',talent:'A'});
assert.equal(skilled.mastery,'skilled');
assert.equal(skilled.combatRegen,true);

const advanced=R.deriveProfile({text:'高级技巧：反转术式',control:'SSS',efficiency:'SS',talent:'SS'});
assert.equal(advanced.mastery,'advanced');
assert.equal(advanced.limbRepair,true);

const output=R.deriveProfile({text:'反转术式 反转术式外放',control:'SS',efficiency:'SS'});
assert.equal(output.externalOutput,true);
const noOutput=R.deriveProfile({text:'反转术式',control:'SS',efficiency:'SS'});
assert.equal(noOutput.externalOutput,false);

const h1=R.healPlan(skilled,{maxHp:400,hp:120,maxCe:250,ce:100});
assert.ok(h1.healing>=70&&h1.healing<=100);
assert.equal(h1.apCost,1);
assert.ok(h1.ceCost<=20);

const full=R.healPlan(skilled,{maxHp:400,hp:400,maxCe:250,ce:100});
assert.equal(full.available,false);
assert.equal(full.reason,'full_hp');

assert.equal(R.classifyInjury('真人造成灵魂损伤').kind,'soul');
assert.equal(R.treatmentPlan(skilled,'断臂',{maxCe:300,ce:300}).available,false);
assert.equal(R.treatmentPlan(advanced,'断臂',{maxCe:300,ce:300}).repair,'full');
assert.equal(R.treatmentPlan(advanced,'灵魂损伤',{maxCe:300,ce:300}).available,false);

assert.equal(R.shouldCpuHeal(skilled,{maxHp:400,hp:100,maxCe:200,ce:100},{maxHp:400,hp:300}),true);
assert.equal(R.shouldCpuHeal(skilled,{maxHp:400,hp:150,maxCe:200,ce:100},{maxHp:400,hp:30}),false);

console.log('v8 rct model tests passed');