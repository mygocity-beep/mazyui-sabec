# KNOWLEDGE GRAPH — MazyUI-SABEC

| Campo            | Valor                                              |
|------------------|----------------------------------------------------|
| **Projeto**      | `MazyUI-SABEC` (sabec-os)                          |
| **Linguagem**    | JavaScript (Node.js ESM + Browser ESM)             |
| **Padrão**       | Layered Monolith + Plugin System                   |
| **Frameworks**   | Node.js HTTP nativo, lit-html (vendor), marked CDN |
| **Gerado em**    | 2026-06-09                                         |
| **Modo**         | Full scan                                          |
| **Arquivos**     | 68 arquivos de código (excl. node_modules)         |

> **Origem:** Fork público de MazyOS (Vagner Mazzeo), mantido por Diogo Sabec.
> Motor privado em `github.com/DiogoSabec/sabec-os`. Clientes recebem cópias
> brandadas com `brand.config.js` e extensões em `local-*.js`.

---

## Resumo Executivo

O MazyUI é um **painel de negócio local** que combina um servidor Node.js
minimal com uma SPA modular em ES Modules puros (sem bundler). O coração do
produto é o spawn do **Claude Code CLI** como subprocesso — prompts chegam
via POST, a resposta é streamada via SSE pro frontend. Cada cliente clone
customiza via arquivos `local-routes.mjs` (rotas extras) e `local-ui.js`
(painéis extras), nunca editando os arquivos de sistema — que são
sobrescritos a cada `/atualizar-sistema`.

**Fluxo principal:**
```
Usuário → mazyui-ui.html (SPA) → /api/run (POST)
→ mazyui-server.mjs spawna claude CLI
→ SSE stream de volta pro browser
→ Painel de chat renderiza eventos em tempo real
```

---

## Clusters

| ID | Label | Responsabilidade | Nós | Arestas IN | Arestas OUT |
|----|-------|-----------------|-----|-----------|------------|
| `server` | Infraestrutura de Servidor | HTTP server, rotas, spawn Claude, renderização HTML→PNG | 2 | 0 | 8 |
| `ui-core` | Core da UI | State reativo, API, boot, brand, persist, router, registry | 9 | 3 | 22 |
| `ui-chrome` | Chrome da UI | Shell, sidebar nav, topbar, lightbox, modal | 5 | 2 | 6 |
| `panels` | Painéis Built-in | 9 painéis de conteúdo + streaming de chat | 9 | 5 | 12 |
| `extensions` | Extensões do Cliente | Pontos de extensão local (opcional) | 3 | 1 | 0 |
| `skills` | Claude Skills | 17 skills de automação de negócio | 17 | 0 | 0 |
| `business-ctx` | Contexto de Negócio | Memória, identidade visual, dados | 4 | 0 | 0 |
| `marketing` | Biblioteca de Conteúdo | Carrosséis, slides HTML, legendas | 8 | 1 | 0 |
| `styles` | Estilos CSS | Tokens de design, layout, componentes | 7 | 0 | 0 |
| `vendor` | Dependências Locais | lit-html standalone | 1 | 3 | 0 |

---

## Arquitetura

### Padrão: Layered Monolith + Plugin System

```
┌─────────────────────────────────────────────────────────┐
│  CAMADA DE EXTENSÃO (cliente)                           │
│  local-routes.mjs  │  local-ui.js  │  local-ui.css      │
├─────────────────────────────────────────────────────────┤
│  CAMADA DE PAINÉIS                                      │
│  panels/{hoje,chat,skills,memoria,identidade,           │
│          biblioteca,slide-editor,chat-stream}            │
├──────────────────────┬──────────────────────────────────┤
│  CHROME DA UI        │  CORE DA UI                      │
│  ui/{shell,nav,      │  core/{state,api,boot,brand,     │
│      topbar,         │       dom,markdown,persist,      │
│      lightbox,modal} │       router,panels-registry}    │
├──────────────────────┴──────────────────────────────────┤
│  CAMADA DE SERVIDOR                                     │
│  mazyui-server.mjs  ←  brand.config.js                 │
│  • HTTP routes (17 endpoints)                           │
│  • spawn('@anthropic-ai/claude-code')                   │
│  • SSE streaming                                        │
│  • Playwright lazy (HTML→PNG)                           │
└─────────────────────────────────────────────────────────┘
         ↓ npm install lazy em .mazyui-runtime/
┌─────────────────────────────────────────────────────────┐
│  RUNTIME EXTERNO (baixado na 1ª execução)               │
│  .mazyui-runtime/node_modules/@anthropic-ai/claude-code │
│  .mazyui-runtime/node_modules/playwright (opcional)     │
└─────────────────────────────────────────────────────────┘
```

