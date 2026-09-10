import json
import os

import firebase_admin
from firebase_admin import credentials, firestore

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_PATH = os.path.join(BASE_DIR, "serviceAccountKey.json")

if not firebase_admin._apps:
    # Em produção (Render, Railway, etc.) é mais seguro colar o conteúdo
    # inteiro do serviceAccountKey.json em uma variável de ambiente do
    # que subir o arquivo para o repositório Git. Se essa variável
    # existir, ela tem prioridade sobre o arquivo local.
    credenciais_env = os.getenv("FIREBASE_CREDENTIALS_JSON")

    if credenciais_env:
        cred = credentials.Certificate(json.loads(credenciais_env))
    elif os.path.exists(SERVICE_ACCOUNT_PATH):
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    else:
        raise FileNotFoundError(
            "Credencial do Firebase não encontrada: crie "
            "backend/serviceAccountKey.json (desenvolvimento local) ou "
            "defina a variável de ambiente FIREBASE_CREDENTIALS_JSON "
            "(produção)."
        )

    firebase_admin.initialize_app(cred)

db = firestore.client()
