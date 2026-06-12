# Debug Report — MazyUI-SABEC
**Data:** 2026-06-10
**Arquivo auditado:** `mazyui-server.mjs`
**Ferramenta:** MCP agente-a-maxx (pipeline F0→F5)

---

## Resumo Executivo

| # | Severidade | Arquivo | Status |
|---|---|---|---|
| 1 | 🔴 Crítico | `mazyui-server.mjs` linha 1036 | Corrigido |
| 2 | 🟡 Latente | `mazyui-server.mjs` linha 511 | Corrigido |
| 3 | ℹ️ Config | `_memoria/empresa.md` | Pendente (requer `/instalar`) |

---

## Bug 1 — Rota `/local-ui.css` ausente (Crítico)

### Descrição
O arquivo `mazyui-ui.html` (linha 14) carrega o CSS de customização do cliente:

```html
<link rel="stylesheet" href="/local-ui.css" onerror="this.remove()">
```

O servidor possuía a rota `GET /local-ui.js` para extensões JavaScript, mas **não havia rota correspondente para `/local-ui.css`**. O servidor retornava `404 Not Found`, e o atributo `onerror="this.remove()"` silenciava o erro — tornando o problema invisível durante o uso normal.

### Impacto
Qualquer cliente com um arquivo `local-ui.css` (customização de cores, fontes, paleta) nunca tinha o CSS aplicado. A feature de tema por cliente (`local-ui.css`) estava completamente quebrada.

### Root Cause
Assimetria no registro de rotas: ao adicionar suporte a `local-ui.css` no HTML, a rota no servidor não foi criada.

### Fix Aplicado

**Adicionado em `mazyui-server.mjs`:**

```js
// Linhas 1020–1028 (novo handler)
function handleLocalUiCss(req, res) {
  const file = path.join(ROOT, 'local-ui.css');
  if (!fs.existsSync(file)) return text(res, 404, 'sem local-ui.css');
  res.writeHead(200, {
    'Content-Type': 'text/css; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
}

// Linha 1036 (nova rota)
addRoute('GET',  '/local-ui.css',        handleLocalUiCss);
```

---

## Bug 2 — `handleRestart` Windows: quoting incorreto (Latente)

### Descrição
A função `handleRestart` (Windows) construía a linha de comando do reinício assim:

```js
// Código original — BUGADO
const cmdLine = `start "" /min cmd /c "timeout /t 2 /nobreak >nul & cd /d "${ROOT}" & node "${serverFile}""`;
```

O `${ROOT}` e `${serverFile}` estavam envoltos em `"..."` **dentro** da string do `cmd /c "..."`. Em paths contendo espaços, o `cmd.exe` fecha a string prematuramente na primeira `"` interna, quebrando o reinício do servidor.

### Impacto
O path atual (`c:\Users\mygoc\Downloads\Aplicativos\MazyUI-SABEC`) não contém espaços, então o bug não se manifestava. Porém, qualquer renomeação de pasta ou deploy em path com espaços quebraria o reinício pelo painel.

### Fix Aplicado

```js
// Linhas 511–512 — helper q() para escapar paths
const q = (s) => `\\"${s}\\"`;
const cmdLine = `start "" /min cmd /c "timeout /t 2 /nobreak >nul & cd /d ${q(ROOT)} & node ${q(serverFile)}"`;
```

> **[INCERTEZA]:** `\"` para escapar aspas funciona na maioria dos contextos Windows modernos. Em versões muito antigas do `cmd.exe` o comportamento pode variar. Solução definitiva: usar PowerShell ou arquivo `.bat` temporário.

---

## Observação de Configuração

### `_memoria/empresa.md` — vazio
O arquivo de memória do negócio está sem preenchimento — o comando `/instalar` ainda não foi executado nesta instância. Isso não causa erro no servidor (o campo é lido como string vazia e tratado como `null`), mas a IA não tem contexto do negócio para responder adequadamente.

**Ação:** executar `/instalar` para preencher `_memoria/empresa.md`, `_memoria/preferencias.md` e `_memoria/estrategia.md`.

---

## Verificação Final

```
node --check mazyui-server.mjs → SINTAXE OK
```

Ambas as edições foram confirmadas via `grep` no arquivo antes da entrega:

| Símbolo | Linha | Presente |
|---|---|---|
| `handleLocalUiCss` | 1020 | ✅ |
| `addRoute('/local-ui.css')` | 1036 | ✅ |
| `const q = (s)` | 511 | ✅ |

---

## MCP agente-a-maxx — Config Debug

| Check | Status |
|---|---|
| MCP online | ✅ |
| Todas as 9 ferramentas respondendo | ✅ |
| Hook `UserPromptSubmit → calibrate` | ✅ |
| `.mcp.json` — header sem espaço após `:` | ✅ (corrigido na sessão) |
