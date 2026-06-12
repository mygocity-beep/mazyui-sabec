---
name: componentes
description: Catálogo de 3.915 componentes web do 21st.dev (heros, pricing, FAQ, cards, animações, 3D, shaders) com busca local e download de código do CDN. Use quando o usuário pedir uma landing page, site, painel ou qualquer interface web e você quiser referências de design de alto nível; quando pedir "/componentes"; ou quando pedir pra buscar/usar um componente específico do catálogo.
---

# Catálogo de componentes (21st.dev)

Pacote de capacidade de design: 3.915 componentes profissionais catalogados,
com busca offline e código TSX baixável do CDN público (sem login).

## Ferramentas

```bash
# Buscar (offline, rankeado por relevância + popularidade)
node .claude/skills/componentes/buscar.mjs "hero animado" --n 10
node .claude/skills/componentes/buscar.mjs pricing --tag "Landing Page"
node .claude/skills/componentes/buscar.mjs --tags              # lista top tags

# Baixar código (cacheia em dados/componentes/cache/<id>/)
node .claude/skills/componentes/codigo.mjs <id>                # grava e mostra caminhos
node .claude/skills/componentes/codigo.mjs <id> --print        # imprime no stdout
```

Servidor MazyUI rodando? As mesmas funções existem em
`/api/componentes/buscar|item|codigo`, e o painel **Componentes** na sidebar
permite ao usuário navegar visualmente (previews em imagem) e te mandar um
pedido pelo chat.

## Fluxo de trabalho num projeto

1. **Contexto antes de catálogo.** Leia a identidade do projeto primeiro
   (`identidade/design-guide.md` pra peças da Sabec, ou o brief/identidade do
   projeto específico). O componente serve ao design — nunca o contrário.
2. **Busque 2–4 candidatos por seção** (hero, features, pricing, faq, cta…).
   Use termos em inglês (catálogo é em inglês): "hero", "bento grid",
   "testimonial", "pricing", "navbar". Filtre por tag quando ajudar.
3. **Baixe o código dos escolhidos** com `codigo.mjs <id>`. O cache evita
   re-download; `dados/componentes/cache/<id>/meta.json` guarda os metadados.
4. **Adapte conforme o alvo do projeto:**
   - **Projeto React/Next + Tailwind** → use o TSX quase direto. Resolva
     imports (`@/lib/utils` → função `cn` local; `framer-motion`,
     `lucide-react` → instalar). O bloco `demo.tsx` mostra o uso.
   - **Projeto HTML estático (padrão MazyUI)** → o TSX é *referência de
     design*: traduza a estrutura pro HTML, as classes Tailwind pra CSS
     próprio e as animações framer-motion pra CSS animations/transitions
     (ou JS vanilla leve). Não inclua React num projeto estático.
5. **Re-skin obrigatório.** Nunca entregue o visual default (cores Tailwind,
   Inter genérica). Mapeie cores, fontes, radius e espaçamento pro design
   system do projeto. Pra Sabec: `#0A0A0A` base, `#1F4FFF` acento, Space
   Grotesk/Inter/JetBrains Mono, grão + grade técnica (ver design-guide.md).
6. **Crédito:** mantenha um comentário com a fonte
   (`<!-- adaptado de <fonte do 21st.dev> -->`) no arquivo gerado.

## O que tem no catálogo (top tags)

Animated (409) · Card (384) · Hero (266) · Button (264) · Framer Motion (136)
· Input (114) · Features (89) · Landing Page (80) · Calendar (77) ·
3d-effects (75) · Shader (64) · Accordion/FAQ (60) · Loader (59) · Form (58)
· Menu (58) · AI Chat (55) · Retro/8bit (65) · Data Visualization (67) ·
Pricing, Testimonial, Navbar, Footer, Sign-in, Dock, Globe, Particles…
(`buscar.mjs --tags` pra lista completa)

## Manutenção

- O índice vem de `21st_component_catalog/output/catalog.json` (scraper).
  Depois de re-rodar o scraper, atualize com:
  `node .claude/skills/componentes/atualizar-indice.mjs`
- Rotas do servidor e painel: módulo `modulos/componentes/`
  (`rotas.mjs` + `painel.js`), carregado pelos loaders `local-routes.mjs`
  / `local-ui.js` (regra inviolável do CLAUDE.md — nunca mover pra
  arquivos do sistema).
