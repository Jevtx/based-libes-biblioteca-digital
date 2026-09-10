from datetime import datetime, timezone

from firebase_admin import firestore
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity

from firebase_config import db
from utils.auth_utils import login_required

emprestimos_bp = Blueprint("emprestimos", __name__)


def erro(mensagem, status=400):
    return jsonify({"erro": mensagem}), status


def agora():
    return datetime.now(timezone.utc).isoformat()


def livro_para_json(livro_id):
    doc = db.collection("livros").document(livro_id).get()

    if not doc.exists:
        return None

    data = doc.to_dict()

    return {
        "id": doc.id,
        "titulo": data.get("titulo"),
        "autor": data.get("autor"),
        "categoria": data.get("categoria"),
        "ano": data.get("ano"),
        "situacao": data.get("situacao", "DISPONIVEL"),
    }


def usuario_para_json(usuario_id):
    doc = db.collection("usuarios").document(usuario_id).get()

    if not doc.exists:
        return None

    data = doc.to_dict()

    return {
        "id": doc.id,
        "nome": data.get("nome"),
        "email": data.get("email"),
        "tipo": data.get("tipo"),
    }


def emprestimo_para_json(doc, administrativo=False):
    data = doc.to_dict()

    resultado = {
        "id": doc.id,
        "livro": livro_para_json(data["livro_id"]),
        "data_emprestimo": data.get("data_emprestimo"),
        "data_devolucao": data.get("data_devolucao"),
        "situacao": data.get("situacao"),
    }

    # CLIENTE nunca recebe os dados do usuário relacionado.
    if administrativo:
        resultado["usuario"] = usuario_para_json(data["usuario_id"])

    return resultado


@emprestimos_bp.post("/emprestimos")
@login_required
def criar_emprestimo():
    data = request.get_json(silent=True) or {}
    livro_id = str(data.get("livro_id", "")).strip()

    if not livro_id:
        return erro("Informe livro_id.")

    livro_ref = db.collection("livros").document(livro_id)
    livro_doc = livro_ref.get()

    if not livro_doc.exists:
        return erro("Livro não encontrado.", 404)

    if livro_doc.to_dict().get("situacao") != "DISPONIVEL":
        return erro(
            "Este livro não está disponível para empréstimo.",
            409,
        )

    usuario_id = str(get_jwt_identity())

    usuario_doc = db.collection("usuarios").document(usuario_id).get()

    if not usuario_doc.exists:
        return erro("Usuário do token não encontrado.", 401)

    emprestimo_ref = db.collection("emprestimos").document()

    @firestore.transactional
    def transacao(transaction):
        livro_atual = livro_ref.get(transaction=transaction)

        if not livro_atual.exists:
            raise ValueError("Livro não encontrado.")

        if livro_atual.to_dict().get("situacao") != "DISPONIVEL":
            raise RuntimeError("Livro indisponível.")

        transaction.set(emprestimo_ref, {
            "livro_id": livro_id,
            "usuario_id": usuario_id,
            "data_emprestimo": agora(),
            "data_devolucao": None,
            "situacao": "ATIVO",
        })

        transaction.update(
            livro_ref,
            {"situacao": "EMPRESTADO"}
        )

    try:
        transacao(db.transaction())
    except RuntimeError:
        return erro(
            "Este livro não está mais disponível para empréstimo.",
            409,
        )
    except ValueError as exc:
        return erro(str(exc), 404)

    tipo = get_jwt().get("tipo")

    return jsonify({
        "mensagem": "Empréstimo registrado com sucesso.",
        "emprestimo": emprestimo_para_json(
            emprestimo_ref.get(),
            administrativo=tipo in {"ATENDENTE", "ADM"},
        ),
    }), 201


@emprestimos_bp.put("/emprestimos/<emprestimo_id>/devolver")
@login_required
def devolver_emprestimo(emprestimo_id):
    emprestimo_ref = db.collection("emprestimos").document(emprestimo_id)
    emprestimo_doc = emprestimo_ref.get()

    if not emprestimo_doc.exists:
        return erro("Empréstimo não encontrado.", 404)

    emprestimo = emprestimo_doc.to_dict()
    usuario_id = str(get_jwt_identity())
    tipo = get_jwt().get("tipo")

    # CLIENTE só pode devolver o próprio empréstimo.
    if tipo == "CLIENTE" and emprestimo["usuario_id"] != usuario_id:
        return erro(
            "Você não pode devolver empréstimo de outro usuário.",
            403,
        )

    if emprestimo.get("situacao") != "ATIVO":
        return erro(
            "Este empréstimo já foi devolvido.",
            409,
        )

    livro_ref = db.collection("livros").document(
        emprestimo["livro_id"]
    )

    @firestore.transactional
    def transacao(transaction):
        atual = emprestimo_ref.get(transaction=transaction)

        if not atual.exists:
            raise ValueError("Empréstimo não encontrado.")

        if atual.to_dict().get("situacao") != "ATIVO":
            raise RuntimeError("Este empréstimo já foi devolvido.")

        transaction.update(emprestimo_ref, {
            "situacao": "DEVOLVIDO",
            "data_devolucao": agora(),
        })

        transaction.update(livro_ref, {
            "situacao": "DISPONIVEL",
        })

    try:
        transacao(db.transaction())
    except RuntimeError as exc:
        return erro(str(exc), 409)
    except ValueError as exc:
        return erro(str(exc), 404)

    return jsonify({
        "mensagem": "Devolução registrada com sucesso.",
        "emprestimo": emprestimo_para_json(
            emprestimo_ref.get(),
            administrativo=tipo in {"ATENDENTE", "ADM"},
        ),
    }), 200


@emprestimos_bp.get("/emprestimos")
@login_required
def listar_emprestimos():
    usuario_id = str(get_jwt_identity())
    tipo = get_jwt().get("tipo")

    if tipo == "CLIENTE":
        docs = (
            db.collection("emprestimos")
            .where("usuario_id", "==", usuario_id)
            .stream()
        )

        resultado = [
            emprestimo_para_json(doc, administrativo=False)
            for doc in docs
        ]
    else:
        docs = db.collection("emprestimos").stream()

        resultado = [
            emprestimo_para_json(doc, administrativo=True)
            for doc in docs
        ]

    resultado.sort(
        key=lambda item: item.get("data_emprestimo") or "",
        reverse=True,
    )

    return jsonify(resultado), 200
