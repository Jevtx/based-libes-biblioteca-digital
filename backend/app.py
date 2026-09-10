import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

# Carrega o arquivo .env (se existir) para variáveis como
# JWT_SECRET_KEY e as configurações de SMTP da recuperação de senha.
load_dotenv()

import firebase_config

from routes.auth_routes import auth_bp
from routes.livros_routes import livros_bp
from routes.usuarios_routes import usuarios_bp
from routes.emprestimos_routes import emprestimos_bp


app = Flask(__name__)

app.config["JWT_SECRET_KEY"] = os.getenv(
    "JWT_SECRET_KEY",
    "CHAVE-SECRETA-ALTERE-EM-PRODUCAO",
)

# Origens autorizadas a chamar a API. Em desenvolvimento, o Live Server
# do VS Code roda em localhost:5500. Em produção, adicione a URL do seu
# site no Netlify na variável de ambiente CORS_ORIGINS (separadas por
# vírgula), por exemplo:
#   CORS_ORIGINS=https://seu-site.netlify.app
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


@app.get("/")
def inicio():
    return {
        "sistema": "Sistema de Biblioteca",
        "status": "API funcionando",
    }


if __name__ == "__main__":
    app.run(
        debug=True,
        host="0.0.0.0",
        port=5000,
    )
