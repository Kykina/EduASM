import fs from 'node:fs';
import assert from 'node:assert/strict';
const app=fs.readFileSync(new URL('../www/app.js',import.meta.url),'utf8');
assert.ok(app.includes('b.type.replace("block_","")'), 'Blockly instruction IDs must map to opcodes');
assert.ok(app.includes('workspace.newBlock(`block_${item.op.toLowerCase()}`)'), 'ASM roundtrip must recreate renamed block IDs');
assert.ok(app.includes('target.registers.map(r=>`${r.name}: ${fmt(x.registers[r.id])}`)'), 'trace must render targetInfo register snapshots dynamically');
assert.ok(!app.includes('replace("ea_","")'), 'obsolete block prefix must be gone');
console.log('UI regression checks OK');
