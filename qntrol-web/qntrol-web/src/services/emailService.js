import QRCode from 'qrcode';
import emailjs from '@emailjs/browser';
import { marcarEmailEnviado, actualizarAsientoInvitado } from '../firebase/firebase';

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
  const result = { success: 0, failed: 0, skipped: 0, errors: [] };
  const emailsEnviadosEnLote = new Set();
  const eventId = eventData.id || eventData.eventId;

  // Lógica de Asientos: Obtenemos las llaves de los asientos seleccionados y ordenamos
  const availableSeats = eventData.selectedSeats 
    ? Object.keys(eventData.selectedSeats).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) 
    : [];

  let nextSeatIndex = 0;

  for (const guest of guestList) {
    // 1. Evitar re-envíos si ya se marcó en Firebase previamente
    if (guest.emailEnviado) {
      result.skipped++;
      continue;
    }

    const personas = guest.personas || [];
    const personasConEmail = personas.filter(p => p.email && p.email.trim() !== '');
    
    // Si nadie en el grupo tiene email, usamos el del titular.
    const targets = personasConEmail.length > 0 ? personasConEmail : (guest.email ? [guest] : []);
    
    let exitoEnInvitado = false;

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const targetEmail = target.email.toLowerCase().trim();

      if (emailsEnviadosEnLote.has(targetEmail)) {
        result.skipped++;
        continue;
      }

      // Asignación automática de asiento basado en el mapa visual
      let assignedSeat = guest.asiento || 'Sin asiento asignado';
      if (nextSeatIndex < availableSeats.length && (!guest.asiento || guest.asiento === 'Sin asiento asignado')) {
        const seatKey = availableSeats[nextSeatIndex];
        assignedSeat = `Fila ${seatKey.split('-')[0]}, Col ${seatKey.split('-')[1]}`;
        
        // Guardar en Firebase de forma asíncrona pero esperando respuesta
        try {
          await actualizarAsientoInvitado(eventId, guest.id, target.id || i, assignedSeat);
        } catch (e) {
          console.error("Error guardando asiento en Firebase:", e);
        }
        nextSeatIndex++;
      }

      try {
        await sendEventInvitation(eventData, {
          ...target,
          asiento: assignedSeat,
          // Buscamos el QR específico de la persona o heredamos el del titular
          qrCode: target.qrCode || (personas.length > 0 ? personas[0].qrCode : guest.qrCode)
        }, customSubject, customBody);
        
        result.success++;
        emailsEnviadosEnLote.add(targetEmail);
        exitoEnInvitado = true;
      } catch (err) {
        result.failed++;
        result.errors.push({ guest: target.nombre, error: err.message });
      }

      // Pequeña pausa para no saturar el servidor de EmailJS (Antispam)
      await new Promise(r => setTimeout(r, 500));
    }

    // 2. Si al menos un correo del invitado/grupo salió bien, marcamos en Firebase
    if (exitoEnInvitado && guest.id) {
      try {
        await marcarEmailEnviado(eventId, guest.id);
      } catch (e) {
        console.error("Error marcando como enviado:", e);
      }
    }
  }

  return result;
};