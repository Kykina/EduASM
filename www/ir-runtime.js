export const moduleInfo = { id:"ir", apiVersion:"1.0.0", irVersion:"1.0.0" };
export const IR_NAME = "EduASM-IR";
export const IR_VERSION = "1.0.0";
export const REGISTERS = Object.freeze({
  rax: { id:"r0", width:64, aliases:{ rax:[0,64], eax:[0,32], ax:[0,16], al:[0,8], ah:[8,8] } },
  rbx: { id:"r1", width:64, aliases:{ rbx:[0,64], ebx:[0,32], bx:[0,16], bl:[0,8], bh:[8,8] } }
});
export const imm = (value, width=64) => ({type:"value", value:String(value), width});
export const reg = (name) => {
  const n=String(name).toLowerCase();
  for (const [base,d] of Object.entries(REGISTERS)) {
    if (d.aliases[n]) { const [offset,width]=d.aliases[n]; return {type:"register",id:d.id,base,alias:n,width,offset}; }
  }
  throw new Error(`Unsupported register: ${name}`);
};
export const labelRef = name => ({type:"label",name:String(name)});
export const predicate = name => ({type:"predicate",name:String(name)});
export function makeProgram(instructions, name="main") {
  return {ir:IR_NAME,version:IR_VERSION,wordSize:64,functions:[{
    name,entry:"entry",blocks:[{id:"entry",label:"entry",instructions,terminator:{op:"return"}}]
  }]};
}
export function flatten(program) {
  return (program.functions||[]).flatMap(fn=>(fn.blocks||[]).flatMap(b=>b.instructions||[]));
}
export function validateProgram(program) {
  const errors=[];
  if(program?.ir!==IR_NAME) errors.push("ir must be EduASM-IR");
  if(program?.version!==IR_VERSION) errors.push(`version must be ${IR_VERSION}`);
  if(program?.wordSize!==64) errors.push("wordSize must be 64");
  if(!Array.isArray(program?.functions)||!program.functions.length) errors.push("functions must be a non-empty array");
  const labels=new Set();
  for(const fn of program?.functions||[]) {
    if(!fn.name || !Array.isArray(fn.blocks) || !fn.blocks.length) errors.push(`Invalid function ${fn.name||"(unnamed)"}`);
    for(const b of fn.blocks||[]) {
      if(!b.label || !Array.isArray(b.instructions) || !b.terminator) errors.push(`Invalid basic block in ${fn.name}`);
      if(labels.has(b.label)) errors.push(`Duplicate label ${b.label}`);
      labels.add(b.label);
      for(const i of b.instructions||[]) {
        if(!i.op) errors.push(`Instruction without op in ${b.label}`);
      }
    }
  }
  for(const fn of program?.functions||[]) for(const b of fn.blocks||[]) {
    for(const i of b.instructions||[]) {
      for(const target of [i.target,i.trueTarget,i.falseTarget]) if(target && !labels.has(target)) errors.push(`Unknown target ${target}`);
    }
  }
  return {valid:errors.length===0,errors};
}
