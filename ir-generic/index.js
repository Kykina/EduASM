export const moduleInfo = { id:"ir-generic", apiVersion:"1.1.0", irVersion:"1.0.0" };
export const targetInfo = {
 id:"edu-generic", name:"Obecný EduASM – virtuální ISA", wordSize:64,
 registers:[
  {id:"r0",name:"A",base:"A",width:64,offset:0,aliases:["A"]},
  {id:"r1",name:"B",base:"B",width:64,offset:0,aliases:["B"]},
  {id:"r2",name:"C",base:"C",width:64,offset:0,aliases:["C"]},
  {id:"r3",name:"D",base:"D",width:64,offset:0,aliases:["D"]}
 ]
};
export function emitDemoGeneric(program){
 const out=["; EduASM-IR 1.0.0 -> obecná virtuální ISA",`; registry ${(targetInfo.registers||[]).map(r=>r.name).join(", ")}; operand konstanty je #hodnota`,"CODE:"];
 const registerMap=Object.fromEntries(targetInfo.registers.map(r=>[r.id,r.name]));
 const operand=o=>{
  if(o.type==="value")return `#${o.value}`;
  if(o.type==="register")return registerMap[o.id]||`<neznámý:${o.id}>`;
  throw new Error(`Generic backend: unsupported operand ${o.type}`);
 };
 for(const fn of program.functions)for(const block of fn.blocks)for(const i of block.instructions){
  if(i.op==="move")out.push(`    MOV ${operand(i.dst)}, ${operand(i.src)}`);
  else if(i.op==="binary"&&["add","sub"].includes(i.operator))out.push(`    ${i.operator.toUpperCase()} ${operand(i.dst)}, ${operand(i.right)}`);
  else throw new Error(`Generic backend does not implement ${i.op}/${i.operator||""}`);
 }
 out.push("    HALT");return out.join("\n");
}
