#!/usr/bin/env node
// atualizar-indice.mjs — destila 21st_component_catalog/output/catalog.json
// num índice de busca otimizado em dados/componentes/index.json.
//
// Rodar da raiz do cliente:
//   node .claude/skills/componentes/atualizar-indice.mjs
//
// Re-rodar sempre que o scraper (21st_component_catalog/scrape_21st.py)
// atualizar o catálogo.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SRC  = path.join(ROOT, '21st_component_catalog', 'output', 'catalog.json');
const OUT_DIR = path.join(ROOT, 'dados', 'componentes');
const OUT  = path.join(OUT_DIR, 'index.json');

if (!fs.existsSync(SRC)) {
  console.error('catalog.json não encontrado em', SRC);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const itens = raw.map((d) => ({
  id:        d.demo_id,
  nome:      d.name,
  variante:  d.demo_name && d.demo_name !== 'Default' ? d.demo_name : '',
  autor:     d.username,
  slug:      d.component_slug,
  descricao: d.description || '',
  tags:      d.tags || [],
  downloads: d.downloads_count || 0,
  salvos:    d.bookmarks_count || 0,
  preview:   d.preview_url || '',
  video:     d.video_url || '',
  codigo:    d.code_url || '',
  demo:      d.demo_code_url || '',
  registry:  d.registry_url || '',
  fonte:     d.source_url || '',
}));

// Ordena por popularidade (salvos + downloads) — busca sem query devolve os melhores
itens.sort((a, b) => (b.salvos + b.downloads) - (a.salvos + a.downloads));

// Facetas: contagem de tags pro painel
const tagCount = {};
for (const it of itens) for (const t of it.tags) tagCount[t] = (tagCount[t] || 0) + 1;
const tagsTop = Object.entries(tagCount)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 60)
  .map(([tag, n]) => ({ tag, n }));

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  geradoEm: new Date().toISOString(),
  total: itens.length,
  tagsTop,
  itens,
}));

const kb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`index.json gerado: ${itens.length} componentes, ${tagsTop.length} tags, ${kb} KB`);
console.log('→', OUT);
