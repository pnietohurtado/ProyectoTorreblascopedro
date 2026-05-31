#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import time
import argparse
import random
import re
import smtplib
from io import BytesIO
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage

# Intentar importar dependencias externas y dar mensaje de error claro si no están
try:
    import pandas as pd
    import qrcode
    from PIL import Image
except ImportError:
    print("\n❌ ERROR: Faltan instalar dependencias críticas.")
    print("Por favor, ejecuta el siguiente comando para instalarlas:")
    print("   pip install -r requirements.txt\n")
    sys.exit(1)

import config

# Mostrar Banner Premium en consola
def show_banner():
    banner = """
    ╔════════════════════════════════════════════════════════════════╗
    ║                 Q N T R O L  -  M A I L  A G E N T             ║
    ║        Agente Inteligente de Envío Masivo por SMTP & Excel     ║
    ╚════════════════════════════════════════════════════════════════╝
    """
    print(banner)

# Limpiar y sanitizar nombres para generar ID
def slugify(text):
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '_', text)
    return text.strip('_')

# Cargar plantilla HTML
def load_html_template():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    template_path = os.path.join(current_dir, 'templates', 'invitation.html')
    
    if not os.path.exists(template_path):
        print(f"⚠️  No se encontró la plantilla en {template_path}. Se usará una básica de texto.")
        return """
        <html>
        <body>
          <h2>Pase de Invitación</h2>
          <p>Hola {{ guest_name }}</p>
          <p>Estás invitado al evento: <strong>{{ event_name }}</strong></p>
          <p>Fecha: {{ event_date }} - Hora: {{ event_time }}h</p>
          <p>Lugar: {{ event_address }}</p>
          <p>Código QR Adjunto abajo.</p>
          <img src="cid:{{ qr_cid }}" alt="QR Code">
        </body>
        </html>
        """
    with open(template_path, 'r', encoding='utf-8') as f:
        return f.read()

# Generar Código QR en memoria
def generate_qr_image(qr_data):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#000000", back_color="#ffffff")
    
    # Guardar en buffer en memoria de forma compatible con PIL y PyPNGImage, evitando quejas del editor/IDE
    buffer = BytesIO()
    if hasattr(img, '_img'):
        # Acceder directamente a la imagen de Pillow, que el IDE sabe que acepta 'format="PNG"'
        img._img.save(buffer, format="PNG")
    else:
        # Si es PyPNGImage u otro motor, guardamos directamente
        img.save(buffer)
    return buffer.getvalue()

def attach_inline_image(message, image_path, content_id, filename):
    if not os.path.exists(image_path):
        print(f"⚠️  No se encontró la imagen para el correo: {image_path}")
        return

    with open(image_path, 'rb') as image_file:
        image = MIMEImage(image_file.read(), name=filename)
    image.add_header('Content-ID', f'<{content_id}>')
    image.add_header('Content-Disposition', 'inline', filename=filename)
    message.attach(image)

# Enviar correo individual
def send_individual_email(server, guest_name, guest_email, qr_code_value, event_data, template_html, guest_seat="Entrada General"):
    # Generar CID único para incrustar el QR
    qr_cid = f"qr_{slugify(guest_name)}_{int(time.time())}"
    hero_cid = "graduacion_header"
    qntrol_logo_cid = "qntrol_logo"
    
    # Crear mensaje MIME multipart
    msg = MIMEMultipart('related')
    subject = f"¡Importante! Instrucciones, horarios y acceso con QR para {event_data['name']}"
    msg['Subject'] = subject
    msg['From'] = f"{config.SMTP_SENDER_NAME} <{config.SMTP_USER}>"
    msg['To'] = guest_email
    
    # Crear la parte alternativa para HTML
    msg_alternative = MIMEMultipart('alternative')
    msg.attach(msg_alternative)
    
    # Reemplazar placeholders en plantilla HTML
    html_body = template_html
    html_body = html_body.replace("{{ guest_name }}", guest_name)
    html_body = html_body.replace("{{ event_name }}", event_data['name'])
    html_body = html_body.replace("{{ event_date }}", event_data['date'])
    html_body = html_body.replace("{{ event_time }}", event_data['time'])
    html_body = html_body.replace("{{ event_address }}", event_data['address'])
    html_body = html_body.replace("{{ guest_seat }}", guest_seat)
    html_body = html_body.replace("{{ qr_cid }}", qr_cid)
    html_body = html_body.replace("{{ hero_cid }}", hero_cid)
    html_body = html_body.replace("{{ qntrol_logo_cid }}", qntrol_logo_cid)
    
    msg_html = MIMEText(html_body, 'html', 'utf-8')
    msg_alternative.attach(msg_html)
    
    # Generar la imagen del QR y adjuntarla inline
    qr_image_bytes = generate_qr_image(qr_code_value)
    msg_image = MIMEImage(qr_image_bytes, name="pase_acceso.png")
    msg_image.add_header('Content-ID', f'<{qr_cid}>')
    msg_image.add_header('Content-Disposition', 'inline', filename="pase_acceso.png")
    msg.attach(msg_image)

    current_dir = os.path.dirname(os.path.abspath(__file__))
    assets_dir = os.path.join(current_dir, 'templates', 'assets')
    attach_inline_image(msg, os.path.join(assets_dir, 'graduacion_header.jpg'), hero_cid, 'graduacion_header.jpg')
    attach_inline_image(msg, os.path.join(assets_dir, 'qntrol_logo.png'), qntrol_logo_cid, 'qntrol_logo.png')
    
    # Enviar correo
    server.sendmail(config.SMTP_USER, guest_email, msg.as_string())

