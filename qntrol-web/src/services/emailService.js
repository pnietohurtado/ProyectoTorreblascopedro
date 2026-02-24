import emailjs from '@emailjs/browser';

// CONFIGURACIÓN DE EMAILJS
const SERVICE_ID = 'service_0rt1cqa';
const TEMPLATE_ID = 'template_czkqqos';
const PUBLIC_KEY = 'wewgP2tKTSYexpl_f';

/**
 * Genera la URL HTTPS pública de la imagen QR (funciona en todos los emails)
 */
const getQRImageUrl = (qrText) => {
  const encoded = encodeURIComponent(qrText);
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&data=${encoded}`;
};

/**
 * Envía un correo de invitación con QR a un invitado.
 * El template de EmailJS debe contener en su cuerpo:
 *   <img src="{{qr_image_url}}" width="250" height="250" />
 */
export const sendEventInvitation = async (eventData, guestData) => {
  if (!guestData.email) {
    console.warn(`Sin email para: ${guestData.nombre}`);
    return;
  }

  const qrCode = guestData.qrCode || guestData.personas?.[0]?.qrCode || null;
  const qrImageUrl = qrCode ? getQRImageUrl(qrCode) : '';

  // Variables que el template de EmailJS puede usar
  const templateParams = {
    to_email: guestData.email,
    guest_name: guestData.nombre,
    event_name: eventData.nombreEvento || eventData.title || '',
    event_date: eventData.fecha || eventData.date || '',
    event_time: eventData.hora || '',
    event_address: eventData.direccion || eventData.address || '',
    // URL directa de la imagen QR → úsala en tu template como:
    // <img src="{{qr_image_url}}" width="250" height="250" />
    qr_image_url: qrImageUrl,
    qr_code_text: qrCode || '',
  };

  console.log(`📧 Enviando a ${guestData.email}`);
  console.log(`🔗 QR URL: ${qrImageUrl}`);

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
export const sendInvitationsToAll = async (eventData, guestList) => {
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
          });
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
        });
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
