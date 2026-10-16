"use strict";

/*
   CONFIGURAÇÃO DE AMBIENTE — URL da API
 */

(function () {
  const hostAtual = window.location.hostname;
  const ehAmbienteLocal = hostAtual === "localhost" || hostAtual === "127.0.0.1";

  window.API_BASE_URL = ehAmbienteLocal
    ? "http://127.0.0.1:5000"
    : "https://biblioteca-digital-z1bt.onrender.com";
})();
