import {reg,imm,makeProgram,validateProgram} from "../www/ir-runtime.js";
import {createBlocklyWorkspace,translateDemoItems} from "../blockly/index.js";
import {DemoInterpreter} from "../ir-interpreter/index.js";
import {emitDemoX86,targetInfo as x86TargetInfo} from "../ir-to-x86-64/index.js";
import {emitDemoGeneric,targetInfo as genericTargetInfo} from "../ir-generic/index.js";
import {parseX86Assembly} from "../x86-64-to-ir/index.js";
import {parseGenericAssembly} from "../generic-ir/index.js";




const $=id=>document.getElementById(id);
const TARGETS={
 "x86-64":{
  ...x86TargetInfo,asmTitle:"ASM – NASM x86-64",
  description:"Konkrétní architektura: registry x86-64 podle popisu cíle.",
  registerOptions:[["RAX","rax"],["EAX","eax"],["AX","ax"],["AH","ah"],["AL","al"],["RBX","rbx"],["EBX","ebx"],["BX","bx"],["BH","bh"],["BL","bl"]],
  labels:{r0:"RAX",r1:"RBX"},emit:emitDemoX86
 },
 "edu-generic":{
  ...genericTargetInfo,asmTitle:"ASM – obecný EduASM",
  description:"Obecný výukový cíl; seznam registrů poskytuje modul cílové architektury.",
  registerOptions:genericTargetInfo.registers.map(r=>[r.name,r.name]),
  labels:Object.fromEntries(genericTargetInfo.registers.map(r=>[r.id,r.name])),emit:emitDemoGeneric
 }
};
let target=TARGETS["x86-64"];
let workspace=null,machine=null,timer=null,irProgram=null;
function registerOptions(){
 return target.registerOptions.map(([label,value])=>[label,value]);
}
function readValue(block){
 const child=block.getInputTargetBlock("SRC");
 if(!child)return {kind:"immediate",value:"0"};
 if(child.type==="block_register")return {kind:"register",name:child.getFieldValue("VALUE")};
 if(child.type==="block_value"){
  const value=String(child.getFieldValue("VALUE")??"").trim();
  if(!/^-?(0x[0-9a-fA-F]+|[0-9]+)$/.test(value)) throw new Error(`Neplatná konstanta: ${value}`);
  return {kind:"immediate",value};
 }
 throw new Error(`Nepodporovaný operand: ${child.type}`);
}
function collect(){
 const items=[],tops=workspace.getTopBlocks(true).sort((a,b)=>a.getRelativeToSurfaceXY().y-b.getRelativeToSurfaceXY().y);
 for(const top of tops)for(let b=top;b;b=b.getNextBlock()){
  const op=b.type.replace("block_","").toUpperCase();
  if(["MOV","ADD","SUB"].includes(op))items.push({op,dst:b.getFieldValue("DST"),src:readValue(b)});
 }
 return items;
}
function showIR(p){$("irOutput").textContent=JSON.stringify(p,null,2);}
function renderRegisters(){
 const vals=machine?.registers||Object.fromEntries(target.registers.map(r=>[r.id,0n]));
 function card(title,id){
  const v=BigInt(vals[id]||0n),hex=v.toString(16).toUpperCase().padStart(16,"0"),bin=v.toString(2).padStart(64,"0");
  return `<div class="regCard"><table class="reg"><tr><td class="lab">${title}</td><th class="grp" colspan="8">${title}</th></tr><tr><td class="rowlab">BIN:</td>${bin.match(/.{8}/g).map(x=>`<td class="bin">${x}</td>`).join("")}</tr><tr><td class="rowlab">HEX:</td>${hex.match(/.{2}/g).map(x=>`<td class="hex">${x}</td>`).join("")}</tr><tr><td class="rowlab">DEC:</td><td class="decCell" colspan="8">${v.toString()}</td></tr></table></div>`;
 }
 $("REG_TABLES").innerHTML=`<div class="regSheetWrap">${target.registers.map(r=>card(r.name,r.id)).join("")}</div>`;
}
function renderTrace(){
 const t=machine?.trace||[];
 $("trace").innerHTML=t.map((x,i)=>{
  const fmt=v=>`0x${BigInt(v||0n).toString(16).toUpperCase().padStart(16,"0")}`;
  const ins=x.instruction.op==="binary" ? `${x.instruction.operator.toUpperCase()} ${x.instruction.dst?.alias||"?"}, …` : x.instruction.op.toUpperCase();
  const snapshot=target.registers.map(r=>`${r.name}: ${fmt(x.registers[r.id])}`).join(" &nbsp; ");
  return `<div class="row ${i===t.length-1?"active":""}">${String(i).padStart(3,"0")}: ${ins}<br><small>${snapshot}</small></div>`;
 }).join("");
 $("pcInfo").textContent=`PC: ${machine?.pc||0} / ${machine?.instructions?.length||0}`;
}
function update(){
 try{
  const items=collect();
  irProgram=translateDemoItems(items,target.id,target);
  const check=validateProgram(irProgram);if(!check.valid)throw new Error(check.errors.join("; "));
  showIR(irProgram);
  try{
   const asm=target.emit(irProgram);
   if(document.activeElement!==$("output"))$("output").value=asm;
   $("asmStatus").textContent="ASM je generováno z aktuální EduASM-IR; lze jej upravit a převést zpět.";
  }
  catch(e){
   if(document.activeElement!==$("output"))$("output").value=`; Export není dostupný: ${e.message}`;
   $("asmStatus").textContent=`Export není dostupný: ${e.message}`;
  }
  machine=new DemoInterpreter(irProgram,target);renderRegisters();renderTrace();
 }catch(e){
  $("irOutput").textContent=`Chyba překladu Blockly → IR:\n${e.message}`;
  if(document.activeElement!==$("output"))$("output").value="";
  $("asmStatus").textContent=`Chyba: ${e.message}`;
  machine=null;renderRegisters();renderTrace();
 }
}

