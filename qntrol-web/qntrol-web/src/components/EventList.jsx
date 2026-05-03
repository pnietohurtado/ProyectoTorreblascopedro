import React, { useState, useRef } from 'react';
import Button from './Button';
import excelIcon from '../assets/excel-icon.png';
import { actualizarEvento, cargarInvitadosCSV, getInvitadosByEvento, eliminarEvento } from "../firebase/firebase";
import { sendInvitationsToAll } from "../services/emailService";

const EventList = ({ events, onEditEvent, onDeleteEvent, onCreateClick }) => {
  const displayEvents = events || [];

  const [editingEvent, setEditingEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Estados del formulario y configuración
  const [activeTab, setActiveTab] = useState('general');
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seatRows, setSeatRows] = useState(10);
  const [seatCols, setSeatCols] = useState(10);
  const [hiddenSeats, setHiddenSeats] = useState({});
  const [seatEditMode, setSeatEditMode] = useState('select'); // 'select' o 'delete'

  // Estados de Invitación
  const [mensajeAsunto, setMensajeAsunto] = useState('');
  const [mensajeCuerpo, setMensajeCuerpo] = useState('Hola {{nombre_alumno}},\n\nTu invitación para {{nombre_evento}} está lista.');

  // Estados de CSV
  const [fileName, setFileName] = useState('');
  const [guestList, setGuestList] = useState([]);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const variablesDisponibles = [
    '{{nombre_alumno}}', '{{nombre_evento}}', '{{fecha_evento}}',
    '{{hora_evento}}', '{{nombre_salon}}', '{{asiento_asignado}}'
  ];

  const handleEditClick = (event) => {
    setEditingEvent(event);
    setIsEditing(true);
    setActiveTab('general');

    setTitle(event.title || event.nombreEvento || '');
    setAddress(event.address || event.direccion || '');

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

    setSeatRows(event.seatRows || 10);
    setSeatCols(event.seatCols || 10);
    setHiddenSeats(event.hiddenSeats || {});
    setGuestList(event.invitados || []);
    setFileName(event.invitados?.length > 0 ? `Lista cargada (${event.invitados.length} invitados)` : '');
    
    setMensajeAsunto(event.mensajeAsunto || '');
    setMensajeCuerpo(event.mensajeCuerpo || 'Hola {{nombre_alumno}},\n\nTu invitación para {{nombre_evento}} está lista.');
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
    setHiddenSeats({});
    setActiveTab('general');
    setMensajeAsunto('');
    setMensajeCuerpo('Hola {{nombre_alumno}},\n\nTu invitación para {{nombre_evento}} está lista.');
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
    }
  };

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

  const handleDropVariable = (e) => {
    e.preventDefault();
    const variable = e.dataTransfer.getData('text/plain');
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      setMensajeCuerpo(mensajeCuerpo.substring(0, start) + variable + mensajeCuerpo.substring(end));
    }
  };

  const handleSubmit = async () => {
    if (!title || !date) return alert('Título y fecha requeridos');

    try {
      if (editingEvent.id) {
        if (guestList.length > 0 && fileName && !fileName.includes('Lista cargada')) {
          const confirmar = window.confirm(`Vas a importar ${guestList.length} invitados. ¿Continuar?`);
          if (confirmar) {
            await cargarInvitadosCSV(editingEvent.id, guestList);
            alert("Importación finalizada.");
          }
        }

        // GUARDADO EN FIREBASE
        await actualizarEvento(editingEvent.id, {
          nombreEvento: title,
          direccion: address,
          fecha: date,
          hora: time,
          seatRows,
          seatCols,
          hiddenSeats,
          mensajeAsunto,
          mensajeCuerpo
        });

        const nuevosInvitados = await getInvitadosByEvento(editingEvent.id);
        const dateObj = new Date(date + 'T' + (time || '00:00'));
        const formattedDate = dateObj.toLocaleDateString('es-ES') + ' - ' + (time ? time + 'h' : '');

        onEditEvent({
          ...editingEvent,
          title, 
          address, 
          date: formattedDate,
          nombreEvento: title,
          direccion: address,
          fecha: date,
          hora: time,
          seatRows, 
          seatCols, 
          hiddenSeats,
          invitados: nuevosInvitados, 
          mensajeAsunto, 
          mensajeCuerpo
        });
      }
      handleCancelEdit();
    } catch (error) {
      alert("Error al actualizar: " + error.message);
    }
  };

  if (isEditing) {
    return (
      <div className="flex-1 p-6 md:p-10 flex flex-col h-full overflow-hidden text-left bg-[#0D0E22]">
        <div className="bg-[#0f0f1b] rounded-[3rem] max-w-6xl w-full mx-auto shadow-2xl flex flex-col overflow-hidden border border-white/5 h-[90vh]">
          
          <div className="bg-gradient-to-r from-[#7738B0] to-[#592a85] pt-10 px-10 shrink-0">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-4">
                 <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                 Editando Evento
               </h2>
               <span className="text-[10px] bg-black/30 px-5 py-2 rounded-full text-purple-200 border border-white/10 uppercase tracking-[0.3em] font-black">
                 {editingEvent?.title || editingEvent?.nombreEvento || 'Evento'}
               </span>
            </div>
            <div className="flex gap-10">
              {['general', 'salon', 'mensaje'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-5 text-[11px] font-black uppercase tracking-[0.2em] border-b-[5px] transition-all ${
                    activeTab === tab ? 'border-white text-white' : 'border-transparent text-white/30 hover:text-white/60'
                  }`}
                >
                  {tab === 'general' ? 'Información' : tab === 'salon' ? 'Salón' : 'Invitación'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-10 overflow-y-auto flex-1 custom-scrollbar bg-[#0D0E22]">
            {activeTab === 'general' ? (
              <div className="grid grid-cols-2 gap-8 animate-fadeIn">
                <div className="col-span-2 flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre del Evento</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="EJ. GALA DE GRADUACIÓN" className="bg-[#1e1b2e] p-5 rounded-2xl text-white outline-none border border-transparent focus:border-[#7738B0]" />
                </div>
                <div className="col-span-2 flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Dirección</label>
                  <input value={address} onChange={e => setAddress(e.target.value)} placeholder="DIRECCIÓN DEL EVENTO" className="bg-[#1e1b2e] p-5 rounded-2xl text-white outline-none border border-transparent focus:border-[#7738B0]" />
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
                </div>
              </div>
            ) : activeTab === 'mensaje' ? (
              <div className="flex flex-col md:flex-row gap-8 animate-fadeIn h-full">
                <div className="flex-1 flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Asunto del Correo</label>
                    <input value={mensajeAsunto} onChange={e => setMensajeAsunto(e.target.value)} placeholder="TU INVITACIÓN PARA {{nombre_evento}}" className="bg-[#1e1b2e] p-5 rounded-2xl text-white outline-none border border-transparent focus:border-[#7738B0]" />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Cuerpo del Mensaje (Soporta Drag & Drop)</label>
                    <textarea ref={textareaRef} value={mensajeCuerpo} onChange={e => setMensajeCuerpo(e.target.value)} onDragOver={e => e.preventDefault()} onDrop={handleDropVariable} className="bg-[#1e1b2e] p-6 rounded-[2rem] text-white outline-none border border-transparent focus:border-[#7738B0] flex-1 min-h-[300px] resize-none leading-relaxed" />
                  </div>
                </div>
                <div className="w-full md:w-64 bg-black/20 p-6 rounded-[2rem] border border-white/5">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Variables</p>
                  <div className="flex flex-col gap-2">
                    {variablesDisponibles.map(v => (
                      <div key={v} draggable onDragStart={e => e.dataTransfer.setData('text/plain', v)} className="bg-gray-800 p-3 rounded-xl text-[10px] font-black text-purple-400 border border-purple-500/20 cursor-grab active:cursor-grabbing hover:bg-gray-700 transition-colors">
                        {v}
                      </div>
                    ))}
                    <div className="mt-4 p-3 bg-white/5 rounded-xl border border-dashed border-white/10">
                      <p className="text-[9px] text-gray-500 font-bold leading-tight">TIP: Puedes usar cualquier columna de tu CSV como variable escribiendo {'{{nombre_columna}}'} en minúsculas.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 animate-fadeIn h-full">
                <div className="flex flex-wrap gap-4 bg-black/20 p-4 rounded-xl border border-white/5 items-end">
                  <div className="flex-1 min-w-[100px]">
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Filas</label>
                    <input type="number" value={seatRows} onChange={e => setSeatRows(parseInt(e.target.value) || 1)} className="w-full bg-[#1e1b2e] p-2.5 rounded-lg text-white border border-white/5 focus:border-purple-500 outline-none" />
                  </div>
                  <div className="flex-1 min-w-[100px]">
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Columnas</label>
                    <input type="number" value={seatCols} onChange={e => setSeatCols(parseInt(e.target.value) || 1)} className="w-full bg-[#1e1b2e] p-2.5 rounded-lg text-white border border-white/5 focus:border-purple-500 outline-none" />
                  </div>
                  <button onClick={() => setSeatEditMode(m => m === 'select' ? 'delete' : 'select')} className={`px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${seatEditMode === 'delete' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-[#7738B0] text-white hover:bg-purple-600'}`}>
                    {seatEditMode === 'delete' ? 'Modo Borrar Pasillos' : 'Modo Visualizar'}
                  </button>
                </div>
                
                <div className="bg-[#13111C] p-10 rounded-[3rem] border border-white/5 overflow-auto flex flex-col items-center min-h-[450px] relative shadow-inner">
                  <div className="flex flex-col gap-3 min-w-max pb-10">
                    {Array.from({ length: seatRows }).map((_, r) => (
                      <div key={r} className="flex gap-3 items-center">
                        <span className="text-[11px] font-black text-gray-600 w-6 text-center">{getRowLabel(r)}</span>
                        <div className="flex gap-2">
                          {Array.from({ length: seatCols }).map((_, c) => {
                            const id = `${getRowLabel(r)}-${c + 1}`;
                            const isH = hiddenSeats[id];
                            const occupant = guestList.find(inv => inv.asiento === id || inv.personas?.some(p => p.asiento === id));
                            const isOccupied = !!occupant;

                            return (
                              <button 
                                key={c}
                                onClick={() => handleSeatClick(getRowLabel(r), c + 1)}
                                title={isOccupied ? `Ocupado por: ${occupant.nombre}` : id}
                                className={`w-9 h-9 rounded-t-xl rounded-b-md text-[9px] font-bold transition-all relative border 
                                  ${isH ? (seatEditMode === 'delete' ? 'bg-red-900/20 border-dashed border-red-500 opacity-60' : 'opacity-0 pointer-events-none') 
                                    : (isOccupied ? 'bg-red-600 border-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)] scale-105' 
                                      : 'bg-gray-800 border-white/5 text-gray-400 hover:bg-gray-700 hover:text-white hover:scale-105')}`}
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
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 md:p-10 bg-[#0D0E22]">
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-5 text-white">
          <span className="bg-gradient-to-br from-[#7738B0] to-[#4A236D] p-3.5 rounded-2xl shadow-2xl border border-purple-500/30">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
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
                    <button onClick={async (e) => { 
                        e.stopPropagation(); 
                        if(window.confirm(`¿Eliminar "${title}" permanentemente?`)) { 
                          await eliminarEvento(event.id); 
                          if(onDeleteEvent) onDeleteEvent(event.id); 
                        } 
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
                      const conf = window.confirm(`¿Enviar correos masivos para "${title}"?`);
                      if (!conf) return;
                      setIsSendingEmails(true);
                      try {
                        const invitados = await getInvitadosByEvento(event.id);
                        if (!invitados?.length) return alert("No hay invitados.");
                        const result = await sendInvitationsToAll(event, invitados);
                        alert(`Éxito: ${result.success} | Fallidos: ${result.failed}`);
                      } catch (err) { alert(err.message); } finally { setIsSendingEmails(false); }
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
  );
};

export default EventList;