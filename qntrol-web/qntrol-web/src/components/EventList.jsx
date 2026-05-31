import React, { useState, useRef } from 'react';
import Button from './Button';
import AppModal from './AppModal';
import TheaterSectionEditor from './TheaterSectionEditor';
import excelIcon from '../assets/excel-icon.png';
import { actualizarEvento, cargarInvitadosCSV, getInvitadosByEvento, eliminarEvento } from "../firebase/firebase";
import { sendInvitationsToAll } from "../services/emailService";
import { INFANTA_LEONOR_SECTIONS, THEATER_TOTAL_CAPACITY } from "../utils/theaterSeating";

const EventList = ({ events, onEditEvent, onDeleteEvent, onCreateClick }) => {
  const displayEvents = events || [];

  const [editingEvent, setEditingEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Estados del formulario
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [fileName, setFileName] = useState('');
  const [guestList, setGuestList] = useState([]);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [modal, setModal] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const fileInputRef = useRef(null);

  // --- LÓGICA DE ASIENTOS RECUPERADA ---
  const [activeTab, setActiveTab] = useState('general');
  const [seatRows, setSeatRows] = useState(10);
  const [seatCols, setSeatCols] = useState(10);
  const [selectedSeats, setSelectedSeats] = useState({});
  const [hiddenSeats, setHiddenSeats] = useState({});
  const [seatEditMode, setSeatEditMode] = useState('select'); // 'select' o 'delete'
  const [seatSections, setSeatSections] = useState(INFANTA_LEONOR_SECTIONS);
  const [reservedSeatsText, setReservedSeatsText] = useState('');
  const [reservedSeatIds, setReservedSeatIds] = useState([]);

  const handleEditClick = (event) => {
    setEditingEvent(event);
    setIsEditing(true);
    setActiveTab('general');

    setTitle(event.title || event.nombreEvento || '');
    setAddress(event.address || event.direccion || '');

    // Parseo de fecha
    if (event.fecha) {
      setDate(event.fecha);
      setTime(event.hora || '');
    } else if (event.date) {
      const dateParts = event.date.split(' - ');
      if (dateParts[0]) {
        const [day, month, year] = dateParts[0].split('/');
        if (day && month && year) setDate(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      }
      if (dateParts[1]) setTime(dateParts[1].replace('h', ''));
    }

    // Carga de configuración de salón
    setSeatRows(event.seatRows || event.configuracionSalon?.filas || 10);
    setSeatCols(event.seatCols || event.configuracionSalon?.columnas || 10);
    setSelectedSeats(event.selectedSeats || {});
    setHiddenSeats(event.hiddenSeats || {});
    setSeatSections(event.seatSections || INFANTA_LEONOR_SECTIONS);
    setReservedSeatsText(event.reservedSeatsText || '');
    setReservedSeatIds(event.reservedSeatIds || []);
    setGuestList(event.guestList || event.invitados || []);
    setFileName(event.guestList?.length > 0 ? `Lista cargada (${event.guestList.length} invitados)` : '');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingEvent(null);
    resetForm();
  };

  const resetForm = () => {
    setTitle(''); setAddress(''); setDate(''); setTime('');
    setGuestList([]); setFileName('');
    setSeatRows(10); setSeatCols(10);
    setSelectedSeats({}); setHiddenSeats({});
    setSeatSections(INFANTA_LEONOR_SECTIONS);
    setReservedSeatsText('');
    setReservedSeatIds([]);
    setActiveTab('general');
  };

  const getRowLabel = (index) => {
    let label = '';
    let temp = index;
    while (temp >= 0) {
      label = String.fromCharCode(65 + (temp % 26)) + label;
      temp = Math.floor(temp / 26) - 1;
    }
    return label;
  };

  const handleSeatClick = (rowLabel, colIndex) => {
    const seatId = `${rowLabel}-${colIndex}`;
    if (seatEditMode === 'delete') {
      setHiddenSeats(prev => {
        const next = { ...prev };
        next[seatId] ? delete next[seatId] : next[seatId] = true;
        return next;
      });
    } else {
      if (hiddenSeats[seatId]) return;
      setSelectedSeats(prev => {
        const next = { ...prev };
        next[seatId] ? delete next[seatId] : next[seatId] = true;
        return next;
      });
    }
  };

  // --- LÓGICA DE ARCHIVOS (CSV) ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim());
      const headers = lines[0].split(lines[0].includes(';') ? ';' : ',').map(h => h.trim());
      const data = lines.slice(1).map(line => {
        const values = line.split(lines[0].includes(';') ? ';' : ',');
        const obj = {};
        headers.forEach((h, i) => obj[h] = values[i]?.trim() || '');
        return obj;
      });
      setGuestList(data);
      setFileName(file.name);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleSubmit = async () => {
    if (!title || !date) {
      setModal({ title: 'Datos incompletos', body: 'El título y la fecha son obligatorios.' });
      return;
    }

    try {
      if (editingEvent.id) {
        await actualizarEvento(editingEvent.id, {
          nombreEvento: title,
          direccion: address,
          fecha: date,
          hora: time,
          seatRows,
          seatCols,
          selectedSeats,
          hiddenSeats,
          seatSections,
          reservedSeatsText,
          reservedSeatIds,
          capacidadMaxima: THEATER_TOTAL_CAPACITY
        });

        if (guestList.length > 0 && fileName && !fileName.includes('Lista cargada')) {
          await cargarInvitadosCSV(editingEvent.id, guestList);
        }

        const dateObj = new Date(date + 'T' + (time || '00:00'));
        const formattedDate = dateObj.toLocaleDateString('es-ES') + ' - ' + (time ? time + 'h' : '');

        onEditEvent({
          ...editingEvent,
          title, address, date: formattedDate,
          seatRows, seatCols, selectedSeats, hiddenSeats, seatSections, reservedSeatsText, reservedSeatIds,
          guestList
        });
      }
      handleCancelEdit();
    } catch (error) {
      setModal({ title: 'Error al actualizar', body: error.message });
    }
  };

  const askDeleteEvent = (event, eventTitle) => {
    setConfirmAction({
      title: 'Eliminar evento',
      body: `¿Quieres eliminar "${eventTitle}" permanentemente? Esta acción no se puede deshacer.`,
      variant: 'danger',
      label: 'Eliminar evento',
      run: async () => {
        await eliminarEvento(event.id);
        if (onDeleteEvent) onDeleteEvent(event.id);
      },
    });
  };

  const askSendEmails = (event, eventTitle) => {
    setConfirmAction({
      title: 'Enviar invitaciones',
      body: `¿Quieres enviar los correos masivos para "${eventTitle}"?`,
      label: 'Enviar correos',
      run: async () => {
        setIsSendingEmails(true);
        try {
          const invitados = await getInvitadosByEvento(event.id);
          if (!invitados?.length) {
            setModal({ title: 'Sin invitados', body: 'Este evento todavía no tiene invitados cargados.' });
            return;
          }
          const result = await sendInvitationsToAll(event, invitados);
          setModal({ title: 'Envío finalizado', body: `Éxito: ${result.success} | Fallidos: ${result.failed}` });
        } catch (err) {
          setModal({ title: 'Error al enviar', body: err.message });
        } finally {
          setIsSendingEmails(false);
        }
      },
    });
  };

  const runConfirmAction = async () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (action?.run) await action.run();
  };

  const renderModals = () => (
    <>
      <AppModal open={Boolean(modal)} title={modal?.title || ''} confirmLabel="Aceptar" onClose={() => setModal(null)}>
        <p>{modal?.body}</p>
      </AppModal>
      <AppModal
        open={Boolean(confirmAction)}
        title={confirmAction?.title || ''}
        variant={confirmAction?.variant}
        confirmLabel={confirmAction?.label || 'Confirmar'}
        showCancel
        onClose={() => setConfirmAction(null)}
        onConfirm={runConfirmAction}
      >
        <p>{confirmAction?.body}</p>
      </AppModal>
    </>
  );

  // --- RENDERIZADO MODO EDICIÓN ---
  if (isEditing) {
    return (
      <>
        <div className="flex-1 p-6 md:p-10 flex flex-col h-full overflow-hidden text-left bg-[#0D0E22]">
          <div className="bg-[#0f0f1b] rounded-[3rem] max-w-6xl w-full mx-auto shadow-2xl flex flex-col overflow-hidden border border-white/5 h-[90vh]">
          
          <div className="bg-gradient-to-r from-[#7738B0] to-[#592a85] pt-10 px-10 shrink-0">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-4">
                 <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                 Editando Evento
               </h2>
               <span className="text-[10px] bg-black/30 px-5 py-2 rounded-full text-purple-200 border border-white/10 uppercase tracking-[0.3em] font-black">
                 {editingEvent?.title || 'Evento'}
               </span>
            </div>
            <div className="flex gap-10">
              {['general', 'salon', 'mensaje'].map(tab => {
                const isDisabled = tab === 'mensaje';
                return (
                <button
                  key={tab}
                  onClick={() => !isDisabled && setActiveTab(tab)}
                  disabled={isDisabled}
                  className={`pb-5 text-[11px] font-black uppercase tracking-[0.2em] border-b-[5px] transition-all ${
                    isDisabled
                      ? 'border-transparent text-white/25 cursor-not-allowed'
                      : activeTab === tab
                        ? 'border-white text-white'
                        : 'border-transparent text-white/30 hover:text-white/60'
                  }`}
                >
                  <span>{tab === 'general' ? 'Información' : tab === 'salon' ? 'Salón' : 'Invitación'}</span>
                  {isDisabled && (
                    <span className="ml-2 rounded-full bg-black/25 px-2 py-1 text-[8px] text-white/45">
                      Deshabilitado
                    </span>
                  )}
                </button>
                );
              })}
            </div>
          </div>

          <div className="p-10 overflow-y-auto flex-1 custom-scrollbar bg-[#0D0E22]">
            {activeTab === 'general' ? (
              <div className="grid grid-cols-2 gap-8 animate-fadeIn">
                <div className="col-span-2 flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre del Evento</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="EJ. GALA DE GRADUACIÓN" className="bg-[#1e1b2e] p-5 rounded-2xl text-white outline-none border border-transparent focus:border-[#7738B0] transition-all" />
                </div>
                <div className="col-span-2 flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Dirección</label>
                  <input value={address} onChange={e => setAddress(e.target.value)} placeholder="DIRECCIÓN DEL EVENTO" className="bg-[#1e1b2e] p-5 rounded-2xl text-white outline-none border border-transparent focus:border-[#7738B0] transition-all" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Fecha</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-[#1e1b2e] p-5 rounded-2xl text-white outline-none" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Hora</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-[#1e1b2e] p-5 rounded-2xl text-white outline-none" />
                </div>
                <div className="col-span-2 mt-4">
                  <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-white/10 p-10 rounded-[2rem] flex flex-col items-center gap-4 cursor-pointer hover:bg-white/[0.02] transition-all group">
                     <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".csv" />
                     <img src={excelIcon} className="w-12 h-12 opacity-20 group-hover:opacity-100 transition-opacity" alt="csv" />
                     <p className="text-gray-500 font-bold text-sm">{fileName || "CARGAR LISTA DE INVITADOS (.CSV)"}</p>
                     {guestList.length > 0 && <span className="text-[#7738B0] font-black">{guestList.length} DETECTADOS</span>}
                  </div>
                  
                  {/* Vista previa de invitados (Excel Preview) */}
                  {guestList.length > 0 && (
                    <div className="mt-8 bg-black/20 rounded-[2rem] border border-white/5 overflow-hidden">
                      <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center px-6">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vista Previa de Invitados</span>
                        <span className="text-[10px] font-black text-purple-400">{guestList.length} Filas</span>
                      </div>
                      <div className="max-h-60 overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-black/40">
                              {Object.keys(guestList[0]).map(h => (
                                <th key={h} className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {guestList.slice(0, 50).map((row, i) => (
                              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                {Object.values(row).map((v, j) => (
                                  <td key={j} className="p-4 text-xs text-gray-300 font-medium">
                                    {typeof v === 'object' && v !== null 
                                      ? (Array.isArray(v) ? `${v.length} personas` : '...') 
                                      : String(v)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {guestList.length > 50 && (
                          <div className="p-4 text-center text-[10px] font-black text-gray-600 uppercase tracking-widest bg-black/20">
                            Y {guestList.length - 50} filas más...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 animate-fadeIn h-full">
                <div className="hidden bg-black/20 p-6 rounded-3xl border border-white/5">
                  <p className="text-[10px] text-purple-300 font-black uppercase tracking-[0.2em] mb-2">Plano aplicado</p>
                  <h3 className="text-white text-2xl font-black">Nuevo Teatro Infanta Leonor</h3>
                  <p className="text-gray-500 text-sm mt-2">Los sectores se guardan en Firebase y se usan para asignar asientos automáticamente al importar invitados.</p>
                </div>

                <div className="hidden bg-black/20 p-6 rounded-3xl border border-white/5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                    <div>
                      <p className="text-[10px] text-purple-300 font-black uppercase tracking-[0.2em] mb-2">Butacas reservadas</p>
                      <h3 className="text-white text-xl font-black">Excluir de la asignación automática</h3>
                      <p className="text-gray-500 text-sm mt-2">Estas butacas quedan bloqueadas para reservas ya asignadas, como alumnos o protocolo.</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-[11px] text-gray-300 leading-relaxed">
                      <p><strong className="text-white">Ejemplo:</strong> patio-b 1 11-20</p>
                      <p>anfiteatro-a 3 1,2,3</p>
                    </div>
                  </div>
                  <textarea
                    value={reservedSeatsText}
                    onChange={(e) => setReservedSeatsText(e.target.value)}
                    placeholder={"patio-b 1 11-20\npatio-c 10 21,22\nanfiteatro-a 3 1-4"}
                    className="w-full min-h-[120px] bg-[#1e1b2e] p-5 rounded-2xl text-white outline-none border border-white/5 focus:border-[#7738B0] resize-y leading-relaxed"
                  />
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {seatSections.filter(section => section.type !== 'pmr').map(section => (
                      <span key={section.id} className="rounded-xl bg-white/5 border border-white/5 px-3 py-2 text-[10px] text-gray-400">
                        <strong className="text-white">{section.id}</strong> · filas 1-{section.rows} · asientos {section.seatStart}-{section.seatEnd}
                      </span>
                    ))}
                  </div>
                </div>

                <TheaterSectionEditor
                  sections={seatSections}
                  reservedSeatIds={reservedSeatIds}
                  onReservedSeatIdsChange={setReservedSeatIds}
                />

                <div className="hidden bg-[#13111C] p-8 rounded-[3rem] border border-white/5 overflow-auto shadow-inner">
                  <div className="min-w-[760px] flex flex-col gap-8">
                    <div>
                      <p className="text-center text-white/70 text-[11px] font-black uppercase tracking-[0.3em] mb-4">Anfiteatro</p>
                      <div className="grid grid-cols-3 gap-6">
                        {seatSections.filter(section => section.level === 'Anfiteatro').map(section => (
                          <div key={section.id} className="rounded-2xl border border-white/10 p-4" style={{ backgroundColor: `${section.color}22` }}>
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <p className="text-white font-black text-sm">{section.name}</p>
                                <p className="text-white/45 text-[10px] mt-1 uppercase tracking-widest">{section.capacity} butacas</p>
                              </div>
                              <span className="rounded-full px-3 py-1 text-[10px] font-black text-white" style={{ backgroundColor: section.color }}>Sector {section.sector}</span>
                            </div>
                            <div className="mt-4 grid grid-cols-10 gap-1">
                              {Array.from({ length: Math.min(section.capacity, 70) }).map((_, index) => (
                                <span key={index} className="h-2 rounded-sm" style={{ backgroundColor: section.color }} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-center text-white/70 text-[11px] font-black uppercase tracking-[0.3em] mb-4">Patio de butacas</p>
                      <div className="grid grid-cols-3 gap-6">
                        {seatSections.filter(section => section.level === 'Patio de Butacas' && section.type !== 'pmr').map(section => (
                          <div key={section.id} className="rounded-2xl border border-white/10 p-4" style={{ backgroundColor: `${section.color}22` }}>
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <p className="text-white font-black text-sm">{section.name}</p>
                                <p className="text-white/45 text-[10px] mt-1 uppercase tracking-widest">{section.capacity} butacas</p>
                              </div>
                              <span className="rounded-full px-3 py-1 text-[10px] font-black text-white" style={{ backgroundColor: section.color }}>Sector {section.sector}</span>
                            </div>
                            {section.id === 'patio-c' && (
                              <div className="mt-4 rounded-xl bg-yellow-400/20 border border-yellow-300/30 px-3 py-2 text-yellow-100 text-[11px] font-bold">
                                Zona discapacitados integrada en este sector
                              </div>
                            )}
                            <div className="mt-4 grid grid-cols-10 gap-1">
                              {Array.from({ length: Math.min(section.capacity, 100) }).map((_, index) => (
                                <span key={index} className="h-2 rounded-sm" style={{ backgroundColor: section.color }} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white/80 text-[11px] font-black uppercase tracking-[0.3em]">
                      Escenario
                    </div>
                  </div>
                </div>

                <div className="hidden flex-wrap gap-4 bg-black/20 p-4 rounded-xl border border-white/5 items-end">
                  <div className="flex-1 min-w-[100px]">
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Filas</label>
                    <input type="number" value={seatRows} onChange={e => setSeatRows(parseInt(e.target.value) || 1)} className="w-full bg-[#1e1b2e] p-2.5 rounded-lg text-white border border-white/5 focus:border-purple-500 outline-none" />
                  </div>
                  <div className="flex-1 min-w-[100px]">
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Columnas</label>
                    <input type="number" value={seatCols} onChange={e => setSeatCols(parseInt(e.target.value) || 1)} className="w-full bg-[#1e1b2e] p-2.5 rounded-lg text-white border border-white/5 focus:border-purple-500 outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSeatEditMode(m => m === 'select' ? 'delete' : 'select')} className={`px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${seatEditMode === 'delete' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-[#7738B0] text-white hover:bg-purple-600'}`}>
                      {seatEditMode === 'delete' ? 'Modo Borrar Pasillos' : 'Modo Seleccionar Butacas'}
                    </button>
                    <button onClick={() => setSelectedSeats({})} className="px-4 py-2.5 rounded-lg font-bold text-xs bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all">Limpiar Selección</button>
                  </div>
                </div>
                <div className="hidden flex-col items-center shrink-0 mb-4">
                  <div className="w-3/4 h-2 bg-gradient-to-r from-transparent via-[#7738B0] to-transparent rounded-full shadow-[0_0_30px_#7738B0]"></div>
                </div>

                <div className="hidden bg-[#13111C] p-10 rounded-[3rem] border border-white/5 overflow-auto flex-col items-center min-h-[450px] relative shadow-inner">
                  <div className="flex flex-col gap-3 min-w-max pb-10">
                    {Array.from({ length: seatRows }).map((_, r) => (
                      <div key={r} className="flex gap-3 items-center">
                        <span className="text-[11px] font-black text-gray-600 w-6 text-center">{getRowLabel(r)}</span>
                        <div className="flex gap-2">
                          {Array.from({ length: seatCols }).map((_, c) => {
                            const id = `${getRowLabel(r)}-${c + 1}`;
                            const isH = hiddenSeats[id];
                            const isS = selectedSeats[id];
                            return (
                              <button 
                                key={c}
                                onClick={() => handleSeatClick(getRowLabel(r), c + 1)}
                                className={`w-9 h-9 rounded-t-xl rounded-b-md text-[9px] font-bold transition-all relative border ${isH ? (seatEditMode === 'delete' ? 'bg-red-900/20 border-dashed border-red-500 opacity-60' : 'opacity-0 pointer-events-none') : (isS ? 'bg-green-500 border-green-400 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)] scale-105' : 'bg-gray-800 border-white/5 text-gray-400 hover:bg-gray-700 hover:text-white hover:scale-105')}`}
                              >
                                {!isH && id}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-8 bg-[#0f0f1b] border-t border-white/5 flex gap-6">
             <button onClick={handleCancelEdit} className="flex-1 p-6 text-gray-500 font-black text-xs tracking-widest uppercase hover:text-white transition-colors">Cancelar</button>
             <Button onClick={handleSubmit} className="flex-[2] bg-gradient-to-r from-purple-600 to-purple-800 py-6 rounded-[2rem] font-black text-sm tracking-[0.2em] uppercase shadow-2xl shadow-purple-900/40 hover:scale-[1.02] active:scale-95 transition-all">GUARDAR CAMBIOS</Button>
          </div>
          </div>
        </div>
        {renderModals()}
      </>
    );
  }

  // --- RENDERIZADO DE LA LISTA NORMAL (DISEÑO PREMIUM RECUPERADO) ---
  return (
    <>
    <div className="flex-1 flex flex-col p-6 md:p-10 bg-[#0D0E22]">
      
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-5 text-white">
          <span className="bg-gradient-to-br from-[#7738B0] to-[#4A236D] p-3.5 rounded-2xl shadow-2xl shadow-purple-900/50 border border-purple-500/30">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          </span>
          <div>
            <h1 className="text-4xl font-black tracking-tight leading-none">Eventos</h1>
            <p className="text-gray-500 text-sm mt-1 font-medium">Gestiona tus celebraciones y accesos</p>
          </div>
        </div>
        
        <Button onClick={onCreateClick} className="shadow-2xl shadow-purple-900/40 font-black px-8 py-3.5 bg-gradient-to-r from-[#7738B0] to-[#9a4ad4] hover:scale-105 transition-transform">
          <span className="text-xl mr-2">+</span> NUEVO EVENTO
        </Button>
      </div>

      {displayEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {displayEvents.map((event) => {
            const title = event.title || event.nombreEvento || 'Evento sin nombre';
            const date = event.date || (event.fecha ? `${event.fecha}${event.hora ? ' - ' + event.hora : ''}` : 'Fecha no definida');
            const num = event.invitados?.length || event.totalInvitados || 0;

            return (
              <div key={event.id} className="bg-[#2B2738] border border-white/5 rounded-[2rem] p-7 flex flex-col justify-between shadow-2xl hover:bg-[#342F42] hover:-translate-y-2 hover:border-purple-500/40 transition-all duration-500 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-purple-600/10 transition-colors"></div>
                
                <div className="flex items-start justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#1E1B29] to-[#2a2638] border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl group-hover:border-purple-500/50 transition-all group-hover:scale-110">
                      <span className="text-[#7738B0] font-black text-3xl">{title.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-white font-black text-xl leading-tight truncate max-w-[180px] tracking-tight">{title}</h3>
                      <span className="text-purple-300/60 text-[10px] font-black bg-purple-500/10 px-3 py-1 rounded-full w-fit uppercase tracking-widest border border-purple-500/10">{date}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1.5">
                    <button onClick={() => handleEditClick(event)} className="text-white/20 hover:text-white hover:bg-white/10 p-2.5 rounded-2xl transition-all" title="Editar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button onClick={(e) => { 
                        e.stopPropagation(); 
                        askDeleteEvent(event, title);
                      }} className="text-white/20 hover:text-red-500 hover:bg-red-500/10 p-2.5 rounded-2xl transition-all"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-white/5 relative z-10">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Invitados</span>
                    <span className="text-xl font-black text-white">{num} <span className="text-xs text-purple-400 font-bold tracking-normal">Confirmados</span></span>
                  </div>
                  
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (isSendingEmails) return;
                      askSendEmails(event, title);
                    }}
                    disabled={isSendingEmails}
                    className="bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white p-4 rounded-[1.2rem] transition-all border border-purple-500/20 active:scale-95 shadow-lg group/btn"
                  >
                    {isSendingEmails ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover/btn:rotate-12 transition-transform"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-20 mt-10 bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[3rem]">
          <div className="text-8xl mb-8 animate-bounce opacity-20">📅</div>
          <h2 className="text-white text-3xl font-black text-center tracking-tight">Tu lista está vacía</h2>
          <p className="text-gray-500 mt-4 text-center max-w-sm font-medium leading-relaxed">Comienza creando un nuevo evento para gestionar tus invitados, asientos y códigos QR de acceso.</p>
          <button onClick={onCreateClick} className="mt-10 px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/10">Crear mi primer evento</button>
        </div>
      )}
    </div>
    {renderModals()}
    </>
  );
};

export default EventList;