function parseAssembly(text){
 return target.id==="x86-64" ? parseX86Assembly(text) : parseGenericAssembly(text);
}
function buildBlocksFromAssembly(){
 try{
  const parsedItems=parseAssembly($("output").value);
  // First parse source text into the shared IR. Blockly is rebuilt from IR,
  // not directly from the source parser's temporary representation.
  const parsedIR=translateDemoItems(parsedItems,target.id,target);
  const validation=validateProgram(parsedIR);
  if(!validation.valid)throw new Error(validation.errors.join("; "));
  const items=parsedIR.functions.flatMap(fn=>fn.blocks.flatMap(block=>block.instructions)).map(i=>{
   const dstName=target.id==="x86-64"?(i.dst.alias||targetRegisterName(i.dst.id,target.id)):targetRegisterName(i.dst.id,target.id);
   let src;
   if(i.src?.type==="value")src={kind:"immediate",value:i.src.value};
   else if(i.src?.type==="register")src={kind:"register",name:target.id==="x86-64"?(i.src.alias||targetRegisterName(i.src.id,target.id)):targetRegisterName(i.src.id,target.id)};
   else if(i.right?.type==="register")src={kind:"register",name:target.id==="x86-64"?(i.right.alias||targetRegisterName(i.right.id,target.id)):targetRegisterName(i.right.id,target.id)};
   else if(i.right?.type==="value")src={kind:"immediate",value:i.right.value};
   else throw new Error(`Nelze převést operand IR instrukce ${i.op} zpět do Blockly`);
   return {op:i.op==="move"?"MOV":i.operator.toUpperCase(),dst:dstName,src};
  });
  workspace.clear();
  let previous=null;
  for(const item of items){
   const block=workspace.newBlock(`block_${item.op.toLowerCase()}`);
   block.setFieldValue(item.dst,"DST");
   const value=workspace.newBlock(item.src.kind==="register"?"block_register":"block_value");
   value.setFieldValue(item.src.kind==="register"?item.src.name:item.src.value,"VALUE");
   value.initSvg();value.render();
   block.initSvg();block.render();
   block.getInput("SRC").connection.connect(value.outputConnection);
   if(previous)previous.nextConnection.connect(block.previousConnection);
   else block.moveBy(40,40);
   previous=block;
  }
  workspace.render();
  update();
  $("asmStatus").textContent=`Převedeno ${items.length} instrukcí: ASM → EduASM-IR → Blockly.`;
 }catch(e){
  $("asmStatus").textContent=`Převod se nezdařil: ${e.message}`;
 }
}
function canonicalRegister(name,oldTarget){
 const n=String(name||"").toUpperCase();
 if(oldTarget==="edu-generic")return n==="A"?"r0":n==="B"?"r1":null;
 if(["RAX","EAX","AX","AH","AL"].includes(n))return "r0";
 if(["RBX","EBX","BX","BH","BL"].includes(n))return "r1";
 return null;
}
function targetRegisterName(canonical,targetId){
 const t=TARGETS[targetId];
 if(targetId==="edu-generic")return target.registers.find(r=>r.id===canonical)?.name||canonical;
 return canonical==="r1"?"rbx":"rax";
}
function findUnsupportedRegisters(blocksState,newTarget){
 const supported=new Set((newTarget.registerOptions||[]).map(([,value])=>String(value).toUpperCase()));
 const unsupported=new Set();
 const visit=block=>{
  if(!block||typeof block!=="object")return;
  if(block.type==="block_mov"||block.type==="block_add"||block.type==="block_sub"){
   const value=String(block.fields?.DST||"").toUpperCase();
   if(value&&!supported.has(value))unsupported.add(value);
  }else if(block.type==="block_register"){
   const value=String(block.fields?.VALUE||"").toUpperCase();
   if(value&&!supported.has(value))unsupported.add(value);
  }
  for(const child of block.inputs?Object.values(block.inputs):[]){
   if(child?.block)visit(child.block);
   if(child?.shadow)visit(child.shadow);
  }
  if(block.next?.block)visit(block.next.block);
 };
 for(const block of blocksState?.blocks||[])visit(block);
 return [...unsupported];
}
function remapSerializedBlock(blocksState,oldTarget,newTarget){
 if(!blocksState)return;
 const visit=block=>{
  if(!block||typeof block!=="object")return;
  if(block.type==="block_mov"||block.type==="block_add"||block.type==="block_sub"){
   block.fields ||= {};
   const id=canonicalRegister(block.fields.DST,oldTarget);
   if(id)block.fields.DST=targetRegisterName(id,newTarget);
  }else if(block.type==="block_register"){
   block.fields ||= {};
   const id=canonicalRegister(block.fields.VALUE,oldTarget);
   if(id)block.fields.VALUE=targetRegisterName(id,newTarget);
  }
  // Constant block's VALUE field is intentionally left untouched.
  for(const child of block.inputs?Object.values(block.inputs):[]){
   if(child?.block)visit(child.block);
   if(child?.shadow)visit(child.shadow);
  }
  if(block.next?.block)visit(block.next.block);
 };
 for(const block of blocksState.blocks||[])visit(block);
}
function createWorkspace(){
 workspace=createBlocklyWorkspace(
  Blockly,
  document.getElementById("blocklyDiv"),
  registerOptions,
  target.id
 );
 workspace.addChangeListener(update);
}
function applyTarget(id){
 stop();
 const nextTarget=TARGETS[id]||TARGETS["x86-64"];
 if(nextTarget.id===target.id && workspace){
  update();
  return;
 }
 const previousTarget=target.id;
 let savedState=null;
 if(workspace){
  // Save the complete Blockly workspace (blocks, connections, fields, positions).
  savedState=Blockly.serialization.workspaces.save(workspace);
  const unsupported=findUnsupportedRegisters(savedState.blocks,nextTarget);
  if(unsupported.length){
   $("asmStatus").textContent=`Nelze přepnout na ${nextTarget.name}: cílová architektura nezná registr(y) ${unsupported.join(", ")}. Bloky zůstaly zachovány. Nahraď tyto registry podporovanými a přepnutí zopakuj.`;
   $("targetSelect").value=previousTarget;
   return;
  }
  workspace.removeChangeListener(update);
  workspace.dispose();
  workspace=null;
 }
 target=nextTarget;
 // Recreate both workspace and flyout from definitions built for the new target.
 createWorkspace();
 if(savedState){
  remapSerializedBlock(savedState.blocks,previousTarget,target.id);
  Blockly.Events.disable();
  try{
   Blockly.serialization.workspaces.load(savedState,workspace);
  }finally{
   Blockly.Events.enable();
  }
 }
 $("targetInfo").textContent=target.description;
 $("asmTitle").textContent=target.asmTitle;
 $("asmMeta").textContent=target.id==="x86-64"?"Výstup z IR pro NASM":"Ilustrační výstup z IR pro obecnou virtuální ISA";
 update();
}
function stop(){if(timer)clearInterval(timer);timer=null;}
function step(){if(!machine)return;try{machine.step();renderRegisters();renderTrace();}catch(e){stop();$("trace").textContent=`Chyba interpretru: ${e.message}`;}}
function reset(){stop();if(machine){machine.reset();renderRegisters();renderTrace();}}
function run(){stop();timer=setInterval(()=>{if(!machine||machine.halted){stop();return;}step();},350);}
function init(){
 if(!window.Blockly)throw new Error("Blockly se nepodařilo načíst. Zkontrolujte připojení k internetu nebo CDN.");
 createWorkspace();
 $("targetSelect").addEventListener("change",e=>applyTarget(e.target.value));
 $("btnAsmToBlocks").addEventListener("click",buildBlocksFromAssembly);
 $("btnReset").addEventListener("click",reset);
 $("btnStep").addEventListener("click",step);
 $("btnRun").addEventListener("click",run);
 $("btnStop").addEventListener("click",stop);
 applyTarget("x86-64");
}
window.addEventListener("error",e=>{
 const box=document.getElementById("startupError")||document.body.insertAdjacentHTML("afterbegin",'<div id="startupError" role="alert"></div>')||document.getElementById("startupError");
 const el=document.getElementById("startupError");
 if(el){el.style.cssText="padding:12px;background:#fee;color:#900;font:14px/1.5 monospace;white-space:pre-wrap";el.textContent=`JavaScript chyba: ${e.message} (${e.filename||""}:${e.lineno||""})`;}
});
window.addEventListener("unhandledrejection",e=>{
 let el=document.getElementById("startupError");
 if(!el){document.body.insertAdjacentHTML("afterbegin",'<div id="startupError" role="alert"></div>');el=document.getElementById("startupError");}
 el.style.cssText="padding:12px;background:#fee;color:#900;font:14px/1.5 monospace;white-space:pre-wrap";
 el.textContent=`Chyba při načítání aplikace: ${e.reason?.stack||e.reason}`;
});
try{init();}catch(e){
 document.body.insertAdjacentHTML("afterbegin",'<div id="startupError" role="alert"></div>');
 const el=document.getElementById("startupError");
 el.style.cssText="padding:12px;background:#fee;color:#900;font:14px/1.5 monospace;white-space:pre-wrap";
 el.textContent=`EduASM se nepodařilo spustit:\n${e.stack||e.message}`;
}
