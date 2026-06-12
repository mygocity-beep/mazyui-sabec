// lib.mjs — núcleo do catálogo de componentes (busca + download de código).
// Compartilhado entre local-routes.mjs (servidor) e os scripts CLI da skill.
// Stdlib do Node apenas (fetch nativo do Node 18+).

import fs from 'node:fs';
import path from 'node:path';

export function carregarIndice(ROOT) {
  const file = path.join(ROOT, 'dados', 'componentes', 'index.json');
  if (!fs.existsSync(file)) {
    throw new Error(
      'dados/componentes/index.json não existe. Rode: node .claude/skills/componentes/atualizar-indice.mjs'
    );
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// Busca rankeada: todos os tokens da query precisam bater em algum campo.
// Peso: nome > tag > slug > descrição/autor. Empate → popularidade.
export function buscar(indice, { q = '', tag = '', autor = '', pagina = 1, por = 24 } = {}) {
  const tokens = norm(q).split(/\s+/).filter(Boolean);
  const tagN = norm(tag);
  const autorN = norm(autor);

  const out = [];
  for (const it of indice.itens) {
    if (tagN && !it.tags.some((t) => norm(t) === tagN)) continue;
    if (autorN && norm(it.autor) !== autorN) continue;

    let score = 0;
    if (tokens.length) {
      const nome = norm(it.nome + ' ' + it.variante);
      const slug = norm(it.slug);
      const tags = norm(it.tags.join(' '));
      const desc = norm(it.descricao);
      const aut = norm(it.autor);
      let ok = true;
      for (const tk of tokens) {
        let s = 0;
        if (nome.includes(tk)) s = Math.max(s, 5);
        if (tags.includes(tk)) s = Math.max(s, 4);
        if (slug.includes(tk)) s = Math.max(s, 3);
        if (desc.includes(tk)) s = Math.max(s, 2);
        if (aut.includes(tk)) s = Math.max(s, 2);
        if (!s) { ok = false; break; }
        score += s;
      }
      if (!ok) continue;
    }
    out.push({ it, score });
  }

  out.sort((a, b) => b.score - a.score || (b.it.salvos + b.it.downloads) - (a.it.salvos + a.it.downloads));

  const total = out.length;
  const inicio = (Math.max(1, pagina) - 1) * por;
  const itens = out.slice(inicio, inicio + por).map((o) => o.it);
  return { total, pagina: Math.max(1, pagina), por, itens };
}

export function porId(indice, id) {
  return indice.itens.find((it) => String(it.id) === String(id)) || null;
}

// Baixa o código TSX do CDN do 21st.dev e cacheia em dados/componentes/cache/<id>/.
// Retorna { id, nome, componente, demo, cacheado }.
export async function baixarCodigo(ROOT, item) {
  const dir = path.join(ROOT, 'dados', 'componentes', 'cache', String(item.id));
  const fComp = path.join(dir, 'component.tsx');
  const fDemo = path.join(dir, 'demo.tsx');

  if (fs.existsSync(fComp)) {
    return {
      id: item.id,
      nome: item.nome,
      componente: fs.readFileSync(fComp, 'utf8'),
      demo: fs.existsSync(fDemo) ? fs.readFileSync(fDemo, 'utf8') : '',
      cacheado: true,
      caminhos: { componente: fComp, demo: fs.existsSync(fDemo) ? fDemo : '' },
    };
  }

  const baixa = async (url) => {
    if (!url) return '';
    const r = await fetch(url);
    if (!r.ok) throw new Error(`CDN ${r.status} em ${url}`);
    return await r.text();
  };

  const [componente, demo] = await Promise.all([baixa(item.codigo), baixa(item.demo)]);

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fComp, componente);
  if (demo) fs.writeFileSync(fDemo, demo);
  fs.writeFileSync(
    path.join(dir, 'meta.json'),
    JSON.stringify({ ...item, baixadoEm: new Date().toISOString() }, null, 2)
  );

  return {
    id: item.id,
    nome: item.nome,
    componente,
    demo,
    cacheado: false,
    caminhos: { componente: fComp, demo: demo ? fDemo : '' },
  };
}
