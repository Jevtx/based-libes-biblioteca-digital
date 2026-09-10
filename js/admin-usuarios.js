"use strict";

/* ============================================================
   ADMIN - GESTÃO DE USUÁRIOS
   Biblioteca Digital
   ============================================================ */

const ADMIN_USERS_API_BASE_URL =
    window.API_BASE_URL || "http://127.0.0.1:5000";


const ADMIN_USERS_ALLOWED_ROLES = [
    "ADM",
    "ATENDENTE"
];


const AdminUsuariosPage = {

    usuarios: [],

    usuariosFiltrados: [],

    carregando: false,

    salvando: false,

    excluindo: false,

    tipoUsuarioAtual: ""
};


const usuariosElementos = {};


/* ============================================================
   ELEMENTOS
   ============================================================ */

function capturarElementosUsuarios() {

    usuariosElementos.userName =
        document.getElementById("usersUserName");

    usuariosElementos.userRole =
        document.getElementById("usersUserRole");

    usuariosElementos.profileBadge =
        document.getElementById("usersProfileBadge");

    usuariosElementos.logout =
        document.getElementById("usersLogout");


    usuariosElementos.statTotal =
        document.getElementById("statUsersTotal");

    usuariosElementos.statClients =
        document.getElementById("statClients");

    usuariosElementos.statAttendants =
        document.getElementById("statAttendants");

    usuariosElementos.statAdmins =
        document.getElementById("statAdmins");


    usuariosElementos.newUserButton =
        document.getElementById("newUserButton");

    usuariosElementos.search =
        document.getElementById("userSearch");

    usuariosElementos.typeFilter =
        document.getElementById("userTypeFilter");


    usuariosElementos.status =
        document.getElementById("usersStatus");

    usuariosElementos.tableWrapper =
        document.getElementById("usersTableWrapper");

    usuariosElementos.tableBody =
        document.getElementById("usersTableBody");

    usuariosElementos.empty =
        document.getElementById("usersEmpty");

    usuariosElementos.error =
        document.getElementById("usersError");


    usuariosElementos.modal =
        document.getElementById("userModal");

    usuariosElementos.closeModal =
        document.getElementById("closeUserModal");

    usuariosElementos.cancelButton =
        document.getElementById("cancelUserButton");


    usuariosElementos.form =
        document.getElementById("userForm");

    usuariosElementos.name =
        document.getElementById("userName");

    usuariosElementos.email =
        document.getElementById("userEmail");

    usuariosElementos.password =
        document.getElementById("userPassword");

    usuariosElementos.type =
        document.getElementById("userType");

    usuariosElementos.typeHelp =
        document.getElementById("userTypeHelp");

    usuariosElementos.formMessage =
        document.getElementById("userFormMessage");

    usuariosElementos.saveButton =
        document.getElementById("saveUserButton");
}


/* ============================================================
   SESSÃO
   ============================================================ */

function obterUsuarioAtual() {

    if (typeof getUsuario === "function") {

        return getUsuario();
    }


    try {

        return JSON.parse(
            localStorage.getItem(
                "biblioteca_usuario"
            ) || "null"
        );

    } catch (erro) {

        return null;
    }
}


function obterTokenUsuarios() {

    if (typeof getToken === "function") {

        return getToken();
    }


    return localStorage.getItem(
        "biblioteca_token"
    );
}


/* ============================================================
   VERIFICAR ACESSO
   ============================================================ */

function verificarAcessoUsuarios() {

    const token =
        obterTokenUsuarios();


    if (!token) {

        window.location.href =
            "login.html";

        return false;
    }


    const usuario =
        obterUsuarioAtual();


    const tipo =
        String(
            usuario?.tipo || ""
        )
            .trim()
            .toUpperCase();


    if (
        !ADMIN_USERS_ALLOWED_ROLES
            .includes(tipo)
    ) {

        window.location.href =
            "livros.html";

        return false;
    }


    AdminUsuariosPage.tipoUsuarioAtual =
        tipo;


    return true;
}


/* ============================================================
   INFORMAÇÕES DO USUÁRIO LOGADO
   ============================================================ */