# Enviar masivo principal
def send_bulk_emails(file_path, event_data, delay_seconds=1.5, auto_seats=False, seats_per_row=10):
    show_banner()
    
    # Validar configuraciones
    if not config.validate_config():
        return False
        
    # Verificar archivo
    if not os.path.exists(file_path):
        print(f"❌ Error: El archivo especificado no existe: {file_path}")
        return False
        
    print(f"📂 Cargando archivo de invitados: {file_path}")
    try:
        # Leer archivo según extensión
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
    except Exception as e:
        print(f"❌ Error al leer el archivo Excel/CSV: {str(e)}")
        return False
        
    # Normalizar columnas
    df.columns = [c.strip().lower() for c in df.columns]
    
    # Buscar columnas de nombre, email, asiento e invitados
    name_col = next((c for c in df.columns if c in ['nombre', 'name', 'guest_name']), None)
    email_col = next((c for c in df.columns if c in ['email', 'correo', 'mail', 'to_email']), None)
    qr_col = next((c for c in df.columns if c in ['qrcode', 'qr', 'qr_code', 'codigo']), None)
    invitados_col = next((c for c in df.columns if c in ['numinvitados', 'invitados', 'acompañantes', 'seats']), None)
    asiento_col = next((c for c in df.columns if c in ['asiento', 'seat', 'butaca', 'localidad', 'mesa', 'fila']), None)
    
    if not name_col or not email_col:
        print("\n❌ Error: El archivo debe contener al menos las columnas 'Nombre' y 'Email'.")
        print(f"Columnas detectadas en tu archivo: {list(df.columns)}")
        return False
        
    # Filtrar registros válidos que tengan email
    df = df.dropna(subset=[email_col])
    total_invitados = len(df)
    
    if total_invitados == 0:
        print("⚠️  No hay invitados con correos válidos para procesar.")
        return False
        
    print(f"✅ Archivo procesado correctamente.")
    print(f"📊 Total de correos a enviar: {total_invitados}")
    print(f"🎉 Evento: {event_data['name']}")
    print(f"📅 Fecha: {event_data['date']} a las {event_data['time']}h")
    print(f"📍 Lugar: {event_data['address']}")
    
    # Asignación de asientos secuenciales (Variables de control)
    current_row = 1
    current_seat = 1
    
    if asiento_col:
        print("💺 Modo Asientos: Se leerán los asientos asignados en la columna del archivo.")
    elif auto_seats:
        print(f"💺 Modo Asientos: Auto-asignación secuencial activa ({seats_per_row} asientos por fila).")
    else:
        print("💺 Modo Asientos: Sin numerar (Entrada General).")
        
    # Confirmación de seguridad
    confirm = input("\n¿Estás seguro de que quieres iniciar el envío? (s/n): ")
    if confirm.lower() not in ['s', 'si', 'y', 'yes']:
        print("❌ Envío cancelado por el usuario.")
        return False
        
    # Conectarse al servidor SMTP
    print(f"\n⚡ Conectando al servidor SMTP ({config.SMTP_HOST}:{config.SMTP_PORT})...")
    try:
        if config.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT)
        else:
            server = smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT)
            server.starttls() # Iniciar cifrado seguro TLS
            
        server.login(config.SMTP_USER, config.SMTP_PASSWORD)
        print("🔒 Conexión segura establecida e inicio de sesión exitoso.")
    except Exception as e:
        print(f"❌ Error al conectar al servidor SMTP: {str(e)}")
        print("Verifica tus credenciales en el archivo '.env'.")
        return False
        
    # Cargar la plantilla HTML una sola vez
    template_html = load_html_template()
    
    exitosos = 0
    fallidos = 0
    errores = []
    
    print("\n🚀 Iniciando envío masivo...\n")
    
    for idx, row in df.iterrows():
        nombre = str(row[name_col]).strip()
        email = str(row[email_col]).strip()
        num_invitados = int(row[invitados_col]) if invitados_col and not pd.isna(row[invitados_col]) else 1
        
        # Enviar un correo con QR independiente para el titular y cada acompañante
        for j in range(num_invitados):
            es_principal = (j == 0)
            target_name = nombre if es_principal else f"{nombre} - Acompañante {j}"
            
            # 1. Asignar Localidad/Asiento
            if asiento_col and not pd.isna(row[asiento_col]):
                guest_seat = str(row[asiento_col]).strip()
                if not es_principal:
                    guest_seat = f"{guest_seat} (Acomp. {j})"
            elif auto_seats:
                if current_seat > seats_per_row:
                    current_row += 1
                    current_seat = 1
                guest_seat = f"Fila {current_row}, Asiento {current_seat}"
                current_seat += 1
            else:
                guest_seat = "Entrada General (Asiento Libre)"
                
            # Generar o rescatar código QR único para cada persona del grupo
            if es_principal and qr_col and not pd.isna(row[qr_col]):
                qr_value = str(row[qr_col]).strip()
            else:
                event_slug = slugify(event_data['name'])
                guest_slug = slugify(nombre)
                qr_value = f"{event_slug}_{guest_slug}_persona_{j}_{int(time.time())}_{random.randint(1000, 9999)}"
                
            print(f"📧 [{idx+1}/{total_invitados}] Enviando pase {j+1}/{num_invitados} a: {target_name} <{email}> [Asiento: {guest_seat}] ... ", end="", flush=True)
            
            try:
                send_individual_email(
                    server=server,
                    guest_name=target_name,
                    guest_email=email,
                    qr_code_value=qr_value,
                    event_data=event_data,
                    template_html=template_html,
                    guest_seat=guest_seat
                )
                print("✅ ENVIADO")
                exitosos += 1
            except Exception as err:
                print("❌ ERROR")
                print(f"   Motivo del fallo: {str(err)}")
                fallidos += 1
                errores.append({"nombre": target_name, "email": email, "error": str(err)})
                
            # Throttling ligero entre correos individuales
            time.sleep(delay_seconds)
            
    # Cerrar conexión SMTP elegantemente
    try:
        server.quit()
        print("\n🔒 Conexión SMTP cerrada de forma segura.")
    except:
        pass
        
    # Mostrar resumen final
    print("\n" + "="*50)
    print("📊 RESUMEN FINAL DEL PROCESO DE ENVÍO")
    print("="*50)
    print(f"✅ Envíos con éxito: {exitosos}")
    print(f"❌ Envíos fallidos:  {fallidos}")
    print(f"📈 Tasa de éxito:    {(exitosos/total_invitados)*100:.1f}%")
    print("="*50)
    
    if fallidos > 0:
        print("\nDetalle de errores:")
        for err in errores:
            print(f"   - {err['nombre']} ({err['email']}): {err['error']}")
            
    return True

