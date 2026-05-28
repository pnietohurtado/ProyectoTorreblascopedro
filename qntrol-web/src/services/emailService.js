import QRCode from 'qrcode';
import emailjs from '@emailjs/browser';
import { marcarEmailEnviado, actualizarAsientoInvitado } from '../firebase/firebase';

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
 * Envía un correo de invitación con QR a un invitado.
 */
export const sendEventInvitation = async (eventData, guestData) => {
  if (!guestData.email) {
    console.warn(`Sin email para: ${guestData.nombre}`);
    return;
  }

  const qrCode = guestData.qrCode || guestData.personas?.[0]?.qrCode || null;
  const qrBase64 = qrCode ? await getQRBase64(qrCode) : '';

  // Variables que el template de EmailJS puede usar
  const templateParams = {
    to_email: guestData.email,
    guest_name: guestData.nombre,
    event_name: eventData.nombreEvento || eventData.title || '',
    event_date: eventData.fecha || eventData.date || '',
    event_time: eventData.hora || '',
    event_address: eventData.direccion || eventData.address || '',
    // Código QR en base64 → úsala en tu template como:
    // <img src="{{qr_image_url}}" width="250" height="250" />
    qr_image_url: qrBase64,
    qr_code_text: qrCode || '',
    // Información de asiento (NUEVO)
    guest_seat: guestData.asiento || 'Sin asiento asignado',
  };

  console.log(`📧 Enviando a ${guestData.email}`);
  console.log(`🔗 QR Base64 generado`);

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
 * Si un invitado ya recibió el email (emailEnviado === true), se lo salta.
 * Implementa asignación automática de asientos antes de enviar.
 */
export const sendInvitationsToAll = async (eventData, guestList) => {
  const result = { success: 0, failed: 0, skipped: 0, errors: [] };
  
  // Set para rastrear emails ya enviados EN ESTE LOTE para evitar duplicados
  const emailsEnviadosEnLote = new Set();

  // --- LÓGICA DE ASIENTOS ---
  // Extraer asientos disponibles del diseño (selectedSeats es un objeto { 'A-1': true, ... })
  // Realizamos un ordenamiento natural (A-1, A-2, A-10...)
  const availableSeats = eventData.selectedSeats 
    ? Object.keys(eventData.selectedSeats).sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      }) 
    : [];

  let nextSeatIndex = 0;

  // Filtrar solo los invitados que realmente vamos a procesar (los que no han sido enviados)
  const guestsToProcess = guestList.filter(g => !g.emailEnviado);
  
  // Calcular total de personas a las que enviaremos para ver si hay asientos suficientes
  let totalPersonasAEnviar = 0;
  guestsToProcess.forEach(g => {
    const pConEmail = (g.personas || []).filter(p => p.email && p.email.trim() !== '');
    totalPersonasAEnviar += pConEmail.length > 0 ? pConEmail.length : (g.email ? 1 : 0);
  });

  console.log(`💺 Asientos disponibles: ${availableSeats.length}. Personas a procesar: ${totalPersonasAEnviar}`);

  if (availableSeats.length < totalPersonasAEnviar && availableSeats.length > 0) {
    const confirm = window.confirm(`Aviso: Solo hay ${availableSeats.length} asientos disponibles para ${totalPersonasAEnviar} personas. Algunos invitados se quedarán sin asiento asignado. ¿Continuar?`);
    if (!confirm) throw new Error("Acción cancelada por falta de asientos.");
  }

  for (const guest of guestList) {
    // 1. Saltarlos si la base de datos ya dice que fueron enviados
    if (guest.emailEnviado) {
      result.skipped++;
      continue;
    }

    const personas = guest.personas || [];
    const personasConEmail = personas.filter(p => p.email && p.email.trim() !== '');
    
    let invitadoProcesadoConExito = false;

    if (personasConEmail.length > 0) {
      // Cada persona con email recibe su propio QR y asiento
      for (let i = 0; i < personasConEmail.length; i++) {
        const persona = personasConEmail[i];
        const targetEmail = persona.email.toLowerCase().trim();
        
        // 2. Saltarlos si ya enviamos a este email en este mismo lote
        if (emailsEnviadosEnLote.has(targetEmail)) {
          result.skipped++;
          continue;
        }

        // Asignar asiento si hay disponibles
        let assignedSeatText = '';
        if (nextSeatIndex < availableSeats.length) {
          const seatId = availableSeats[nextSeatIndex];
          const parts = seatId.split('-');
          const fila = parts[0];
          const col = parts[1];
          assignedSeatText = `Fila ${fila}, Columna ${col}`;
          
          // Guardar en Firebase (usamos el ID de la persona o su índice original)
          // Buscamos el índice original en el array guest.personas
          const originalIndex = guest.personas.indexOf(persona);
          await actualizarAsientoInvitado(eventData.id || eventData.eventId, guest.id, persona.id || originalIndex, assignedSeatText);
          nextSeatIndex++;
        }

        try {
          await sendEventInvitation(eventData, {
            nombre: persona.nombre,
            email: persona.email,
            qrCode: persona.qrCode,
            asiento: assignedSeatText // Pasar asiento asignado
          });
          result.success++;
          emailsEnviadosEnLote.add(targetEmail);
          invitadoProcesadoConExito = true;
        } catch (err) {
          result.failed++;
          result.errors.push({ guest: persona.nombre, error: err.message });
        }
        await new Promise(r => setTimeout(r, 350));
      }
      
    } else if (guest.email && guest.email.trim() !== '') {
      const targetEmail = guest.email.toLowerCase().trim();

      // 2. Saltarlos si ya enviamos a este email en este mismo lote
      if (emailsEnviadosEnLote.has(targetEmail)) {
        result.skipped++;
      } else {
        // El titular recibe el QR de la primera persona
        const personaPrincipal = personas[0] || guest;

        // Asignar asiento si hay disponibles
        let assignedSeatText = '';
        if (nextSeatIndex < availableSeats.length) {
          const seatId = availableSeats[nextSeatIndex];
          const parts = seatId.split('-');
          const fila = parts[0];
          const col = parts[1];
          assignedSeatText = `Fila ${fila}, Columna ${col}`;
          
          // Guardar en Firebase
          await actualizarAsientoInvitado(eventData.id || eventData.eventId, guest.id, 'principal', assignedSeatText);
          nextSeatIndex++;
        }

        try {
          await sendEventInvitation(eventData, {
            nombre: guest.nombre,
            email: guest.email,
            qrCode: personaPrincipal.qrCode || guest.qrCode,
            asiento: assignedSeatText // Pasar asiento asignado
          });
          
          result.success++;
          emailsEnviadosEnLote.add(targetEmail);
          invitadoProcesadoConExito = true;
        } catch (err) {
          result.failed++;
          result.errors.push({ guest: guest.nombre, error: err.message });
        }
        await new Promise(r => setTimeout(r, 350));
      }
    }
    
    // Marcar como enviado en Firebase solo si realmente enviamos algo para este guest
    if (invitadoProcesadoConExito && guest.id) {
      await marcarEmailEnviado(eventData.id || eventData.eventId, guest.id);
    }
  }

  if (result.success === 0 && result.failed === 0 && result.skipped === 0) {
    throw new Error('No hay invitados con correo electrónico válido.');
  }

  return result;
};