function carregarInformacoesUsuario() {

    const usuario =
        obterUsuarioAtual();


    const nome =
        usuario?.nome ||
        "Usuário";


    const tipo =
        String(
            usuario?.tipo || ""
        )
            .trim()
            .toUpperCase();


    if (usuariosElementos.userName) {

        usuariosElementos.userName.textContent =
            nome;
    }


    if (usuariosElementos.userRole) {

        usuariosElementos.userRole.textContent =
            tipo === "ADM"
                ? "Administrador"
                : "Atendente";
    }


    if (usuariosElementos.profileBadge) {

        usuariosElementos.profileBadge.textContent =
            tipo === "ADM"
                ? "Acesso ADM"
                : "Acesso ATENDENTE";
    }


    configurarTiposPermitidos();
}


/* ============================================================
   REGRA DE TIPOS
   ============================================================ */

function configurarTiposPermitidos() {

    if (!usuariosElementos.type) {

        return;
    }


    const tipoAtual =
        AdminUsuariosPage.tipoUsuarioAtual;


    /*
     * ADM pode criar CLIENTE, ATENDENTE e ADM.
     *
     * ATENDENTE pode criar somente CLIENTE.
     */

    if (tipoAtual === "ATENDENTE") {

        usuariosElementos.type.innerHTML = `
            <option value="CLIENTE">
                CLIENTE
            </option>
        `;


        usuariosElementos.type.value =
            "CLIENTE";


        usuariosElementos.typeHelp.textContent =
            "Como ATENDENTE, você pode cadastrar apenas clientes.";
    }


    if (tipoAtual === "ADM") {

        usuariosElementos.type.innerHTML = `
            <option value="CLIENTE">
                CLIENTE
            </option>

            <option value="ATENDENTE">
                ATENDENTE
            </option>

            <option value="ADM">
                ADM
            </option>
        `;


        usuariosElementos.typeHelp.textContent =
            "O ADM possui controle completo sobre os perfis.";
    }
}


/* ============================================================
   HEADERS
   ============================================================ */

function obterHeadersUsuarios() {

    const token =
        obterTokenUsuarios();


    const headers = {
        "Content-Type": "application/json"
    };


    if (token) {

        headers.Authorization =
            `Bearer ${token}`;
    }


    return headers;
}


/* ============================================================
   REQUISIÇÃO
   ============================================================ */

async function requisicaoUsuarios(
    endpoint,
    opcoes = {}
) {

    const token =
        obterTokenUsuarios();


    if (!token) {

        window.location.href =
            "login.html";

        throw new Error(
            "Sessão não encontrada."
        );
    }


    const configuracao = {

        method:
            opcoes.method ||
            "GET",

        headers: {
            ...obterHeadersUsuarios(),
            ...(opcoes.headers || {})
        }
    };


    if (
        opcoes.body !== undefined &&
        opcoes.body !== null
    ) {

        configuracao.body =
            typeof opcoes.body === "string"
                ? opcoes.body
                : JSON.stringify(
                    opcoes.body
                );
    }


    const resposta =
        await fetch(
            `${ADMIN_USERS_API_BASE_URL}${endpoint}`,
            configuracao
        );


    let dados = null;


    const contentType =
        resposta.headers.get(
            "content-type"
        ) || "";


    if (
        contentType.includes(
            "application/json"
        )
    ) {

        try {

            dados =
                await resposta.json();

        } catch (erro) {

            dados = null;
        }

    } else {

        try {

            const texto =
                await resposta.text();

            dados =
                texto
                    ? { mensagem: texto }
                    : null;

        } catch (erro) {

            dados = null;
        }
    }


    if (resposta.status === 401) {

        if (typeof logout === "function") {

            logout();

        } else {

            localStorage.removeItem(
                "biblioteca_token"
            );

            localStorage.removeItem(
                "biblioteca_usuario"
            );

            window.location.href =
                "login.html";
        }


        throw new Error(
            "Sua sessão expirou. Faça login novamente."
        );
    }


    if (resposta.status === 403) {

        throw new Error(
            dados?.mensagem ||
            dados?.erro ||
            "Você não possui permissão para esta ação."
        );
    }


    if (!resposta.ok) {

        throw new Error(
            dados?.mensagem ||
            dados?.erro ||
            dados?.msg ||
            `Erro na API (${resposta.status}).`
        );
    }


    return dados;
}


/* ============================================================
   EXTRAIR LISTA
   ============================================================ */

