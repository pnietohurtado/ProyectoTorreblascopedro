import React, { useState, useRef } from 'react';
import Button from './Button';
import AppModal from './AppModal';
import TheaterSectionEditor from './TheaterSectionEditor';
import excelIcon from '../assets/excel-icon.png';
import { crearEvento, cargarInvitadosCSV } from "../firebase/firebase";
import { INFANTA_LEONOR_SECTIONS, THEATER_TOTAL_CAPACITY } from "../utils/theaterSeating";

const EventForm = ({ onSave, onCancel }) => {
  // --- ESTADOS GENERALES ---
  const [activeTab, setActiveTab] = useState('general');
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);

  // --- LÓGICA DE ARCHIVOS (CSV) ---
  const [guestList, setGuestList] = useState([]);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  // --- CONFIGURACIÓN DE SALÓN (MAPA VISUAL) ---
  const [seatRows, setSeatRows] = useState(10);
  const [seatCols, setSeatCols] = useState(10);
  const [selectedSeats, setSelectedSeats] = useState({});
  const [hiddenSeats, setHiddenSeats] = useState({});
  const [seatEditMode, setSeatEditMode] = useState('select'); // 'select' o 'delete'
  const [seatSections] = useState(INFANTA_LEONOR_SECTIONS);
  const [reservedSeatsText, setReservedSeatsText] = useState('');
  const [reservedSeatIds, setReservedSeatIds] = useState([]);

  // --- CONFIGURACIÓN DEL MENSAJE ---
  const [modal, setModal] = useState(null);

  // --- FUNCIONES DE ASISTENCIA ---
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

  // --- LÓGICA DE CSV ---
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

  // --- SUBMIT FINAL ---
  const handleSubmit = async () => {
    if (!title || !date) {
      setModal({ title: 'Datos incompletos', body: 'Por favor rellena el título y la fecha.' });
      return;
    }
    setLoading(true);
    try {
      const result = await crearEvento({
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

      if (guestList.length > 0) {
        await cargarInvitadosCSV(result.eventoId, guestList);
      }
      onSave(result);
    } catch (error) {
      setModal({ title: 'Error al crear evento', body: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-10 flex flex-col h-full bg-[#0D0E22]">
      <div className="bg-[#0f0f1b] rounded-3xl max-w-6xl w-full mx-auto shadow-2xl flex flex-col overflow-hidden border border-white/5 h-full">
        
        {/* HEADER CON PESTAÑAS */}
        <div className="bg-gradient-to-r from-[#7738B0] to-[#592a85] pt-6 px-8 shrink-0">
          <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">Nuevo Evento</h2>
          <div className="flex gap-8">
            {['general', 'salon', 'mensaje'].map(tab => {
              const isDisabled = tab === 'mensaje';
              return (
              <button
                key={tab}
                onClick={() => !isDisabled && setActiveTab(tab)}
                disabled={isDisabled}
                className={`pb-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all ${
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

        {/* CONTENIDO SCROLLABLE */}
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar bg-[#0D0E22]">
          
          {/* PESTAÑA 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-2 gap-8 animate-fadeIn">
              <div className="col-span-2 flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Título</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="EJ. GALA DE GRADUACIÓN" className="bg-[#1e1b2e] p-5 rounded-2xl text-white outline-none border border-transparent focus:border-[#7738B0] transition-all" />
              </div>
              <div className="col-span-2 flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Ubicación</label>
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
              </div>
            </div>
          )}

          {/* PESTAÑA 2: SALÓN (MAPA) */}
          {activeTab === 'salon' && (
            <div className="flex flex-col gap-8 animate-fadeIn">
              <div className="hidden bg-black/20 p-6 rounded-3xl border border-white/5">
                <p className="text-[10px] text-purple-300 font-black uppercase tracking-[0.2em] mb-2">Plano aplicado</p>
                <h3 className="text-white text-2xl font-black">Nuevo Teatro Infanta Leonor</h3>
                <p className="text-gray-500 text-sm mt-2">La asignación se hará automáticamente por sectores. Para acceso adaptado, añade una columna TipoAcceso con el valor PMR en el CSV.</p>
              </div>

              <div className="hidden bg-black/20 p-6 rounded-3xl border border-white/5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[10px] text-purple-300 font-black uppercase tracking-[0.2em] mb-2">Butacas reservadas</p>
                    <h3 className="text-white text-xl font-black">Excluir de la asignación automática</h3>
                    <p className="text-gray-500 text-sm mt-2">Usa una línea por zona, fila y asiento. Puedes poner rangos.</p>
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

              <div className="hidden flex-wrap gap-4 bg-black/20 p-6 rounded-3xl border border-white/5 items-end">
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block">Filas</label>
                  <input type="number" value={seatRows} onChange={e => setSeatRows(parseInt(e.target.value) || 1)} className="w-full bg-[#1e1b2e] p-4 rounded-xl text-white outline-none" />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block">Columnas</label>
                  <input type="number" value={seatCols} onChange={e => setSeatCols(parseInt(e.target.value) || 1)} className="w-full bg-[#1e1b2e] p-4 rounded-xl text-white outline-none" />
                </div>
                <button onClick={() => setSeatEditMode(m => m === 'select' ? 'delete' : 'select')} className={`px-6 py-4 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all ${seatEditMode === 'delete' ? 'bg-red-500 text-white' : 'bg-purple-600 text-white'}`}>
                  {seatEditMode === 'delete' ? 'Modo: Borrar Pasillos' : 'Modo: Activar Butacas'}
                </button>
              </div>

              <div className="hidden flex-col items-center shrink-0 mb-4">
                <div className="w-3/4 h-2 bg-gradient-to-r from-transparent via-[#7738B0] to-transparent rounded-full shadow-[0_0_30px_#7738B0]"></div>
              </div>

              <div className="hidden bg-[#13111C] p-10 rounded-[3rem] border border-white/5 overflow-auto flex-col items-center min-h-[450px] relative shadow-inner">
                <div className="flex flex-col gap-3 min-w-max pb-10">
                  {Array.from({ length: seatRows }).map((_, r) => (
                    <div key={r} className="flex gap-3 items-center">
                      <span className="text-[11px] font-black text-gray-700 w-8 text-center">{getRowLabel(r)}</span>
                      <div className="flex gap-2">
                        {Array.from({ length: seatCols }).map((_, c) => {
                          const id = `${getRowLabel(r)}-${c + 1}`;
                          const isH = hiddenSeats[id];
                          const isS = selectedSeats[id];
                          return (
                            <button key={c} onClick={() => handleSeatClick(getRowLabel(r), c + 1)} className={`w-10 h-10 rounded-t-xl rounded-b-md text-[9px] font-black transition-all relative border ${isH ? (seatEditMode === 'delete' ? 'bg-red-900/20 border-dashed border-red-500 opacity-40' : 'opacity-0 pointer-events-none') : (isS ? 'bg-green-500 border-green-400 text-white shadow-lg scale-110' : 'bg-gray-800 border-white/5 text-gray-500 hover:scale-110')}`}>
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

        {/* FOOTER ACCIONES */}
        <div className="p-8 bg-[#0f0f1b] border-t border-white/5 flex gap-6 shrink-0">
          <button onClick={onCancel} className="flex-1 p-5 text-gray-500 font-black text-xs tracking-widest uppercase hover:text-white transition-colors">Cancelar</button>
          <Button onClick={handleSubmit} loading={loading} className="flex-[2] bg-gradient-to-r from-purple-600 to-purple-800 py-5 rounded-[1.5rem] font-black text-xs tracking-[0.2em] uppercase shadow-2xl shadow-purple-900/40 hover:scale-[1.02] active:scale-95 transition-all">
            Crear Evento
          </Button>
        </div>
      </div>
      <AppModal open={Boolean(modal)} title={modal?.title || ''} confirmLabel="Aceptar" onClose={() => setModal(null)}>
        <p>{modal?.body}</p>
      </AppModal>
    </div>
  );
};

export default EventForm;