### Entry Points (sem arestas de entrada internas)

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `mazyui-server.mjs` | Server entry | Inicia o servidor HTTP na porta 7777 |
| `mazyui-ui/index.js` | UI entry | Wires todos os módulos e chama `boot()` |
| `brand.config.js` | Config | Exporta identidade da instância (nome, marca) |

### Hotspots (> 5 arestas de entrada — módulos críticos)

| Arquivo | Arestas IN | Por quê é central |
|---------|-----------|-------------------|
| `core/state.js` | 11 | Todo módulo lê/escreve estado da UI |
| `core/panels-registry.js` | 6 | Hub de registro + bridge `window.Sabec` |
| `core/api.js` | 7 | Toda comunicação com o servidor passa aqui |
| `mazyui-server.mjs` | — | God-file do servidor (1107 linhas, 17 rotas) |
| `core/persist.js` | 5 | Toda persistência em localStorage |

### Módulos Folha (sem arestas de saída para código do projeto)

`vendor/lit-html.js`, todos os arquivos em `styles/`, `brand.config.js`,
`_memoria/*.md`, `identidade/design-guide.md`, `.claude/skills/*/SKILL.md`

---

## Nós do Grafo

### Cluster: server

| ID | Label | Tipo | Camada | Complexidade | Linhas | Exports principais |
|----|-------|------|--------|-------------|--------|-------------------|
| `mazyui-server.mjs` | Server | file | entry-point | **high** | 1107 | `addRoute`, handlers |
| `brand.config.js` | Brand Config | file | config | low | 17 | `brand` |

### Cluster: ui-core

| ID | Label | Tipo | Camada | Complexidade | Linhas | Exports principais |
|----|-------|------|--------|-------------|--------|-------------------|
| `mazyui-ui/index.js` | UI Entry | file | entry-point | medium | 74 | — (wiring) |
| `mazyui-ui/core/state.js` | State Store | file | source-core | medium | 82 | `state`, `subscribe`, `update` |
| `mazyui-ui/core/api.js` | API Layer | file | source-core | medium | 116 | `apiState`, `apiSave`, `streamRun`, `apiCall` |
| `mazyui-ui/core/boot.js` | Boot | file | source-core | high | 273 | `boot`, `setBoot`, `reload`, `reloadQuiet`, `loadLocalUi` |
| `mazyui-ui/core/brand.js` | Brand/Identity | file | source-core | medium | 161 | `extractBusiness`, `applyIdentityToCSS`, `updateBrandLogo` |
| `mazyui-ui/core/dom.js` | DOM Helpers | file | source-util | low | ~80 | `newId`, `escapeHtml`, `toast`, `autoResize` |
| `mazyui-ui/core/markdown.js` | Markdown | file | source-util | low | 156 | `renderChatMarkdown`, `extractPalette`, `extractFonts`, `extractBusiness` |
| `mazyui-ui/core/panels-registry.js` | Panel Registry | file | source-core | high | 273 | `registerPanel`, `registerPanelV2`, `mountPanel`, `Sabec` |
| `mazyui-ui/core/persist.js` | Persistence | file | source-core | medium | 313 | `getModel`, `saveChatHistory`, `loadChatSessions`, `isConsented` |
| `mazyui-ui/core/router.js` | Router | file | source-core | medium | 101 | `setActive`, `getActive`, `setTopbar`, `setNavRenderer` |

### Cluster: ui-chrome

