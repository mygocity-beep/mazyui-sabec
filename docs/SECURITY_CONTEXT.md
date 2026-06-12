# Contexto de Seguranca do MazyUI-SABEC

Este documento registra a leitura correta de seguranca para o MazyUI-SABEC com base no uso pretendido: cada usuario roda sua propria copia local, no proprio computador, sem acesso de outras pessoas e sem intencao inicial de publicar online.

## Modelo Principal: Uso Local Individual

O MazyUI-SABEC foi desenhado como uma ferramenta local de trabalho. O servidor escuta em `127.0.0.1`, manipula arquivos da propria pasta do projeto, chama o Claude Code CLI e entrega uma interface web para o usuario operar o sistema.

Neste modelo, o usuario e tambem o operador/admin. Portanto, algumas decisoes que seriam perigosas em uma aplicacao publica fazem sentido como ferramenta local:

| Item | Classificacao local | Motivo |
|---|---|---|
| Sem login interno | Aceitavel | O acesso esperado e somente pelo proprio computador do usuario. |
| `/api/shutdown` e `/api/restart` sem autenticacao | Aceitavel com ressalva | Sao comandos administrativos locais. |
| Claude Code com `--permission-mode bypassPermissions` | Aceitavel com consciencia | Faz parte da proposta: permitir que o assistente edite arquivos e execute tarefas no workspace. |
| Historico em `localStorage` | Aceitavel | Dados ficam no navegador local do usuario. |
| Extensoes `local-ui.js`, `local-ui.css`, `local-routes.mjs` | Adequado | O sistema foi feito para customizacao por cliente/copia local. |

## Bugs, Erros E Melhorias Que Afetam O Uso

Esta secao separa o que afeta o uso real do sistema local, o que e apenas melhoria preventiva e o que so vira problema relevante se o sistema for exposto online.

| Item | Tipo | Afeta o uso local? | Impacto pratico | Prioridade |
|---|---|---|---|---|
| `local-ui.css` sem rota no servidor | Bug funcional | Sim, se houver customizacao CSS local | O arquivo e documentado e carregado no HTML, mas nao e servido. Overrides visuais de cliente nao funcionam. | Alta |
| `safeResolve` com `startsWith(ROOT)` | Bug de seguranca/robustez | Raramente no uso normal, mas pode afetar por erro ou prompt ruim | Pode permitir leitura/escrita fora da pasta se o caminho cair em uma pasta irma com mesmo prefixo. | Alta |
| `readBody` sem limite nos JSON comuns | Fragilidade operacional | Sim, em caso de request acidental ou script ruim | Payload grande pode consumir memoria e travar o servidor local. | Media |
| Markdown sem sanitizacao | Fragilidade de UI/seguranca | Sim, se conteudo externo for colado/importado | HTML perigoso pode ser renderizado em telas que usam `marked.parse`. | Media |
| Sem testes minimos | Melhoria de manutencao | Indiretamente | Aumenta chance de regressao quando mexer em rotas, filesystem, painel ou renderizacao. | Media |
| `mazyui-server.mjs` concentra muitas responsabilidades | Melhoria arquitetural | Indiretamente | Mudancas no servidor ficam mais arriscadas porque rotas, filesystem, Claude e renderizacao estao no mesmo arquivo. | Media |
| Dependencias lazy em `.mazyui-runtime` | Detalhe operacional | Sim, na primeira execucao de Claude/Playwright | Se rede/npm falhar, a primeira execucao de Claude ou renderizacao de PNG pode falhar. | Media |
| Porta `7777` ocupada | Detalhe operacional | Sim | Uma segunda instancia nao sobe; o usuario precisa usar a instancia aberta ou encerrar o processo da porta. | Baixa |
| Sem repositorio Git nesta pasta | Detalhe de operacao | Indiretamente | Dificulta rollback, comparacao de mudancas e auditoria de atualizacoes. | Baixa/Media |
| Modelos fixos no frontend | Possivel incompatibilidade | Sim, se o Claude Code local nao aceitar algum id | Um modelo invalido pode fazer a run falhar ate o usuario selecionar outro modelo. | Media |