function extrairListaUsuarios(dados) {

    if (Array.isArray(dados)) {

        return dados;
    }


    if (Array.isArray(dados?.usuarios)) {

        return dados.usuarios;
    }


    if (Array.isArray(dados?.data)) {

        return dados.data;
    }


    if (
        Array.isArray(
            dados?.data?.usuarios
        )
    ) {

        return dados.data.usuarios;
    }


    return [];
}


/* ============================================================
   NORMALIZAR
   ============================================================ */

function normalizarUsuario(usuario) {

    return {

        id:
            String(
                usuario?.id ??
                ""
            ),

        nome:
            String(
                usuario?.nome ??
                ""
            ).trim(),

        email:
            String(
                usuario?.email ??
                ""
            ).trim().toLowerCase(),

        tipo:
            String(
                usuario?.tipo ??
                "CLIENTE"
            )
                .trim()
                .toUpperCase()
    };
}


/* ============================================================
   CARREGAR USUÁRIOS
   ============================================================ */

async function carregarUsuarios() {

    if (
        AdminUsuariosPage.carregando
    ) {

        return;
    }


    AdminUsuariosPage.carregando =
        true;


    mostrarStatusUsuarios(
        "Carregando usuários..."
    );


    try {

        const dados =
            await requisicaoUsuarios(
                "/usuarios"
            );


        AdminUsuariosPage.usuarios =
            extrairListaUsuarios(
                dados
            )
                .map(
                    normalizarUsuario
                );


        atualizarIndicadoresUsuarios();

        aplicarFiltrosUsuarios();

    } catch (erro) {

        console.error(
            "Erro ao carregar usuários:",
            erro
        );


        mostrarErroUsuarios(
            erro.message ||
            "Não foi possível carregar os usuários."
        );

    } finally {

        AdminUsuariosPage.carregando =
            false;
    }
}


/* ============================================================
   FILTROS
   ============================================================ */