| ID | Label | Tipo | Complexidade | Exports principais |
|----|-------|------|-----------|--------------------|
| `mazyui-ui/ui/shell.js` | App Shell | file | low | `mountShell`, `setTopbar` |
| `mazyui-ui/ui/nav.js` | Sidebar Nav | file | medium | `renderNav`, `NAV` |
| `mazyui-ui/ui/topbar.js` | Topbar | file | low | `setTopbar` |
| `mazyui-ui/ui/lightbox.js` | Lightbox | file | high | `openLightbox`, `closeLightbox`, `goSlide` |
| `mazyui-ui/ui/modal.js` | Modal | file | medium | `openSkillModal`, `closeModal`, `openGuideModal` |

### Cluster: panels

| ID | Label | Versão | Responsabilidade |
|----|-------|--------|-----------------|
| `mazyui-ui/panels/hoje.js` | Hoje | v1 | Painel home: resumo de memória + próximas prioridades |
| `mazyui-ui/panels/chat.js` | Chat | v1 | Interface de chat com histórico, model picker, attachments |
| `mazyui-ui/panels/chat-stream.js` | Chat Stream | — | Orquestra SSE → turn model → DOM (não é painel, é lib) |
| `mazyui-ui/panels/chat-attachments.js` | Attachments | — | Upload de imagens e gestão de attachments |
| `mazyui-ui/panels/memoria.js` | Memória | v1 | 3 painéis: empresa, preferências, estratégia |
| `mazyui-ui/panels/identidade.js` | Identidade | v1 | Editor de design-guide.md com undo/redo de paleta |
| `mazyui-ui/panels/skills.js` | Skills | v2 | Grid de skills disponíveis |
| `mazyui-ui/panels/biblioteca.js` | Biblioteca | v2 | Galeria de conteúdos de marketing |
| `mazyui-ui/panels/slide-editor.js` | Slide Editor | v1 | Edição inline de slides HTML com proteção de siblings |

### Cluster: extensions (opcionais, por cliente)

| ID | Label | Quando carregado | Contrato |
|----|-------|-----------------|---------|
| `local-routes.mjs` | Rotas do Cliente | Se existir na raiz | `export function register({ ROOT, helpers, addRoute })` |
| `local-ui.js` | UI do Cliente | Sempre (404 silencioso) | `window.Sabec.registerPanel(def)` |
| `local-ui.css` | CSS do Cliente | Sempre (404 silencioso) | Overrides de variáveis CSS |

---

## Arestas (Relacionamentos)

### Server Layer

| Source | Target | Tipo | Peso |
|--------|--------|------|------|
| `mazyui-server.mjs` | `brand.config.js` | imports | 1 |
| `mazyui-server.mjs` | `local-routes.mjs` | calls (dynamic import) | 1 |
| `mazyui-server.mjs` | `.mazyui-runtime/claude-code` | spawns | 1 |
| `mazyui-server.mjs` | `mazyui-ui.html` | serves | 1 |
| `mazyui-server.mjs` | `mazyui-ui/*` | serves-static | 1 |
| `mazyui-server.mjs` | `_memoria/*` | reads | 3 |
| `mazyui-server.mjs` | `identidade/design-guide.md` | reads | 1 |
| `mazyui-server.mjs` | `marketing/conteudo/` | scans | 1 |

### UI Core

