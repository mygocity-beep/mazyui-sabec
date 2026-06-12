// local-routes.mjs — loader de módulos deste cliente (intocável pelo sync).
//
// Arquitetura modular: cada feature vive numa pasta modulos/<id>/ com:
//   modulo.json  (opcional) — { nome, versao, descricao }
//   rotas.mjs    (opcional) — export register({ ROOT, helpers, addRoute, MODULO })
//   painel.js    (opcional) — ES module que registra painéis via window.Sabec
//
// Este arquivo NÃO precisa ser editado pra adicionar feature nova: basta
// criar a pasta do módulo e reiniciar o servidor. Pastas começando com
// "_" ou "." são ignoradas (ex: _template; renomear pra _nome desativa).
//
// Isolamento de falha: cada módulo carrega em try/catch próprio — um
// módulo quebrado vira status "erro" em /api/modulos, nunca derruba o
// servidor nem os outros módulos.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modulos = []; // status de cada módulo, exposto em /api/modulos

export function register({ ROOT, helpers, addRoute }) {
  const { json } = helpers;

  addRoute('GET', '/api/modulos', (req, res) => json(res, 200, { modulos }));

  const dir = path.join(ROOT, 'modulos');
  if (!fs.existsSync(dir)) return;

  const ids = fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
    .map(d => d.name)
    .sort();

  // Async interno: o servidor não espera o register() — rotas de módulo
  // podem entrar um tick depois do listen, o que é seguro porque o match
  // de rota acontece por requisição. O catch final garante que nenhuma
  // rejeição escapa (o try/catch do servidor não cobre código async).
  (async () => {
    for (const id of ids) {
      const base = path.join(dir, id);
      const m = {
        id,
        nome: id,
        versao: '',
        descricao: '',
        rotas: fs.existsSync(path.join(base, 'rotas.mjs')) ? 'pendente' : '—',
        painel: fs.existsSync(path.join(base, 'painel.js')),
        erro: '',
      };
      modulos.push(m);

      try {
        const manifesto = path.join(base, 'modulo.json');
        if (fs.existsSync(manifesto)) {
          const meta = JSON.parse(fs.readFileSync(manifesto, 'utf8'));
          if (meta.nome) m.nome = String(meta.nome);
          if (meta.versao) m.versao = String(meta.versao);
          if (meta.descricao) m.descricao = String(meta.descricao);
        }
      } catch (e) {
        m.erro = 'modulo.json inválido: ' + (e.message || e);
      }

      if (m.rotas === 'pendente') {
        try {
          const mod = await import(pathToFileURL(path.join(base, 'rotas.mjs')).href);
          if (typeof mod.register !== 'function') {
            throw new Error('rotas.mjs não exporta register({ ROOT, helpers, addRoute })');
          }
          await mod.register({ ROOT, helpers, addRoute, MODULO: base });
          m.rotas = 'ok';
        } catch (e) {
          m.rotas = 'erro';
          m.erro = String(e.message || e);
          console.error(`[mazyui] módulo "${id}" falhou ao registrar rotas:`, m.erro);
        }
      }

      console.log(`[mazyui] módulo "${id}"${m.versao ? ' v' + m.versao : ''} — rotas: ${m.rotas}, painel: ${m.painel ? 'sim' : 'não'}${m.erro ? ' — ' + m.erro : ''}`);
    }
  })().catch(e => console.error('[mazyui] loader de módulos falhou:', e.message || e));
}