function aplicarFiltrosUsuarios() {

    const termo =
        String(
            usuariosElementos.search
                ?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const tipo =
        String(
            usuariosElementos.typeFilter
                ?.value ||
            "TODOS"
        )
            .trim()
            .toUpperCase();


    AdminUsuariosPage.usuariosFiltrados =
        AdminUsuariosPage.usuarios.filter(
            (usuario) => {

                const texto =
                    `${usuario.nome} ${usuario.email}`
                        .toLowerCase();


                const correspondeTexto =
                    !termo ||
                    texto.includes(termo);


                const correspondeTipo =
                    tipo === "TODOS" ||
                    usuario.tipo === tipo;


                return (
                    correspondeTexto &&
                    correspondeTipo
                );
            }
        );


    renderizarUsuarios();
}


/* ============================================================
   RENDERIZAR
   ============================================================ */

function renderizarUsuarios() {

    const usuarios =
        AdminUsuariosPage
            .usuariosFiltrados;


    if (!usuariosElementos.tableBody) {

        return;
    }


    usuariosElementos.tableBody.innerHTML =
        "";


    esconderEstadosUsuarios();


    if (!usuarios.length) {

        usuariosElementos.empty
            ?.classList.remove(
                "users-hidden"
            );

        return;
    }


    usuariosElementos.tableWrapper
        ?.classList.remove(
            "users-hidden"
        );


    const fragmento =
        document.createDocumentFragment();


    const usuarioLogado =
        obterUsuarioAtual();


    const usuarioLogadoId =
        String(
            usuarioLogado?.id ||
            ""
        );


    usuarios.forEach(
        (usuario) => {

            const linha =
                document.createElement("tr");


            const podeExcluir =
                usuario.id !==
                usuarioLogadoId &&
                (
                    usuario.tipo !== "ADM" ||
                    AdminUsuariosPage
                        .tipoUsuarioAtual === "ADM"
                );


            let acaoHTML;


            if (podeExcluir) {

                acaoHTML = `
                    <button
                        type="button"
                        class="user-delete-button danger"
                        data-action="delete"
                        data-id="${escaparAtributo(usuario.id)}"
                    >
                        Excluir
                    </button>
                `;

            } else {

                let motivo =
                    "Protegido";


                if (
                    usuario.id ===
                    usuarioLogadoId
                ) {

                    motivo =
                        "Seu usuário";
                }


                if (
                    usuario.tipo === "ADM" &&
                    AdminUsuariosPage
                        .tipoUsuarioAtual !== "ADM"
                ) {

                    motivo =
                        "ADM protegido";
                }


                acaoHTML = `
                    <span class="user-protected">
                        ${escaparHTML(motivo)}
                    </span>
                `;
            }


            linha.innerHTML = `
                <td class="user-name-cell">
                    ${escaparHTML(
                        usuario.nome ||
                        "—"
                    )}
                </td>

                <td class="user-email-cell">
                    ${escaparHTML(
                        usuario.email ||
                        "—"
                    )}
                </td>

                <td>
                    ${criarBadgeUsuario(
                        usuario.tipo
                    )}
                </td>

                <td>
                    <div class="users-actions">
                        ${acaoHTML}
                    </div>
                </td>
            `;


            fragmento.appendChild(
                linha
            );
        }
    );


    usuariosElementos.tableBody
        .appendChild(
            fragmento
        );
}


/* ============================================================
   BADGE
   ============================================================ */

function criarBadgeUsuario(tipo) {

    const valor =
        String(
            tipo ||
            "CLIENTE"
        )
            .trim()
            .toUpperCase();


    let classe =
        "role-client";


    let texto =
        "Cliente";


    if (valor === "ATENDENTE") {

        classe =
            "role-attendant";

        texto =
            "Atendente";
    }


    if (valor === "ADM") {

        classe =
            "role-admin";

        texto =
            "ADM";
    }


    return `
        <span class="user-role-badge ${classe}">
            ${escaparHTML(texto)}
        </span>
    `;
}


/* ============================================================
   INDICADORES
   ============================================================ */

function atualizarIndicadoresUsuarios() {

    const usuarios =
        AdminUsuariosPage.usuarios;


    const total =
        usuarios.length;


    const clientes =
        usuarios.filter(
            (usuario) =>
                usuario.tipo === "CLIENTE"
        ).length;


    const atendentes =
        usuarios.filter(
            (usuario) =>
                usuario.tipo === "ATENDENTE"
        ).length;


    const admins =
        usuarios.filter(
            (usuario) =>
                usuario.tipo === "ADM"
        ).length;


    if (usuariosElementos.statTotal) {

        usuariosElementos.statTotal.textContent =
            total;
    }


    if (usuariosElementos.statClients) {

        usuariosElementos.statClients.textContent =
            clientes;
    }


    if (usuariosElementos.statAttendants) {

        usuariosElementos.statAttendants.textContent =
            atendentes;
    }


    if (usuariosElementos.statAdmins) {

        usuariosElementos.statAdmins.textContent =
            admins;
    }
}


/* ============================================================
   MODAL
   ============================================================ */

function abrirModalUsuario() {

    limparFormularioUsuario();

    configurarTiposPermitidos();


    usuariosElementos.modal
        ?.classList.add(
            "open"
        );

    usuariosElementos.modal
        ?.removeAttribute(
            "hidden"
        );


    document.body.style.overflow =
        "hidden";


    setTimeout(
        () => {

            usuariosElementos.name
                ?.focus();

        },
        100
    );
}


function fecharModalUsuario() {

    usuariosElementos.modal
        ?.classList.remove(
            "open"
        );

    usuariosElementos.modal
        ?.setAttribute(
            "hidden",
            ""
        );


    document.body.style.overflow =
        "";


    limparFormularioUsuario();
}


/* ============================================================
   FORMULÁRIO
   ============================================================ */

function limparFormularioUsuario() {

    usuariosElementos.form?.reset();


    limparMensagemFormularioUsuario();


    if (
        usuariosElementos.saveButton
    ) {

        usuariosElementos.saveButton.disabled =
            false;

        usuariosElementos.saveButton.textContent =
            "Cadastrar usuário";
    }


    configurarTiposPermitidos();
}


function limparMensagemFormularioUsuario() {

    if (
        !usuariosElementos.formMessage
    ) {

        return;
    }


    usuariosElementos.formMessage.textContent =
        "";


    usuariosElementos.formMessage.className =
        "users-form-message";
}


function mostrarMensagemFormularioUsuario(
    mensagem,
    tipo = "error"
) {

    if (
        !usuariosElementos.formMessage
    ) {

        return;
    }


    usuariosElementos.formMessage.textContent =
        mensagem;


    usuariosElementos.formMessage.className =
        `users-form-message ${tipo}`;
}


/* ============================================================
   VALIDAÇÃO
   ============================================================ */

function obterDadosFormularioUsuario() {

    const nome =
        String(
            usuariosElementos.name?.value ||
            ""
        ).trim();


    const email =
        String(
            usuariosElementos.email?.value ||
            ""
        ).trim()
            .toLowerCase();


    const senha =
        String(
            usuariosElementos.password?.value ||
            ""
        );


    const tipo =
        String(
            usuariosElementos.type?.value ||
            ""
        )
            .trim()
            .toUpperCase();


    if (!nome) {

        throw new Error(
            "Informe o nome do usuário."
        );
    }


    if (!email) {

        throw new Error(
            "Informe o e-mail do usuário."
        );
    }


    const emailValido =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email);


    if (!emailValido) {

        throw new Error(
            "Informe um e-mail válido."
        );
    }


    if (!senha) {

        throw new Error(
            "Informe a senha inicial."
        );
    }


    if (senha.length < 6) {

        throw new Error(
            "A senha deve possuir pelo menos 6 caracteres."
        );
    }


    if (
        ![
            "CLIENTE",
            "ATENDENTE",
            "ADM"
        ].includes(tipo)
    ) {

        throw new Error(
            "Selecione um tipo de usuário válido."
        );
    }


    /*
     * Regra de segurança no frontend.
     * A API também valida.
     */

    if (
        AdminUsuariosPage
            .tipoUsuarioAtual === "ATENDENTE" &&
        tipo !== "CLIENTE"
    ) {

        throw new Error(
            "ATENDENTE pode cadastrar somente CLIENTE."
        );
    }


    return {

        nome,

        email,

        senha,

        tipo
    };
}