## O Que Vale Corrigir Primeiro No Contexto Atual

Para o uso local individual, a ordem mais pratica e:

1. Corrigir `local-ui.css`, porque afeta diretamente a customizacao prometida pelo sistema.
2. Corrigir `safeResolve`, porque e pequeno, importante e reduz risco de efeitos fora da pasta.
3. Adicionar limite ao `readBody`, porque evita travamento por payload grande.
4. Sanitizar Markdown ou bloquear HTML bruto, porque melhora seguranca sem mudar o fluxo principal.
5. Criar smoke tests minimos, porque protege o sistema contra regressao.

Itens como login, CSRF e proxy autenticado nao sao prioridade para o uso local atual. Eles passam a ser prioridade apenas se houver acesso remoto.

## Riscos Que Continuam Reais Mesmo Localmente

Alguns pontos continuam valendo como bugs ou melhorias importantes mesmo sem publicar online.

### 1. `safeResolve` Deve Ser Corrigido

O servidor valida caminhos com `abs.startsWith(ROOT)`. Isso pode aceitar uma pasta irma com o mesmo prefixo de nome, por exemplo:

```text
ROOT: C:\...\MazyUI-SABEC
path externo: C:\...\MazyUI-SABEC-evil\x.txt
```

Esse caminho ainda comeca com o texto de `ROOT`, mas esta fora da pasta real.

Recomendacao:

```js
const abs = path.resolve(ROOT, rel || '');
const relative = path.relative(ROOT, abs);
if (relative.startsWith('..') || path.isAbsolute(relative)) {
  throw new Error('Path fora do workspace');
}
```

Prioridade: alta.

### 2. `local-ui.css` Esta No Contrato, Mas Precisa De Rota

O HTML tenta carregar `/local-ui.css`, e a documentacao cita esse arquivo como ponto de customizacao. O servidor, porem, registra somente `/local-ui.js`.

Para manter o contrato de extensao completo, deve existir uma rota `GET /local-ui.css` com comportamento semelhante ao `local-ui.js`: servir o arquivo se existir e responder 404 silencioso se nao existir.

Prioridade: media/alta.

### 3. `readBody` Sem Limite Pode Travar O Processo

Uploads ja possuem limite proprio, mas endpoints JSON comuns acumulam body sem limite. Mesmo localmente, um erro de cliente, script ruim ou chamada acidental pode consumir memoria demais.

Recomendacao: criar `readBody(req, maxBytes)` ou `readJsonBody(req, maxBytes)` e aplicar limites por rota.

Prioridade: media.

### 4. Markdown Sem Sanitizacao

O sistema usa `marked.parse` e injeta HTML em algumas telas. Localmente isso e menos grave, mas ainda pode ser um problema se o usuario colar conteudo externo malicioso, importar Markdown de terceiros ou pedir ao modelo para gerar HTML perigoso.

Recomendacao: sanitizar o HTML renderizado ou bloquear HTML bruto no Markdown.

Prioridade: media.

### 5. Falta De Testes Minimos

O `package.json` atualmente possui apenas `dev` e `start`. Para uma ferramenta local isso nao impede o uso, mas aumenta o risco de regressao quando o sistema evolui.

Testes recomendados:

- `safeResolve` bloqueia paths fora do workspace.
- `/api/state` responde com estrutura esperada.
- `/local-ui.css` responde 404 quando ausente e 200 quando presente.
- `readBody` rejeita payload acima do limite.
- Markdown e sanitizado ou escapa HTML perigoso.

Prioridade: media.

## Se For Subir Online Mesmo So Para Voce

Se o sistema for acessivel pela internet, mesmo com a intencao de uso individual, o modelo de risco muda. Online, nao basta presumir que "so eu vou acessar". Um bot, link vazado, DNS exposto, proxy mal configurado, navegador autenticado ou pagina maliciosa podem tentar acionar endpoints locais/remotos.

Neste caso, o MazyUI deixa de ser apenas uma ferramenta local confiavel e passa a ser uma aplicacao remota com poder de editar arquivos e rodar comandos no servidor. Antes de publicar, os itens abaixo passam a ser obrigatorios.