# Punto de entrada para ejecución por consola (CLI)
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Qntrol Mail Agent - Envía invitaciones con código QR desde Excel.")
    parser.add_argument('--file', '-f', required=True, help="Ruta del archivo Excel (.xlsx) o CSV (.csv) con los invitados.")
    parser.add_argument('--event', '-e', required=True, help="Nombre del evento.")
    parser.add_argument('--date', '-d', default="Próximamente", help="Fecha del evento (Ej: 25/12/2026).")
    parser.add_argument('--time', '-t', default="20:00", help="Hora del evento (Ej: 19:30).")
    parser.add_argument('--address', '-a', default="Dirección por definir", help="Dirección o lugar del evento.")
    parser.add_argument('--delay', type=float, default=1.5, help="Segundos de espera entre correos para evitar Spam (por defecto 1.5s).")
    parser.add_argument('--auto-seats', action='store_true', help="Auto-asignar asientos secuenciales de forma automática.")
    parser.add_argument('--seats-per-row', type=int, default=10, help="Número de asientos por fila para la auto-asignación (por defecto 10).")
    
    args = parser.parse_args()
    
    event_info = {
        'name': args.event,
        'date': args.date,
        'time': args.time,
        'address': args.address
    }
    
    send_bulk_emails(
        file_path=args.file,
        event_data=event_info,
        delay_seconds=args.delay,
        auto_seats=args.auto_seats,
        seats_per_row=args.seats_per_row
    )
