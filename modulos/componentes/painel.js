// modulos/componentes/painel.js — painel "Componentes" (navegador do catálogo 21st.dev).
// Carregado dinamicamente pelo local-ui.js via import('/api/file?path=...').
// Painel v2 (lit-html via ctx) com estado local + draw imperativo.

const CSS = `
.cmp-toolbar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:14px; }
.cmp-busca { flex:1; min-width:240px; padding:10px 14px; border:1px solid var(--line-strong);
  border-radius:8px; background:transparent; color:inherit; font:inherit; outline:none; }
.cmp-busca:focus { border-color: var(--red); }
.cmp-tags { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; }
.cmp-tag { padding:5px 12px; border:1px solid var(--line); border-radius:999px; cursor:pointer;
  font-size:11.5px; opacity:.75; user-select:none; background:transparent; color:inherit; font-family:var(--mono); }
.cmp-tag:hover { opacity:1; border-color:var(--line-strong); }
.cmp-tag.ativo { background:var(--red); color:var(--paper); border-color:var(--red); opacity:1; }
.cmp-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); gap:14px; }
.cmp-card { border:1px solid var(--line); border-radius:12px; overflow:hidden; cursor:pointer;
  transition:border-color .15s ease, transform .15s ease; background:var(--paper-2, rgba(0,0,0,.04)); }
.cmp-card:hover { border-color:var(--red); transform:translateY(-2px); }
.cmp-thumb { width:100%; aspect-ratio:16/10; object-fit:cover; display:block; background:#101010; }
.cmp-thumb-vazio { width:100%; aspect-ratio:16/10; display:flex; align-items:center; justify-content:center;
  font-family:var(--mono); font-size:11px; opacity:.4; background:rgba(0,0,0,.15); }
.cmp-meta { padding:10px 12px; }
.cmp-nome { font-size:13px; font-weight:600; line-height:1.3; }
.cmp-sub { font-size:11px; opacity:.55; margin-top:3px; font-family:var(--mono); }
.cmp-paginacao { display:flex; gap:10px; align-items:center; justify-content:center; margin:22px 0; }
.cmp-det-capa { width:100%; max-height:420px; object-fit:contain; border-radius:12px;
  border:1px solid var(--line); display:block; background:#101010; }
.cmp-det-tags { display:flex; gap:6px; flex-wrap:wrap; margin:12px 0; }
.cmp-acoes { display:flex; gap:10px; flex-wrap:wrap; margin:16px 0; }
.cmp-codigo { white-space:pre; overflow:auto; max-height:480px; font-family:var(--mono);
  font-size:11.5px; line-height:1.5; padding:14px; border:1px solid var(--line);
  border-radius:8px; background:rgba(0,0,0,.18); }
.cmp-voltar { cursor:pointer; font-family:var(--mono); font-size:12px; opacity:.7; margin-bottom:14px; display:inline-block; }
.cmp-voltar:hover { opacity:1; }
`;

