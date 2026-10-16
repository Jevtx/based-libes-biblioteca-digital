"use strict";

/*
   ADMINISTRAÇÃO — EMPRÉSTIMOS
*/

const AdminEmprestimosPage = {

    emprestimos: [],

    emprestimosFiltrados: [],

    carregando: false,

    devolvendo: false

};


/*
   ELEMENTOS
*/

const elementosEmprestimosAdmin = {

    userName:
        document.getElementById(
            "adminLoansUserName"
        ),

    userRole:
        document.getElementById(
            "adminLoansUserRole"
        ),

    profileBadge:
        document.getElementById(
            "adminLoansProfileBadge"
        ),

    logout:
        document.getElementById(
            "adminLoansLogout"
        ),

    total:
        document.getElementById(
            "loansAdminTotal"
        ),

    active:
        document.getElementById(
            "loansAdminActive"
        ),

    returned:
        document.getElementById(
            "loansAdminReturned"
        ),

    search:
        document.getElementById(
            "adminLoansSearch"
        ),

    statusFilter:
        document.getElementById(
            "adminLoansStatusFilter"
        ),

    status:
        document.getElementById(
            "adminLoansStatus"
        ),

    tableWrapper:
        document.getElementById(
            "adminLoansTableWrapper"
        ),

    tableBody:
        document.getElementById(
            "adminLoansTableBody"
        ),

    loading:
        document.getElementById(
            "adminLoansLoading"
        ),

    empty:
        document.getElementById(
            "adminLoansEmpty"
        ),

    error:
        document.getElementById(
            "adminLoansError"
        )
};


/* 
   CHAMADAS AUTENTICADAS À API

   Essa função é usada por toda a página (listar empréstimos, devolver
   um empréstimo)
*/

