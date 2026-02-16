import emailjs from '@emailjs/browser';

// CONFIGURACIÓN DE EMAILJS
// Deberás reemplazar estos valores con los que obtengas en tu panel de EmailJS
const SERVICE_ID = 'service_0rt1cqa';
const TEMPLATE_ID = 'template_czkqqos';
const PUBLIC_KEY = 'wewgP2tKTSYexpl_f';

/**
 * Envía un correo de invitación a un invitado
 * @param {Object} eventData - Datos del evento (nombreEvento, fecha, hora, direccion)
 * @param {Object} guestData - Datos del invitado (nombre, email)
 * @returns {Promise}
 */
export const sendEventInvitation = async (eventData, guestData) => {
    // Verificación de credenciales
    if (SERVICE_ID === 'YOUR_SERVICE_ID' || TEMPLATE_ID === 'YOUR_TEMPLATE_ID' || PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
        throw new Error('CONFIGURACIÓN FALTANTE: Debes configurar tus credenciales de EmailJS en src/services/emailService.js. Mira las instrucciones en el archivo.');
    }

    if (!guestData.email) {
        console.warn(`El invitado ${guestData.nombre} no tiene email.`);
        return;
    }

    // LOS NOMBRES DE ESTAS VARIABLES DEBEN COINCIDIR CON LOS QUE PONGAS EN TU PLANTILLA DE EMAILJS
    // Ejemplo: {{guest_name}}, {{event_name}}, {{event_date}}, {{event_address}}, {{to_email}}
    const templateParams = {
        guest_name: guestData.nombre,
        event_name: eventData.nombreEvento || eventData.title,
        event_date: eventData.fecha || eventData.date,
        event_time: eventData.hora || '',
        event_address: eventData.direccion || eventData.address,
        to_email: guestData.email,
    };

    try {
        const response = await emailjs.send(
            SERVICE_ID,
            TEMPLATE_ID,
            templateParams,
            PUBLIC_KEY
        );
        console.log(`Correo enviado con éxito a ${guestData.email}:`, response.status, response.text);
        return response;
    } catch (error) {
        console.error(`Error al enviar correo a ${guestData.email}:`, error);
        throw error;
    }
};

/**
 * Envía correos a una lista de invitados
 * @param {Object} eventData 
 * @param {Array} guestList 
 * @returns {Promise}
 */
export const sendInvitationsToAll = async (eventData, guestList) => {
    const emailResults = {
        success: 0,
        failed: 0,
        errors: []
    };

    // Filtramos invitados que tengan email
    const guestsWithEmail = guestList.filter(guest => guest.email && guest.email.trim() !== '');

    if (guestsWithEmail.length === 0) {
        throw new Error('No hay invitados con correo electrónico válido.');
    }

    // Enviamos los correos uno por uno (o en bloque si EmailJS lo permite en el plan, 
    // pero generalmente es uno a uno en el plan gratuito)
    for (const guest of guestsWithEmail) {
        try {
            await sendEventInvitation(eventData, guest);
            emailResults.success++;
        } catch (error) {
            emailResults.failed++;
            emailResults.errors.push({ guest: guest.nombre, error: error.message });
        }

        // Pequeña pausa opcional para evitar límites de tasa si la lista es muy larga
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    return emailResults;
};
