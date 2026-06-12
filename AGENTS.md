# Sabec/OS no Codex

Este workspace e um sistema operacional de negocio com memoria persistente, identidade visual e skills locais.

## Contexto obrigatorio

Antes de tarefas relevantes, leia:

1. `_memoria/empresa.md`
2. `_memoria/preferencias.md`
3. `_memoria/estrategia.md`
4. `identidade/design-guide.md` para qualquer trabalho visual

As regras operacionais completas continuam em `CLAUDE.md`. Leia e siga esse arquivo como fonte canonica enquanto a migracao de nomenclatura para Codex estiver em andamento.

## Skills do projeto

As skills existentes ficam em `.claude/skills/<nome>/SKILL.md`. Quando o pedido corresponder a uma delas, leia o `SKILL.md` completo antes de agir. Os comandos `/carrossel`, `/seo`, `/salvar`, `/atualizar` e demais fluxos MazyOS continuam usando essas definicoes.

## Regras

- Nao invente dados do negocio.
- Preserve alteracoes existentes que nao fazem parte da tarefa.
- Use os padroes e scripts locais antes de criar novas abstracoes.
- Outputs de negocio devem respeitar `_memoria/preferencias.md`.
- Outputs visuais devem respeitar `identidade/design-guide.md`.
- Para alteracoes de codigo, valide sintaxe e execute os testes disponiveis antes de concluir.
