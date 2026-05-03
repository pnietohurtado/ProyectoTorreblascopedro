import QRCode from 'qrcode';
import emailjs from '@emailjs/browser';
import { marcarEmailEnviado } from '../firebase/firebase';

// CONFIGURACIÓN DE EMAILJS
const SERVICE_ID = 'service_0rt1cqa';
const TEMPLATE_ID = 'template_czkqqos';
const PUBLIC_KEY = 'wewgP2tKTSYexpl_f';

/**
 * Genera el código QR en formato Base64
 */
const getQRBase64 = async (qrText) => {
  if (!qrText) return '';
  try {
    const options = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      scale: 4,
      width: 250,
      color: { dark: '#000000', light: '#ffffff' }
    };
    return await QRCode.toDataURL(qrText, options);
  } catch (err) {
    console.error('Error generando QR:', err);
    return '';
  }
};

/**
 * Motor de sustitución universal e insensibile a mayúsculas
 */
const replaceVariables = (text, eventData, guestData) => {
  if (!text) return '';
  let result = text;

  // Creamos un mapa de todas las variables posibles
  const dataMap = {
    // Variables de Evento
    nombre_evento: eventData.nombreEvento || eventData.title || '',
    fecha_evento: eventData.fecha || eventData.date || '',
    hora_evento: eventData.hora || '',
    nombre_salon: eventData.direccion || eventData.address || '',
    ubicacion: eventData.direccion || eventData.address || '',
    
    // Variables de Invitado (Estándar)
    nombre_alumno: guestData.nombre || '',
    nombre: guestData.nombre || '',
    asiento_asignado: guestData.asiento || 'Sin asiento',
    email: guestData.email || '',
    
    // Incluir cualquier otro campo que venga en guestData (CSV)
    ...guestData
  };

  // Recorremos el mapa y reemplazamos cada una de forma insesible a mayúsculas
  Object.keys(dataMap).forEach(key => {
    const value = dataMap[key];
    if (typeof value === 'string' || typeof value === 'number') {
      // Regex que busca {{key}} sin importar mayúsculas/minúsculas
      const regex = new RegExp(`{{${key}}}`, 'gi');
      result = result.replace(regex, value);
    }
  });

  return result;
};

/**
 * Envía un correo individual
 */
export const sendEventInvitation = async (eventData, guestData, customSubject = null, customBody = null) => {
  if (!guestData.email) return;

  const qrCode = guestData.qrCode || guestData.personas?.[0]?.qrCode || null;
  const qrBase64 = qrCode ? await getQRBase64(qrCode) : '';

  // Aplicamos la sustitución al asunto y al cuerpo
  const finalSubject = customSubject 
    ? replaceVariables(customSubject, eventData, guestData) 
    : `Invitación a ${eventData.nombreEvento || eventData.title || 'Evento'}`;
    
  const finalMessage = customBody 
    ? replaceVariables(customBody, eventData, guestData) 
    : '';

  const templateParams = {
    to_email: guestData.email,
    guest_name: guestData.nombre,
    event_name: eventData.nombreEvento || eventData.title || '',
    event_date: eventData.fecha || eventData.date || '',
    event_time: eventData.hora || '',
    event_address: eventData.direccion || eventData.address || '',
    qr_image_url: qrBase64,
    qr_code_text: qrCode || '',
    guest_seat: guestData.asiento || 'Sin asiento asignado',
    custom_subject: finalSubject,
    custom_message: finalMessage,
  };

  try {
    return await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
  } catch (error) {
    console.error(`Error enviando a ${guestData.email}:`, error);
    throw error;
  }
};

/**
 * Envía correos masivos con filtrado de prueba
 */
export const sendInvitationsToAll = async (eventData, guestList) => {
  const result = { success: 0, failed: 0, skipped: 0, errors: [] };
  const eventId = eventData.id || eventData.eventId;
  
  const customSubject = eventData.mensajeAsunto;
  const customBody = eventData.mensajeCuerpo;

  for (const guest of guestList) {
    const email = (guest.email || "").toLowerCase().trim();

    // Filtro de seguridad para tus pruebas
    if (email.endsWith('example.com')) {
      result.skipped++;
      continue;
    }

    if (guest.emailEnviado) {
      result.skipped++;
      continue;
    }

    try {
      await sendEventInvitation(eventData, guest, customSubject, customBody);
      result.success++;
      if (guest.id) {
        await marcarEmailEnviado(eventId, guest.id);
      }
    } catch (err) {
      result.failed++;
      result.errors.push({ guest: guest.nombre, error: err.message });
    }

    // Pausa anti-spam
    await new Promise(r => setTimeout(r, 800));
  }

  return result;
};