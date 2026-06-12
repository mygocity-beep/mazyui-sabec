#!/usr/bin/env node
// codigo.mjs — baixa (com cache) o código TSX de um componente do catálogo.
//
//   node .claude/skills/componentes/codigo.mjs 14118            → imprime caminhos do cache
//   node .claude/skills/componentes/codigo.mjs 14118 --print    → imprime o código no stdout

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { carregarIndice, porId, baixarCodigo } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const id = process.argv[2];
const print = process.argv.includes('--print');
if (!id) {
  console.error('uso: node .claude/skills/componentes/codigo.mjs <id> [--print]');
  process.exit(1);
}

const item = porId(carregarIndice(ROOT), id);
if (!item) {
  console.error(`componente ${id} não encontrado no índice`);
  process.exit(1);
}

const r = await baixarCodigo(ROOT, item);
console.log(`${r.nome} [${r.id}] — ${r.cacheado ? 'cache' : 'baixado do CDN'}`);
console.log('componente:', r.caminhos.componente);
if (r.caminhos.demo) console.log('demo:      ', r.caminhos.demo);
console.log('fonte:     ', item.fonte);
if (print) {
  console.log('\n===== component.tsx =====\n');
  console.log(r.componente);
  if (r.demo) {
    console.log('\n===== demo.tsx =====\n');
    console.log(r.demo);
  }
}
