import QRCode from 'qrcode';
import emailjs from '@emailjs/browser';

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
 * Sustituye variables en el mensaje personalizado
 */
const replaceVariables = (text, eventData, guestData) => {
  if (!text) return '';
  return text
    .replace(/{{nombre_alumno}}/g, guestData.nombre || '')
    .replace(/{{nombre_evento}}/g, eventData.nombreEvento || eventData.title || '')
    .replace(/{{fecha_evento}}/g, eventData.fecha || eventData.date || '')
    .replace(/{{hora_evento}}/g, eventData.hora || '')
    .replace(/{{nombre_salon}}/g, eventData.direccion || eventData.address || '')
    .replace(/{{asiento_asignado}}/g, guestData.asiento || 'Sin asiento asignado');
};

/**
 * Envía un correo individual
 */
export const sendEventInvitation = async (eventData, guestData, customSubject = null, customBody = null) => {
  if (!guestData.email) return;

  // Prioridad de QR: 1. El asignado directamente, 2. El de la primera persona, 3. El del invitado raíz
  const qrCode = guestData.qrCode || guestData.personas?.[0]?.qrCode || null;
  const qrBase64 = qrCode ? await getQRBase64(qrCode) : '';

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
    const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
    return response;
  } catch (error) {
    console.error(`Error enviando a ${guestData.email}:`, error);
    throw error;
  }
};

/**
 * Envía correos masivos con Lógica de Asientos y Tracking
 */
export const sendInvitationsToAll = async (eventData, guestList, customSubject = null, customBody = null) => {
  const response = await fetch('http://127.0.0.1:8000/api/send-emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventData,
      guestList,
      customSubject,
      customBody,
    }),
  }).catch((agentError) => {
    throw new Error(`El agente local de correos no está disponible: ${agentError.message}`);
  });

  if (response.ok) {
    const data = await response.json();
    return data.result || data;
  }

  const errorData = await response.json().catch(() => ({}));
  throw new Error(errorData.detail || 'Error en el agente local de correos.');
};
