"use strict";

/*
 ADMINISTRAÇÃO DE LIVROS

Responsabilidades:

- Validar sessão
- Validar perfil ADM / ATENDENTE
- Carregar livros pela API
- Exibir estatísticas
- Buscar livros
- Filtrar por categoria
- Cadastrar livros
- Editar livros
- Excluir livros
- Impedir exclusão de livro emprestado
- Atualizar a interface sem recarregar a página
- Tratar erros de autenticação e API

Backend utilizado:

GET    /livros
POST   /livros
PUT    /livros/{id}
DELETE /livros/{id}
*/

const AdminLivrosPage = {
    livros: [],
    livrosFiltrados: [],
    livroEmEdicao: null,

    elementos: {},

    iniciar() {
        this.capturarElementos();

        if (!this.validarAcesso()) {
            return;
        }

        this.exibirUsuario();
        this.configurarEventos();
        this.carregarLivros();
    },

    /* 
       DOM
     */

    capturarElementos() {
        this.elementos = {
            userName: document.getElementById("adminBooksUserName"),
            userRole: document.getElementById("adminBooksUserRole"),
            profileBadge: document.getElementById(
                "adminBooksProfileBadge"
            ),
            logout: document.getElementById(
                "adminBooksLogout"
            ),

            total: document.getElementById(
                "adminBooksTotal"
            ),
            available: document.getElementById(
                "adminBooksAvailable"
            ),
            loaned: document.getElementById(
                "adminBooksLoaned"
            ),

            search: document.getElementById(
                "adminBooksSearch"
            ),
            categoryFilter: document.getElementById(
                "adminBooksCategoryFilter"
            ),

            status: document.getElementById(
                "adminBooksStatus"
            ),

            loading: document.getElementById(
                "adminBooksLoading"
            ),

            error: document.getElementById(
                "adminBooksError"
            ),

            empty: document.getElementById(
                "adminBooksEmpty"
            ),

            tableWrapper: document.getElementById(
                "adminBooksTableWrapper"
            ),

            tableBody: document.getElementById(
                "adminBooksTableBody"
            ),

            newBookButton: document.getElementById(
                "newBookButton"
            ),

            modal: document.getElementById(
                "bookModal"
            ),

            modalTitle: document.getElementById(
                "bookModalTitle"
            ),

            closeModal: document.getElementById(
                "closeBookModal"
            ),

            cancelButton: document.getElementById(
                "cancelBookButton"
            ),

            form: document.getElementById(
                "bookForm"
            ),

            formMessage: document.getElementById(
                "bookFormMessage"
            ),

            bookId: document.getElementById(
                "bookId"
            ),

            bookTitle: document.getElementById(
                "bookTitle"
            ),

            bookAuthor: document.getElementById(
                "bookAuthor"
            ),

            bookCategory: document.getElementById(
                "bookCategory"
            ),

            bookYear: document.getElementById(
                "bookYear"
            ),

            saveButton: document.getElementById(
                "saveBookButton"
            ),
        };
    },

    /*
       AUTENTICAÇÃO / AUTORIZAÇÃO
     */

    validarAcesso() {
        const token =
            typeof getToken === "function"
                ? getToken()
                : localStorage.getItem("biblioteca_token");

        const usuario =
            typeof getUsuario === "function"
                ? getUsuario()
                : this.obterUsuarioDoStorage();

        if (!token || !usuario) {
            window.location.href = "login.html";
            return false;
        }

        const tipo = String(
            usuario.tipo || ""
        ).toUpperCase();

        if (
            tipo !== "ADM" &&
            tipo !== "ATENDENTE"
        ) {
            window.location.href = "livros.html";
            return false;
        }

        return true;
    },

    obterUsuarioDoStorage() {
        try {
            const dados =
                localStorage.getItem(
                    "biblioteca_usuario"
                );

            return dados
                ? JSON.parse(dados)
                : null;
        } catch (erro) {
            console.error(
                "Erro ao ler usuário:",
                erro
            );

            return null;
        }
    },

    obterToken() {
        if (typeof getToken === "function") {
            return getToken();
        }

        return localStorage.getItem(
            "biblioteca_token"
        );
    },

    obterUsuario() {
        if (typeof getUsuario === "function") {
            return getUsuario();
        }

        return this.obterUsuarioDoStorage();
    },

    /*
       USUÁRIO
     */

    exibirUsuario() {
        const usuario = this.obterUsuario();

        if (!usuario) {
            return;
        }

        const nome =
            usuario.nome ||
            usuario.email ||
            "Usuário";

        const tipo =
            String(
                usuario.tipo || ""
            ).toUpperCase();

        if (this.elementos.userName) {
            this.elementos.userName.textContent =
                nome;
        }

        if (this.elementos.userRole) {
            this.elementos.userRole.textContent =
                this.nomePerfil(tipo);
        }

        if (this.elementos.profileBadge) {
            this.elementos.profileBadge.textContent =
                this.nomePerfil(tipo);
        }
    },

    nomePerfil(tipo) {
        const perfis = {
            ADM: "Administrador",
            ATENDENTE: "Atendente",
            CLIENTE: "Cliente",
        };

        return (
            perfis[tipo] ||
            tipo ||
            "Usuário"
        );
    },

    /*
       EVENTOS
     */

    configurarEventos() {
        this.elementos.search?.addEventListener(
            "input",
            () => {
                this.aplicarFiltros();
            }
        );

        this.elementos.categoryFilter?.addEventListener(
            "change",
            () => {
                this.aplicarFiltros();
            }
        );

        this.elementos.newBookButton?.addEventListener(
            "click",
            () => {
                this.abrirModalNovoLivro();
            }
        );

        this.elementos.closeModal?.addEventListener(
            "click",
            () => {
                this.fecharModal();
            }
        );

        this.elementos.cancelButton?.addEventListener(
            "click",
            () => {
                this.fecharModal();
            }
        );

        this.elementos.modal?.addEventListener(
            "click",
            (evento) => {
                if (
                    evento.target ===
                    this.elementos.modal
                ) {
                    this.fecharModal();
                }
            }
        );

        this.elementos.form?.addEventListener(
            "submit",
            (evento) => {
                evento.preventDefault();

                this.salvarLivro();
            }
        );

        document.addEventListener(
            "keydown",
            (evento) => {
                if (
                    evento.key === "Escape" &&
                    !this.elementos.modal?.classList.contains(
                        "hidden"
                    )
                ) {
                    this.fecharModal();
                }
            }
        );

        this.elementos.logout?.addEventListener(
            "click",
            () => {
                this.executarLogout();
            }
        );
    },

    executarLogout() {
        if (typeof logout === "function") {
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
    },

    /*
       API
     */

    async carregarLivros() {
        this.mostrarLoading();

        try {
            const resposta =
                await this.fazerRequisicao(
                    "/livros",
                    {
                        method: "GET",
                    }
                );

            if (!resposta.ok) {
                await this.tratarErroResposta(
                    resposta
                );

                return;
            }

            const dados =
                await this.lerResposta(
                    resposta
                );

            this.livros =
                this.extrairListaDeLivros(
                    dados
                );

            this.normalizarLivros();

            this.atualizarCategorias();

            this.atualizarEstatisticas();

            this.aplicarFiltros();

            this.mostrarSucesso(
                "Acervo carregado com sucesso."
            );

        } catch (erro) {
            console.error(
                "Erro ao carregar livros:",
                erro
            );

            this.mostrarErro(
                this.mensagemErro(
                    erro,
                    "Não foi possível carregar o acervo."
                )
            );
        } finally {
            this.esconderLoading();
        }
    },

    async fazerRequisicao(
        endpoint,
        opcoes = {}
    ) {
        const token =
            this.obterToken();

        const headers = {
            Accept: "application/json",
            ...(opcoes.headers || {}),
        };

        if (
            opcoes.body &&
            !headers["Content-Type"]
        ) {
            headers["Content-Type"] =
                "application/json";
        }

        if (token) {
            headers.Authorization =
                `Bearer ${token}`;
        }

        return fetch(
            this.urlApi(endpoint),
            {
                ...opcoes,
                headers,
            }
        );
    },

    urlApi(endpoint) {
        const base =
            window.API_BASE_URL ||
            "http://127.0.0.1:5000";

        return (
            base.replace(/\/+$/, "") +
            "/" +
            endpoint.replace(/^\/+/, "")
        );
    },

    async lerResposta(resposta) {
        const texto =
            await resposta.text();

        if (!texto) {
            return null;
        }

        try {
            return JSON.parse(texto);
        } catch (erro) {
            return texto;
        }
    },

    extrairListaDeLivros(dados) {
        if (Array.isArray(dados)) {
            return dados;
        }

        if (
            dados &&
            Array.isArray(dados.livros)
        ) {
            return dados.livros;
        }

        if (
            dados &&
            dados.data &&
            Array.isArray(dados.data)
        ) {
            return dados.data;
        }

        if (
            dados &&
            dados.data &&
            Array.isArray(
                dados.data.livros
            )
        ) {
            return dados.data.livros;
        }

        return [];
    },

    async tratarErroResposta(resposta) {
        if (resposta.status === 401) {
            this.executarLogout();
            return;
        }

        if (resposta.status === 403) {
            this.mostrarErro(
                "Você não possui permissão para realizar esta operação."
            );

            return;
        }

        const dados =
            await this.lerResposta(
                resposta
            );

        const mensagem =
            dados?.erro ||
            dados?.mensagem ||
            `Erro ${resposta.status}.`;

        this.mostrarErro(mensagem);
    },

    mensagemErro(
        erro,
        padrao
    ) {
        if (
            erro &&
            erro.message
        ) {
            return erro.message;
        }

        return padrao;
    },

    /*
       NORMALIZAÇÃO
     */

    normalizarLivros() {
        this.livros =
            this.livros.map(
                (livro) => {
                    return {
                        id:
                            livro.id ??
                            "",

                        titulo:
                            String(
                                livro.titulo ??
                                ""
                            ).trim(),

                        autor:
                            String(
                                livro.autor ??
                                ""
                            ).trim(),

                        categoria:
                            String(
                                livro.categoria ??
                                ""
                            ).trim(),

                        ano:
                            livro.ano ??
                            "",

                        situacao:
                            String(
                                livro.situacao ??
                                "DISPONIVEL"
                            )
                                .trim()
                                .toUpperCase(),
                    };
                }
            );
    },

    /*
       FILTROS
     */

    atualizarCategorias() {
        const select =
            this.elementos.categoryFilter;

        if (!select) {
            return;
        }

        const categoriaAtual =
            select.value;

        const categorias =
            [
                ...new Set(
                    this.livros
                        .map(
                            (livro) =>
                                livro.categoria
                        )
                        .filter(Boolean)
                ),
            ].sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        "pt-BR",
                        {
                            sensitivity:
                                "base",
                        }
                    )
            );

        select.innerHTML = "";

        const opcaoTodas =
            document.createElement(
                "option"
            );

        opcaoTodas.value = "";
        opcaoTodas.textContent =
            "Todas as categorias";

        select.appendChild(
            opcaoTodas
        );

        categorias.forEach(
            (categoria) => {
                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    categoria;

                option.textContent =
                    categoria;

                select.appendChild(
                    option
                );
            }
        );

        if (
            categorias.includes(
                categoriaAtual
            )
        ) {
            select.value =
                categoriaAtual;
        }
    },

    aplicarFiltros() {
        const busca =
            String(
                this.elementos.search?.value ||
                ""
            )
                .trim()
                .toLowerCase();

        const categoria =
            String(
                this.elementos
                    .categoryFilter
                    ?.value || ""
            )
                .trim()
                .toLowerCase();

        this.livrosFiltrados =
            this.livros.filter(
                (livro) => {
                    const titulo =
                        String(
                            livro.titulo ||
                            ""
                        ).toLowerCase();

                    const autor =
                        String(
                            livro.autor ||
                            ""
                        ).toLowerCase();

                    const categoriaLivro =
                        String(
                            livro.categoria ||
                            ""
                        ).toLowerCase();

                    const correspondeBusca =
                        !busca ||
                        titulo.includes(
                            busca
                        ) ||
                        autor.includes(
                            busca
                        );

                    const correspondeCategoria =
                        !categoria ||
                        categoriaLivro ===
                            categoria;

                    return (
                        correspondeBusca &&
                        correspondeCategoria
                    );
                }
            );

        this.renderizarLivros();
    },

    /*
       ESTATÍSTICAS
     */

    atualizarEstatisticas() {
        const total =
            this.livros.length;

        const disponiveis =
            this.livros.filter(
                (livro) =>
                    this.isDisponivel(
                        livro
                    )
            ).length;

        const emprestados =
            this.livros.filter(
                (livro) =>
                    this.isEmprestado(
                        livro
                    )
            ).length;

        if (this.elementos.total) {
            this.elementos.total.textContent =
                total;
        }

        if (this.elementos.available) {
            this.elementos.available.textContent =
                disponiveis;
        }

        if (this.elementos.loaned) {
            this.elementos.loaned.textContent =
                emprestados;
        }
    },

    isDisponivel(livro) {
        return (
            String(
                livro.situacao || ""
            ).toUpperCase() ===
            "DISPONIVEL"
        );
    },

    isEmprestado(livro) {
        const situacao =
            String(
                livro.situacao || ""
            ).toUpperCase();

        return (
            situacao === "EMPRESTADO" ||
            situacao === "EMPRESTADA"
        );
    },

    /*
       RENDERIZAÇÃO
     */

    renderizarLivros() {
        const tbody =
            this.elementos.tableBody;

        if (!tbody) {
            return;
        }

        tbody.innerHTML = "";

        if (
            this.livrosFiltrados.length ===
            0
        ) {
            this.elementos.tableWrapper?.classList.add(
                "admin-books-hidden"
            );

            this.elementos.empty?.classList.remove(
                "admin-books-hidden"
            );

            return;
        }

        this.elementos.tableWrapper?.classList.remove(
            "admin-books-hidden"
        );

        this.elementos.empty?.classList.add(
            "admin-books-hidden"
        );

        this.livrosFiltrados.forEach(
            (livro) => {
                tbody.appendChild(
                    this.criarLinhaLivro(
                        livro
                    )
                );
            }
        );
    },

    criarLinhaLivro(livro) {
        const tr =
            document.createElement(
                "tr"
            );

        const tdLivro =
            document.createElement(
                "td"
            );

        const titulo =
            document.createElement(
                "div"
            );

        titulo.className =
            "admin-books-book-title";

        titulo.textContent =
            livro.titulo ||
            "Sem título";

        tdLivro.appendChild(
            titulo
        );

        const tdAutor =
            document.createElement(
                "td"
            );

        const autor =
            document.createElement(
                "div"
            );

        autor.className =
            "admin-books-book-author";

        autor.textContent =
            livro.autor ||
            "Autor não informado";

        tdAutor.appendChild(
            autor
        );

        const tdCategoria =
            document.createElement(
                "td"
            );

        const categoria =
            document.createElement(
                "span"
            );

        categoria.className =
            "admin-books-category";

        categoria.textContent =
            livro.categoria ||
            "Sem categoria";

        tdCategoria.appendChild(
            categoria
        );

        const tdAno =
            document.createElement(
                "td"
            );

        tdAno.textContent =
            livro.ano ||
            "—";

        const tdSituacao =
            document.createElement(
                "td"
            );

        const situacao =
            document.createElement(
                "span"
            );

        const situacaoTexto =
            this.textoSituacao(
                livro.situacao
            );

        situacao.className =
            "admin-books-status " +
            this.classeSituacao(
                livro.situacao
            );

        situacao.textContent =
            situacaoTexto;

        tdSituacao.appendChild(
            situacao
        );

        const tdAcoes =
            document.createElement(
                "td"
            );

        const acoes =
            document.createElement(
                "div"
            );

        acoes.className =
            "admin-books-actions";

        const editar =
            document.createElement(
                "button"
            );

        editar.type = "button";
        editar.className =
            "admin-books-action";

        editar.textContent =
            "Editar";

        editar.addEventListener(
            "click",
            () => {
                this.abrirModalEdicao(
                    livro
                );
            }
        );

        const excluir =
            document.createElement(
                "button"
            );

        excluir.type = "button";
        excluir.className =
            "admin-books-action delete";

        excluir.textContent =
            "Excluir";

        if (
            this.isEmprestado(
                livro
            )
        ) {
            excluir.disabled =
                true;

            excluir.classList.add(
                "disabled"
            );

            excluir.title =
                "Livros emprestados não podem ser excluídos.";
        } else {
            excluir.addEventListener(
                "click",
                () => {
                    this.excluirLivro(
                        livro
                    );
                }
            );
        }

        acoes.appendChild(
            editar
        );

        acoes.appendChild(
            excluir
        );

        tdAcoes.appendChild(
            acoes
        );

        tr.appendChild(
            tdLivro
        );

        tr.appendChild(
            tdAutor
        );

        tr.appendChild(
            tdCategoria
        );

        tr.appendChild(
            tdAno
        );

        tr.appendChild(
            tdSituacao
        );

        tr.appendChild(
            tdAcoes
        );

        return tr;
    },

    classeSituacao(
        situacao
    ) {
        if (
            String(
                situacao || ""
            ).toUpperCase() ===
            "DISPONIVEL"
        ) {
            return "available";
        }

        if (
            this.isEmprestado({
                situacao,
            })
        ) {
            return "loaned";
        }

        return "unknown";
    },

    textoSituacao(
        situacao
    ) {
        const valor =
            String(
                situacao || ""
            ).toUpperCase();

        if (
            valor ===
            "DISPONIVEL"
        ) {
            return "Disponível";
        }

        if (
            valor ===
                "EMPRESTADO" ||
            valor ===
                "EMPRESTADA"
        ) {
            return "Emprestado";
        }

        return (
            situacao ||
            "Não informado"
        );
    },

    /*
       MODAL — NOVO LIVRO
     */

    abrirModalNovoLivro() {
        this.livroEmEdicao =
            null;

        this.limparFormulario();

        this.elementos.modalTitle.textContent =
            "Novo livro";

        this.elementos.saveButton.textContent =
            "Salvar livro";

        this.limparMensagemFormulario();

        this.abrirModal();

        setTimeout(
            () => {
                this.elementos.bookTitle?.focus();
            },
            50
        );
    },

    /*
       MODAL — EDITAR LIVRO
     */

    abrirModalEdicao(
        livro
    ) {
        this.livroEmEdicao =
            livro;

        this.elementos.bookId.value =
            livro.id || "";

        this.elementos.bookTitle.value =
            livro.titulo || "";

        this.elementos.bookAuthor.value =
            livro.autor || "";

        this.elementos.bookCategory.value =
            livro.categoria || "";

        this.elementos.bookYear.value =
            livro.ano || "";

        this.elementos.modalTitle.textContent =
            "Editar livro";

        this.elementos.saveButton.textContent =
            "Salvar alterações";

        this.limparMensagemFormulario();

        this.abrirModal();

        setTimeout(
            () => {
                this.elementos.bookTitle?.focus();
            },
            50
        );
    },

    abrirModal() {
        this.elementos.modal?.classList.add(
            "open"
        );

        this.elementos.modal?.removeAttribute(
            "hidden"
        );

        this.elementos.modal?.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";
    },

    fecharModal() {
        this.elementos.modal?.classList.remove(
            "open"
        );

        this.elementos.modal?.setAttribute(
            "hidden",
            ""
        );

        this.elementos.modal?.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.style.overflow =
            "";

        this.livroEmEdicao =
            null;

        this.limparMensagemFormulario();
    },

    limparFormulario() {
        this.elementos.form?.reset();

        this.elementos.bookId.value =
            "";
    },

    /*
       SALVAR
     */

    async salvarLivro() {
        this.limparMensagemFormulario();

        const dados =
            this.obterDadosFormulario();

        const validacao =
            this.validarDadosFormulario(
                dados
            );

        if (!validacao.valido) {
            this.mostrarMensagemFormulario(
                validacao.mensagem
            );

            return;
        }

        this.definirBotaoSalvamento(
            true
        );

        try {
            const editando =
                Boolean(
                    this.livroEmEdicao
                );

            const endpoint =
                editando
                    ? `/livros/${encodeURIComponent(
                          this.livroEmEdicao.id
                      )}`
                    : "/livros";

            const resposta =
                await this.fazerRequisicao(
                    endpoint,
                    {
                        method:
                            editando
                                ? "PUT"
                                : "POST",

                        body:
                            JSON.stringify(
                                dados
                            ),
                    }
                );

            if (
                resposta.status ===
                401
            ) {
                this.executarLogout();
                return;
            }

            const respostaDados =
                await this.lerResposta(
                    resposta
                );

            if (!resposta.ok) {
                const mensagem =
                    respostaDados?.erro ||
                    respostaDados?.mensagem ||
                    `Não foi possível ${
                        editando
                            ? "atualizar"
                            : "cadastrar"
                    } o livro.`;

                this.mostrarMensagemFormulario(
                    mensagem
                );

                return;
            }

            this.fecharModal();

            await this.carregarLivros();

            this.mostrarSucesso(
                editando
                    ? "Livro atualizado com sucesso."
                    : "Livro cadastrado com sucesso."
            );

        } catch (erro) {
            console.error(
                "Erro ao salvar livro:",
                erro
            );

            this.mostrarMensagemFormulario(
                this.mensagemErro(
                    erro,
                    "Não foi possível salvar o livro."
                )
            );
        } finally {
            this.definirBotaoSalvamento(
                false
            );
        }
    },

    obterDadosFormulario() {
        const titulo =
            String(
                this.elementos.bookTitle
                    ?.value || ""
            ).trim();

        const autor =
            String(
                this.elementos.bookAuthor
                    ?.value || ""
            ).trim();

        const categoria =
            String(
                this.elementos.bookCategory
                    ?.value || ""
            ).trim();

        const anoTexto =
            String(
                this.elementos.bookYear
                    ?.value || ""
            ).trim();

        let ano = "";

        if (anoTexto) {
            ano =
                Number(
                    anoTexto
                );
        }

        return {
            titulo,
            autor,
            categoria,
            ano,
        };
    },

    validarDadosFormulario(
        dados
    ) {
        if (!dados.titulo) {
            return {
                valido: false,
                mensagem:
                    "Informe o título do livro.",
            };
        }

        if (!dados.autor) {
            return {
                valido: false,
                mensagem:
                    "Informe o autor do livro.",
            };
        }

        if (!dados.categoria) {
            return {
                valido: false,
                mensagem:
                    "Informe a categoria do livro.",
            };
        }

        if (
            dados.ano !== "" &&
            (
                !Number.isInteger(
                    dados.ano
                ) ||
                dados.ano < 0 ||
                dados.ano > 9999
            )
        ) {
            return {
                valido: false,
                mensagem:
                    "Informe um ano válido.",
            };
        }

        return {
            valido: true,
            mensagem: "",
        };
    },

    definirBotaoSalvamento(
        carregando
    ) {
        if (
            !this.elementos.saveButton
        ) {
            return;
        }

        this.elementos.saveButton.disabled =
            carregando;

        if (carregando) {
            this.elementos.saveButton.textContent =
                "Salvando...";
        } else {
            this.elementos.saveButton.textContent =
                this.livroEmEdicao
                    ? "Salvar alterações"
                    : "Salvar livro";
        }
    },

    /*
       EXCLUIR
     */

    async excluirLivro(
        livro
    ) {
        if (
            !livro ||
            !livro.id
        ) {
            this.mostrarErro(
                "Não foi possível identificar o livro."
            );

            return;
        }

        if (
            this.isEmprestado(
                livro
            )
        ) {
            this.mostrarErro(
                "Este livro está emprestado e não pode ser excluído."
            );

            return;
        }

        const confirmado =
            window.confirm(
                `Deseja realmente excluir o livro "${livro.titulo}"?`
            );

        if (!confirmado) {
            return;
        }

        try {
            const resposta =
                await this.fazerRequisicao(
                    `/livros/${encodeURIComponent(
                        livro.id
                    )}`,
                    {
                        method:
                            "DELETE",
                    }
                );

            if (
                resposta.status ===
                401
            ) {
                this.executarLogout();
                return;
            }

            const dados =
                await this.lerResposta(
                    resposta
                );

            if (!resposta.ok) {
                const mensagem =
                    dados?.erro ||
                    dados?.mensagem ||
                    "Não foi possível excluir o livro.";

                this.mostrarErro(
                    mensagem
                );

                return;
            }

            this.livros =
                this.livros.filter(
                    (item) =>
                        item.id !==
                        livro.id
                );

            this.atualizarCategorias();

            this.atualizarEstatisticas();

            this.aplicarFiltros();

            this.mostrarSucesso(
                "Livro excluído com sucesso."
            );

        } catch (erro) {
            console.error(
                "Erro ao excluir livro:",
                erro
            );

            this.mostrarErro(
                this.mensagemErro(
                    erro,
                    "Não foi possível excluir o livro."
                )
            );
        }
    },

    /*
       MENSAGENS
     */

    mostrarLoading() {
        this.elementos.loading?.classList.remove(
            "admin-books-hidden"
        );

        this.elementos.error?.classList.add(
            "admin-books-hidden"
        );

        this.elementos.empty?.classList.add(
            "admin-books-hidden"
        );

        this.elementos.tableWrapper?.classList.add(
            "admin-books-hidden"
        );
    },

    esconderLoading() {
        this.elementos.loading?.classList.add(
            "admin-books-hidden"
        );
    },

    mostrarErro(
        mensagem
    ) {
        if (
            !this.elementos.error
        ) {
            return;
        }

        this.elementos.error.textContent =
            mensagem;

        this.elementos.error.classList.remove(
            "admin-books-hidden"
        );
    },

    mostrarSucesso(
        mensagem
    ) {
        if (
            !this.elementos.status
        ) {
            return;
        }

        this.elementos.status.textContent =
            mensagem;

        this.elementos.status.classList.remove(
            "admin-books-hidden"
        );

        window.clearTimeout(
            this._statusTimeout
        );

        this._statusTimeout =
            window.setTimeout(
                () => {
                    this.elementos.status?.classList.add(
                        "admin-books-hidden"
                    );
                },
                3500
            );
    },

    mostrarMensagemFormulario(
        mensagem
    ) {
        if (
            !this.elementos.formMessage
        ) {
            return;
        }

        this.elementos.formMessage.textContent =
            mensagem;

        this.elementos.formMessage.classList.remove(
            "admin-books-hidden"
        );
    },

    limparMensagemFormulario() {
        if (
            !this.elementos.formMessage
        ) {
            return;
        }

        this.elementos.formMessage.textContent =
            "";

        this.elementos.formMessage.classList.add(
            "admin-books-hidden"
        );
    },
};

/*
   INICIALIZAÇÃO
 */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        AdminLivrosPage.iniciar();
    }
);

/*
   DISPONIBILIZAÇÃO GLOBAL
   Útil para testes pelo console do navegador.
 */

window.BibliotecaAdminLivros =
    AdminLivrosPage;