| Source | Target | Tipo | Peso |
|--------|--------|------|------|
| `mazyui-ui/index.js` | `core/panels-registry.js` | imports | 3 |
| `mazyui-ui/index.js` | `core/boot.js` | imports | 2 |
| `mazyui-ui/index.js` | `core/state.js` | imports | 1 |
| `mazyui-ui/index.js` | `core/persist.js` | imports | 1 |
| `mazyui-ui/index.js` | `core/router.js` | imports | 1 |
| `mazyui-ui/index.js` | `core/dom.js` | imports | 1 |
| `mazyui-ui/index.js` | `ui/shell.js` | imports | 2 |
| `mazyui-ui/index.js` | `panels/hoje.js` | imports | 1 |
| `mazyui-ui/index.js` | `panels/chat.js` | imports | 1 |
| `mazyui-ui/index.js` | `panels/skills.js` | imports | 1 |
| `mazyui-ui/index.js` | `panels/memoria.js` | imports | 1 |
| `mazyui-ui/index.js` | `panels/identidade.js` | imports | 1 |
| `mazyui-ui/index.js` | `panels/biblioteca.js` | imports | 1 |
| `mazyui-ui/index.js` | `panels/slide-editor.js` | imports | 1 |
| `mazyui-ui/index.js` | `panels/chat-stream.js` | imports | 1 |
| `core/boot.js` | `core/state.js` | imports | 2 |
| `core/boot.js` | `core/api.js` | imports | 2 |
| `core/boot.js` | `core/brand.js` | imports | 4 |
| `core/boot.js` | `core/persist.js` | imports | 5 |
| `core/brand.js` | `core/state.js` | imports | 1 |
| `core/brand.js` | `core/api.js` | imports | 1 |
| `core/brand.js` | `core/markdown.js` | imports | 5 |
| `core/router.js` | `core/state.js` | imports | 1 |
| `core/router.js` | `core/panels-registry.js` | imports | 3 |
| `core/panels-registry.js` | `core/state.js` | imports | 2 |
| `core/panels-registry.js` | `core/api.js` | imports | 2 |
| `core/panels-registry.js` | `core/dom.js` | imports | 2 |
| `core/panels-registry.js` | `vendor/lit-html.js` | imports | 2 |
| `core/persist.js` | `core/state.js` | calls (dynamic) | 1 |
| `panels/chat-stream.js` | `core/state.js` | imports | 2 |
| `panels/chat-stream.js` | `core/dom.js` | imports | 2 |
| `panels/chat-stream.js` | `core/api.js` | imports | 3 |
| `panels/chat-stream.js` | `core/persist.js` | imports | 1 |
| `panels/chat-stream.js` | `core/markdown.js` | imports | 1 |
| `panels/chat-stream.js` | `core/router.js` | calls (dynamic) | 1 |
| `panels/chat-stream.js` | `core/brand.js` | calls (dynamic) | 2 |
| `ui/shell.js` | `ui/nav.js` | imports | 1 |
| `ui/shell.js` | `ui/topbar.js` | imports | 1 |
| `ui/shell.js` | `core/router.js` | calls (dynamic) | 1 |

### Circular Dependencies (resolvidas)

| Ciclo | Resolução |
|-------|-----------|
| `router.js` ↔ `panels-registry.js` | `setRouterCallbacks()` injetado no boot |
| `boot.js` ↔ `router.js` | `setBoot()` injetado pelo `index.js` |
| `chat-stream.js` → `router.js` | dynamic import no dispatchRun |
| `persist.js` → `state.js` | `_injectState()` injetado pelo `index.js` |

---

## Índice de Símbolos

