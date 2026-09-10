from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt
from werkzeug.security import generate_password_hash

from firebase_config import db
from utils.auth_utils import admin_or_attendant_required

usuarios_bp = Blueprint("usuarios", __name__)

TIPOS_VALIDOS = {"CLIENTE", "ATENDENTE", "ADM"}


def erro(mensagem, status=400):
    return jsonify({"erro": mensagem}), status


def usuario_para_json(doc):
    data = doc.to_dict()

    return {
        "id": doc.id,
        "nome": data.get("nome"),
        "email": data.get("email"),
        "tipo": data.get("tipo"),
    }


@usuarios_bp.get("/usuarios")
@admin_or_attendant_required
def listar_usuarios():
    usuarios = [
        usuario_para_json(doc)
        for doc in db.collection("usuarios").stream()
    ]

    usuarios.sort(key=lambda usuario: usuario["nome"].lower())
    return jsonify(usuarios), 200


@usuarios_bp.post("/usuarios")
@admin_or_attendant_required
def cadastrar_usuario():
    data = request.get_json(silent=True) or {}

    nome = str(data.get("nome", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    senha = data.get("senha", "")
    tipo = str(data.get("tipo", "")).strip().upper()

    if not nome or not email or not senha or not tipo:
        return erro("Informe nome, email, senha e tipo.")

    if tipo not in TIPOS_VALIDOS:
        return erro(
            "Tipo inválido. Use CLIENTE, ATENDENTE ou ADM."
        )

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

    # Regra especial: ATENDENTE não pode criar ADM.
    if get_jwt().get("tipo") == "ATENDENTE" and tipo == "ADM":
        return erro(
            "ATENDENTE não pode cadastrar usuário ADM.",
            403,
        )

    ref = db.collection("usuarios").document()

    ref.set({
        "nome": nome,
        "email": email,
        "senha_hash": generate_password_hash(senha),
        "tipo": tipo,
    })

    return jsonify({
        "mensagem": "Usuário cadastrado com sucesso.",
        "usuario": usuario_para_json(ref.get()),
    }), 201


@usuarios_bp.delete("/usuarios/<usuario_id>")
@admin_or_attendant_required
def excluir_usuario(usuario_id):
    ref = db.collection("usuarios").document(usuario_id)
    doc = ref.get()

    if not doc.exists:
        return erro("Usuário não encontrado.", 404)

    alvo = doc.to_dict()
    tipo_solicitante = get_jwt().get("tipo")
    solicitante_id = str(get_jwt().get("sub"))

    # Somente ADM pode excluir ADM.
    if alvo.get("tipo") == "ADM" and tipo_solicitante != "ADM":
        return erro(
            "ATENDENTE não pode excluir usuário ADM.",
            403,
        )

    if usuario_id == solicitante_id:
        return erro(
            "Não é permitido excluir o próprio usuário.",
            400,
        )

    ref.delete()

    return jsonify({
        "mensagem": "Usuário excluído com sucesso."
    }), 200
