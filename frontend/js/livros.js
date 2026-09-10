/* ============================================================
   BIBLIOTECA DIGITAL
   LIVROS.JS
   Busca, filtros, sincronização do acervo e empréstimos
   ============================================================ */

"use strict";

const API_BASE_URL =
    window.API_BASE_URL || "http://127.0.0.1:5000";

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

/* ============================================================
   NORMALIZAÇÃO
   ============================================================ */

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

/* ============================================================
   ELEMENTOS
   ============================================================ */

function obterElementos() {
    return {
        busca: document.getElementById("livrosSearch"),
        filtros: document.getElementById("livrosFilters"),
        secoes: Array.from(document.querySelectorAll(".genre-section")),
        contador: document.getElementById("catalogCounter"),
        vazio: document.getElementById("catalogEmpty")
    };
}

/* ============================================================
   FILTRO / BUSCA
   ============================================================ */

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

/* ============================================================
   FILTROS DE GÊNERO
   ============================================================ */

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

/* ============================================================
   BUSCA POR TÍTULO, AUTOR OU GÊNERO
   ============================================================ */

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

/* ============================================================
   URL
   ============================================================ */

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

/* ============================================================
   SINCRONIZAÇÃO COM A API
   ============================================================ */

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

async function sincronizarCatalogo() {
    try {
        const token = localStorage.getItem("biblioteca_token");
        const headers = {
            Accept: "application/json"
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const resposta = await fetch(
            `${API_BASE_URL}/livros`,
            { headers }
        );

        if (!resposta.ok) {
            return;
        }

        const dados = await resposta.json();
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

        document.querySelectorAll(".book-card").forEach((card) => {
            const livro = porTitulo.get(
                normalizarTexto(card.dataset.title)
            );

            if (livro) {
                atualizarCardComLivro(card, livro);
            }
        });
    } catch (erro) {
        console.warn(
            "Não foi possível sincronizar o catálogo com a API.",
            erro
        );
    }
}

/* ============================================================
   EMPRÉSTIMO
   ============================================================ */

async function solicitarEmprestimo(botao) {
    const livroId = botao?.dataset.livroId;

    if (!livroId) {
        window.location.href = "login.html";
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

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    configurarParametroInicial();
    configurarBusca();
    configurarFiltros();
    configurarEmprestimos();
    aplicarFiltros();
    sincronizarCatalogo();
});

/* ============================================================
   API GLOBAL OPCIONAL
   ============================================================ */

window.BibliotecaLivros = {
    aplicarFiltros,
    sincronizarCatalogo,
    obterGeneroCanonico,
    normalizarTexto,
    livroPertenceAoGenero
};
