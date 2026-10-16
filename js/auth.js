"use strict";

/* 
   Login, cadastro, recuperação de senha e login com Google.

   Este arquivo também define getToken()/getUsuario()/logout(),
   que os módulos admin-livros.js, admin-usuarios.js e
   admin-emprestimos.js já esperam encontrar como funções globais.
   */

const API_BASE_URL = window.API_BASE_URL || "http://127.0.0.1:5000";
window.API_BASE_URL = API_BASE_URL;

/*
  (localStorage)

   Guardamos os dados em dois formatos ao mesmo tempo:
   - "biblioteca_token" / "biblioteca_usuario" (JSON)
   - "token" / "tipo" / "nome" / "usuarioId" — formato usado por
     telas mais antigas, mantido por compatibilidade.
   */

function salvarSessao(dados) {
  const usuario = dados.usuario || {};

  localStorage.setItem("biblioteca_token", dados.token);
  localStorage.setItem("biblioteca_usuario", JSON.stringify(usuario));

  localStorage.setItem("token", dados.token);
  localStorage.setItem("tipo", usuario.tipo || dados.tipo || "");
  localStorage.setItem("usuarioId", usuario.id || "");
  localStorage.setItem("nome", usuario.nome || "");
}

function getToken() {
  return localStorage.getItem("biblioteca_token") || localStorage.getItem("token");
}

function getUsuario() {
  try {
    const bruto = localStorage.getItem("biblioteca_usuario");
    if (bruto) return JSON.parse(bruto);
  } catch (erro) {
    console.error("Erro ao ler usuário do storage:", erro);
  }

  // Fallback para o formato antigo (chaves separadas).
  const tipo = localStorage.getItem("tipo");
  if (!tipo) return null;
  return {
    id: localStorage.getItem("usuarioId") || "",
    nome: localStorage.getItem("nome") || "",
    tipo,
  };
}

function logout() {
  [
    "biblioteca_token", "biblioteca_usuario",
    "token", "tipo", "usuarioId", "nome", "usuario",
  ].forEach((chave) => localStorage.removeItem(chave));
  window.location.href = "login.html";
}

function exigirLogin() {
  if (!getToken()) window.location.href = "login.html";
}

function exigirAcessoAdmin() {
  exigirLogin();
  const usuario = getUsuario();
  const tipo = (usuario && usuario.tipo) || "";
  if (tipo === "CLIENTE") window.location.href = "livros.html";
}

// Adapta o menu (.nav-links / .nav-login) conforme quem está logado:
// - visitante: menu padrão (Início/Livros/Meus empréstimos) + "Entrar"
// - CLIENTE logado: mesmo menu, mas "Entrar" vira "Sair"
// - ADM/ATENDENTE logado: menu vira Livros/Usuários/Empréstimos
//   (apontando para os painéis administrativos) + "Sair"

