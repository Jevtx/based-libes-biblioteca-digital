# Based Libes — Biblioteca Digital

Aplicação web de gestão de biblioteca: catálogo, empréstimos e painel administrativo,
com três perfis de acesso e login com Google.

Desenvolvida na disciplina *Engenharia de Software e Projeto Interdisciplinar II*
(Grau Técnico). [A CONFIRMAR: individual ou em grupo? Se grupo: "Em grupo de N pessoas.
Minha parte: ..."]

**Demo:** https://basedlibes.netlify.app
> O backend está em plano gratuito e a primeira requisição pode levar cerca de 1 minuto.
> Entrar com Google cria uma conta de Cliente automaticamente.

## Telas

![Login](docs/img/login.png)
![Catálogo](docs/img/catalogo.png)
![Meus empréstimos](docs/img/meus-emprestimos.png)
![Gestão de livros](docs/img/admin-livros.png)
![Gestão de usuários](docs/img/admin-usuarios.png)
![Controle de empréstimos](docs/img/admin-emprestimos.png)

## Funcionalidades por perfil

| Ação | Cliente | Atendente | Admin |
|---|:-:|:-:|:-:|
| Consultar catálogo e pegar livro emprestado | ✔ | ✔ | ✔ |
| Devolver o próprio empréstimo | ✔ | ✔ | ✔ |
| Ver histórico pessoal | ✔ | ✔ | ✔ |
| Cadastrar, editar e excluir livros | | ✔ | ✔ |
| Ver todos os empréstimos e registrar devolução | | ✔ | ✔ |
| Cadastrar Clientes e Atendentes | | ✔ | ✔ |
| Excluir usuários | | [A CONFIRMAR após decidir a regra] | ✔ |
| Cadastrar e excluir Admin | | | ✔ |

Quem se cadastra ou entra com Google recebe sempre o perfil Cliente.

## Tecnologias

- **Backend:** Python, Flask, Flask-JWT-Extended, Firebase Admin SDK
- **Banco e autenticação:** Cloud Firestore, Firebase Authentication (login com Google)
- **Frontend:** HTML, CSS e JavaScript
- **Hospedagem:** Netlify (frontend) e Render (API)

## Segurança implementada

- Senhas armazenadas com hash (Werkzeug), nunca em texto puro
- Autenticação com JWT e permissões por perfil verificadas no backend
- Empréstimo e devolução em transações do Firestore (evita empréstimo duplicado)
- Recuperação de senha com token de uso único, validade de 30 minutos e guardado como hash
- CORS restrito às origens autorizadas
- Credenciais em variáveis de ambiente, fora do repositório

## Como rodar localmente

Requisitos: Python 3.10+ e um projeto Firebase com Firestore e conta de serviço.

```bash
cd backend
python -m venv venv
source venv/Scripts/activate      # Windows (Git Bash); Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env              # preencha JWT_SECRET_KEY
# coloque serviceAccountKey.json em backend/ (ou defina FIREBASE_CREDENTIALS_JSON)
python seed_admin.py              # cria o primeiro admin (só na primeira vez)
python app.py                     # API em http://127.0.0.1:5000
```

Em outro terminal, na raiz do projeto: `python -m http.server 5500` e abra `http://127.0.0.1:5500`.

## Próximos passos

- Testes automatizados das rotas principais (login, permissões, empréstimo duplicado)
- Limite de tentativas de login
- Paginação e menos consultas repetidas na listagem de empréstimos
- Impedir exclusão de usuário com empréstimo ativo