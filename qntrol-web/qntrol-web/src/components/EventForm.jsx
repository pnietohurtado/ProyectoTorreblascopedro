import React, { useState, useRef } from 'react';
import Button from './Button';
import excelIcon from '../assets/excel-icon.png';
import { crearEvento, cargarInvitadosCSV } from "../firebase/firebase";

const EventForm = ({ onSave, onCancel }) => {
  // --- LÓGICA ORIGINAL INTACTA ---
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [guestList, setGuestList] = useState([]);
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // --- NUEVOS ESTADOS PARA PESTAÑAS Y SALÓN ---
  const [activeTab, setActiveTab] = useState('general');
  const [totalSeats, setTotalSeats] = useState('');
  const [rows, setRows] = useState('');
  const [columns, setColumns] = useState('');

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleExcelClick = () => {
    setShowUploadArea(true);
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 100);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file) => {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension)) {
      alert('Por favor sube un archivo CSV o Excel (.csv, .xlsx, .xls)');
      return;
    }

    setFileName(file.name);
    setShowUploadArea(false);

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const data = parseCSV(text);
        
        // Validar que el CSV tenga al menos el campo "Nombre"
        if (data.length > 0 && !data[0].Nombre && !data[0].nombre) {
          alert('El archivo CSV necesita al menos una columna "Nombre" o "nombre"');
          return;
        }
        
        setGuestList(data);
        
      } catch (error) {
        console.error('Error al procesar el archivo:', error);
        alert('Error al leer el archivo. Verifica el formato.');
      }
    };
    
    reader.onerror = () => {
      alert('Error al leer el archivo');
    };
    
    if (fileExtension === 'csv') {
      reader.readAsText(file, 'UTF-8');
    } 
  };

  const parseCSV = (text) => {
    const lines = text.split(/\r\n|\n|\r/);
    const result = [];
    
    if (lines.length === 0) return result;
    
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';
    
    const headers = firstLine.split(delimiter).map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(delimiter);
      const obj = {};
      
      headers.forEach((header, index) => {
        obj[header] = values[index] ? values[index].trim() : '';
      });
      
      if (Object.values(obj).some(value => value !== '')) {
        result.push(obj);
      }
    }
    
    return result;
  };

  const handleRemoveFile = () => {
    setFileName('');
    setGuestList([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    // Validate inputs
    if (!title || !date) {
      alert('Por favor rellena al menos el título y la fecha.');
      return;
    }

    setLoading(true);

    try {
      // 1. Crear el evento primero (AÑADIDOS LOS CAMPOS DEL SALÓN AQUÍ MANTENIENDO LO TUYO)
      const eventoCreado = await crearEvento({
        nombreEvento: title,
        direccion: address || "",
        fecha: date,
        hora: time || "18:00",
        descripcion: "Evento creado desde formulario",
        capacidadMaxima: totalSeats ? parseInt(totalSeats) : (guestList.length > 0 ? (guestList.length * 3) : 100),
        configuracionSalon: {
          filas: rows ? parseInt(rows) : null,
          columnas: columns ? parseInt(columns) : null
        }
      });

      console.log('✅ Evento creado:', eventoCreado.eventoId);

      let resultadosCarga = { exitosos: 0, fallidos: 0 };
      
      // 2. Si hay invitados en el CSV, cargarlos
      if (guestList.length > 0) {
        resultadosCarga = await cargarInvitadosCSV(eventoCreado.eventoId, guestList);
      }

      // 3. Preparar datos para el componente padre
      const dateObj = new Date(date + 'T' + (time || '00:00'));
      const formattedDate = dateObj.toLocaleDateString('es-ES') + ' - ' + (time ? time + 'h' : '');

      const newEvent = {
        title,
        address,
        date: formattedDate,
        eventId: eventoCreado.eventoId,
        guestList: guestList.length > 0 ? guestList : [],
        estadisticas: {
          totalInvitados: guestList.length,
          exitosos: resultadosCarga.exitosos,
          fallidos: resultadosCarga.fallidos
        }
      };

      // 4. Notificar al componente padre
      onSave(newEvent);

    } catch (error) {
      console.error('Error al crear evento:', error);
      console.error('Detalles del error:', error.message, error.stack);
      alert(`Error al crear evento: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- NUEVO DISEÑO ---
  return (
    <div className="flex-1 p-6 md:p-10 flex flex-col h-full overflow-hidden text-left">
      <div className="bg-[#0f0f1b] rounded-3xl max-w-5xl w-full mx-auto shadow-2xl flex flex-col overflow-hidden max-h-full border border-white/5">

        {/* Header con Pestañas (Diseño Mejorado) */}
        <div className="bg-gradient-to-r from-[#7738B0] to-[#592a85] pt-6 px-6 flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-white ml-2">Crear Evento</h2>
          <div className="flex gap-6">
            <button 
              onClick={() => setActiveTab('general')}
              className={`pb-3 px-2 text-sm font-semibold tracking-wide border-b-2 transition-all duration-300 ${activeTab === 'general' ? 'border-white text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
            >
              Información General
            </button>
            <button 
              onClick={() => setActiveTab('salon')}
              className={`pb-3 px-2 text-sm font-semibold tracking-wide border-b-2 transition-all duration-300 ${activeTab === 'salon' ? 'border-white text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
            >
              Configuración de Salón
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar bg-[#0D0E22] flex-1">
          <div className="flex flex-col md:flex-row gap-10">

            {/* Foto del evento (Se mantiene) */}
            <div className="flex flex-col gap-3">
              <label className="text-gray-300 text-sm font-medium ml-1">Foto del evento</label>
              <div className="w-40 h-40 border-2 border-dashed border-gray-600 rounded-2xl flex items-center justify-center cursor-pointer hover:border-[#7738B0] hover:bg-[#7738B0]/5 transition-all group bg-[#13111c]">
                <span className="text-5xl text-gray-500 group-hover:text-[#7738B0] transition-colors font-light relative top-[-2px]">+</span>
              </div>
            </div>

            <div className="flex-1">
              {/* PESTAÑA: INFORMACIÓN GENERAL */}
              {activeTab === 'general' ? (
                <div className="grid grid-cols-2 gap-6 animate-fadeIn">
                  <div className="col-span-2 flex flex-col gap-2">
                    <label className="text-gray-300 text-sm font-medium ml-1">Nombre</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="bg-[#1e1b2e] border border-transparent p-4 rounded-xl focus:border-[#7738B0] focus:ring-1 focus:ring-[#7738B0] outline-none transition-all placeholder:text-gray-600 text-white"
                      placeholder="Ej: Graduación..."
                    />
                  </div>

                  <div className="col-span-2 flex flex-col gap-2">
                    <label className="text-gray-300 text-sm font-medium ml-1">Dirección</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="bg-[#1e1b2e] border border-transparent p-4 rounded-xl focus:border-[#7738B0] focus:ring-1 focus:ring-[#7738B0] outline-none transition-all placeholder:text-gray-600 text-white"
                      placeholder="Ej: Calle Principal 123"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-gray-300 text-sm font-medium ml-1">Fecha</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-[#1e1b2e] border border-transparent p-4 rounded-xl text-gray-300 focus:border-[#7738B0] focus:ring-1 focus:ring-[#7738B0] outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-gray-300 text-sm font-medium ml-1">Hora</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="bg-[#1e1b2e] border border-transparent p-4 rounded-xl text-gray-300 focus:border-[#7738B0] focus:ring-1 focus:ring-[#7738B0] outline-none transition-all"
                    />
                  </div>

                  {/* Área de carga de invitados - TU LÓGICA INTACTA */}
                  <div className="col-span-2 mt-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                    />
                    
                    {showUploadArea ? (
                      <div
                        className={`bg-[#1e1c30] p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                          dragActive 
                            ? 'border-[#7738B0] bg-[#7738B0]/10' 
                            : 'border-gray-600 hover:border-[#7738B0]/50'
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12">
                            <img src={excelIcon} alt="Excel" className="w-full h-full object-contain opacity-80" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-300">
                              {dragActive ? 'Suelta el archivo aquí' : 'Arrastra tu archivo CSV/Excel aquí'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">o haz clic para seleccionar</p>
                            <p className="text-[10px] text-gray-600 mt-2">Formatos aceptados: .csv, .xlsx, .xls</p>
                          </div>
                        </div>
                      </div>
                    ) : fileName ? (
                      <div className="bg-[#1e1c30] p-4 rounded-xl border border-[#7738B0]/50 shadow-lg shadow-purple-900/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10">
                              <img src={excelIcon} alt="Excel" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-gray-300">{fileName}</span>
                              <span className="text-xs text-[#7738B0] font-medium">
                                {guestList.length} invitados cargados
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={() => setShowUploadArea(true)} className="text-xs text-white/60 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                              Cambiar
                            </button>
                            <button onClick={handleRemoveFile} className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                              Quitar
                            </button>
                          </div>
                        </div>
                        
                        {guestList.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/5">
                            <p className="text-xs text-gray-400 mb-2">Vista previa de datos:</p>
                            <div className="max-h-32 overflow-y-auto bg-black/40 rounded-lg p-2 custom-scrollbar">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-500 border-b border-white/10">
                                    {Object.keys(guestList[0]).map((key, i) => (
                                      <th key={i} className="text-left p-1.5 font-medium">{key}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {guestList.slice(0, 3).map((guest, idx) => (
                                    <tr key={idx} className="border-b border-white/5 last:border-0">
                                      {Object.values(guest).map((value, i) => (
                                        <td key={i} className="p-1.5 text-gray-300">{value}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {guestList.length > 3 && (
                                <p className="text-xs text-gray-500 text-center mt-2 italic">
                                  ... y {guestList.length - 3} filas más
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div 
                        className="bg-[#1e1b2e] p-4 rounded-xl flex items-center justify-between border border-transparent hover:border-[#7738B0]/50 transition-all cursor-pointer group pr-6"
                        onClick={handleExcelClick}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                            <img src={excelIcon} alt="Excel" className="w-full h-full object-contain" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">Lista de invitados</span>
                            <span className="text-xs text-gray-500">Sube un archivo .xlsx o .csv</span>
                          </div>
                        </div>
                        <span className="text-[#7738B0] group-hover:text-purple-400 text-sm font-medium transition-colors">Cargar archivo</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* PESTAÑA: CONFIGURACIÓN DE SALÓN */
                <div className="grid grid-cols-2 gap-6 animate-fadeIn">
                  <div className="col-span-2 bg-[#1e1b2e] p-5 rounded-xl border border-purple-500/20 mb-2">
                    <p className="text-sm text-purple-200">Configura la capacidad y distribución de los asientos para generar correctamente el mapa de este evento.</p>
                  </div>

                  <div className="col-span-2 flex flex-col gap-2">
                    <label className="text-gray-300 text-sm font-medium ml-1">Total de Butacas / Capacidad</label>
                    <input
                      type="number"
                      value={totalSeats}
                      onChange={(e) => setTotalSeats(e.target.value)}
                      className="bg-[#1e1b2e] border border-transparent p-4 rounded-xl focus:border-[#7738B0] focus:ring-1 focus:ring-[#7738B0] outline-none transition-all placeholder:text-gray-600 text-white"
                      placeholder="Ej: 150"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-gray-300 text-sm font-medium ml-1">Número de Filas</label>
                    <input
                      type="number"
                      value={rows}
                      onChange={(e) => setRows(e.target.value)}
                      className="bg-[#1e1b2e] border border-transparent p-4 rounded-xl text-gray-300 focus:border-[#7738B0] focus:ring-1 focus:ring-[#7738B0] outline-none transition-all"
                      placeholder="Ej: 10"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-gray-300 text-sm font-medium ml-1">Número de Columnas</label>
                    <input
                      type="number"
                      value={columns}
                      onChange={(e) => setColumns(e.target.value)}
                      className="bg-[#1e1b2e] border border-transparent p-4 rounded-xl text-gray-300 focus:border-[#7738B0] focus:ring-1 focus:ring-[#7738B0] outline-none transition-all"
                      placeholder="Ej: 15"
                    />
                  </div>
                </div>
              )}

              {/* Botones Fijos abajo */}
              <div className="mt-10 flex flex-col gap-3">
                <Button 
                  onClick={handleSubmit} 
                  className={`w-full py-4 text-lg font-bold tracking-wide transition-all ${
                    guestList.length > 0 
                      ? 'shadow-lg shadow-purple-900/40 bg-gradient-to-r from-[#7738B0] to-[#9a4ad4] hover:scale-[1.01]' 
                      : 'bg-[#7738B0] hover:bg-[#602c8c]'
                  }`}
                >
                  {loading ? 'Procesando...' : (guestList.length > 0 ? `Crear evento con ${guestList.length} invitados` : 'Crear evento')}
                </Button>
                <button onClick={onCancel} className="w-full py-3 text-gray-500 hover:text-white transition-colors text-sm font-medium hover:bg-white/5 rounded-xl">
                  Cancelar
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default EventForm;