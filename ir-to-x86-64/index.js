export const moduleInfo = { id:"ir-to-x86-64", apiVersion:"1.1.0", irVersion:"1.0.0" };
export const targetInfo = {
 id:"x86-64", name:"x86-64 / NASM", wordSize:64,
 registers:[
  {id:"r0",name:"RAX",base:"rax",width:64,offset:0,aliases:["RAX","EAX","AX","AH","AL"]},
  {id:"r1",name:"RBX",base:"rbx",width:64,offset:0,aliases:["RBX","EBX","BX","BH","BL"]}
 ]
};
const NAMES={r0:{64:"RAX",32:"EAX",16:"AX","8:0":"AL","8:8":"AH"},r1:{64:"RBX",32:"EBX",16:"BX","8:0":"BL","8:8":"BH"}};
function operand(o){
 if(o.type==="value")return o.value;
 if(o.type==="register")return NAMES[o.id]?.[o.width===8?`8:${o.offset}`:o.width]||o.alias;
 throw new Error(`NASM backend: unsupported operand ${o.type}`);
}
export function emitDemoX86(program){
 const out=["; EduASM-IR 1.0.0 — demonstration NASM subset","section .text","global function","function:"];
 for(const fn of program.functions)for(const block of fn.blocks)for(const i of block.instructions){
  if(i.op==="move")out.push(`    mov ${operand(i.dst)}, ${operand(i.src)}`);
  else if(i.op==="binary"&&["add","sub"].includes(i.operator))out.push(`    ${i.operator} ${operand(i.dst)}, ${operand(i.right)}`);
  else if(i.op==="label")out.push(`${i.name}:`);
  else throw new Error(`Demo backend does not implement ${i.op}/${i.operator||""}`);
 }
 out.push("    ret");return out.join("\n");
}


// Ilustrační assembler-neutral/virtuální cíl. Nejde o NASM ani o skutečnou ISA.
// Klíčové je, že backend mapuje kanonická ID registrů IR na názvy A/B.
