import fs from 'node:fs';
import assert from 'node:assert/strict';

const bp1 = fs.readFileSync(new URL('../blockly/index.js', import.meta.url), 'utf8');
const bp5 = fs.readFileSync(new URL('../www/app.js', import.meta.url), 'utf8');

assert.ok(bp1.includes('export function defineBlocks('));
assert.ok(bp1.includes('export function createBlocklyWorkspace('));
assert.ok(bp1.includes('toolboxByTarget'));
assert.ok(bp1.includes('Blockly.inject(container'));
assert.ok(bp5.includes('createBlocklyWorkspace('));
assert.ok(!bp5.includes('toolbox:'), 'BP5 must not define the Blockly toolbox');
assert.ok(!bp5.includes('defineBlocks('), 'BP5 must not define Blockly blocks');

console.log('Blockly ownership OK: BP1 owns block definitions, toolbox and workspace creation.');
