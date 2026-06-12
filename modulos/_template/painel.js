// painel.js — painel de UI deste módulo (opcional; apague se não precisar).
// ES module carregado dinamicamente pelo local-ui.js. Contrato em modulos/README.md.

window.Sabec.v2.registerPanel({
  id: 'exemplo',            // troque pelo id do módulo (= nome da pasta)
  label: 'Exemplo',
  crumb: 'Exemplo',
  glyph: 'E',
  sidebar: true,
  v2: true,

  onMount: async (host, ctx) => {
    const { html, render } = ctx;
    ctx.setTopbar('Exemplo', 'Painel de exemplo');

    const r = await ctx.api.call('GET', '/api/exemplo/ping?q=oi');
    render(html`
      <div class="card">
        <b>Funcionou.</b> Resposta do servidor: <code>${JSON.stringify(r)}</code>
      </div>
    `, host);
  },

  onUnmount: () => { /* cleanup opcional */ },
});
