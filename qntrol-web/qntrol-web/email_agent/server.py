#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import time
import random
import smtplib
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

try:
    from fastapi import FastAPI, HTTPException, BackgroundTasks
    from fastapi.middleware.cors import CORSMiddleware
    import uvicorn
except ImportError:
    print("\n❌ ERROR: Faltan dependencias para iniciar el servidor.")
    print("Ejecuta: pip install fastapi uvicorn pydantic python-multipart\n")
    sys.exit(1)

import config
import agent

app = FastAPI(
    title="Qntrol SMTP Email API",
    description="Servidor local de Python para el envío seguro de correos por SMTP.",
    version="1.0.0"
)

# Permitir CORS para que la aplicación de React pueda hacer peticiones
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción se puede restringir a localhost:3000, etc.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Definir esquemas Pydantic para validar los datos que envía React
class EventSalonConfig(BaseModel):
    filas: Optional[int] = None
    columnas: Optional[int] = None

class EventData(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    nombreEvento: Optional[str] = None
    fecha: Optional[str] = None
    hora: Optional[str] = None
    date: Optional[str] = None
    address: Optional[str] = None
    direccion: Optional[str] = None
    configuracionSalon: Optional[EventSalonConfig] = None

class GuestPerson(BaseModel):
    id: Optional[str] = None
    nombre: str
    email: Optional[str] = None
    qrCode: Optional[str] = None
    asiento: Optional[str] = None
    butaca: Optional[str] = None
    fila: Optional[str] = None
    mesa: Optional[str] = None

class GuestData(BaseModel):
    id: Optional[str] = None
    nombre: str
    email: Optional[str] = None
    qrCode: Optional[str] = None
    asiento: Optional[str] = None
    butaca: Optional[str] = None
    fila: Optional[str] = None
    mesa: Optional[str] = None
    personas: Optional[List[GuestPerson]] = []

class SendInvitationsRequest(BaseModel):
    eventData: EventData
    guestList: List[GuestData]

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Servidor de Correos de Qntrol activo.",
        "smtp_configured": config.validate_config(),
        "smtp_user": config.SMTP_USER
    }

