// modulos/componentes/rotas.mjs — rotas do catálogo de componentes 21st.dev.
//
//   GET /api/componentes/buscar?q=&tag=&autor=&pagina=&por=   → busca rankeada
//   GET /api/componentes/item?id=                             → detalhe de um componente
//   GET /api/componentes/codigo?id=                           → baixa TSX do CDN (cache em dados/componentes/cache/)
//
// Índice: dados/componentes/index.json — gerado por
//   node .claude/skills/componentes/atualizar-indice.mjs

import { carregarIndice, buscar, porId, baixarCodigo } from '../../.claude/skills/componentes/lib.mjs';

export function register({ ROOT, helpers, addRoute }) {
  const { json } = helpers;

  let indice = null;
  const idx = () => (indice ??= carregarIndice(ROOT));

  addRoute('GET', '/api/componentes/buscar', (req, res, url) => {
    try {
      const p = url.searchParams;
      const r = buscar(idx(), {
        q:      p.get('q') || '',
        tag:    p.get('tag') || '',
        autor:  p.get('autor') || '',
        pagina: parseInt(p.get('pagina') || '1', 10) || 1,
        por:    Math.min(60, parseInt(p.get('por') || '24', 10) || 24),
      });
      json(res, 200, { ...r, tagsTop: idx().tagsTop, totalCatalogo: idx().total });
    } catch (e) {
      json(res, 500, { error: String(e.message || e) });
    }
  });

  addRoute('GET', '/api/componentes/item', (req, res, url) => {
    try {
      const item = porId(idx(), url.searchParams.get('id'));
      if (!item) return json(res, 404, { error: 'componente não encontrado' });
      json(res, 200, { item });
    } catch (e) {
      json(res, 500, { error: String(e.message || e) });
    }
  });

  addRoute('GET', '/api/componentes/codigo', async (req, res, url) => {
    try {
      const item = porId(idx(), url.searchParams.get('id'));
      if (!item) return json(res, 404, { error: 'componente não encontrado' });
      const r = await baixarCodigo(ROOT, item);
      json(res, 200, r);
    } catch (e) {
      json(res, 502, { error: String(e.message || e) });
    }
  });
}
