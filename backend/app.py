import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.exceptions import HTTPException

# Carrega o arquivo .env para variáveis como JWT_SECRET_KEY, CORS_ORIGINS
# e as configurações de e-mail (BREVO_API_KEY e EMAIL_FROM).
load_dotenv()

import firebase_config

from routes.auth_routes import auth_bp
from routes.livros_routes import livros_bp
from routes.usuarios_routes import usuarios_bp
from routes.emprestimos_routes import emprestimos_bp


app = Flask(__name__)

secret = os.getenv("JWT_SECRET_KEY")
if not secret:
    raise RuntimeError("Defina JWT_SECRET_KEY no ambiente ou no .env.")
app.config["JWT_SECRET_KEY"] = secret

# Origens autorizadas a chamar a API. O Live Server do VS Code (localhost:5500)
# já vem liberado; em produção, defina CORS_ORIGINS com a URL do site,
# separadas por vírgula.
origens_extra = os.getenv("CORS_ORIGINS", "")
origens = ["http://localhost:5500", "http://127.0.0.1:5500"]
origens += [origem.strip() for origem in origens_extra.split(",") if origem.strip()]

CORS(
    app,
    resources={r"/*": {"origins": origens}},
)
JWTManager(app)

app.register_blueprint(auth_bp)
app.register_blueprint(livros_bp)
app.register_blueprint(usuarios_bp)
app.register_blueprint(emprestimos_bp)


# Garante que qualquer erro inesperado do servidor (uma exceção que
# ninguém previu) sempre volte como JSON.
@app.errorhandler(Exception)
def tratar_erro_inesperado(erro):
    if isinstance(erro, HTTPException):
        # Erros "normais" do próprio Flask — mantém o status original, só troca o
        # corpo pra JSON.
        return {"erro": erro.description}, erro.code

    app.logger.exception("Erro inesperado não tratado")
    return {"erro": "Erro interno no servidor. Tente novamente em instantes."}, 500


@app.get("/")
def inicio():
    return {
        "sistema": "Sistema de Biblioteca",
        "status": "API funcionando",
    }


if __name__ == "__main__":
    app.run(
        debug=os.getenv("FLASK_DEBUG") == "1",
        host="127.0.0.1",
        port=5000,
    )
