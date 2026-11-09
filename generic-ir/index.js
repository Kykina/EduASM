export const moduleInfo = { id:"generic-ir", apiVersion:"1.1.0", irVersion:"1.0.0" };
import {targetInfo} from "../ir-generic/index.js";
export {targetInfo};
export function parseGenericAssembly(text){
 const items=[];
 const lines=String(text).split(/\r?\n/);
 for(let n=0;n<lines.length;n++){
  const line=lines[n].replace(/;.*$/,"").trim();
  if(!line || /^CODE:$/i.test(line) || /^halt$/i.test(line) || /^;/.test(line) || /^[A-Za-z_.$][\\w.$]*:$/.test(line)) continue;
  const m=line.match(/^(mov|add|sub)\s+([^,]+)\s*,\s*(.+)$/i);
  if(!m) throw new Error(`Řádek ${n+1}: nepodporovaná instrukce nebo syntaxe: ${line}`);
  const op=m[1].toUpperCase(), dst=m[2].trim().toUpperCase(), raw=m[3].trim();
  const validNames=targetInfo.registers.map(r=>r.name);
  if(!validNames.includes(dst)) throw new Error(`Řádek ${n+1}: neznámý registr ${dst}`);
  const src=raw.toUpperCase();
  if(validNames.includes(src)) items.push({op,dst,src:{kind:"register",name:src}});
  else {
   const num=raw.replace(/^#/,"");
   if(!/^-?(0x[0-9a-f]+|[0-9]+)$/i.test(num)) throw new Error(`Řádek ${n+1}: neplatný operand ${raw}`);
   items.push({op,dst,src:{kind:"immediate",value:num}});
  }
 }
 return items;
}