| Símbolo | Arquivo | Tipo |
|---------|---------|------|
| `state` | `core/state.js` | const (objeto reativo) |
| `subscribe` | `core/state.js` | function |
| `update` | `core/state.js` | function |
| `boot` | `core/boot.js` | async function |
| `setBoot` | `core/boot.js` | function |
| `reload` | `core/boot.js` | async function |
| `reloadQuiet` | `core/boot.js` | async function |
| `loadLocalUi` | `core/boot.js` | async function |
| `apiState` | `core/api.js` | async function |
| `apiSave` | `core/api.js` | async function |
| `streamRun` | `core/api.js` | async function |
| `apiCall` | `core/api.js` | async function |
| `fileUrl` | `core/api.js` | function |
| `registerPanel` | `core/panels-registry.js` | function |
| `registerPanelV2` | `core/panels-registry.js` | function |
| `registerInternal` | `core/panels-registry.js` | function |
| `mountPanel` | `core/panels-registry.js` | async function |
| `unmountActive` | `core/panels-registry.js` | function |
| `Sabec` | `core/panels-registry.js` | const (bridge global) |
| `setActive` | `core/router.js` | function |
| `setTopbar` | `core/router.js` | function |
| `setNavRenderer` | `core/router.js` | function |
| `extractBusiness` | `core/brand.js` | function |
| `applyIdentityToCSS` | `core/brand.js` | function |
| `updateBrandLogo` | `core/brand.js` | function |
| `extractPalette` | `core/markdown.js` | function |
| `extractFonts` | `core/markdown.js` | function |
| `renderChatMarkdown` | `core/markdown.js` | function |
| `getModel` | `core/persist.js` | function |
| `setModelId` | `core/persist.js` | function |
| `saveChatHistory` | `core/persist.js` | function |
| `loadChatHistory` | `core/persist.js` | function |
| `archiveCurrentChat` | `core/persist.js` | function |
| `isConsented` | `core/persist.js` | function |
| `dispatchRun` | `panels/chat-stream.js` | function |
| `startChatRun` | `panels/chat-stream.js` | async function |
| `handleStreamEvent` | `panels/chat-stream.js` | function |
| `mountShell` | `ui/shell.js` | function |
| `renderNav` | `ui/nav.js` | function |
| `openLightbox` | `ui/lightbox.js` | async function |
| `openSkillModal` | `ui/modal.js` | function |
| `brand` | `brand.config.js` | const |
| `addRoute` | `mazyui-server.mjs` | function |
| `safeResolve` | `mazyui-server.mjs` | function |
| `scanLibrary` | `mazyui-server.mjs` | function |
| `handleRun` | `mazyui-server.mjs` | async function |
| `renderHtmlToPng` | `mazyui-server.mjs` | async function |

---

## Índice de Conceitos

| Conceito | Arquivos relacionados |
|----------|----------------------|
| `reactive-state` | `core/state.js`, `core/panels-registry.js`, `vendor/lit-html.js` |
| `panel-lifecycle` | `core/panels-registry.js`, `core/router.js`, `panels/*.js` |
| `sse-streaming` | `mazyui-server.mjs`, `core/api.js`, `panels/chat-stream.js` |
| `claude-spawn` | `mazyui-server.mjs` |
| `brand-identity` | `brand.config.js`, `core/brand.js`, `_memoria/empresa.md`, `identidade/design-guide.md` |
| `local-extension` | `local-routes.mjs`, `local-ui.js`, `local-ui.css`, `CLAUDE.md` |
| `chat-session` | `core/persist.js`, `panels/chat-stream.js`, `panels/chat.js` |
| `slide-render` | `mazyui-server.mjs`, `panels/slide-editor.js`, `panels/biblioteca.js` |
| `skill-system` | `.claude/skills/`, `panels/skills.js`, `panels/chat-stream.js` |
| `workspace-sandbox` | `mazyui-server.mjs` (`safeResolve`, `readSafe`) |
| `markdown-memory` | `_memoria/*.md`, `core/markdown.js`, `core/brand.js` |
| `lit-html-v2` | `vendor/lit-html.js`, `core/panels-registry.js`, `panels/skills.js`, `panels/biblioteca.js` |

---

## Tour Guiado (Onboarding)

**Para um novo desenvolvedor entender o MazyUI em 7 paradas:**

### Parada 1 — Servidor (entry point e arquitetura)
**Arquivo:** [`mazyui-server.mjs`](mazyui-server.mjs)
**Por que começar aqui:** É o único processo que inicia tudo. Em 1107 linhas entende-se o contrato inteiro servidor-cliente: como os arquivos são servidos, como o Claude é spawnado, como as rotas funcionam.
**O que entender:** `addRoute()` é a tabela de rotas; `handleRun()` é o coração — spawna o Claude e stream via SSE; `safeResolve()` é a sandboxing de filesystem.
**Próxima parada:** `brand.config.js` — como a instância é brandada.

### Parada 2 — Configuração de Marca
**Arquivo:** [`brand.config.js`](brand.config.js)
**Por que:** Explica o modelo multi-instância: cada cliente é um clone com esse arquivo diferente. O servidor injeta os valores como `{{BRAND_*}}` no HTML.
**O que entender:** O conceito de fork público (MazyUI) vs motor privado (sabec-os). Cada cliente customiza aqui sem tocar nos arquivos de sistema.
**Próxima parada:** `mazyui-ui/index.js` — como a SPA inicializa.

