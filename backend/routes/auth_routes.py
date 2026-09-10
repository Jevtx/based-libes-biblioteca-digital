import hashlib
import os
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from flask import Blueprint, jsonify, request
from firebase_admin import auth as firebase_auth
from werkzeug.security import check_password_hash, generate_password_hash

from firebase_config import db
from utils.auth_utils import gerar_token

auth_bp = Blueprint("auth", __name__)

# Tempo de validade do link de recuperação.
RESET_TOKEN_MINUTES = 30

# Resposta genérica para não revelar se um email está cadastrado.
RESET_GENERIC_MESSAGE = (
    "Se o email estiver cadastrado, você receberá "
    "as instruções para redefinir a senha."
)


def erro(mensagem, status=400):
    return jsonify({"erro": mensagem}), status


def _hash_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _enviar_email_recuperacao(email, nome, token):
    """
    Envia o link de recuperação usando SMTP.
    Configure as variáveis SMTP no ambiente antes de usar em produção.
    """
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM", smtp_user or "")
    frontend_url = os.getenv(
        "FRONTEND_URL",
        "http://localhost:5500"
    ).rstrip("/")

    if not all([smtp_host, smtp_user, smtp_password, smtp_from]):
        raise RuntimeError(
            "SMTP não configurado. Defina SMTP_HOST, SMTP_USER, "
            "SMTP_PASSWORD e SMTP_FROM."
        )

    link = (
        f"{frontend_url}/redefinir-senha.html"
        f"?token={token}"
    )

    mensagem = EmailMessage()
    mensagem["Subject"] = "Recuperação de senha - Biblioteca"
    mensagem["From"] = smtp_from
    mensagem["To"] = email

    mensagem.set_content(
        f"""Olá, {nome}!

Recebemos uma solicitação para redefinir a senha da sua conta no Sistema de Biblioteca.

Use o link abaixo para criar uma nova senha:

{link}

Este link é válido por {RESET_TOKEN_MINUTES} minutos e pode ser usado uma única vez.

Se você não solicitou a recuperação, ignore este email.

Atenciosamente,
Sistema de Biblioteca
"""
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as smtp:
        smtp.starttls()
        smtp.login(smtp_user, smtp_password)
        smtp.send_message(mensagem)


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}

    email = str(data.get("email", "")).strip().lower()
    senha = data.get("senha", "")

    if not email or not senha:
        return erro("Informe email e senha.")

    docs = (
        db.collection("usuarios")
        .where("email", "==", email)
        .limit(1)
        .stream()
    )
    usuario_doc = next(docs, None)

    if usuario_doc is None:
        return erro("Email ou senha inválidos.", 401)

    usuario = usuario_doc.to_dict()

    if not check_password_hash(usuario.get("senha_hash", ""), senha):
        return erro("Email ou senha inválidos.", 401)

    usuario["id"] = usuario_doc.id
    token = gerar_token(usuario)

    return jsonify({
        "mensagem": "Login realizado com sucesso.",
        "token": token,
        "tipo": usuario["tipo"],
        "usuario": {
            "id": usuario["id"],
            "nome": usuario["nome"],
            "email": usuario["email"],
            "tipo": usuario["tipo"],
        },
    }), 200


@auth_bp.post("/login/google")
def login_google():
    """
    Login (ou cadastro automático) usando uma conta Google.

    O frontend faz o login com o SDK do Firebase no navegador e nos manda
    só o id_token resultante. Aqui a gente verifica esse token direto com
    o Firebase (garantindo que foi realmente emitido para o nosso projeto
    e que não expirou) e então:

    - se já existe um usuário com esse email, faz login nele;
    - se não existe, cria um novo usuário do tipo CLIENTE (mesma regra
      do cadastro público comum) com uma senha aleatória — quem entrar
      por aqui nunca vai usar login por senha, a menos que peça
      "esqueci minha senha" depois.
    """
    data = request.get_json(silent=True) or {}
    id_token = data.get("id_token", "")

    if not id_token:
        return erro("Token do Google não informado.")

    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception:
        return erro("Token do Google inválido ou expirado.", 401)

    if not decoded.get("email_verified", False):
        return erro("O email da conta Google não está verificado.", 401)

    email = str(decoded.get("email", "")).strip().lower()
    if not email:
        return erro("Não foi possível obter o email da conta Google.", 400)

    nome = decoded.get("name") or email.split("@")[0]

    docs = (
        db.collection("usuarios")
        .where("email", "==", email)
        .limit(1)
        .stream()
    )
    usuario_doc = next(docs, None)

    if usuario_doc is None:
        ref = db.collection("usuarios").document()
        usuario = {
            "nome": nome,
            "email": email,
            # Senha aleatória e descartável: essa conta só entra pelo
            # Google, a menos que peça uma redefinição de senha depois.
            "senha_hash": generate_password_hash(secrets.token_hex(32)),
            "tipo": "CLIENTE",
            "login_google": True,
        }
        ref.set(usuario)
        usuario["id"] = ref.id
    else:
        usuario = usuario_doc.to_dict()
        usuario["id"] = usuario_doc.id

    token = gerar_token(usuario)

    return jsonify({
        "mensagem": "Login com Google realizado com sucesso.",
        "token": token,
        "tipo": usuario["tipo"],
        "usuario": {
            "id": usuario["id"],
            "nome": usuario["nome"],
            "email": usuario["email"],
            "tipo": usuario["tipo"],
        },
    }), 200


