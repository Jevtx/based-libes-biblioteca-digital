from flask import Blueprint, jsonify, request

from firebase_config import db
from utils.auth_utils import login_required, admin_or_attendant_required

livros_bp = Blueprint("livros", __name__)


def erro(mensagem, status=400):
    return jsonify({"erro": mensagem}), status


def livro_para_json(doc):
    data = doc.to_dict()

    return {
        "id": doc.id,
        "titulo": data.get("titulo"),
        "autor": data.get("autor"),
        "categoria": data.get("categoria"),
        "ano": data.get("ano"),
        "situacao": data.get("situacao", "DISPONIVEL"),
    }


@livros_bp.get("/livros")
@login_required
def listar_livros():
    titulo = request.args.get("titulo", "").strip().lower()

    livros = [
        livro_para_json(doc)
        for doc in db.collection("livros").stream()
    ]

    if titulo:
        livros = [
            livro for livro in livros
            if titulo in livro["titulo"].lower()
        ]

    livros.sort(key=lambda livro: livro["titulo"].lower())
    return jsonify(livros), 200


@livros_bp.get("/livros/<livro_id>")
@login_required
def detalhe_livro(livro_id):
    doc = db.collection("livros").document(livro_id).get()

    if not doc.exists:
        return erro("Livro não encontrado.", 404)

    return jsonify(livro_para_json(doc)), 200


@livros_bp.post("/livros")
@admin_or_attendant_required
def cadastrar_livro():
    data = request.get_json(silent=True) or {}

    campos = ["titulo", "autor", "categoria", "ano"]
    faltantes = [campo for campo in campos if not data.get(campo)]

    if faltantes:
        return erro(
            "Campos obrigatórios: " + ", ".join(faltantes)
        )

    try:
        ano = int(data["ano"])
    except (ValueError, TypeError):
        return erro("O campo ano deve ser numérico.")

    ref = db.collection("livros").document()

    ref.set({
        "titulo": str(data["titulo"]).strip(),
        "autor": str(data["autor"]).strip(),
        "categoria": str(data["categoria"]).strip(),
        "ano": ano,
        "situacao": "DISPONIVEL",
    })

    return jsonify({
        "mensagem": "Livro cadastrado com sucesso.",
        "livro": livro_para_json(ref.get()),
    }), 201


@livros_bp.put("/livros/<livro_id>")
@admin_or_attendant_required
def editar_livro(livro_id):
    ref = db.collection("livros").document(livro_id)
    doc = ref.get()

    if not doc.exists:
        return erro("Livro não encontrado.", 404)

    data = request.get_json(silent=True) or {}
    atualizacoes = {}

    for campo in ("titulo", "autor", "categoria"):
        if campo in data:
            atualizacoes[campo] = str(data[campo]).strip()

    if "ano" in data:
        try:
            atualizacoes["ano"] = int(data["ano"])
        except (ValueError, TypeError):
            return erro("O campo ano deve ser numérico.")

    if atualizacoes:
        ref.update(atualizacoes)

    return jsonify({
        "mensagem": "Livro atualizado com sucesso.",
        "livro": livro_para_json(ref.get()),
    }), 200


@livros_bp.delete("/livros/<livro_id>")
@admin_or_attendant_required
def excluir_livro(livro_id):
    ref = db.collection("livros").document(livro_id)
    doc = ref.get()

    if not doc.exists:
        return erro("Livro não encontrado.", 404)

    if doc.to_dict().get("situacao") == "EMPRESTADO":
        return erro(
            "Não é possível excluir um livro emprestado.",
            409,
        )

    ref.delete()

    return jsonify({
        "mensagem": "Livro excluído com sucesso."
    }), 200
