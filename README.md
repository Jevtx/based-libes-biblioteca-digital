# Sistema de Biblioteca — pronto para publicação

Este pacote já está revisado, testado e configurado para ir ao ar. Login com Google, cadastro,
CRUD de livros/usuários e empréstimos foram testados localmente com sucesso.

## O que foi revisado e testado nesta rodada

- Backend recompilado e testado com um cliente de teste do Flask: todas as rotas (`/`, `/login`,
  `/cadastro`, `/login/google`, `/livros`, `/usuarios`, `/emprestimos` e as de recuperação de
  senha) respondem corretamente, inclusive nos casos de erro (token ausente, token inválido,
  corpo de requisição vazio).
- Confirmado que `JWT_SECRET_KEY` no `.env` foi gerada corretamente (64 caracteres, formato
  esperado).
- Confirmado que `CORS_ORIGINS` já estava restrito a `localhost:5500`/`127.0.0.1:5500` (passo 4
  da lista de segurança).
- Confirmado que `firebase-config.js` está com valores reais (`apiKey`, `messagingSenderId`,
  `appId`) do projeto `biblioteca-14ecc`.
- **Adicionado `js/config.js`**: define automaticamente a URL da API certa
  (desenvolvimento local vs. produção), incluído como o primeiro `<script>` em todas as
  páginas. Veja `Publicar_no_Netlify.md` para o que precisa ser editado nele.
- **Adicionado suporte a `FIREBASE_CREDENTIALS_JSON`** em `firebase_config.py`: em produção, em
  vez de subir o `serviceAccountKey.json`, você cola o conteúdo dele numa variável de ambiente.
  Testado e funcionando.
- **Adicionado `gunicorn`** ao `requirements.txt` (servidor de produção; o `python app.py` local
  continua funcionando igual, sem mudança no seu fluxo do dia a dia).
- **Adicionado `netlify.toml`** na raiz — o projeto foi reorganizado com `index.html` e tudo do frontend direto na raiz (sem a subpasta `frontend/`), o que simplifica a configuração no Netlify. A pasta `backend/` continua separada, e o `netlify.toml` já bloqueia o acesso público a ela.
- `CORS_ORIGINS` no `app.py` agora também lê uma variável de ambiente (além dos endereços locais
  fixos), para você liberar a URL do Netlify sem precisar editar código.

## Próximo passo

Siga o **`Publicar_no_Netlify.md`** — é o passo a passo completo (backend no Render + frontend
no Netlify + ajustes finais de CORS e Firebase). O **`Proximos_Passos_e_Seguranca.md`** continua
valendo como checklist de segurança geral.

## Como rodar localmente

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
```

Copie `.env.example` para `.env` e preencha `JWT_SECRET_KEY` (vocês já fizeram isso corretamente).

```bash
python seed_admin.py   # só na primeira vez
python app.py           # sobe a API em http://localhost:5000
```

Sirva a pasta raiz do projeto com o Live Server do VS Code (porta 5500) ou `python -m http.server 5500` a partir dela — o `index.html` já está na raiz.

## Atenção: `serviceAccountKey.json` e `.env`

Os dois são credenciais reais e **não podem** ir para um repositório público, print de tela ou
mensagem de grupo. Ambos já estão listados no `backend/.gitignore`. Para publicar em produção
sem subir esses arquivos, veja a seção sobre `FIREBASE_CREDENTIALS_JSON` no
`Publicar_no_Netlify.md`.