async function apiAuthenticatedRequest(endpoint, opcoes = {}) {
    const base = window.API_BASE_URL || "http://127.0.0.1:5000";
    const url =
        base.replace(/\/+$/, "") +
        "/" +
        String(endpoint).replace(/^\/+/, "");

    const token =
        typeof getToken === "function"
            ? getToken()
            : localStorage.getItem("biblioteca_token");

    const headers = {
        Accept: "application/json",
        ...(opcoes.headers || {}),
    };

    if (opcoes.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const resposta = await fetch(url, { ...opcoes, headers });

    const texto = await resposta.text();
    let dados = null;

    if (texto) {
        try {
            dados = JSON.parse(texto);
        } catch (erroParse) {
            dados = texto;
        }
    }

    if (!resposta.ok) {
        const mensagem =
            (dados && typeof dados === "object" && dados.erro) ||
            `Erro ${resposta.status}.`;

        const erro = new Error(mensagem);
        erro.status = resposta.status;
        erro.dados = dados;
        throw erro;
    }

    return dados;
}


/*
   INICIALIZAÇÃO
*/

document.addEventListener(
    "DOMContentLoaded",
    iniciarAdminEmprestimos
);


async function iniciarAdminEmprestimos() {

    /*
     * Primeiro verificamos se existe sessão.
     */
    const token =
        typeof getToken === "function"
            ? getToken()
            : localStorage.getItem(
                "biblioteca_token"
            );

    if (!token) {

        window.location.href =
            "login.html";

        return;
    }


    /*
     * Recupera o usuário salvo na sessão.
     */
    const usuario =
        obterUsuarioAtual();


    /*
     * Somente ADM e ATENDENTE
     * podem acessar esta página.
     */
    if (
        !usuario ||
        !["ADM", "ATENDENTE"].includes(
            String(usuario.tipo || "").toUpperCase()
        )
    ) {

        window.location.href =
            "livros.html";

        return;
    }


    preencherUsuario(usuario);

    configurarEventos();

    await carregarEmprestimos();
}


/*
   USUÁRIO ATUAL
*/

function obterUsuarioAtual() {

    if (
        typeof getUsuario === "function"
    ) {

        const usuario =
            getUsuario();

        if (usuario) {
            return usuario;
        }
    }


    try {

        const salvo =
            localStorage.getItem(
                "biblioteca_usuario"
            );

        return salvo
            ? JSON.parse(salvo)
            : null;

    } catch (erro) {

        console.error(
            "Erro ao recuperar usuário:",
            erro
        );

        return null;
    }
}


/*
   PREENCHER USUÁRIO
*/

function preencherUsuario(usuario) {

    const nome =
        usuario.nome ||
        "Usuário";

    const tipo =
        String(
            usuario.tipo || ""
        ).toUpperCase();


    if (
        elementosEmprestimosAdmin.userName
    ) {

        elementosEmprestimosAdmin
            .userName
            .textContent = nome;
    }


    if (
        elementosEmprestimosAdmin.userRole
    ) {

        elementosEmprestimosAdmin
            .userRole
            .textContent =
                tipo === "ADM"
                    ? "Administrador"
                    : "Atendente";
    }


    if (
        elementosEmprestimosAdmin.profileBadge
    ) {

        elementosEmprestimosAdmin
            .profileBadge
            .textContent =
                tipo === "ADM"
                    ? "ADM · Controle geral"
                    : "ATENDENTE · Controle";
    }
}


/*
   EVENTOS
*/

function configurarEventos() {

    if (
        elementosEmprestimosAdmin.search
    ) {

        elementosEmprestimosAdmin
            .search
            .addEventListener(
                "input",
                aplicarFiltrosEmprestimos
            );
    }


    if (
        elementosEmprestimosAdmin.statusFilter
    ) {

        elementosEmprestimosAdmin
            .statusFilter
            .addEventListener(
                "change",
                aplicarFiltrosEmprestimos
            );
    }


    if (
        elementosEmprestimosAdmin.logout
    ) {

        elementosEmprestimosAdmin
            .logout
            .addEventListener(
                "click",
                executarLogout
            );
    }
}


/*
   LOGOUT
*/

function executarLogout() {

    if (
        typeof logout === "function"
    ) {

        logout();

        return;
    }


    localStorage.removeItem(
        "biblioteca_token"
    );

    localStorage.removeItem(
        "biblioteca_usuario"
    );

    window.location.href =
        "login.html";
}


/*
   CARREGAR EMPRÉSTIMOS
*/

async function carregarEmprestimos() {

    if (
        AdminEmprestimosPage.carregando
    ) {

        return;
    }


    AdminEmprestimosPage.carregando =
        true;


    mostrarCarregando(true);

    esconderErro();

    esconderVazio();


    atualizarStatus(
        "Consultando empréstimos..."
    );


    try {

        const resposta =
            await apiAuthenticatedRequest(
                "/emprestimos"
            );


        const dados =
            resposta?.data !== undefined
                ? resposta.data
                : resposta;


        if (
            !Array.isArray(dados)
        ) {

            throw new Error(
                "A API retornou um formato inválido para os empréstimos."
            );
        }


        AdminEmprestimosPage
            .emprestimos =
                dados.map(
                    normalizarEmprestimo
                );


        atualizarEstatisticas();

        aplicarFiltrosEmprestimos();


    } catch (erro) {

        console.error(
            "Erro ao carregar empréstimos:",
            erro
        );


        if (
            erro?.status === 401
        ) {

            executarLogout();

            return;
        }


        mostrarErro(
            erro?.message ||
            "Não foi possível carregar os empréstimos."
        );


    } finally {

        AdminEmprestimosPage
            .carregando = false;

        mostrarCarregando(false);
    }
}


/*
   NORMALIZAR EMPRÉSTIMO
 */

function normalizarEmprestimo(
    emprestimo
) {

    const livro =
        emprestimo?.livro || {};

    const usuario =
        emprestimo?.usuario || {};


    return {

        id:
            String(
                emprestimo?.id || ""
            ),

        livro: {

            id:
                String(
                    livro?.id || ""
                ),

            titulo:
                String(
                    livro?.titulo ||
                    "Livro não informado"
                ).trim(),

            autor:
                String(
                    livro?.autor ||
                    "Autor não informado"
                ).trim(),

            categoria:
                String(
                    livro?.categoria ||
                    ""
                ).trim()
        },


        usuario: {

            id:
                String(
                    usuario?.id || ""
                ),

            nome:
                String(
                    usuario?.nome ||
                    "Usuário não informado"
                ).trim(),

            email:
                String(
                    usuario?.email ||
                    ""
                ).trim(),

            tipo:
                String(
                    usuario?.tipo ||
                    ""
                ).trim()
        },


        data_emprestimo:
            emprestimo
                ?.data_emprestimo ||
            null,

        data_devolucao:
            emprestimo
                ?.data_devolucao ||
            null,

        situacao:
            normalizarSituacao(
                emprestimo?.situacao
            )
    };
}


/* 
   NORMALIZAR SITUAÇÃO
 */

function normalizarSituacao(
    situacao
) {

    const valor =
        String(
            situacao || ""
        )
        .trim()
        .toUpperCase();


    if (
        valor === "DEVOLVIDO"
    ) {

        return "DEVOLVIDO";
    }


    return "ATIVO";
}


/*
   FILTROS
 */

function aplicarFiltrosEmprestimos() {

    const texto =
        normalizarTexto(
            elementosEmprestimosAdmin
                .search
                ?.value || ""
        );


    const situacaoSelecionada =
        elementosEmprestimosAdmin
            .statusFilter
            ?.value || "";


    AdminEmprestimosPage
        .emprestimosFiltrados =
            AdminEmprestimosPage
                .emprestimos
                .filter(
                    (emprestimo) => {

                        const livro =
                            emprestimo.livro
                                ?.titulo || "";

                        const autor =
                            emprestimo.livro
                                ?.autor || "";

                        const usuario =
                            emprestimo.usuario
                                ?.nome || "";

                        const email =
                            emprestimo.usuario
                                ?.email || "";


                        const textoCompleto =
                            normalizarTexto(
                                [
                                    livro,
                                    autor,
                                    usuario,
                                    email
                                ].join(" ")
                            );


                        const correspondeTexto =
                            !texto ||
                            textoCompleto.includes(
                                texto
                            );


                        const correspondeSituacao =
                            !situacaoSelecionada ||
                            emprestimo.situacao ===
                                situacaoSelecionada;


                        return (
                            correspondeTexto &&
                            correspondeSituacao
                        );
                    }
                );


    renderizarTabela();
}


/* 
   NORMALIZAR TEXTO
 */

function normalizarTexto(
    texto
) {

    return String(texto || "")
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim();
}


/*
   ESTATÍSTICAS
 */

function atualizarEstatisticas() {

    const lista =
        AdminEmprestimosPage
            .emprestimos;


    const total =
        lista.length;


    const ativos =
        lista.filter(
            (item) =>
                item.situacao ===
                "ATIVO"
        ).length;


    const devolvidos =
        lista.filter(
            (item) =>
                item.situacao ===
                "DEVOLVIDO"
        ).length;


    elementosEmprestimosAdmin
        .total
        .textContent = total;


    elementosEmprestimosAdmin
        .active
        .textContent = ativos;


    elementosEmprestimosAdmin
        .returned
        .textContent = devolvidos;
}


/*
   RENDERIZAR TABELA
 */

function renderizarTabela() {

    const lista =
        AdminEmprestimosPage
            .emprestimosFiltrados;


    elementosEmprestimosAdmin
        .tableBody
        .innerHTML = "";


    if (
        lista.length === 0
    ) {

        mostrarVazio(true);

        return;
    }


    mostrarVazio(false);


    lista.forEach(
        (emprestimo) => {

            const linha =
                document.createElement(
                    "tr"
                );


            linha.innerHTML =
                criarLinhaEmprestimo(
                    emprestimo
                );


            elementosEmprestimosAdmin
                .tableBody
                .appendChild(
                    linha
                );
        }
    );


    const total =
        lista.length;


    atualizarStatus(
        total === 1
            ? "1 empréstimo encontrado."
            : `${total} empréstimos encontrados.`
    );
}


/*
   CRIAR LINHA
 */

function criarLinhaEmprestimo(
    emprestimo
) {

    const titulo =
        escapeHtml(
            emprestimo
                .livro
                ?.titulo ||
            "Livro não informado"
        );


    const autor =
        escapeHtml(
            emprestimo
                .livro
                ?.autor ||
            "Autor não informado"
        );


    const nomeUsuario =
        escapeHtml(
            emprestimo
                .usuario
                ?.nome ||
            "Usuário não informado"
        );


    const emailUsuario =
        escapeHtml(
            emprestimo
                .usuario
                ?.email ||
            ""
        );


    const dataEmprestimo =
        formatarData(
            emprestimo
                .data_emprestimo
        );


    const dataDevolucao =
        emprestimo
            .data_devolucao
            ? formatarData(
                emprestimo
                    .data_devolucao
            )
            : "—";


    const statusHtml =
        emprestimo.situacao ===
        "ATIVO"

            ? `
                <span class="loan-status-badge loan-status-active">
                    Em andamento
                </span>
              `

            : `
                <span class="loan-status-badge loan-status-returned">
                    Devolvido
                </span>
              `;


    const acaoHtml =
        emprestimo.situacao ===
        "ATIVO"

            ? `
                <button
                    type="button"
                    class="loan-return-button"
                    data-return-loan="${escapeHtml(
                        emprestimo.id
                    )}"
                >
                    Registrar devolução
                </button>
              `

            : `
                <span class="loan-returned-text">
                    Finalizado
                </span>
              `;


    return `

        <td>

            <span class="loan-book-title">
                ${titulo}
            </span>

            <span class="loan-book-author">
                ${autor}
            </span>

        </td>


        <td>

            <span class="loan-user-name">
                ${nomeUsuario}
            </span>

            ${
                emailUsuario
                    ? `
                        <span class="loan-user-email">
                            ${emailUsuario}
                        </span>
                      `
                    : ""
            }

        </td>


        <td>

            <span class="loan-date">
                ${dataEmprestimo}
            </span>

        </td>


        <td>

            <span class="loan-date">
                ${dataDevolucao}
            </span>

        </td>


        <td>

            ${statusHtml}

        </td>


        <td>

            ${acaoHtml}

        </td>
    `;
}


/*
   EVENTO DE DEVOLUÇÃO
 */

document.addEventListener(
    "click",
    function (evento) {

        const botao =
            evento.target.closest(
                "[data-return-loan]"
            );


        if (!botao) {
            return;
        }


        const emprestimoId =
            botao.dataset.returnLoan;


        if (!emprestimoId) {
            return;
        }


        devolverEmprestimo(
            emprestimoId,
            botao
        );
    }
);


/*
   DEVOLVER LIVRO
 */

async function devolverEmprestimo(
    emprestimoId,
    botao
) {

    if (
        AdminEmprestimosPage.devolvendo
    ) {

        return;
    }


    const emprestimo =
        AdminEmprestimosPage
            .emprestimos
            .find(
                (item) =>
                    item.id ===
                    String(emprestimoId)
            );


    if (!emprestimo) {

        mostrarMensagem(
            "Empréstimo não encontrado."
        );

        return;
    }


    if (
        emprestimo.situacao !==
        "ATIVO"
    ) {

        mostrarMensagem(
            "Este empréstimo já foi devolvido."
        );

        return;
    }


    const titulo =
        emprestimo
            .livro
            ?.titulo ||
        "este livro";


    const confirmou =
        window.confirm(
            `Confirmar a devolução de "${titulo}"?`
        );


    if (!confirmou) {
        return;
    }


    AdminEmprestimosPage
        .devolvendo = true;


    const textoOriginal =
        botao.textContent;


    botao.disabled =
        true;


    botao.textContent =
        "Processando...";


    try {

        const resposta =
            await apiAuthenticatedRequest(
                `/emprestimos/${encodeURIComponent(
                    emprestimoId
                )}/devolver`,
                {
                    method: "PUT"
                }
            );


        const dados =
            resposta?.data !== undefined
                ? resposta.data
                : resposta;


        /*
         * Atualiza o empréstimo localmente.
         */
        emprestimo.situacao =
            "DEVOLVIDO";


        if (
            dados?.emprestimo
        ) {

            const atualizado =
                dados.emprestimo;


            emprestimo.situacao =
                normalizarSituacao(
                    atualizado.situacao
                );


            emprestimo.data_devolucao =
                atualizado
                    .data_devolucao ||
                new Date().toISOString();
        }

        else {

            emprestimo.data_devolucao =
                new Date().toISOString();
        }


        atualizarEstatisticas();

        aplicarFiltrosEmprestimos();


        atualizarStatus(
            dados?.mensagem ||
            "Devolução registrada com sucesso."
        );


    } catch (erro) {

        console.error(
            "Erro ao registrar devolução:",
            erro
        );


        if (
            erro?.status === 401
        ) {

            executarLogout();

            return;
        }


        if (
            erro?.status === 409
        ) {

            /*
             * Caso outro operador tenha
             * realizado a devolução antes.
             */
            await carregarEmprestimos();

        }


        mostrarMensagem(
            erro?.message ||
            "Não foi possível registrar a devolução."
        );


    } finally {

        AdminEmprestimosPage
            .devolvendo = false;


        if (
            botao &&
            document.body.contains(
                botao
            )
        ) {

            botao.disabled = false;

            botao.textContent =
                textoOriginal;
        }
    }
}


/*
   FORMATAÇÃO DE DATA
 */

function formatarData(
    valor
) {

    if (!valor) {
        return "—";
    }


    /*
     * Caso venha como Timestamp
     * serializado pelo Firebase.
     */
    if (
        typeof valor === "object"
    ) {

        if (
            typeof valor.seconds ===
            "number"
        ) {

            valor =
                valor.seconds * 1000;
        }

        else if (
            typeof valor._seconds ===
            "number"
        ) {

            valor =
                valor._seconds * 1000;
        }

        else {

            return "—";
        }
    }


    const data =
        new Date(valor);


    if (
        Number.isNaN(
            data.getTime()
        )
    ) {

        return "—";
    }


    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    ).format(data);
}