function configurarNavegacao() {
  const usuario = getUsuario();
  const token = getToken();
  const logado = Boolean(token && usuario);
  const tipo = (usuario && usuario.tipo) || "";
  const ehGestor = tipo === "ATENDENTE" || tipo === "ADM";

  const linksMenu = document.querySelectorAll(".nav-links .nav-link");

  if (linksMenu.length >= 3) {
    if (logado && ehGestor) {
      const destinos = [
        { texto: "Livros", href: "admin-livros.html" },
        { texto: "Usuários", href: "admin-usuarios.html" },
        { texto: "Empréstimos", href: "admin-emprestimos.html" },
      ];
      linksMenu.forEach((link, indice) => {
        const destino = destinos[indice];
        if (!destino) return;
        link.textContent = destino.texto;
        link.setAttribute("href", destino.href);
        link.classList.toggle(
          "active",
          window.location.pathname.endsWith(destino.href)
        );
      });
    } else {
      linksMenu.forEach((link) => {
        if ((link.getAttribute("href") || "").endsWith("meus-emprestimos")) {
          link.setAttribute("href", "meus-emprestimos.html");
        }
      });
    }
  }

  // Páginas simples (index.html, livros.html) usam um único link "Entrar".
  const linkLogin = document.querySelector(".nav-login");
  if (linkLogin && logado) {
    linkLogin.textContent = usuario.nome ? `Sair (${usuario.nome})` : "Sair";
    linkLogin.setAttribute("href", "#");
    linkLogin.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Páginas com área de usuário própria (ex: meus-emprestimos.html, que já
  // controla #loansUserName/#loansLogout sozinha) não são mexidas aqui —
  // só a troca de abas acima (Livros/Usuários/Empréstimos) se aplica a elas.
}

document.addEventListener("DOMContentLoaded", configurarNavegacao);

/*
   MENSAGENS DE FORMULÁRIO

   Funciona para os três padrões usados nas telas do projeto:
   - <p id="mensagem">                (sem estado "hidden")
   - <div class="form-message">       (precisa da classe "show")
   - <div class="auth-message" hidden> (precisa remover o atributo "hidden")
   */
function exibirMensagem(elemento, texto, tipo = "error") {
  if (!elemento) return;
  elemento.hidden = false;
  elemento.textContent = texto;
  elemento.classList.remove("error", "success", "erro", "sucesso");
  elemento.classList.add("show");
  elemento.classList.add(tipo);
  // mantém compatibilidade com CSS antigo que usa "erro"/"sucesso"
  elemento.classList.add(tipo === "error" ? "erro" : "sucesso");
}

/* 
   BOTÕES DE "MOSTRAR SENHA"
 */
document.getElementById("togglePassword")?.addEventListener("click", () => {
  const campo = document.getElementById("senha");
  if (!campo) return;
  campo.type = campo.type === "password" ? "text" : "password";
});

document.querySelectorAll(".password-toggle").forEach((botao) => {
  botao.addEventListener("click", () => {
    const alvo = document.getElementById(botao.dataset.target);
    if (!alvo) return;
    alvo.type = alvo.type === "password" ? "text" : "password";
  });
});

/*
   LINK "ESQUECI MINHA SENHA" (login.html)
 */
document.getElementById("forgotPassword")?.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "esqueci-senha.html";
});

/*
   LOGIN  (login.html — #loginForm)
 */
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const mensagem = document.getElementById("loginMessage");
  const botao = document.getElementById("loginSubmit");
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  if (!email || !senha) {
    exibirMensagem(mensagem, "Preencha email e senha.");
    return;
  }

  botao && (botao.disabled = true);

  try {
    const resposta = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      exibirMensagem(mensagem, dados.erro || "Não foi possível entrar.");
      return;
    }

    salvarSessao(dados);
    window.location.href = "livros.html";
  } catch (erro) {
    exibirMensagem(mensagem, "Não foi possível conectar à API.");
  } finally {
    botao && (botao.disabled = false);
  }
});

/*
   CADASTRO  (cadastro.html — #cadastroForm)
   Cria sempre uma conta do tipo CLIENTE.
 */
document.getElementById("cadastroForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const mensagem = document.getElementById("cadastroMessage");
  const botao = document.getElementById("cadastroSubmit");

  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;
  const confirmarSenha = document.getElementById("confirmarSenha").value;
  const aceiteTermos = document.getElementById("aceiteTermos");

  if (!nome || !email || !senha || !confirmarSenha) {
    exibirMensagem(mensagem, "Preencha todos os campos.");
    return;
  }
  if (senha.length < 6) {
    exibirMensagem(mensagem, "A senha deve ter pelo menos 6 caracteres.");
    return;
  }
  if (senha !== confirmarSenha) {
    exibirMensagem(mensagem, "As senhas não são iguais.");
    return;
  }
  if (aceiteTermos && !aceiteTermos.checked) {
    exibirMensagem(mensagem, "Você precisa aceitar os termos de uso.");
    return;
  }

  botao && (botao.disabled = true);

  try {
    const resposta = await fetch(`${API_BASE_URL}/cadastro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha }),
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      exibirMensagem(mensagem, dados.erro || "Não foi possível cadastrar.");
      return;
    }

    // Troca o formulário pelo painel de sucesso, se existir na página.
    const container = document.getElementById("cadastroContainer");
    const sucesso = document.getElementById("cadastroSuccess");
    if (container && sucesso) {
      container.style.display = "none";
      sucesso.classList.add("show");
    } else {
      exibirMensagem(mensagem, "Cadastro realizado! Redirecionando...", "success");
      setTimeout(() => { window.location.href = "login.html"; }, 1200);
    }
  } catch (erro) {
    exibirMensagem(mensagem, "Não foi possível conectar à API.");
  } finally {
    botao && (botao.disabled = false);
  }
});

/*
   RECUPERAÇÃO DE SENHA — passo 1  (esqueci-senha.html — #recuperacaoForm)
 */
document.getElementById("recuperacaoForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const mensagem = document.getElementById("recuperacaoMessage");
  const botao = document.getElementById("recuperacaoSubmit");
  const email = document.getElementById("email").value.trim();

  if (!email) {
    exibirMensagem(mensagem, "Informe seu email.");
    return;
  }

  botao && (botao.disabled = true);

  try {
    const resposta = await fetch(`${API_BASE_URL}/recuperar-senha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const dados = await resposta.json();
    exibirMensagem(mensagem, dados.mensagem || dados.erro, resposta.ok ? "success" : "error");
  } catch (erro) {
    exibirMensagem(mensagem, "Não foi possível conectar à API.");
  } finally {
    botao && (botao.disabled = false);
  }
});