/* ============================================================
   CADASTRAR
   ============================================================ */

async function cadastrarUsuario(evento) {

    evento.preventDefault();


    if (
        AdminUsuariosPage.salvando
    ) {

        return;
    }


    let dados;


    try {

        dados =
            obterDadosFormularioUsuario();

    } catch (erro) {

        mostrarMensagemFormularioUsuario(
            erro.message
        );

        return;
    }


    AdminUsuariosPage.salvando =
        true;


    usuariosElementos.saveButton.disabled =
        true;


    usuariosElementos.saveButton.textContent =
        "Cadastrando...";


    limparMensagemFormularioUsuario();


    try {

        await requisicaoUsuarios(
            "/usuarios",
            {
                method: "POST",
                body: dados
            }
        );


        mostrarMensagemFormularioUsuario(
            "Usuário cadastrado com sucesso.",
            "success"
        );


        await carregarUsuarios();


        setTimeout(
            () => {

                fecharModalUsuario();

            },
            650
        );


    } catch (erro) {

        console.error(
            "Erro ao cadastrar usuário:",
            erro
        );


        mostrarMensagemFormularioUsuario(
            erro.message ||
            "Não foi possível cadastrar o usuário."
        );

    } finally {

        AdminUsuariosPage.salvando =
            false;


        usuariosElementos.saveButton.disabled =
            false;


        usuariosElementos.saveButton.textContent =
            "Cadastrar usuário";
    }
}


/* ============================================================
   EXCLUIR
   ============================================================ */

async function excluirUsuario(id) {

    if (
        AdminUsuariosPage.excluindo
    ) {

        return;
    }


    const usuario =
        AdminUsuariosPage.usuarios.find(
            (item) =>
                String(item.id) ===
                String(id)
        );


    if (!usuario) {

        mostrarErroUsuarios(
            "Usuário não encontrado."
        );

        return;
    }


    const usuarioAtual =
        obterUsuarioAtual();


    const usuarioAtualId =
        String(
            usuarioAtual?.id ||
            ""
        );


    if (
        String(id) ===
        usuarioAtualId
    ) {

        mostrarErroUsuarios(
            "Você não pode excluir o próprio usuário."
        );

        return;
    }


    if (
        usuario.tipo === "ADM" &&
        AdminUsuariosPage
            .tipoUsuarioAtual !== "ADM"
    ) {

        mostrarErroUsuarios(
            "ATENDENTE não pode excluir usuário ADM."
        );

        return;
    }


    const confirmacao =
        window.confirm(
            `Deseja realmente excluir o usuário "${usuario.nome}"?`
        );


    if (!confirmacao) {

        return;
    }


    AdminUsuariosPage.excluindo =
        true;


    try {

        await requisicaoUsuarios(
            `/usuarios/${encodeURIComponent(id)}`,
            {
                method: "DELETE"
            }
        );


        await carregarUsuarios();


    } catch (erro) {

        console.error(
            "Erro ao excluir usuário:",
            erro
        );


        mostrarErroUsuarios(
            erro.message ||
            "Não foi possível excluir o usuário."
        );

    } finally {

        AdminUsuariosPage.excluindo =
            false;
    }
}