@app.post("/api/send-emails")
def send_emails(payload: SendInvitationsRequest):
    # 1. Validar que el archivo de configuración tiene credenciales
    if not config.validate_config():
        raise HTTPException(
            status_code=500,
            detail="El servidor SMTP de Python no está configurado. Por favor edita el archivo .env"
        )
        
    event = payload.eventData
    guests = payload.guestList
    
    # 2. Normalizar datos del evento
    event_name = event.nombreEvento or event.title or "Evento sin título"
    event_date = event.fecha or (event.date.split(" - ")[0] if event.date else "Próximamente")
    
    # Intentar sacar la hora
    event_time = event.hora or ""
    if not event_time and event.date and " - " in event.date:
        parts = event.date.split(" - ")
        if len(parts) > 1:
            event_time = parts[1].replace("h", "")
            
    event_address = event.direccion or event.address or "Dirección por definir"
    
    event_info = {
        "name": event_name,
        "date": event_date,
        "time": event_time or "20:00",
        "address": event_address
    }
    
    # Obtener configuración del salón para auto-asignación
    filas_salon = 0
    columnas_salon = 0
    if event.configuracionSalon:
        filas_salon = event.configuracionSalon.filas or 0
        columnas_salon = event.configuracionSalon.columnas or 0
        
    seats_per_row = columnas_salon if columnas_salon > 0 else 10
    
    # 3. Conectarse al servidor SMTP
    print(f"\n⚡ [API] Conectando al servidor SMTP ({config.SMTP_HOST}:{config.SMTP_PORT})...")
    try:
        if config.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT)
        else:
            server = smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT)
            server.starttls()
            
        server.login(config.SMTP_USER, config.SMTP_PASSWORD)
        print("🔒 [API] Conexión SMTP iniciada con éxito.")
    except Exception as e:
        print(f"❌ [API] Error de inicio de sesión SMTP: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al iniciar sesión en tu SMTP: {str(e)}. Verifica el archivo .env"
        )
        
    template_html = agent.load_html_template()
    
    exitosos = 0
    fallidos = 0
    errors = []
    
    # Variables de control para auto-asignación
    current_row = 1
    current_seat = 1
    
    total_processed = 0
    
    for idx, guest in enumerate(guests):
        personas = guest.personas or []
        
        if len(personas) > 0:
            # Enviar pase individual para cada persona registrada en el grupo (acompañantes incluidos)
            for p_idx, persona in enumerate(personas):
                # Destinatario: SIEMPRE se envía al correo del Alumno (titular principal)
                target_email = guest.email.strip() if guest.email else ""
                
                if not target_email:
                    continue # Sin dirección de correo para despachar
                    
                total_processed += 1
                
                # Obtener Localidad/Asiento pre-asignado o auto-asignar
                pre_seat = persona.asiento or persona.butaca or (f"Fila {persona.fila}, Asiento {persona.butaca}" if (persona.fila and persona.butaca) else None) or persona.mesa
                
                if pre_seat:
                    guest_seat = str(pre_seat).strip()
                else:
                    if current_seat > seats_per_row:
                        current_row += 1
                        current_seat = 1
                    guest_seat = f"Fila {current_row}, Asiento {current_seat}"
                    current_seat += 1
                    
                try:
                    # Recuperar el código QR asignado o generar uno
                    qr_value = persona.qrCode or f"{event_name}_{persona.nombre}_{idx}_{p_idx}_{int(time.time())}"
                    agent.send_individual_email(
                        server=server,
                        guest_name=persona.nombre,
                        guest_email=target_email,
                        qr_code_value=qr_value,
                        event_data=event_info,
                        template_html=template_html,
                        guest_seat=guest_seat
                    )
                    exitosos += 1
                    print(f"📧 [API] Correo enviado a {persona.nombre} en [{guest_seat}] a la dirección <{target_email}>")
                    time.sleep(1.2) # Throttling
                except Exception as err:
                    fallidos += 1
                    errors.append({"guest": persona.nombre, "error": str(err)})
                    print(f"❌ Falló envío a {persona.nombre}: {str(err)}")
        else:
            # Caso fallback para invitado individual clásico sin acompañantes cargados
            if guest.email and guest.email.strip() != "":
                total_processed += 1
                
                # Obtener Localidad/Asiento pre-asignado o auto-asignar
                pre_seat = guest.asiento or guest.butaca or (f"Fila {guest.fila}, Asiento {guest.butaca}" if (guest.fila and guest.butaca) else None) or guest.mesa
                
                if pre_seat:
                    guest_seat = str(pre_seat).strip()
                else:
                    if current_seat > seats_per_row:
                        current_row += 1
                        current_seat = 1
                    guest_seat = f"Fila {current_row}, Asiento {current_seat}"
                    current_seat += 1
                    
                try:
                    qr_value = guest.qrCode or f"{event_name}_{guest.nombre}_{idx}_{int(time.time())}"
                    agent.send_individual_email(
                        server=server,
                        guest_name=guest.nombre,
                        guest_email=guest.email.strip(),
                        qr_code_value=qr_value,
                        event_data=event_info,
                        template_html=template_html,
                        guest_seat=guest_seat
                    )
                    exitosos += 1
                    print(f"📧 [API] Correo enviado a {guest.nombre} en [{guest_seat}]")
                    time.sleep(1.2)
                except Exception as err:
                    fallidos += 1
                    errors.append({"guest": guest.nombre, "error": str(err)})
                    print(f"❌ Falló envío a {guest.nombre}: {str(err)}")
                    
    # Cerrar conexión
    try:
        server.quit()
        print("🔒 [API] Conexión SMTP cerrada correctamente.")
    except:
        pass
        
    return {
        "success": True,
        "processed": total_processed,
        "result": {
            "success": exitosos,
            "failed": fallidos,
            "errors": errors
        }
    }

# Iniciar servidor local
def start_server():
    print(f"🚀 Iniciando Servidor API de Correos en http://{config.API_HOST}:{config.API_PORT}")
    uvicorn.run("server:app", host=config.API_HOST, port=config.API_PORT, reload=True)

if __name__ == "__main__":
    start_server()
