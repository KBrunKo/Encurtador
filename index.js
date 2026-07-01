export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. ROTA DE CRIAÇÃO (POST)
    if (request.method === "POST" && path === "/shorten") {
      try {
        const { longUrl } = await request.json();
        
        // Validação básica
        if (!longUrl) {
          return new Response(JSON.stringify({ error: "URL longa é obrigatória." }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        // Gera um código curto aleatório de 6 caracteres (base 36)
        const shortCode = Math.random().toString(36).substring(2, 8);

        // Salva no Cloudflare KV: Chave = shortCode, Valor = longUrl
        await env.LINKS_KV.put(shortCode, longUrl);

        const shortUrl = `${url.origin}/${shortCode}`;

        return new Response(JSON.stringify({ shortUrl }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Erro interno no servidor." }), { status: 500 });
      }
    }

    // 2. ROTA DE REDIRECIONAMENTO (GET /:id)
    if (request.method === "GET" && path !== "/") {
      const shortCode = path.replace("/", "");

      // Busca a URL original no KV usando o código como chave
      const originalUrl = await env.LINKS_KV.get(shortCode);

      // Tratamento para códigos inexistentes (Critério de Sucesso!)
      if (!originalUrl) {
        return new Response("Oops! Esse link encurtado não existe ou expirou. 😢", {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      // Redireciona com status 307 (Redirecionamento Temporário)
      return Response.redirect(originalUrl, 307);
    }

    // Caso acesse a raiz do Worker por engano
    return new Response("Worker do Encurtador Ativo!", { status: 200 });
  }
};