import {makeProgram,reg,imm} from "../www/ir-runtime.js";

export const moduleInfo = { id:"blockly", apiVersion:"1.1.0", irVersion:"1.0.0" };

export function defineBlocks(Blockly, registerOptions){
 // Hodnota v registru – operand typu registr.
 Blockly.Blocks["block_register"] = {
  init: function() {
   this.appendDummyInput()
    .appendField("registr")
    .appendField(new Blockly.FieldDropdown(registerOptions()), "VALUE");
   this.setOutput(true, "Value");
   this.setColour(290);
  }
 };

 // Volně editovatelná hodnota – desetinný/hexadecimální zápis i záporné hodnoty.
 Blockly.Blocks["block_value"] = {
  init: function() {
   this.appendDummyInput()
    .appendField("hodnota")
    .appendField(new Blockly.FieldTextInput("0"), "VALUE");
   this.setOutput(true, "Value");
   this.setColour(230);
  }
 };

 // MOV – přesun hodnoty do registru.
 Blockly.Blocks["block_mov"] = {
  init: function() {
   this.appendDummyInput()
    .appendField("MOV")
    .appendField(new Blockly.FieldDropdown(registerOptions()), "DST")
    .appendField(",");
   this.appendValueInput("SRC").setCheck("Value");
   this.setInputsInline(true);
   this.setPreviousStatement(true);
   this.setNextStatement(true);
   this.setColour(20);
  }
 };

 // ADD – přičtení hodnoty k registru.
 Blockly.Blocks["block_add"] = {
  init: function() {
   this.appendDummyInput()
    .appendField("ADD")
    .appendField(new Blockly.FieldDropdown(registerOptions()), "DST")
    .appendField(",");
   this.appendValueInput("SRC").setCheck("Value");
   this.setInputsInline(true);
   this.setPreviousStatement(true);
   this.setNextStatement(true);
   this.setColour(120);
  }
 };

 // SUB – odečtení hodnoty od registru.
 Blockly.Blocks["block_sub"] = {
  init: function() {
   this.appendDummyInput()
    .appendField("SUB")
    .appendField(new Blockly.FieldDropdown(registerOptions()), "DST")
    .appendField(",");
   this.appendValueInput("SRC").setCheck("Value");
   this.setInputsInline(true);
   this.setPreviousStatement(true);
   this.setNextStatement(true);
   this.setColour(60);
  }
 };
}

/**
 * Vytvoří Blockly workspace pro zvolený cíl.
 * BP1 vlastní definice bloků i toolbox; BP5 předává pouze Blockly,
 * DOM kontejner, dynamický zdroj registrů a identifikátor cíle.
 */
export function createBlocklyWorkspace(Blockly, container, registerOptions, targetId="x86-64"){
 defineBlocks(Blockly, registerOptions);
 const toolboxByTarget = {
  "x86-64": [
   {kind:"block",type:"block_mov"},
   {kind:"block",type:"block_add"},
   {kind:"block",type:"block_sub"},
   {kind:"block",type:"block_register"},
   {kind:"block",type:"block_value"}
  ],
  "edu-generic": [
   {kind:"block",type:"block_mov"},
   {kind:"block",type:"block_add"},
   {kind:"block",type:"block_sub"},
   {kind:"block",type:"block_register"},
   {kind:"block",type:"block_value"}
  ]
 };
 const contents = toolboxByTarget[targetId] || toolboxByTarget["x86-64"];
 return Blockly.inject(container, {
  toolbox:{kind:"flyoutToolbox",contents:contents.map(item=>({...item}))}
 });
}

function targetRegister(name,targetId,targetInfo){
 if(targetId==="x86-64")return reg(name);
 const entry=(targetInfo?.registers||[]).find(r=>r.name===String(name).toUpperCase() || r.aliases?.includes(String(name).toUpperCase()));
 if(!entry)throw new Error(`Neznámý registr cíle ${targetId}: ${name}`);
 return {type:"register",id:entry.id,base:entry.base||entry.name,alias:String(name).toUpperCase(),width:entry.width||targetInfo.wordSize||64,offset:entry.offset||0};
}
export function translateDemoItems(items,targetId="x86-64",targetInfo=null){
 const out=[];
 for(const x of items){
  const dst=x.dst?targetRegister(x.dst,targetId,targetInfo):null;
  const src=x.src?.kind==="register"?targetRegister(x.src.name,targetId,targetInfo):imm(x.src?.value??0);
  if(x.op==="MOV")out.push({op:"move",dst,src});
  else if(["ADD","SUB"].includes(x.op))out.push({op:"binary",operator:x.op.toLowerCase(),dst,left:dst,right:src});
  else throw new Error(`Fallback BP1 supports only MOV, ADD, SUB (got ${x.op})`);
 }
 return makeProgram(out);
}
