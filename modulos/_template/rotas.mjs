// rotas.mjs — rotas de servidor deste módulo (opcional; apague se não precisar).
// Contrato completo em modulos/README.md. Node stdlib apenas.

export function register({ ROOT, helpers, addRoute, MODULO }) {
  const { json } = helpers;

  // Prefixe sempre com /api/<id-do-modulo>/ pra não colidir com outras rotas.
  addRoute('GET', '/api/exemplo/ping', (req, res, url) => {
    json(res, 200, { ok: true, eco: url.searchParams.get('q') || null });
  });
}