window.Sabec.v2.registerPanel({
  id: 'componentes',
  label: 'Componentes',
  crumb: 'Componentes',
  glyph: '◳',
  sidebar: true,
  v2: true,

  onMount: async (container, ctx) => {
    const { html, render } = ctx;

    if (!document.getElementById('cmp-css')) {
      const st = document.createElement('style');
      st.id = 'cmp-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }

    // estado local do painel
    const S = {
      q: '', tag: '', pagina: 1,
      dados: null,      // resposta da busca
      erro: '',
      detalhe: null,    // item aberto
      codigo: null,     // { componente, demo } do item aberto
      baixando: false,
    };

    let geracao = 0; // descarta respostas fora de ordem
    const buscar = async () => {
      const g = ++geracao;
      try {
        const qs = new URLSearchParams({ q: S.q, tag: S.tag, pagina: String(S.pagina), por: '24' });
        const r = await ctx.api.call('GET', '/api/componentes/buscar?' + qs);
        if (g !== geracao) return;
        S.dados = r; S.erro = '';
      } catch (e) {
        if (g !== geracao) return;
        S.erro = String(e.message || e);
      }
      draw();
    };

    let timer = null;
    const aoDigitar = (ev) => {
      S.q = ev.target.value;
      S.pagina = 1;
      clearTimeout(timer);
      timer = setTimeout(buscar, 250);
    };

    const toggleTag = (tag) => {
      S.tag = S.tag === tag ? '' : tag;
      S.pagina = 1;
      buscar(); draw();
    };

    const irPagina = (p) => {
      S.pagina = p;
      buscar();
      container.scrollTop = 0;
      document.getElementById('content')?.scrollTo?.(0, 0);
    };

    const abrir = (item) => {
      S.detalhe = item; S.codigo = null;
      ctx.setTopbar('Componentes', item.nome);
      draw();
    };

    const fechar = () => {
      S.detalhe = null; S.codigo = null;
      ctx.setTopbar('Componentes', 'Catálogo de componentes');
      draw();
    };

    const carregarCodigo = async () => {
      if (!S.detalhe || S.baixando) return;
      S.baixando = true; draw();
      try {
        S.codigo = await ctx.api.call('GET', '/api/componentes/codigo?id=' + S.detalhe.id);
      } catch (e) {
        ctx.toast('Erro ao baixar código: ' + (e.message || e));
      }
      S.baixando = false; draw();
    };

    const copiar = async (texto, rotulo) => {
      try {
        await navigator.clipboard.writeText(texto);
        ctx.toast(rotulo + ' copiado');
      } catch { ctx.toast('Não consegui copiar'); }
    };

    const copiarPedido = (item) => copiar(
      `Use o componente "${item.nome}" (id ${item.id}) do catálogo 21st como referência. ` +
      `Baixe o código com: node .claude/skills/componentes/codigo.mjs ${item.id} — ` +
      `e adapte ao design do projeto atual.`,
      'Pedido pro chat'
    );

    const viewLista = () => {
      const d = S.dados;
      const tags = (d?.tagsTop || []).slice(0, 22);
      const totalPag = d ? Math.max(1, Math.ceil(d.total / d.por)) : 1;
      return html`
        <div class="cmp-toolbar">
          <input class="cmp-busca" type="search" placeholder="Buscar entre ${d?.totalCatalogo ?? '…'} componentes — hero, pricing, faq, 3d, retro…"
            .value=${S.q} @input=${aoDigitar} />
        </div>
        <div class="cmp-tags">
          ${tags.map(t => html`
            <span class="cmp-tag ${S.tag === t.tag ? 'ativo' : ''}" @click=${() => toggleTag(t.tag)}>${t.tag} · ${t.n}</span>
          `)}
        </div>
        ${S.erro ? html`<div class="card" style="color:var(--red)">${S.erro}</div>` : ''}
        ${!d ? html`<div class="cmp-thumb-vazio">carregando catálogo…</div>` : html`
          <div class="kicker" style="margin-bottom:10px">${d.total} resultado(s)</div>
          <div class="cmp-grid">
            ${d.itens.map(it => html`
              <div class="cmp-card" @click=${() => abrir(it)}>
                ${it.preview
                  ? html`<img class="cmp-thumb" loading="lazy" src=${it.preview} alt=${it.nome}
                      @error=${(e) => { e.target.outerHTML = '<div class="cmp-thumb-vazio">sem preview</div>'; }} />`
                  : html`<div class="cmp-thumb-vazio">sem preview</div>`}
                <div class="cmp-meta">
                  <div class="cmp-nome">${it.nome}${it.variante ? ' · ' + it.variante : ''}</div>
                  <div class="cmp-sub">@${it.autor} — ★${it.salvos} ↓${it.downloads}</div>
                </div>
              </div>
            `)}
          </div>
          <div class="cmp-paginacao">
            <button class="btn" ?disabled=${S.pagina <= 1} @click=${() => irPagina(S.pagina - 1)}>← anterior</button>
            <span style="font-family:var(--mono);font-size:12px;opacity:.6">${S.pagina} / ${totalPag}</span>
            <button class="btn" ?disabled=${S.pagina >= totalPag} @click=${() => irPagina(S.pagina + 1)}>próxima →</button>
          </div>
        `}
      `;
    };

    const viewDetalhe = () => {
      const it = S.detalhe;
      return html`
        <span class="cmp-voltar" @click=${fechar}>← voltar pro catálogo</span>
        ${it.preview ? html`<img class="cmp-det-capa" src=${it.preview} alt=${it.nome} />` : ''}
        <h2 style="margin:16px 0 4px">${it.nome}${it.variante ? ' · ' + it.variante : ''}</h2>
        <div class="cmp-sub">@${it.autor} — ★${it.salvos} salvos · ↓${it.downloads} downloads · id ${it.id}</div>
        ${it.descricao ? html`<p style="margin:12px 0;max-width:680px;line-height:1.6">${it.descricao}</p>` : ''}
        <div class="cmp-det-tags">
          ${it.tags.map(t => html`<span class="cmp-tag" @click=${() => { fechar(); toggleTag(t); }}>${t}</span>`)}
        </div>
        <div class="cmp-acoes">
          <button class="btn" @click=${carregarCodigo} ?disabled=${S.baixando}>
            ${S.baixando ? 'baixando…' : (S.codigo ? 'recarregar código' : 'ver código')}
          </button>
          <button class="btn" @click=${() => copiarPedido(it)}>copiar pedido pro chat</button>
          <a class="btn" href=${it.fonte} target="_blank" rel="noopener">abrir no 21st.dev ↗</a>
        </div>
        ${S.codigo ? html`
          <div class="kicker" style="margin:14px 0 6px">component.tsx
            <span class="cmp-tag" style="margin-left:8px" @click=${() => copiar(S.codigo.componente, 'component.tsx')}>copiar</span>
          </div>
          <pre class="cmp-codigo">${S.codigo.componente}</pre>
          ${S.codigo.demo ? html`
            <div class="kicker" style="margin:14px 0 6px">demo.tsx
              <span class="cmp-tag" style="margin-left:8px" @click=${() => copiar(S.codigo.demo, 'demo.tsx')}>copiar</span>
            </div>
            <pre class="cmp-codigo">${S.codigo.demo}</pre>
          ` : ''}
          <div class="cmp-sub" style="margin-top:8px">cache local: dados/componentes/cache/${it.id}/</div>
        ` : ''}
      `;
    };

    const draw = () => {
      render(html`
        <div style="max-width:1100px;margin:0 auto">
          ${S.detalhe ? viewDetalhe() : viewLista()}
        </div>
      `, container);
    };

    ctx.setTopbar('Componentes', 'Catálogo de componentes');
    draw();
    buscar();
  },

  onUnmount: () => { /* sem timers persistentes além do debounce — GC resolve */ },
});
