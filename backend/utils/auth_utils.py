from functools import wraps

from flask import jsonify
from flask_jwt_extended import (
    create_access_token,
    get_jwt,
    jwt_required,
)


def gerar_token(usuario):
    return create_access_token(
        identity=str(usuario["id"]),
        additional_claims={
            "tipo": usuario["tipo"],
            "nome": usuario["nome"],
            "email": usuario["email"],
        },
    )


def login_required(func):
    @wraps(func)
    @jwt_required()
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)

    return wrapper


def roles_required(*tipos_permitidos):
    def decorator(func):
        @wraps(func)
        @jwt_required()
        def wrapper(*args, **kwargs):
            tipo = get_jwt().get("tipo")

            if tipo not in tipos_permitidos:
                return jsonify({
                    "erro": "Acesso negado",
                    "mensagem": (
                        "Seu tipo de usuário não possui "
                        "esta permissão."
                    ),
                }), 403

            return func(*args, **kwargs)

        return wrapper

    return decorator


def admin_or_attendant_required(func):
    return roles_required("ATENDENTE", "ADM")(func)


def admin_required(func):
    return roles_required("ADM")(func)
