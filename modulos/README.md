# Módulos do cliente

Cada feature deste cliente vive numa pasta própria aqui dentro — rotas de
servidor, painel de UI e manifesto juntos. Os loaders (`local-routes.mjs`
e `local-ui.js` na raiz) descobrem e carregam tudo sozinhos: **adicionar
módulo não exige editar nenhum arquivo existente**, só criar a pasta e
reiniciar o servidor pelo botão da topbar.

```
modulos/
  _template/          ← copie esta pasta pra começar um módulo novo
  componentes/        ← exemplo real: catálogo 21st.dev
    modulo.json       ← manifesto: { nome, versao, descricao }
    rotas.mjs         ← rotas de servidor (opcional)
    painel.js         ← painel de UI (opcional)
```

## Regras

- **Todos os arquivos são opcionais.** Módulo só de rotas (sem UI) ou só
  de painel (sem servidor) é válido.
- **Prefixo `_` desativa.** `modulos/caixa/` → `modulos/_caixa/` e o
  módulo some no próximo restart. `_template/` nunca é carregado.
- **Prefixe suas rotas** com `/api/<id-do-modulo>/...` pra nunca colidir
  com rotas internas (que sempre vencem) nem com outros módulos.
- **Node stdlib apenas** em `rotas.mjs` — o sistema não tem build nem
  `node_modules`. Na UI, use o lit-html que chega via `ctx`.
- **Dados do módulo** vão em `dados/<id-do-modulo>/`.
- **Reinicie o servidor** depois de editar qualquer arquivo de módulo —
  hot reload não é suportado de propósito.

## Isolamento de falha

Cada módulo carrega em try/catch próprio, nas duas pontas:

- `rotas.mjs` quebrado → vira `rotas: erro` em `/api/modulos`, servidor e
  demais módulos seguem de pé.
- `painel.js` quebrado → vira `painel: erro`, UI e demais painéis seguem.
- Painel que quebra **dentro** do `onMount` → o registry do sistema já
  captura e renderiza um card de erro só naquele painel.

O painel **Módulos** na sidebar mostra o status de carga de cada módulo,
com a mensagem de erro quando houver.

## Contrato de `rotas.mjs`

```js
export function register({ ROOT, helpers, addRoute, MODULO }) {
  // ROOT    — raiz do workspace (string)
  // MODULO  — caminho absoluto da pasta deste módulo (string)
  // helpers — json(res, status, payload) · text(res, status, body, ct?)
  //           readBody(req) · safeResolve(rel) · readSafe(rel)
  addRoute('GET', '/api/meumodulo/coisas', (req, res, url) => {
    helpers.json(res, 200, { ok: true, q: url.searchParams.get('q') });
  });
}
```

`register` pode ser async. Match de rota é por (método, pathname) exato —
query string funciona normal.

## Contrato de `painel.js`

ES module carregado via `import()` dinâmico depois do boot. Registra
painéis pelo bridge global:

```js
window.Sabec.v2.registerPanel({
  id: 'meumodulo', label: 'Meu módulo', crumb: 'Meu módulo',
  glyph: 'M', sidebar: true, v2: true,
  onMount: async (host, ctx) => {
    const { html, render } = ctx;            // lit-html via ctx
    const dados = await ctx.api.call('GET', '/api/meumodulo/coisas');
    render(html`<div class="card">${dados.ok}</div>`, host);
  },
  onUnmount: () => { /* cleanup opcional */ },
});
```

`ctx` traz: `state`, `setTopbar`, `setActive`, `api.call`, `fileUrl`,
`toast`, `escapeHtml` + (v2) `html`, `render`, `subscribe`. CSS do painel:
injete um `<style id="<id>-css">` no `onMount` (veja `componentes/painel.js`).

## Versionamento e reuso entre clientes

`modulo.json` declara `versao` (semver). Pra reusar um módulo em outro
cliente MazyUI, copie a pasta inteira — o contrato (`helpers`, `ctx`) é o
mesmo em toda instância. Se o módulo depender de uma skill ou de dados
(como `componentes` depende de `.claude/skills/componentes/` e
`dados/componentes/`), leve-os junto e anote a dependência no
`modulo.json` em `"dependencias"`.
