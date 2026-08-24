import fs from "node:fs";

const path=process.argv[2]||"game.html";
const source=fs.readFileSync(path,"utf8");
const desired="<title>咒术转盘 V8.1 · 命运与抉择</title>";
let next=source;
if(!next.includes(desired))next=next.replace(/<title>[^<]*<\/title>/i,desired);
if(next!==source){fs.writeFileSync(path,next);console.log(`updated V8.1 title metadata in ${path}`)}else console.log(`V8.1 title metadata already clean in ${path}`);
