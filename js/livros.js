/* 
   Busca, filtros, sincronização do acervo e empréstimos
 */

"use strict";

// API_BASE_URL já é declarada em js/auth.js (carregado antes desta página) —
// não redeclarar aqui, senão o navegador quebra com
// "SyntaxError: redeclaration of const API_BASE_URL" e o arquivo inteiro
// para de funcionar.

const ESTADO_LIVROS = {
    generoAtual: "",
    pesquisaAtual: ""
};

const GENEROS = {
    fantasia: [
        "fantasia"
    ],
    romance: [
        "romance"
    ],
    aventura: [
        "aventura"
    ],
    misterio: [
        "misterio",
        "misterio e policial",
        "misterio policial",
        "policial"
    ],
    terror: [
        "terror",
        "horror",
        "terror e horror"
    ],
    distopia: [
        "distopia"
    ],
    drama: [
        "drama"
    ],
    biografia: [
        "biografia",
        "biografias",
        "biografia e memoria",
        "biografia e memorias",
        "memoria",
        "memorias"
    ]
};

/*
   NORMALIZAÇÃO
 */

function normalizarTexto(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function obterGeneroCanonico(valor) {
    const normalizado = normalizarTexto(valor);

    if (!normalizado) {
        return "";
    }

    if (GENEROS[normalizado]) {
        return normalizado;
    }

    for (const [genero, equivalencias] of Object.entries(GENEROS)) {
        if (equivalencias.includes(normalizado)) {
            return genero;
        }
    }

    return normalizado;
}

function livroPertenceAoGenero(livro, genero) {
    const categoria = normalizarTexto(livro?.categoria);
    const generoCanonico = obterGeneroCanonico(genero);

    if (!categoria || !generoCanonico) {
        return false;
    }

    const categoriasAceitas = GENEROS[generoCanonico] || [generoCanonico];

    return categoriasAceitas.some((categoriaAceita) => {
        return (
            categoria === categoriaAceita ||
            categoria.includes(categoriaAceita)
        );
    });
}

function textoContemGenero(texto, genero) {
    const valor = normalizarTexto(texto);
    const generoCanonico = obterGeneroCanonico(genero);

    if (!valor || !generoCanonico) {
        return false;
    }

    const categoriasAceitas = GENEROS[generoCanonico] || [generoCanonico];

    return categoriasAceitas.some((categoriaAceita) => {
        return valor === categoriaAceita || valor.includes(categoriaAceita);
    });
}

/*
   ELEMENTOS
 */

function obterElementos() {
    return {
        busca: document.getElementById("livrosSearch"),
        filtros: document.getElementById("livrosFilters"),
        secoes: Array.from(document.querySelectorAll(".genre-section")),
        contador: document.getElementById("catalogCounter"),
        vazio: document.getElementById("catalogEmpty")
    };
}

/*
   FILTRO / BUSCA
 */

function cardCorrespondePesquisa(card, pesquisa) {
    if (!pesquisa) {
        return true;
    }

    const titulo = normalizarTexto(card.dataset.title);
    const categoria = normalizarTexto(card.dataset.genre);
    const textoCategoria = normalizarTexto(
        card.querySelector(".book-category")?.textContent
    );
    const autor = normalizarTexto(
        card.querySelector(".book-author")?.textContent
    );

    return (
        titulo.includes(pesquisa) ||
        autor.includes(pesquisa) ||
        categoria.includes(pesquisa) ||
        textoCategoria.includes(pesquisa) ||
        Object.keys(GENEROS).some((genero) => {
            if (genero !== "biografia") {
                return false;
            }

            return (
                pesquisa === "memoria" ||
                pesquisa === "memorias" ||
                pesquisa === "biografia" ||
                pesquisa === "biografias"
            ) && textoContemGenero(textoCategoria, genero);
        })
    );
}

function cardCorrespondeFiltro(card, genero) {
    if (!genero) {
        return true;
    }

    const categoriaDoCard = card.dataset.genre || "";
    return livroPertenceAoGenero(
        { categoria: categoriaDoCard },
        genero
    );
}

function aplicarFiltros() {
    const elementos = obterElementos();
    const pesquisa = normalizarTexto(ESTADO_LIVROS.pesquisaAtual);
    const genero = obterGeneroCanonico(ESTADO_LIVROS.generoAtual);
    let encontrados = 0;

    elementos.secoes.forEach((section) => {
        let encontradosNaSecao = 0;
        const generoSecao = obterGeneroCanonico(
            section.dataset.sectionGenre
        );

        section.querySelectorAll(".book-card").forEach((card) => {
            const mostrar =
                (!genero || generoSecao === genero) &&
                cardCorrespondeFiltro(card, genero) &&
                cardCorrespondePesquisa(card, pesquisa);

            card.hidden = !mostrar;

            if (mostrar) {
                encontrados += 1;
                encontradosNaSecao += 1;
            }
        });

        section.classList.toggle(
            "hidden",
            encontradosNaSecao === 0
        );
    });

    if (elementos.contador) {
        elementos.contador.textContent =
            `${encontrados} ${encontrados === 1 ? "livro" : "livros"} no catálogo`;
    }

    if (elementos.vazio) {
        elementos.vazio.classList.toggle(
            "visible",
            encontrados === 0
        );
    }
}

/*
   FILTROS DE GÊNERO
 */

function configurarFiltros() {
    const elementos = obterElementos();

    if (!elementos.filtros) {
        return;
    }

    elementos.filtros
        .querySelectorAll("[data-genero]")
        .forEach((botao) => {
            botao.addEventListener("click", () => {
                ESTADO_LIVROS.generoAtual = obterGeneroCanonico(
                    botao.dataset.genero || ""
                );

                elementos.filtros
                    .querySelectorAll("[data-genero]")
                    .forEach((item) => {
                        item.classList.toggle("active", item === botao);
                    });

                aplicarFiltros();

                if (ESTADO_LIVROS.generoAtual) {
                    const alvo = elementos.secoes.find((section) => {
                        return (
                            obterGeneroCanonico(
                                section.dataset.sectionGenre
                            ) === ESTADO_LIVROS.generoAtual
                        );
                    });

                    alvo?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            });
        });
}

/*
   BUSCA POR TÍTULO, AUTOR OU GÊNERO
*/

function configurarBusca() {
    const elementos = obterElementos();

    if (!elementos.busca) {
        return;
    }

    elementos.busca.addEventListener("input", () => {
        ESTADO_LIVROS.pesquisaAtual = elementos.busca.value;
        aplicarFiltros();
    });
}

/*
   URL
*/

function configurarParametroInicial() {
    const parametro = new URLSearchParams(window.location.search)
        .get("genero");

    if (!parametro) {
        return;
    }

    const genero = obterGeneroCanonico(parametro);
    const elementos = obterElementos();

    if (!GENEROS[genero]) {
        return;
    }

    ESTADO_LIVROS.generoAtual = genero;

    elementos.filtros
        ?.querySelectorAll("[data-genero]")
        .forEach((botao) => {
            botao.classList.toggle(
                "active",
                obterGeneroCanonico(botao.dataset.genero) === genero
            );
        });
}

/*
   SINCRONIZAÇÃO COM A API
 */

function atualizarCardComLivro(card, livro) {
    const situacao = normalizarTexto(livro?.situacao);
    const disponivel = situacao === "disponivel";
    const status = card.querySelector(".book-status");
    const botao = card.querySelector(".book-action");

    card.dataset.livroId = String(livro?.id || "");

    if (botao) {
        botao.dataset.livroId = String(livro?.id || "");
        botao.disabled = !disponivel;
        botao.classList.toggle("disabled", !disponivel);
        botao.textContent = disponivel
            ? "Emprestar livro"
            : "Indisponível";
    }

    if (status) {
        status.textContent = disponivel
            ? "Disponível"
            : "Emprestado";
        status.classList.toggle("available", disponivel);
        status.classList.toggle("loaned", !disponivel);
    }
}

function mostrarAvisoCatalogo(texto, comBotaoTentarNovamente) {
    let aviso = document.getElementById("avisoSincronizacao");

    if (!aviso) {
        aviso = document.createElement("div");
        aviso.id = "avisoSincronizacao";
        aviso.style.cssText =
            "max-width:1200px;margin:0 auto 20px;padding:14px 18px;" +
            "border-radius:12px;border:1px solid rgba(255,255,255,0.22);" +
            "background:rgba(255,255,255,0.06);color:#fff;font-family:var(--sans);" +
            "font-size:13px;display:flex;align-items:center;justify-content:space-between;" +
            "gap:12px;flex-wrap:wrap;";

        const alvo =
            document.getElementById("catalogo") ||
            document.querySelector(".page-content") ||
            document.body;
        alvo.insertBefore(aviso, alvo.firstChild);
    }

    aviso.innerHTML = "";

    const span = document.createElement("span");
    span.textContent = texto;
    aviso.appendChild(span);

    if (comBotaoTentarNovamente) {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.textContent = "Tentar novamente";
        botao.style.cssText =
            "border:1px solid rgba(255,255,255,0.35);background:transparent;" +
            "color:#fff;border-radius:20px;padding:8px 16px;cursor:pointer;" +
            "font-size:12px;font-weight:600;";
        botao.addEventListener("click", () => sincronizarCatalogo());
        aviso.appendChild(botao);
    }
}

function removerAvisoCatalogo() {
    document.getElementById("avisoSincronizacao")?.remove();
}

async function tentarBuscarLivros() {
    const token = localStorage.getItem("biblioteca_token");
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const resposta = await fetch(`${API_BASE_URL}/livros`, { headers });
    if (!resposta.ok) {
        throw new Error(`API respondeu ${resposta.status}`);
    }
    return resposta.json();
}

// O plano gratuito do Render "dorme" o backend depois de um tempo sem uso —
// a primeira chamada depois disso pode demorar 30-50s pra responder (ou até
// falhar de primeira). Por isso tentamos algumas vezes, com espera crescente,
// em vez de desistir na primeira falha.
async function sincronizarCatalogo(tentativa = 1) {
    const MAX_TENTATIVAS = 4;
    const ESPERAS_MS = [0, 4000, 8000, 15000];

    if (tentativa === 1) {
        mostrarAvisoCatalogo("Carregando disponibilidade dos livros...", false);
    } else {
        mostrarAvisoCatalogo(
            `O servidor está iniciando, ainda tentando conectar... (tentativa ${tentativa} de ${MAX_TENTATIVAS})`,
            false
        );
    }

    try {
        const dados = await tentarBuscarLivros();
        const livros = Array.isArray(dados)
            ? dados
            : Array.isArray(dados?.livros)
                ? dados.livros
                : [];

        const porTitulo = new Map(
            livros.map((livro) => [
                normalizarTexto(livro.titulo),
                livro
            ])
        );

        let algumEncontrado = false;

        document.querySelectorAll(".book-card").forEach((card) => {
            const livro = porTitulo.get(
                normalizarTexto(card.dataset.title)
            );

            if (livro) {
                algumEncontrado = true;
                atualizarCardComLivro(card, livro);
            }
        });

        removerAvisoCatalogo();

        if (!algumEncontrado && livros.length === 0) {
            mostrarAvisoCatalogo(
                "Nenhum livro cadastrado no sistema ainda — peça a um " +
                "ATENDENTE ou ADM para cadastrar em \"Gerenciar livros\".",
                false
            );
        }
    } catch (erro) {
        console.warn(
            `Tentativa ${tentativa} de sincronizar o catálogo falhou.`,
            erro
        );

        if (tentativa < MAX_TENTATIVAS) {
            setTimeout(
                () => sincronizarCatalogo(tentativa + 1),
                ESPERAS_MS[tentativa]
            );
        } else {
            mostrarAvisoCatalogo(
                "Não foi possível conectar ao servidor. Confira sua internet " +
                "e tente de novo.",
                true
            );
        }
    }
}

/*
   EMPRÉSTIMO
*/

async function solicitarEmprestimo(botao) {
    const livroId = botao?.dataset.livroId;

    if (!livroId) {
        window.alert(
            "Este livro ainda não está cadastrado no sistema (nenhum " +
            "registro correspondente foi encontrado na base de dados). " +
            "Peça para um ATENDENTE ou ADM cadastrá-lo em \"Gerenciar livros\" " +
            "antes de tentar o empréstimo."
        );
        console.warn(
            "Empréstimo cancelado: o card não tem data-livro-id. Isso " +
            "acontece quando o título do card não bate com nenhum livro " +
            "retornado por GET /livros — normalmente porque o livro ainda " +
            "não foi cadastrado no Firestore."
        );
        return;
    }

    const token = localStorage.getItem("biblioteca_token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const confirmou = window.confirm(
        "Deseja realizar o empréstimo deste livro?"
    );

    if (!confirmou) {
        return;
    }

    const textoOriginal = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Processando...";

    try {
        const resposta = await fetch(
            `${API_BASE_URL}/emprestimos`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ livro_id: livroId })
            }
        );

        const dados = await resposta.json().catch(() => ({}));

        if (resposta.status === 401) {
            localStorage.removeItem("biblioteca_token");
            localStorage.removeItem("biblioteca_usuario");
            window.location.href = "login.html";
            return;
        }

        if (!resposta.ok) {
            window.alert(
                dados.erro ||
                "Não foi possível realizar o empréstimo."
            );
            botao.disabled = false;
            botao.textContent = textoOriginal;
            return;
        }

        window.alert("Livro emprestado com sucesso.");
        await sincronizarCatalogo();
        aplicarFiltros();
    } catch (erro) {
        console.error("Erro ao realizar empréstimo:", erro);
        window.alert("Não foi possível conectar à biblioteca.");
        botao.disabled = false;
        botao.textContent = textoOriginal;
    }
}

function configurarEmprestimos() {
    document.addEventListener("click", (evento) => {
        const botao = evento.target.closest(".book-action");

        if (!botao || botao.disabled) {
            return;
        }

        solicitarEmprestimo(botao);
    });
}

/*
   INICIALIZAÇÃO
*/

document.addEventListener("DOMContentLoaded", () => {
    configurarParametroInicial();
    configurarBusca();
    configurarFiltros();
    configurarEmprestimos();
    aplicarFiltros();
    sincronizarCatalogo();
});

/*
   API GLOBAL OPCIONAL
*/

window.BibliotecaLivros = {
    aplicarFiltros,
    sincronizarCatalogo,
    obterGeneroCanonico,
    normalizarTexto,
    livroPertenceAoGenero
};
