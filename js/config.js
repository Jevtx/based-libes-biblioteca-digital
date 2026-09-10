"use strict";

/* ============================================================
   CONFIGURAÇÃO DE AMBIENTE — URL da API

   Em desenvolvimento (rodando pelo Live Server / 127.0.0.1 / localhost),
   aponta para o backend Flask local, na porta 5000.

   Em produção (depois de publicar no Netlify), troque a linha abaixo
   marcada com "SUBSTITUA" pela URL pública real do seu backend
   (Render, Railway, PythonAnywhere, etc.) — sempre em https://.
   ============================================================ */

(function () {
  const hostAtual = window.location.hostname;
  const ehAmbienteLocal = hostAtual === "localhost" || hostAtual === "127.0.0.1";

  window.API_BASE_URL = ehAmbienteLocal
    ? "http://127.0.0.1:5000"
    : "https://biblioteca-digital-z1bt.onrender.com"; // <-- troque aqui após publicar o backend
})();
