export const moduleInfo = { id:"x86-64-to-ir", apiVersion:"1.0.0", irVersion:"1.0.0" };
function canonicalRegister(name){
 const n=String(name||"").toUpperCase();
 if(["RAX","EAX","AX","AH","AL"].includes(n))return "r0";
 if(["RBX","EBX","BX","BH","BL"].includes(n))return "r1";
 return null;
}
export function parseX86Assembly(text){
 const items=[];
 const lines=String(text).split(/\r?\n/);
 for(let n=0;n<lines.length;n++){
  let line=lines[n].replace(/;.*$/,"").trim();
  if(!line)continue;
  if(/^(section\s+|global\s+|bits\s+|default\s+)/i.test(line))continue;
  if(/^[A-Za-z_.$][\w.$]*:\s*$/.test(line))continue;
  if(/^ret$/i.test(line)||/^halt$/i.test(line))continue;
  const m=line.match(/^(mov|add|sub)\s+([^,]+)\s*,\s*(.+)$/i);
  if(!m)throw new Error(`Řádek ${n+1}: nepodporovaná instrukce nebo syntaxe: ${line}`);
  const op=m[1].toUpperCase(),dst=m[2].trim(),raw=m[3].trim();
  const dstCanonical=canonicalRegister(dst);
  if(!dstCanonical)throw new Error(`Řádek ${n+1}: nepodporovaný cílový registr ${dst}`);
  // Zachováme přesný alias registru (např. EAX, AX, AL nebo AH).
  // BP1 jej následně převede přes ir.reg() na register operand s width/offset.
  const dstName=dst.toLowerCase();
  const srcCanonical=canonicalRegister(raw);
  if(srcCanonical){
   items.push({op,dst:dstName,src:{kind:"register",name:raw.toLowerCase()}});
  }else{
   const num=raw.replace(/^#/, "");
   if(!/^-?(0x[0-9a-f]+|[0-9]+)$/i.test(num))throw new Error(`Řádek ${n+1}: neplatný operand ${raw}`);
   items.push({op,dst:dstName,src:{kind:"immediate",value:num}});
  }
 }
 return items;
}
