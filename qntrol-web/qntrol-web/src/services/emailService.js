import QRCode from 'qrcode';
import emailjs from '@emailjs/browser';

// CONFIGURACIÓN DE EMAILJS (Mantenida como respaldo/fallback por seguridad)
const SERVICE_ID = 'service_0rt1cqa';
const TEMPLATE_ID = 'template_czkqqos';
const PUBLIC_KEY = 'wewgP2tKTSYexpl_f';

/**
 * Genera el código QR en formato Base64 (Data URL) - Utilizado por el fallback de EmailJS
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
 * Envía un correo de invitación con QR a un invitado usando EmailJS (FALLBACK)
 */
export const sendEventInvitation = async (eventData, guestData) => {
  if (!guestData.email) {
    console.warn(`Sin email para: ${guestData.nombre}`);
    return;
  }

  const qrCode = guestData.qrCode || guestData.personas?.[0]?.qrCode || null;
  const qrBase64 = qrCode ? await getQRBase64(qrCode) : '';

  const templateParams = {
    to_email: guestData.email,
    guest_name: guestData.nombre,
    event_name: eventData.nombreEvento || eventData.title || '',
    event_date: eventData.fecha || eventData.date || '',
    event_time: eventData.hora || '',
    event_address: eventData.direccion || eventData.address || '',
    qr_image_url: qrBase64,
    qr_code_text: qrCode || '',
  };

  console.log(`📧 [Fallback EmailJS] Enviando a ${guestData.email}`);

  try {
    const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
    console.log(`✅ [Fallback EmailJS] Enviado a ${guestData.email}:`, response.status);
    return response;
  } catch (error) {
    console.error(`❌ [Fallback EmailJS] Error enviando a ${guestData.email}:`, error);
    throw error;
  }
};

/**
 * Envía correos a todos los invitados.
 * Intenta usar primero el Agente SMTP local de Python.
 * Si no está activo, realiza el envío de respaldo con EmailJS.
 */
export const sendInvitationsToAll = async (eventData, guestList) => {
  // 1. INTENTO DE ENVÍO CON EL AGENTE SMTP DE PYTHON
  try {
    console.log("⚡ Conectando con el Agente de Correos SMTP local...");
    const response = await fetch("http://127.0.0.1:8000/api/send-emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        eventData,
        guestList
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Éxito total: Correos enviados a través de SMTP local.");
      return data.result; // Retorna { success: X, failed: Y, errors: [...] }
    } else {
      const errData = await response.json();
      throw new Error(errData.detail || "Error en el servidor de correos local.");
    }
  } catch (pythonError) {
    // Si falla la conexión a localhost:8000 o el servidor da un error, usar EmailJS
    console.warn("⚠️  El Agente SMTP de Python local no está disponible o dio error:", pythonError.message);
    console.log("🔄 Activando envío de respaldo (Fallback) con EmailJS...");

    // 2. LÓGICA DE RESPALDO CON EMAILJS (Lógica original intacta)
    const result = { success: 0, failed: 0, errors: [] };

    for (const guest of guestList) {
      const personas = guest.personas || [];
      const personasConEmail = personas.filter(p => p.email && p.email.trim() !== '');

      if (personasConEmail.length > 0) {
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
          await new Promise(r => setTimeout(r, 450)); // Pausa ligera
        }
      } else if (guest.email && guest.email.trim() !== '') {
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
        await new Promise(r => setTimeout(r, 450));
      }
    }

    if (result.success === 0 && result.failed === 0) {
      throw new Error('No hay invitados con correo electrónico válido.');
    }

    return result;
  }
};
