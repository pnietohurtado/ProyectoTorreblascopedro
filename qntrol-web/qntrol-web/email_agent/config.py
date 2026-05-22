import os
import sys
from dotenv import load_dotenv

# Obtener la ruta del directorio del agente y cargar el .env
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, '.env')

if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    # Si no existe, intentar cargar .env.template como respaldo o avisar
    template_path = os.path.join(current_dir, '.env.template')
    if os.path.exists(template_path):
        print(f"⚠️  No se encontró el archivo '.env'. Por favor copia '.env.template' a '.env' y configúralo.")
    load_dotenv()

# Variables de SMTP con valores por defecto
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
try:
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
except ValueError:
    SMTP_PORT = 587

SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_SENDER_NAME = os.getenv("SMTP_SENDER_NAME", "Qntrol Torreblascopedro")

# Configuración del servidor API
API_HOST = os.getenv("API_HOST", "127.0.0.1")
try:
    API_PORT = int(os.getenv("API_PORT", 8000))
except ValueError:
    API_PORT = 8000

# Validación básica
def validate_config():
    errors = []
    if not SMTP_USER or SMTP_USER == "tu_correo@gmail.com":
        errors.append("SMTP_USER no está configurado o tiene el valor por defecto.")
    if not SMTP_PASSWORD or SMTP_PASSWORD == "tu_contrasena_de_aplicacion_aqui":
        errors.append("SMTP_PASSWORD no está configurado.")
        
    if errors:
        print("\n❌ ERROR DE CONFIGURACIÓN SMTP:")
        for err in errors:
            print(f"   - {err}")
        print(f"\nPor favor, edita el archivo '.env' en: {env_path}\n")
        return False
    return True