/*
   RECUPERAÇÃO DE SENHA — passo 2  (redefinir-senha.html — #redefinirSenhaForm)
 */
(() => {
  const campoToken = document.getElementById("token");
  if (!campoToken) return;

  // Pré-preenche o token a partir do link enviado por email
  // (?token=...), mas o campo continua editável.
  const parametros = new URLSearchParams(window.location.search);
  const tokenNaUrl = parametros.get("token");
  if (tokenNaUrl) campoToken.value = tokenNaUrl;
})();

document.getElementById("redefinirSenhaForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const mensagem = document.getElementById("redefinirSenhaMessage");
  const botao = document.getElementById("redefinirSenhaSubmit");

  const token = document.getElementById("token").value.trim();
  const novaSenha = document.getElementById("novaSenha").value;
  const confirmarNovaSenha = document.getElementById("confirmarNovaSenha").value;

  if (!token) {
    exibirMensagem(mensagem, "Cole o token recebido no email.");
    return;
  }
  if (novaSenha.length < 6) {
    exibirMensagem(mensagem, "A nova senha deve ter pelo menos 6 caracteres.");
    return;
  }
  if (novaSenha !== confirmarNovaSenha) {
    exibirMensagem(mensagem, "As senhas não são iguais.");
    return;
  }

  botao && (botao.disabled = true);

  try {
    const resposta = await fetch(`${API_BASE_URL}/redefinir-senha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, nova_senha: novaSenha }),
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      exibirMensagem(mensagem, dados.erro);
      return;
    }

    exibirMensagem(mensagem, dados.mensagem, "success");
    document.getElementById("redefinirSenhaForm").reset();
  } catch (erro) {
    exibirMensagem(mensagem, "Não foi possível conectar à API.");
  } finally {
    botao && (botao.disabled = false);
  }
});

/*
   LOGIN COM GOOGLE  (login.html — #googleLoginButton)

   Requer js/firebase-config.js carregado ANTES deste arquivo,
   e o provedor "Google" ativado no Firebase Console
   (Authentication > Sign-in method).

   Status: OK.
 */
document.getElementById("googleLoginButton")?.addEventListener("click", async () => {
  const mensagem = document.getElementById("loginMessage");
  const botao = document.getElementById("googleLoginButton");

  if (typeof firebase === "undefined" || !firebase.apps?.length) {
    exibirMensagem(mensagem, "Login com Google não configurado (veja js/firebase-config.js).");
    return;
  }

  botao && (botao.disabled = true);

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const resultado = await firebase.auth().signInWithPopup(provider);
    const idToken = await resultado.user.getIdToken();

    const resposta = await fetch(`${API_BASE_URL}/login/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      exibirMensagem(mensagem, dados.erro || "Não foi possível entrar com o Google.");
      return;
    }

    salvarSessao(dados);
    window.location.href = "livros.html";
  } catch (erro) {
    if (erro?.code === "auth/popup-closed-by-user") {
      // Usuário fechou o popup, não é um erro real, não exibe mensagem.
      return;
    }
    console.error(erro);
    exibirMensagem(mensagem, "Não foi possível entrar com o Google.");
  } finally {
    botao && (botao.disabled = false);
    // Encerra a sessão do SDK do Firebase no navegador: só precisávamos
    // dela para obter o idToken. Quem controla a sessão real do site
    // a partir daqui é o token do nosso próprio backend.
    firebase.auth()?.signOut().catch(() => {});
  }
});