@auth_bp.post("/cadastro")
def cadastro_cliente():
    data = request.get_json(silent=True) or {}

    nome = str(data.get("nome", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    senha = data.get("senha", "")

    if not nome or not email or not senha:
        return erro("Informe nome, email e senha.")

    if len(senha) < 6:
        return erro("A senha deve possuir pelo menos 6 caracteres.")

    existente = (
        db.collection("usuarios")
        .where("email", "==", email)
        .limit(1)
        .stream()
    )

    if next(existente, None) is not None:
        return erro(
            "Já existe usuário cadastrado com este email.",
            409,
        )

    ref = db.collection("usuarios").document()

    ref.set({
        "nome": nome,
        "email": email,
        "senha_hash": generate_password_hash(senha),
        "tipo": "CLIENTE",
    })

    return jsonify({
        "mensagem": "Cliente cadastrado com sucesso.",
        "usuario": {
            "id": ref.id,
            "nome": nome,
            "email": email,
            "tipo": "CLIENTE",
        },
    }), 201


@auth_bp.post("/recuperar-senha")
def solicitar_recuperacao():
    """
    Solicita recuperação por email.

    Importante:
    - A resposta é sempre genérica para evitar enumeração de contas.
    - O token bruto só vai para o email.
    - No Firestore fica somente o hash do token.
    """
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()

    if not email:
        # Mesmo para entrada inválida, mantemos uma resposta simples.
        return jsonify({"mensagem": RESET_GENERIC_MESSAGE}), 200

    docs = (
        db.collection("usuarios")
        .where("email", "==", email)
        .limit(1)
        .stream()
    )
    usuario_doc = next(docs, None)

    if usuario_doc is None:
        return jsonify({"mensagem": RESET_GENERIC_MESSAGE}), 200

    usuario = usuario_doc.to_dict()

    # Token criptograficamente aleatório.
    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)

    agora = datetime.now(timezone.utc)
    expira_em = agora + timedelta(minutes=RESET_TOKEN_MINUTES)

    # O hash é usado como ID do documento; o token original
    # nunca é armazenado no Firestore.
    db.collection("recuperacoes_senha").document(token_hash).set({
        "usuario_id": usuario_doc.id,
        "email": email,
        "criado_em": agora.isoformat(),
        "expira_em": expira_em.isoformat(),
        "usado": False,
    })

    try:
        _enviar_email_recuperacao(
            email=email,
            nome=usuario.get("nome", "usuário"),
            token=token,
        )
    except Exception as exc:
        # Não revela ao cliente detalhes do SMTP.
        print(f"[ERRO SMTP] Falha ao enviar recuperação: {exc}")

    return jsonify({"mensagem": RESET_GENERIC_MESSAGE}), 200


@auth_bp.post("/redefinir-senha")
def redefinir_senha():
    data = request.get_json(silent=True) or {}

    token = str(data.get("token", "")).strip()
    nova_senha = data.get("nova_senha", "")

    if not token or not nova_senha:
        return erro("Informe o token e a nova senha.")

    if len(nova_senha) < 6:
        return erro(
            "A nova senha deve possuir pelo menos 6 caracteres."
        )

    token_hash = _hash_token(token)
    ref = db.collection("recuperacoes_senha").document(token_hash)
    doc = ref.get()

    if not doc.exists:
        return erro("Link de recuperação inválido ou expirado.", 400)

    recuperacao = doc.to_dict()

    if recuperacao.get("usado") is True:
        return erro(
            "Este link de recuperação já foi utilizado.",
            400,
        )

    try:
        expira_em = datetime.fromisoformat(
            recuperacao["expira_em"]
        )
    except (KeyError, ValueError, TypeError):
        return erro("Link de recuperação inválido.", 400)

    if datetime.now(timezone.utc) >= expira_em:
        return erro(
            "Link de recuperação expirado. Solicite um novo.",
            400,
        )

    usuario_id = recuperacao.get("usuario_id")

    usuario_ref = db.collection("usuarios").document(usuario_id)
    usuario_doc = usuario_ref.get()

    if not usuario_doc.exists:
        return erro("Usuário não encontrado.", 404)

    usuario_ref.update({
        "senha_hash": generate_password_hash(nova_senha)
    })

    # Token de uso único.
    ref.update({
        "usado": True,
        "usado_em": datetime.now(timezone.utc).isoformat(),
    })

    return jsonify({
        "mensagem": "Senha redefinida com sucesso. Faça login novamente."
    }), 200
