"""
Script descartável para criar o primeiro usuário ADM do sistema.
Rode uma única vez com: python seed_admin.py

IMPORTANTE: o campo de senha no Firestore se chama "senha_hash"
(snake_case) para bater com o que o login.py e as rotas de
usuário esperam. Um erro comum é salvar como "senhaHash"
(camelCase) — se isso acontecer, o login desse usuário nunca
funciona, porque a rota de login procura por "senha_hash" e
não encontra nada.
"""

from firebase_config import db
from werkzeug.security import generate_password_hash

EMAIL_ADMIN = "admin@biblioteca.com"

existente = (
    db.collection("usuarios")
    .where("email", "==", EMAIL_ADMIN)
    .limit(1)
    .stream()
)

if next(existente, None) is not None:
    print(f"Já existe um usuário com o email {EMAIL_ADMIN}. Nada foi criado.")
else:
    db.collection("usuarios").add({
        "nome": "Admin Inicial",
        "email": EMAIL_ADMIN,
        "senha_hash": generate_password_hash("senha123"),
        "tipo": "ADM",
    })
    print(f"Admin criado! Login: {EMAIL_ADMIN} / Senha: senha123")
    print("Troque essa senha assim que possível.")
