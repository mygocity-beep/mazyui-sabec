#!/usr/bin/env node
// buscar.mjs — busca CLI no catálogo de componentes (não precisa do servidor).
//
//   node .claude/skills/componentes/buscar.mjs "hero animado"
//   node .claude/skills/componentes/buscar.mjs pricing --tag "Landing Page" --n 10
//   node .claude/skills/componentes/buscar.mjs --tags          (lista as top tags)

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { carregarIndice, buscar } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const args = process.argv.slice(2);
const flags = {};
const livres = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const k = args[i].slice(2);
    if (k === 'tags') flags.tags = true;
    else flags[k] = args[++i];
  } else livres.push(args[i]);
}

const indice = carregarIndice(ROOT);

if (flags.tags) {
  for (const { tag, n } of indice.tagsTop) console.log(`${String(n).padStart(4)}  ${tag}`);
  process.exit(0);
}

const r = buscar(indice, {
  q: livres.join(' '),
  tag: flags.tag || '',
  autor: flags.autor || '',
  por: parseInt(flags.n || '15', 10),
  pagina: parseInt(flags.pagina || '1', 10),
});

console.log(`${r.total} resultado(s) — mostrando ${r.itens.length} (página ${r.pagina})\n`);
for (const it of r.itens) {
  console.log(`[${it.id}] ${it.nome}${it.variante ? ' / ' + it.variante : ''} — @${it.autor}  (★${it.salvos} ↓${it.downloads})`);
  if (it.tags.length) console.log(`       tags: ${it.tags.join(', ')}`);
  if (it.descricao) console.log(`       ${it.descricao.slice(0, 160)}${it.descricao.length > 160 ? '…' : ''}`);
  console.log(`       código: node .claude/skills/componentes/codigo.mjs ${it.id}`);
  console.log();
}