/* ============================================================
   AÇÕES DA TABELA
   ============================================================ */

function tratarAcaoUsuario(evento) {

    const botao =
        evento.target.closest(
            "[data-action]"
        );


    if (!botao) {

        return;
    }


    const acao =
        botao.dataset.action;


    const id =
        botao.dataset.id;


    if (
        acao === "delete" &&
        id
    ) {

        excluirUsuario(id);
    }
}


/* ============================================================
   ESTADOS
   ============================================================ */

function esconderEstadosUsuarios() {

    usuariosElementos.status
        ?.classList.add(
            "users-hidden"
        );

    usuariosElementos.tableWrapper
        ?.classList.add(
            "users-hidden"
        );

    usuariosElementos.empty
        ?.classList.add(
            "users-hidden"
        );

    usuariosElementos.error
        ?.classList.add(
            "users-hidden"
        );
}


function mostrarStatusUsuarios(
    mensagem
) {

    esconderEstadosUsuarios();


    usuariosElementos.status
        ?.classList.remove(
            "users-hidden"
        );


    usuariosElementos.status.textContent =
        mensagem;
}


function mostrarErroUsuarios(
    mensagem
) {

    esconderEstadosUsuarios();


    usuariosElementos.error
        ?.classList.remove(
            "users-hidden"
        );


    usuariosElementos.error.textContent =
        mensagem;
}


/* ============================================================
   LOGOUT
   ============================================================ */

function sairUsuarios() {

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


/* ============================================================
   TECLADO / MODAL
   ============================================================ */

function tratarTeclaUsuarios(
    evento
) {

    if (
        evento.key === "Escape" &&
        !usuariosElementos.modal
            ?.classList.contains(
                "hidden"
            )
    ) {

        fecharModalUsuario();
    }
}


/* ============================================================
   SEGURANÇA HTML
   ============================================================ */

function escaparHTML(valor) {

    return String(valor ?? "")
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


function escaparAtributo(valor) {

    return escaparHTML(valor);
}


/* ============================================================
   EVENTOS
   ============================================================ */

function configurarEventosUsuarios() {

    usuariosElementos.newUserButton
        ?.addEventListener(
            "click",
            abrirModalUsuario
        );


    usuariosElementos.closeModal
        ?.addEventListener(
            "click",
            fecharModalUsuario
        );


    usuariosElementos.cancelButton
        ?.addEventListener(
            "click",
            fecharModalUsuario
        );


    usuariosElementos.modal
        ?.addEventListener(
            "click",
            (evento) => {

                if (
                    evento.target ===
                    usuariosElementos.modal
                ) {

                    fecharModalUsuario();
                }
            }
        );


    usuariosElementos.form
        ?.addEventListener(
            "submit",
            cadastrarUsuario
        );


    usuariosElementos.tableBody
        ?.addEventListener(
            "click",
            tratarAcaoUsuario
        );


    usuariosElementos.search
        ?.addEventListener(
            "input",
            aplicarFiltrosUsuarios
        );


    usuariosElementos.typeFilter
        ?.addEventListener(
            "change",
            aplicarFiltrosUsuarios
        );


    usuariosElementos.logout
        ?.addEventListener(
            "click",
            sairUsuarios
        );


    document.addEventListener(
        "keydown",
        tratarTeclaUsuarios
    );
}


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

async function iniciarAdminUsuarios() {

    capturarElementosUsuarios();


    if (
        !verificarAcessoUsuarios()
    ) {

        return;
    }


    carregarInformacoesUsuario();


    configurarEventosUsuarios();


    await carregarUsuarios();
}


document.addEventListener(
    "DOMContentLoaded",
    iniciarAdminUsuarios
);


/* ============================================================
   API PÚBLICA
   ============================================================ */

window.BibliotecaAdminUsuarios = {

    carregarUsuarios,

    aplicarFiltrosUsuarios,

    abrirModalUsuario,

    fecharModalUsuario,

    excluirUsuario
};