## Requisitos Minimos Para Uso Online Privado

### 1. Acesso Por VPN Ou Camada De Identidade

Preferir uma destas opcoes:

1. Tailscale ou ZeroTier.
2. Cloudflare Access com login e 2FA.
3. Reverse proxy com HTTPS e autenticacao forte.

Evitar expor `node mazyui-server.mjs` diretamente na internet.

### 2. Autenticacao Em Todas As Rotas Sensiveis

Rotas que devem exigir autenticacao/token:

- `POST /api/run`
- `POST /api/save`
- `POST /api/delete-file`
- `POST /api/upload`
- `POST /api/shutdown`
- `POST /api/restart`
- `POST /api/render-slide`
- `POST /api/render-carrossel`
- `POST /api/snapshot-siblings`
- `POST /api/restore-siblings`
- `GET /api/file`

### 3. Proteger Contra CSRF E Origem Indevida

Mesmo com login, uma pagina externa pode tentar fazer POST usando o navegador do usuario.

Adicionar:

- validacao de `Origin`;
- validacao de `Host`;
- token CSRF ou header custom obrigatorio;
- cookies `SameSite=Strict` se houver sessao por cookie.

### 4. Remover `bypassPermissions` Como Padrao

Online, `--permission-mode bypassPermissions` nao deve ser comportamento padrao.

Recomendacao:

- manter bypass apenas quando `MAZYUI_TRUSTED_LOCAL_ONLY=1`;
- usar modo mais restrito para ambiente remoto;
- exigir confirmacao manual para operacoes destrutivas.

### 5. Corrigir `safeResolve` Antes De Publicar

Esse ajuste e obrigatorio para qualquer exposicao remota.

### 6. Bloquear Arquivos Sensiveis Em `/api/file`

Mesmo dentro do workspace, algumas pastas/arquivos nao devem ser servidos remotamente:

- `.git/`
- `.mazyui-runtime/`
- `.env`
- arquivos de log
- secrets
- chaves privadas
- configs de autenticacao
- `node_modules/`

### 7. Limites De Tamanho E Rate Limit

Adicionar:

- limite por body;
- limite por upload;
- timeout por execucao;
- limite de runs simultaneas;
- rate limit por IP/usuario.

### 8. HTTPS Obrigatorio

Se houver acesso remoto, usar HTTPS. Sem HTTPS, credenciais e conteudo podem vazar no caminho.

## Classificacao De Implantacao

| Cenario | Status recomendado |
|---|---|
| Uso local em `127.0.0.1` por uma pessoa | Adequado com melhorias pontuais |
| Uso em rede domestica/LAN | Aceitavel somente com confianca na rede |
| Acesso remoto via Tailscale/ZeroTier | Recomendado para uso privado |
| Acesso remoto via Cloudflare Access | Bom se bem configurado |
| VPS publica com login simples | Risco alto sem hardening |
| Node exposto direto na internet | Nao recomendado |

## Prioridade Recomendada

Para o uso local atual:

1. Corrigir `safeResolve`.
2. Adicionar rota `/local-ui.css`.
3. Adicionar limite ao `readBody`.
4. Sanitizar Markdown.
5. Criar smoke tests minimos.

Para uso online privado:

1. Usar VPN, Cloudflare Access ou reverse proxy autenticado.
2. Corrigir `safeResolve`.
3. Proteger todas as rotas sensiveis.
4. Remover `bypassPermissions` como padrao remoto.
5. Adicionar CSRF/origin check.
6. Bloquear arquivos sensiveis em `/api/file`.
7. Adicionar limites, timeouts e rate limit.

## Decisao Atual

Para o contexto atual, o sistema deve ser tratado como ferramenta local confiavel, nao como aplicacao web publica. As decisoes de poder alto fazem sentido nesse modelo, desde que o usuario entenda que o Claude Code pode atuar sobre os arquivos da pasta.

Se a decisao mudar para acesso online, mesmo privado, a seguranca precisa ser elevada antes da publicacao.