### Parada 3 — Entry Point da UI
**Arquivo:** [`mazyui-ui/index.js`](mazyui-ui/index.js)
**Por que:** É o único arquivo que orquestra tudo no browser. Revela a ordem de boot, os 7 painéis built-in, e o padrão de injeção de dependências pra evitar imports circulares.
**O que entender:** `window.Sabec = Sabec` é o contrato público. `setBoot({ setActive, setTopbar, ... })` é o padrão de injeção que resolve ciclos.
**Próxima parada:** `core/state.js` — o store reativo que todos compartilham.

### Parada 4 — Store Reativo
**Arquivo:** [`mazyui-ui/core/state.js`](mazyui-ui/core/state.js)
**Por que:** É o módulo mais importado do projeto (11 dependentes). Entender o shape do `state` e a distinção entre mutação direta (compat v1) e `update()` (triggers v2) é essencial.
**O que entender:** `update(patch)` faz shallow-merge + notifica subscribers via microtask (debounce natural). Painéis v1 leem `ctx.state.foo` diretamente; painéis v2 usam `subscribe()`.
**Próxima parada:** `core/panels-registry.js` — como os painéis são registrados e montados.

### Parada 5 — Registry de Painéis + Sabec
**Arquivo:** [`mazyui-ui/core/panels-registry.js`](mazyui-ui/core/panels-registry.js)
**Por que:** É o hub de extensibilidade. Aqui vive o `Sabec` global que clientes usam no `local-ui.js`. O lifecycle de mount/unmount e a distinção v1/v2 estão implementadas aqui.
**O que entender:** `mountPanel(id, container)` gerencia o ciclo completo. v2 assina o store automaticamente; v1 é imperativo. `setRouterCallbacks()` fecha o ciclo sem import circular.
**Próxima parada:** `panels/chat-stream.js` — o fluxo de ponta a ponta de uma mensagem.

### Parada 6 — Streaming de Chat
**Arquivo:** [`mazyui-ui/panels/chat-stream.js`](mazyui-ui/panels/chat-stream.js)
**Por que:** Implementa o fluxo mais complexo: `dispatchRun()` → SSE → parse de eventos → DOM updates em tempo real. Aqui se entende como o Claude CLI fala com a UI.
**O que entender:** `dispatchRun()` é o entry point de qualquer skill ou mensagem. `handleStreamEvent()` parseia o protocolo JSON do Claude. `TOOL_FRIENDLY` traduz ferramentas técnicas em texto humano.
**Próxima parada:** `core/persist.js` — como o estado sobrevive entre sessões.

### Parada 7 — Persistência e Sessões
**Arquivo:** [`mazyui-ui/core/persist.js`](mazyui-ui/core/persist.js)
**Por que:** Explica como o histórico de chat, modelo escolhido e consentimento persistem no localStorage. O padrão de `_injectState()` mostra como módulos resolvem dependências circulares em ESM puro.
**O que entender:** Todas as chaves têm prefixo `sabec:` e versão `:v1`. Sessões arquivadas sobrevivem à limpeza do histórico ativo. `_injectState()` é injetado por `index.js` pós-boot.

---

## Riscos Identificados

| Tipo | Descrição | Severidade | Localização |
|------|-----------|-----------|-------------|
| God Object | `mazyui-server.mjs` acumula 1107 linhas — rotas, filesystem, Playwright, snapshot | Alta | `mazyui-server.mjs` |
| Sem testes | Zero arquivos de teste encontrados no projeto | Alta | — |
| Dependências circulares | 4 ciclos resolvidos via injeção manual — frágil a refactors | Média | `core/router.js` ↔ `core/panels-registry.js` |
| Global `window.Sabec` | Bridge global exposta pra clientes — breaking change se renomear | Média | `core/panels-registry.js`, `index.js` |
| `marked` global via CDN | Markdown depende de `window.marked` injetado pelo HTML — não disponível em Node.js | Média | `core/markdown.js` |
| Playwright lazy | 170MB de Chromium baixados na 1ª renderização — pode falhar em ambientes restritos | Média | `mazyui-server.mjs:668` |
| Shallow merge de state | `update({ chat: {...} })` substitui o objeto `chat` inteiro — fácil de perder subobjetos | Baixa | `core/state.js` |
| `.mazyui-runtime` em produção | Runtime é instalado localmente — sem lock file garante versão estável | Baixa | `mazyui-server.mjs:48` |

