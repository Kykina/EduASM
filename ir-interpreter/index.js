export const moduleInfo = { id:"ir-interpreter", apiVersion:"1.1.0", irVersion:"1.0.0" };
import {flatten} from "../www/ir-runtime.js";
const MASK64=(1n<<64n)-1n;
const mask=w=>(1n<<BigInt(w))-1n;
export class DemoInterpreter {
  constructor(program,targetInfo=null){
    this.program=program;this.instructions=flatten(program);this.targetInfo=targetInfo;
    const ids=new Set((targetInfo?.registers||[]).map(r=>r.id));
    for(const i of this.instructions)for(const o of [i.dst,i.src,i.left,i.right,i.source])if(o?.type==="register")ids.add(o.id);
    this.registerIds=[...ids];
    this.reset();
  }
  reset(){this.registers=Object.fromEntries(this.registerIds.map(id=>[id,0n]));this.flags={zf:false,sf:false,cf:false,of:false};this.pc=0;this.halted=false;this.trace=[];}
  read(o){
    if(!o)return 0n;
    if(o.type==="value")return BigInt(o.value);
    if(o.type==="register")return (this.registers[o.id]>>BigInt(o.offset||0))&mask(o.width);
    if(o.type==="predicate")return this.flags[o.name]?1n:0n;
    throw new Error(`Interpreter: unsupported operand ${o.type}`);
  }
  write(o,v){
    if(!o||o.type!=="register")throw new Error("Destination must be a register");
    const width=o.width, offset=o.offset||0, old=this.registers[o.id]||0n;
    const fieldMask=mask(width)<<BigInt(offset);
    if(width===32&&offset===0)this.registers[o.id]=BigInt.asUintN(64,BigInt.asUintN(32,v));
    else this.registers[o.id]=BigInt.asUintN(64,(old&(~fieldMask&MASK64))|((BigInt.asUintN(width,v)<<BigInt(offset))&fieldMask));
  }
  step(){
    if(this.halted)return false;
    const pc=this.pc, i=this.instructions[this.pc++];
    if(!i){this.halted=true;return false;}
    const a=this.read(i.left), b=this.read(i.right);
    switch(i.op){
      case "move": this.write(i.dst,this.read(i.src)); break;
      case "binary":{
        let v;
        switch(i.operator){case "add":v=a+b;break;case "sub":v=a-b;break;default:throw new Error(`Demo interpreter does not implement ${i.operator}`);}
        this.write(i.dst,v);break;
      }
      case "compare":{
        const x=this.read(i.left),y=this.read(i.right);
        this.flags.zf=x===y;this.flags.sf=BigInt.asIntN(i.left.width,x)<BigInt.asIntN(i.right.width,y);
        break;
      }
      case "label": break;
      case "jump": {
        const n=this.instructions.findIndex(x=>x.op==="label"&&x.name===i.target);
        if(n<0)throw new Error(`Unknown label ${i.target}`);this.pc=n;break;
      }
      case "branch":{
        const take=i.condition==="eq"?this.flags.zf:i.condition==="ne"?!this.flags.zf:false;
        if(take){const n=this.instructions.findIndex(x=>x.op==="label"&&x.name===i.trueTarget);if(n<0)throw new Error(`Unknown label ${i.trueTarget}`);this.pc=n;}
        break;
      }
      case "return": this.halted=true;break;
      default: throw new Error(`Demo interpreter does not implement ${i.op}`);
    }
    this.trace.push({pc,instruction:i,registers:{...this.registers}});
    return true;
  }
  run(limit=10000){let n=0;while(!this.halted&&n<limit){this.step();n++;}if(n>=limit&&!this.halted)throw new Error("Instruction limit reached");return n;}
}
