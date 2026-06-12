// local-ui.js — loader de painéis dos módulos deste cliente (intocável pelo sync).
//
// Não precisa ser editado pra adicionar painel novo: ele consulta
// /api/modulos (servido pelo loader em local-routes.mjs) e importa
// dinamicamente o painel.js de cada módulo via /api/file (que serve .js
// com MIME text/javascript — import() de ES module funciona sem build).
//
// Isolamento de falha: cada import roda em try/catch próprio. Painel
// quebrado vira status "erro" no painel de diagnóstico "Módulos" e no
// console — nunca derruba a UI nem os outros painéis.

(async () => {
  let lista = [];
  try {
    const r = await fetch('/api/modulos');
    if (r.ok) lista = (await r.json()).modulos || [];
    else console.warn('[modulos] /api/modulos respondeu', r.status);
  } catch (e) {
    console.warn('[modulos] /api/modulos indisponível:', e.message || e);
  }

  for (const m of lista) {
    if (!m.painel) { m.painelStatus = '—'; continue; }
    try {
      await import('/api/file?path=' + encodeURIComponent(`modulos/${m.id}/painel.js`));
      m.painelStatus = 'ok';
    } catch (e) {
      m.painelStatus = 'erro';
      m.erroPainel = String(e.message || e);
      console.error(`[modulos] painel de "${m.id}" falhou:`, e);
    }
  }

  // Painel de diagnóstico: lista módulos, versões e status de carga.
  window.Sabec.v2.registerPanel({
    id: 'modulos',
    label: 'Módulos',
    crumb: 'Módulos',
    glyph: '▣',
    sidebar: true,
    v2: true,

    onMount: (host, ctx) => {
      const { html, render } = ctx;
      ctx.setTopbar('Módulos', 'Módulos do cliente');

      const chip = (txt, ok) => html`<span style="font-family:var(--mono);font-size:11px;padding:3px 10px;
        border-radius:999px;border:1px solid ${ok === false ? 'var(--red)' : 'var(--line)'};
        color:${ok === false ? 'var(--red)' : 'inherit'};opacity:${ok === undefined ? .5 : 1}">${txt}</span>`;

      render(html`
        <div style="max-width:760px;margin:0 auto">
          <div class="kicker" style="margin-bottom:14px">${lista.length} módulo(s) em modulos/</div>
          ${lista.length === 0 ? html`
            <div class="card">Nenhum módulo instalado. Crie uma pasta em <code>modulos/</code>
              a partir de <code>modulos/_template/</code> e reinicie o servidor.</div>
          ` : lista.map(m => html`
            <div class="card" style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap">
                <div>
                  <b>${m.nome}</b>
                  <span style="font-family:var(--mono);font-size:11px;opacity:.5;margin-left:8px">
                    ${m.id}${m.versao ? ' · v' + m.versao : ''}</span>
                </div>
                <div style="display:flex;gap:6px">
                  ${chip('rotas: ' + m.rotas, m.rotas === 'erro' ? false : (m.rotas === 'ok' ? true : undefined))}
                  ${chip('painel: ' + (m.painelStatus || '—'), m.painelStatus === 'erro' ? false : (m.painelStatus === 'ok' ? true : undefined))}
                </div>
              </div>
              ${m.descricao ? html`<div style="font-size:13px;opacity:.7;margin-top:6px">${m.descricao}</div>` : ''}
              ${m.erro ? html`<div style="font-family:var(--mono);font-size:11.5px;color:var(--red);margin-top:8px">rotas: ${m.erro}</div>` : ''}
              ${m.erroPainel ? html`<div style="font-family:var(--mono);font-size:11.5px;color:var(--red);margin-top:4px">painel: ${m.erroPainel}</div>` : ''}
            </div>
          `)}
          <div style="font-family:var(--mono);font-size:11.5px;opacity:.5;margin-top:18px;line-height:1.7">
            módulo novo → copie modulos/_template/, edite e reinicie o servidor<br>
            desativar módulo → renomeie a pasta pra _nome (prefixo _ é ignorado)<br>
            contrato completo → modulos/README.md
          </div>
        </div>
      `, host);
    },
  });
})();