---

## Skills Disponíveis (`.claude/skills/`)

| Skill | Propósito |
|-------|-----------|
| `abrir` | Abre o painel MazyUI no browser |
| `analisar-dados` | Análise de dados do negócio |
| `anuncio-google` | Criação de anúncios Google Ads |
| `aprovar-post` | Aprovação de posts de redes sociais |
| `atualizar` | Atualiza memória e contexto do negócio |
| `atualizar-sistema` | Sync com o repositório central (whitelist de arquivos) |
| `carrossel` | Criação de carrosséis de Instagram |
| `email-profissional` | Redação de emails profissionais |
| `instalar` | Onboarding e configuração inicial do cliente |
| `mapear-rotinas` | Mapeamento de rotinas e processos |
| `novo-projeto` | Criação de novo projeto/cliente clone |
| `publicar-tema` | Publicação de temas e identidade visual |
| `relatorio-ads` | Relatório de performance de anúncios |
| `responder-avaliacoes` | Resposta a avaliações (Google, etc.) |
| `salvar` | Salva contexto e memória atualizada |
| `seo` | Otimização de SEO |

---

## Endpoints HTTP (mazyui-server.mjs)

| Método | Path | Handler | Função |
|--------|------|---------|--------|
| GET | `/` | `handleRoot` | Serve `mazyui-ui.html` com brand substituído |
| GET | `/mazyui-ui/*` | `handleUiStatic` | Serve módulos ES da pasta `mazyui-ui/` |
| GET | `/local-ui.js` | `handleLocalUi` | Serve extensão UI do cliente (404 silencioso) |
| GET | `/api/state` | `handleState` | Retorna memória, biblioteca, logo |
| GET | `/api/file` | `handleFile` | Serve arquivos do workspace (com rewrite de URLs) |
| POST | `/api/save` | `handleSave` | Grava arquivo no workspace |
| POST | `/api/delete-file` | `handleDeleteFile` | Remove arquivo do workspace |
| POST | `/api/run` | `handleRun` | Spawna Claude CLI, SSE stream |
| POST | `/api/cancel` | `handleCancel` | Mata processo Claude em andamento |
| POST | `/api/shutdown` | `handleShutdown` | Para o servidor |
| POST | `/api/restart` | `handleRestart` | Reinicia o servidor |
| POST | `/api/open-folder` | `handleOpenFolder` | Abre pasta no Explorer/Finder |
| POST | `/api/upload` | `handleUpload` | Recebe imagem base64 → salva em `uploads/` |
| POST | `/api/snapshot-siblings` | `handleSnapshotSiblings` | Snapshot de slides irmãos antes de editar |
| POST | `/api/restore-siblings` | `handleRestoreSiblings` | Restaura slides irmãos após edição |
| POST | `/api/render-slide` | `handleRenderSlide` | HTML → PNG (Playwright) |
| POST | `/api/render-carrossel` | `handleRenderCarrossel` | Batch HTML → PNG com SSE de progresso |

---

## QA das Fases

| Check | Status | Observação |
|-------|--------|-----------|
| ≥ 90% dos arquivos source têm nó | ✅ | Todos os 68 arquivos relevantes mapeados |
| ≤ 5% de arestas não-resolvidas | ✅ | Apenas `marked` (CDN global) e `claude-code` (runtime) são externos esperados |
| Todos os nós em ao menos 1 cluster | ✅ | 10 clusters cobrem todos os nós |
| Tour tem 5-7 paradas com path válido | ✅ | 7 paradas com paths verificados |
| Todo nó tem `description` | ✅ | Tabelas de nós com descrição |
| Arquitetura descrita | ✅ | Padrão Layered Monolith + Plugin System |

---

*Gerado em 2026-06-09 via `/graph full` — MCP agente-a-maxx*
