import QRCode from 'qrcode';
import emailjs from '@emailjs/browser';

// CONFIGURACIÓN DE EMAILJS
const SERVICE_ID = 'service_0rt1cqa';
const TEMPLATE_ID = 'template_czkqqos';
const PUBLIC_KEY = 'wewgP2tKTSYexpl_f';

/**
 * Genera el código QR en formato Base64 (Data URL)
 */
const getQRBase64 = async (qrText) => {
  try {
    const options = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      scale: 4,
      width: 250,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    };
    return await QRCode.toDataURL(qrText, options);
  } catch (err) {
    console.error('Error generando QR Base64:', err);
    return '';
  }
};

/**
 * Sustituye variables en un texto (ej: {{nombre_alumno}}) por valores reales.
 */
const replaceVariables = (text, eventData, guestData) => {
  if (!text) return '';
  
  return text
    .replace(/{{nombre_alumno}}/g, guestData.nombre || '')
    .replace(/{{nombre_evento}}/g, eventData.nombreEvento || eventData.title || '')
    .replace(/{{fecha_evento}}/g, eventData.fecha || eventData.date || '')
    .replace(/{{hora_evento}}/g, eventData.hora || '')
    .replace(/{{nombre_salon}}/g, eventData.direccion || eventData.address || '') // Usando dirección como nombre de salón si no hay
    .replace(/{{asiento_asignado}}/g, guestData.asiento || 'Por asignar');
};

/**
 * Envía un correo de invitación con QR a un invitado.
 */
export const sendEventInvitation = async (eventData, guestData, customSubject = null, customBody = null) => {
  if (!guestData.email) {
    console.warn(`Sin email para: ${guestData.nombre}`);
    return;
  }

  const qrCode = guestData.qrCode || guestData.personas?.[0]?.qrCode || null;
  const qrBase64 = qrCode ? await getQRBase64(qrCode) : '';

  // Variables personalizadas procesadas
  const finalSubject = customSubject 
    ? replaceVariables(customSubject, eventData, guestData) 
    : `Invitación a ${eventData.nombreEvento || eventData.title || 'Evento'}`;
    
  const finalMessage = customBody 
    ? replaceVariables(customBody, eventData, guestData) 
    : '';

  // Variables que el template de EmailJS puede usar
  const templateParams = {
    to_email: guestData.email,
    guest_name: guestData.nombre,
    event_name: eventData.nombreEvento || eventData.title || '',
    event_date: eventData.fecha || eventData.date || '',
    event_time: eventData.hora || '',
    event_address: eventData.direccion || eventData.address || '',
    qr_image_url: qrBase64,
    qr_code_text: qrCode || '',
    // Nuevos campos para personalización
    custom_subject: finalSubject,
    custom_message: finalMessage,
  };

  console.log(`📧 Enviando a ${guestData.email} - Asunto: ${finalSubject}`);

  try {
    const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
    console.log(`✅ Enviado a ${guestData.email}:`, response.status);
    return response;
  } catch (error) {
    console.error(`❌ Error enviando a ${guestData.email}:`, error);
    throw error;
  }
};

/**
 * Envía correos a todos los invitados — un email por persona con su QR propio
 */
export const sendInvitationsToAll = async (eventData, guestList, customSubject = null, customBody = null) => {
  const result = { success: 0, failed: 0, errors: [] };

  for (const guest of guestList) {
    const personas = guest.personas || [];
    const personasConEmail = personas.filter(p => p.email && p.email.trim() !== '');

    if (personasConEmail.length > 0) {
      // Cada persona con email recibe su propio QR
      for (const persona of personasConEmail) {
        try {
          await sendEventInvitation(eventData, {
            nombre: persona.nombre,
            email: persona.email,
            qrCode: persona.qrCode,
            asiento: persona.asiento || guest.asiento,
          }, customSubject, customBody);
          result.success++;
        } catch (err) {
          result.failed++;
          result.errors.push({ guest: persona.nombre, error: err.message });
        }
        await new Promise(r => setTimeout(r, 350));
      }
    } else if (guest.email && guest.email.trim() !== '') {
      // El titular recibe el QR de la primera persona
      try {
        await sendEventInvitation(eventData, {
          nombre: guest.nombre,
          email: guest.email,
          qrCode: personas[0]?.qrCode || guest.qrCode,
          asiento: guest.asiento,
        }, customSubject, customBody);
        result.success++;
      } catch (err) {
        result.failed++;
        result.errors.push({ guest: guest.nombre, error: err.message });
      }
      await new Promise(r => setTimeout(r, 350));
    }
  }

  if (result.success === 0 && result.failed === 0) {
    throw new Error('No hay invitados con correo electrónico válido.');
  }

  return result;
};