/*
   ESCAPE HTML
 */

function escapeHtml(
    valor
) {

    return String(
        valor ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/*
   ESTADOS VISUAIS
 */

function mostrarCarregando(
    mostrar
) {

    elementosEmprestimosAdmin
        .loading
        .classList.toggle(
            "loans-hidden",
            !mostrar
        );


    if (mostrar) {

        elementosEmprestimosAdmin
            .tableWrapper
            .classList.add(
                "loans-hidden"
            );
    }

    else {

        elementosEmprestimosAdmin
            .tableWrapper
            .classList.remove(
                "loans-hidden"
            );
    }
}


function mostrarVazio(
    mostrar
) {

    elementosEmprestimosAdmin
        .empty
        .classList.toggle(
            "loans-hidden",
            !mostrar
        );


    if (mostrar) {

        elementosEmprestimosAdmin
            .tableWrapper
            .classList.add(
                "loans-hidden"
            );
    }

    else {

        elementosEmprestimosAdmin
            .tableWrapper
            .classList.remove(
                "loans-hidden"
            );
    }
}


function esconderVazio() {

    mostrarVazio(false);
}


function mostrarErro(
    mensagem
) {

    elementosEmprestimosAdmin
        .error
        .textContent =
            mensagem;


    elementosEmprestimosAdmin
        .error
        .classList.remove(
            "loans-hidden"
        );


    elementosEmprestimosAdmin
        .tableWrapper
        .classList.add(
            "loans-hidden"
        );
}


function esconderErro() {

    elementosEmprestimosAdmin
        .error
        .classList.add(
            "loans-hidden"
        );
}


function atualizarStatus(
    mensagem
) {

    elementosEmprestimosAdmin
        .status
        .textContent =
            mensagem;
}


function mostrarMensagem(
    mensagem
) {

    atualizarStatus(
        mensagem
    );
}


/*
   EXPOSIÇÃO GLOBAL
 */

window.BibliotecaAdminEmprestimos = {

    carregar:
        carregarEmprestimos,

    devolver:
        devolverEmprestimo,

    aplicarFiltros:
        aplicarFiltrosEmprestimos
};