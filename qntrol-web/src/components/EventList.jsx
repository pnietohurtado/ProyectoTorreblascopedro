import React, { useState, useRef } from 'react';
import Button from './Button';
import excelIcon from '../assets/excel-icon.png';
import { getAlumnoData, sendAlumnoData, actualizarEvento, cargarInvitadosCSV, getInvitadosByEvento } from "../firebase/firebase";
import { sendInvitationsToAll } from "../services/emailService";

const EventList = ({ events, onEditEvent, onCreateClick }) => {
  // Si no hay eventos, usar array vacío
  const displayEvents = events || [];

  // Estados para el modo edición
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Estados del formulario
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [guestList, setGuestList] = useState([]);
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const fileInputRef = useRef(null);

  // Estados para la Pestaña de Asientos
  const [activeTab, setActiveTab] = useState('detalles'); // 'detalles' o 'asientos'
  const [seatRows, setSeatRows] = useState(1);
  const [seatCols, setSeatCols] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState({}); // Mapa de asientos seleccionados ej: {'A-1': true}
  const [hiddenSeats, setHiddenSeats] = useState({}); // Asientos eliminados del grid ej: {'A-1': true}
  const [seatEditMode, setSeatEditMode] = useState('select'); // 'select' para elegir, 'delete' para crear huecos



  // Función para iniciar la edición de un evento
  const handleEditClick = (event) => {
    setEditingEvent(event);
    setIsEditing(true);

    // Cargar los datos del evento en el formulario (Soporte para Firebase y Legacy)
    setTitle(event.title || event.nombreEvento || '');
    setAddress(event.address || event.direccion || '');

    // Parsear la fecha y hora
    if (event.fecha) {
      // Formato Firebase (YYYY-MM-DD)
      setDate(event.fecha);
      setTime(event.hora || '');
    } else if (event.date) {
      // Formato Legacy "DD/MM/YYYY - HH:mmh"
      const dateParts = event.date.split(' - ');
      if (dateParts[0]) {
        // Convertir DD/MM/YYYY a YYYY-MM-DD
        const [day, month, year] = dateParts[0].split('/');
        // Validación básica para evitar NaN
        if (day && month && year) {
          setDate(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        } else {
          setDate('');
        }
      }
      if (dateParts[1]) {
        // Extraer la hora (remover la 'h' al final)
        const timePart = dateParts[1].replace('h', '');
        setTime(timePart);
      }
    } else {
      setDate('');
      setTime('');
    }

    // Cargar lista de invitados si existe
    const currentGuestList = event.guestList || event.invitados || [];
    setGuestList(currentGuestList);
    setFileName(currentGuestList.length > 0 ? `Lista cargada (${currentGuestList.length} invitados)` : '');

    // Cargar datos de asientos
    const configuredRows = event.seatRows || 10;
    const configuredCols = event.seatCols || 10;
    setSeatRows(configuredRows);
    setSeatCols(configuredCols);
    setSelectedSeats(event.selectedSeats || {});
    setHiddenSeats(event.hiddenSeats || {});
    setActiveTab('detalles');
    setSeatEditMode('select');
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingEvent(null);
    resetForm();
  };

  // Resetear formulario
  const resetForm = () => {
    setTitle('');
    setAddress('');
    setDate('');
    setTime('');
    setFileName('');
    setGuestList([]);
    setShowUploadArea(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSeatRows(10);
    setSeatCols(10);
    setSelectedSeats({});
    setHiddenSeats({});
    setActiveTab('detalles');
    setSeatEditMode('select');
  };

  // Drag & Drop handlers
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

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const data = parseCSV(text);

        if (data.length > 0) {
          // Validar formato básico
          if (!data[0].Nombre && !data[0].nombre) {
            alert('El archivo CSV debe tener una columna "Nombre" o "nombre"');
            setFileName('');
            return;
          }
          setGuestList(data);
        } else {
          alert('El archivo parece estar vacío');
          setFileName('');
        }
      } catch (error) {
        console.error('Error al procesar el archivo:', error);
        alert('Error al leer el archivo. Verifica el formato.');
        setFileName('');
      }
    };

    reader.onerror = () => {
      alert('Error al leer el archivo');
    };

    if (fileExtension === 'csv') {
      reader.readAsText(file, 'UTF-8');
    } else {
      alert('Para archivos Excel (.xlsx, .xls) necesitarías instalar una librería adicional como "xlsx". Por ahora, usa CSV.');
      reader.readAsBinaryString(file);
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
    if (!title || !date) {
      alert('Por favor rellena al menos el título y la fecha.');
      return;
    }

    const dateObj = new Date(date + 'T' + (time || '00:00'));
    const formattedDate = dateObj.toLocaleDateString('es-ES') + ' - ' + (time ? time + 'h' : '');

    try {
      // 1. Actualizar datos del evento en Firebase
      if (editingEvent.id) {
        await actualizarEvento(editingEvent.id, {
          nombreEvento: title,
          direccion: address,
          fecha: date,
          hora: time,
          seatRows: seatRows,
          seatCols: seatCols,
          selectedSeats: selectedSeats,
          hiddenSeats: hiddenSeats
        });
      }

      // 2. Si hay nuevos invitados cargados desde CSV, subirlos
      if (guestList.length > 0 && Array.isArray(guestList) && guestList[0].hasOwnProperty('Nombre') || guestList[0]?.hasOwnProperty('nombre')) {
        // Comprobamos si es una lista nueva cargada (tiene estructura de CSV) y no la que ya venía de firebase
        // Si la lista viene de firebase ya tiene estructura de objeto con ID, etc.
        // Una forma simple es ver si estamos "sobreescribiendo" o "añadiendo".
        // En este diseño actual, processFile reemplaza setGuestList con el CSV.
        // Así que si hay datos en guestList y editingEvent.id existe, los subimos.

        const confirmar = window.confirm(`Vas a importar ${guestList.length} invitados al evento. ¿Continuar?`);
        if (confirmar && editingEvent.id) {
          await cargarInvitadosCSV(editingEvent.id, guestList);
          alert('Invitados importados correctamente');
        }
      }

      const updatedEvent = {
        ...editingEvent,
        title,
        address,
        date: formattedDate,
        // No actualizamos guestList aquí con el CSV crudo porque debería recargarse desde el backend
        // o mantenerse lo que había si no se subió nada nuevo.
        // Por simplicidad, pasamos lo que tenemos en memoria para feedback inmediato visual.
        guestList: guestList,
        seatRows: seatRows,
        seatCols: seatCols,
        selectedSeats: selectedSeats,
        hiddenSeats: hiddenSeats
      };

      // Llamar a la función de edición que viene del padre
      if (onEditEvent) {
        onEditEvent(updatedEvent);
      }

      // Salir del modo edición
      setIsEditing(false);
      setEditingEvent(null);
      resetForm();

    } catch (error) {
      console.error("Error al actualizar evento:", error);
      alert("Error al actualizar evento: " + error.message);
    }
  };

  // Helpers para los asientos
  const handleSeatClick = (rowLabel, colIndex) => {
    const seatId = `${rowLabel}-${colIndex}`;

    if (seatEditMode === 'delete') {
      // Modo eliminar: Alternar visibilidad de asiento
      setHiddenSeats(prev => {
        const newHidden = { ...prev };
        if (newHidden[seatId]) {
          delete newHidden[seatId];
        } else {
          newHidden[seatId] = true;
          // Si lo ocultamos, lo quitamos de los seleccionados también
          setSelectedSeats(prevSel => {
            const newSel = { ...prevSel };
            delete newSel[seatId];
            return newSel;
          });
        }
        return newHidden;
      });
    } else {
      // Modo selección normal
      if (hiddenSeats[seatId]) return; // No interactuar si está oculto

      setSelectedSeats(prev => {
        const newSeats = { ...prev };
        if (newSeats[seatId]) {
          delete newSeats[seatId];
        } else {
          newSeats[seatId] = true;
        }
        return newSeats;
      });
    }
  };

  const getRowLabel = (index) => {
    let label = '';
    let tempIndex = index;
    while (tempIndex >= 0) {
      label = String.fromCharCode(65 + (tempIndex % 26)) + label;
      tempIndex = Math.floor(tempIndex / 26) - 1;
    }
    return label;
  };

  // Si estamos en modo edición, mostrar el formulario
  if (isEditing) {
    return (
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden text-left bg-[#0f0f1b]">
        <div className="w-full h-full flex flex-col overflow-hidden">

          {/* Header del formulario de edición */}
          <div className="bg-[#7738B0] p-6 text-white min-h-[80px] flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={handleCancelEdit}
                className="mr-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-xl font-bold ml-2">Editando evento</h2>
            </div>
            <span className="text-sm opacity-90">
              {editingEvent?.title || 'Evento sin título'}
            </span>
          </div>

          {/* Navegación por Pestañas */}
          <div className="flex border-b border-white/10 bg-[#0D0E22] px-8 pt-4">
            <button
              onClick={() => setActiveTab('detalles')}
              className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'detalles' ? 'border-[#7738B0] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
              Detalles del Evento
            </button>
            <button
              onClick={() => setActiveTab('asientos')}
              className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'asientos' ? 'border-[#7738B0] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
              Diseño de Asientos
            </button>
          </div>

          <div className="p-8 overflow-y-auto custom-scrollbar bg-[#0D0E22] flex-1">
            {activeTab === 'detalles' ? (
              <div className="flex flex-col md:flex-row gap-10">

                {/* Foto del evento */}
                <div className="flex flex-col gap-3">
                  <label className="text-gray-300 text-sm font-medium ml-1">Foto del evento</label>
                  <div className="w-40 h-40 border-2 border-dashed border-gray-600 rounded-2xl flex items-center justify-center cursor-pointer hover:border-[#7738B0] hover:bg-white/5 transition-all group bg-[#13111c]">
                    <span className="text-5xl text-gray-500 group-hover:text-[#7738B0] transition-colors font-light relative top-[-2px]">+</span>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-6">
                  <div className="col-span-2 flex flex-col gap-2">
                    <label className="text-gray-300 text-sm font-medium ml-1">Nombre</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="bg-[#1e1b2e] border-none p-4 rounded-xl focus:ring-1 focus:ring-[#7738B0] outline-none transition-all placeholder:text-gray-600 text-white"
                      placeholder="Ej: Graduación..."
                    />
                  </div>

                  <div className="col-span-2 flex flex-col gap-2">
                    <label className="text-gray-300 text-sm font-medium ml-1">Dirección</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="bg-[#1e1b2e] border-none p-4 rounded-xl focus:ring-1 focus:ring-[#7738B0] outline-none transition-all placeholder:text-gray-600 text-white"
                      placeholder="Ej: Calle Principal 123"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-gray-300 text-sm font-medium ml-1">Fecha</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-[#1e1b2e] border-none p-4 rounded-xl text-gray-300 focus:ring-1 focus:ring-[#7738B0] outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-gray-300 text-sm font-medium ml-1">Hora</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="bg-[#1e1b2e] border-none p-4 rounded-xl text-gray-300 focus:ring-1 focus:ring-[#7738B0] outline-none transition-all"
                    />
                  </div>

                  {/* Área de carga de invitados */}
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
                        className={`bg-[#1e1c30] p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer ${dragActive
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
                    ) : fileName || guestList.length > 0 ? (
                      <div className="bg-[#1e1c30] p-4 rounded-xl border border-[#7738B0]/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10">
                              <img src={excelIcon} alt="Excel" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-gray-300">
                                {fileName || `Lista de invitados (${guestList.length})`}
                              </span>
                              <span className="text-xs text-gray-500">
                                {guestList.length} invitados {editingEvent?.guestList ? '(actualizados)' : 'cargados'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setShowUploadArea(true)}
                              className="text-xs text-[#7738B0] hover:text-white px-3 py-1.5 rounded-lg hover:bg-[#7738B0]/10 transition-colors"
                            >
                              {guestList.length > 0 ? 'Cambiar' : 'Cargar'}
                            </button>
                            {guestList.length > 0 && (
                              <button
                                onClick={handleRemoveFile}
                                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                              >
                                Quitar
                              </button>
                            )}
                          </div>
                        </div>

                        {guestList.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <p className="text-xs text-gray-400 mb-2">Vista previa de invitados:</p>
                            <div className="max-h-32 overflow-y-auto bg-black/30 rounded-lg p-2">
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
                                      {Object.values(guest).map((value, i) => {
                                        // Renderizar solo valores primitivos para evitar errores de objetos/arrays
                                        let displayValue = value;
                                        if (typeof value === 'object' && value !== null) {
                                          // Si es un objeto o array, mostrar un placeholder o simplificación
                                          if (value instanceof Date) {
                                            displayValue = value.toLocaleDateString();
                                          } else if (value.seconds) { // Timestamp de Firebase
                                            displayValue = new Date(value.seconds * 1000).toLocaleDateString();
                                          } else if (Array.isArray(value)) {
                                            displayValue = `[${value.length} items]`;
                                          } else {
                                            displayValue = '...';
                                          }
                                        }
                                        return <td key={i} className="p-1.5 text-gray-300">{displayValue}</td>;
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {guestList.length > 3 && (
                                <p className="text-xs text-gray-500 text-center mt-1">
                                  ... y {guestList.length - 3} filas más
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="bg-[#1e1c30] p-4 rounded-xl flex items-center justify-between border border-transparent hover:border-[#7738B0]/50 transition-all cursor-pointer group pr-6"
                        onClick={handleExcelClick}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 flex-shrink-0">
                            <img src={excelIcon} alt="Excel" className="w-full h-full object-contain" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-300 group-hover:text-white">Lista de invitados</span>
                            <span className="text-xs text-gray-500">
                              {editingEvent?.guestList ?
                                `Tienes ${editingEvent.guestList.length} invitados. Carga una nueva lista para actualizar` :
                                'Sube un archivo .xlsx o .csv'}
                            </span>
                          </div>
                        </div>
                        <span className="text-gray-500 group-hover:text-white">Clic para cargar</span>
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 mt-8 flex flex-col gap-3">
                    <Button
                      onClick={handleSubmit}
                      className={`w-full py-3.5 text-lg shadow-lg font-semibold tracking-wide ${guestList.length > 0
                        ? 'shadow-purple-900/30 bg-gradient-to-r from-[#7738B0] to-[#9a4ad4]'
                        : 'shadow-purple-900/20'
                        }`}
                    >
                      {guestList.length > editingEvent?.guestList?.length ?
                        `Actualizar evento con ${guestList.length} invitados` :
                        'Guardar cambios'}
                    </Button>
                    <button onClick={handleCancelEdit} className="w-full py-3 text-gray-400 hover:text-white transition-colors text-sm font-medium hover:bg-white/5 rounded-xl">
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // PESTAÑA: DISEÑO DE ASIENTOS
              <div className="flex flex-col gap-8 h-full">

                {/* Controles de Configuración de Asientos */}
                <div className="flex flex-col md:flex-row gap-4 bg-[#13111C] p-4 rounded-2xl border border-white/5 shrink-0">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-gray-300 text-xs font-medium ml-1">Número de Filas (Letras)</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={seatRows}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val > 0) setSeatRows(val);
                      }}
                      className="bg-[#1e1b2e] border-none p-2.5 rounded-xl focus:ring-1 focus:ring-[#7738B0] outline-none transition-all placeholder:text-gray-600 text-white text-sm"
                      disabled={seatEditMode === 'delete'}
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-gray-300 text-xs font-medium ml-1">Número de Columnas (Números)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={seatCols}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val > 0) setSeatCols(val);
                      }}
                      className="bg-[#1e1b2e] border-none p-2.5 rounded-xl focus:ring-1 focus:ring-[#7738B0] outline-none transition-all placeholder:text-gray-600 text-white text-sm"
                      disabled={seatEditMode === 'delete'}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    {/* Botón para Modo Edición vs Selección */}
                    <button
                      onClick={() => setSeatEditMode(prev => prev === 'select' ? 'delete' : 'select')}
                      className={`h-[40px] px-4 transition-colors rounded-xl text-xs font-medium flex items-center gap-2 border ${seatEditMode === 'delete'
                        ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                        : 'bg-[#2A263D] text-gray-300 border-[#3E3859] hover:bg-[#3B3654] hover:text-white'
                        }`}
                    >
                      {seatEditMode === 'delete' ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14"></path>
                          </svg>
                          <span>Modo Eliminar Activo</span>
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                          <span>Eliminar Huecos</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setSelectedSeats({})}
                      className="h-[40px] px-4 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors rounded-xl text-xs font-medium"
                    >
                      Limpiar Selección
                    </button>
                  </div>
                </div>

                {/* Grid Visual de Asientos */}
                <div className="flex-1 bg-[#13111C] p-4 rounded-2xl border border-white/5 overflow-auto flex flex-col items-center custom-scrollbar relative min-h-[400px]">

                  {/* Etiqueta de Pantalla/Escenario */}
                  <div className="w-full max-w-3xl mb-12 flex flex-col items-center">
                    <div className="w-3/4 h-2 bg-gradient-to-r from-transparent via-[#7738B0]/80 to-transparent rounded-full shadow-[0_0_15px_rgba(119,56,176,0.6)]"></div>
                    <span className="text-xs font-semibold text-gray-500 mt-2 tracking-[0.3em] uppercase">Escenario / Pantalla</span>
                  </div>

                  <div className="flex flex-col gap-3 min-w-max pb-10 px-4">
                    {Array.from({ length: seatRows }).map((_, rIndex) => {
                      const rowLabel = getRowLabel(rIndex);
                      return (
                        <div key={rIndex} className="flex items-center gap-3">
                          {/* Etiqueta Fila Izquierda */}
                          <div className="w-8 flex justify-center items-center text-xs font-bold text-gray-500 shrink-0">
                            {rowLabel}
                          </div>

                          {/* Asientos */}
                          <div className="flex gap-2">
                            {Array.from({ length: seatCols }).map((_, cIndex) => {
                              const seatNumber = cIndex + 1;
                              const seatId = `${rowLabel}-${seatNumber}`;
                              const isSelected = !!selectedSeats[seatId];
                              const isHidden = !!hiddenSeats[seatId];

                              if (isHidden) {
                                // Renderizar el hueco invisible (conservando el espacio)
                                return (
                                  <div
                                    key={cIndex}
                                    onClick={() => handleSeatClick(rowLabel, seatNumber)}
                                    className={`w-10 h-10 ${seatEditMode === 'delete' ? 'border-2 border-dashed border-red-500/30 bg-red-500/5 hover:bg-red-500/20 cursor-pointer rounded-lg' : 'opacity-0 pointer-events-none'}`}
                                    title={seatEditMode === 'delete' ? `Restaurar asiento ${seatId}` : ''}
                                  >
                                    {seatEditMode === 'delete' && (
                                      <div className="w-full h-full flex flex-col justify-center items-center opacity-50 text-red-400">
                                        <span className="text-lg leading-none">+</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <button
                                  key={cIndex}
                                  onClick={() => handleSeatClick(rowLabel, seatNumber)}
                                  className={`
                                    w-10 h-10 rounded-t-lg rounded-b-sm flex items-center justify-center text-[10px] font-bold transition-all relative group shadow-sm
                                    ${seatEditMode === 'delete'
                                      ? 'bg-[#2A263D] text-red-300 hover:bg-red-900/40 hover:text-red-400 border border-red-900/50'
                                      : isSelected
                                        ? 'bg-[#10B981] text-white shadow-[0_0_10px_rgba(16,185,129,0.4)] border border-[#059669]'
                                        : 'bg-[#2A263D] text-gray-400 hover:bg-[#3B3654] hover:text-white border border-[#3E3859]'
                                    }
                                  `}
                                  title={seatEditMode === 'delete' ? `Ocultar asiento ${seatId}` : `Asiento ${seatId}`}
                                >
                                  {/* Respaldo decorativo visual */}
                                  <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-lg opacity-40 ${isSelected ? 'bg-white' : seatEditMode === 'delete' ? 'bg-red-500' : 'bg-black'}`}></div>

                                  {seatEditMode === 'delete' ? (
                                    <div className="mt-1">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                      </svg>
                                    </div>
                                  ) : (
                                    <div className="mt-1 flex flex-col items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                        {/* Cabeza */}
                                        <circle cx="12" cy="7" r="3.5" />
                                        {/* Cuerpo Sentado */}
                                        <path d="M15 13H9C7.89543 13 7 13.8954 7 15V21H9V16H15V21H17V15C17 13.8954 16.1046 13 15 13Z" />
                                        {/* Reposabrazos */}
                                        <path d="M5 13H6V17H5V13Z" />
                                        <path d="M18 13H19V17H18V13Z" />
                                        {/* Línea Asiento Base */}
                                        <path d="M5 18H19C19.5523 18 20 18.4477 20 19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19C4 18.4477 4.44772 18 5 18Z" />
                                      </svg>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Etiqueta Fila Derecha */}
                          <div className="w-8 flex justify-center items-center text-xs font-bold text-gray-500 shrink-0">
                            {rowLabel}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center text-sm text-gray-400 mb-2">
                    <span>{Object.keys(selectedSeats).length} asientos seleccionados de {seatRows * seatCols - Object.keys(hiddenSeats).length} posibles.</span>
                    <div className="flex gap-4">
                      {seatEditMode === 'delete' ? (
                        <>
                          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#2A263D] border border-red-900/50 flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg></div> Clic para ocultar</div>
                          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border-2 border-dashed border-red-500/30 bg-red-500/5"></div> Oculto (Clic para restaurar)</div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#2A263D] border border-[#3E3859]"></div> Disponible</div>
                          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#10B981] border border-[#059669]"></div> Seleccionado</div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleCancelEdit} className="w-full py-3.5 text-gray-400 hover:text-white transition-colors text-sm font-medium bg-white/5 hover:bg-white/10 rounded-xl">
                      Cancelar
                    </button>
                    <Button
                      onClick={handleSubmit}
                      className="w-full py-3.5 text-lg shadow-lg shadow-purple-900/20 font-semibold tracking-wide bg-gradient-to-r from-[#7738B0] to-[#9a4ad4]"
                    >
                      Guardar configuración
                    </Button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Si NO estamos en modo edición, mostrar la lista normal
  return (
    <div className="flex-1 flex flex-col p-10">
      {/* Header de la sección */}
      <div className="flex items-center gap-4 text-white mb-8">
        <span className="bg-white/10 p-2 rounded-lg">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </span>
        <span className="text-2xl font-bold tracking-tight">Eventos</span>
      </div>


      {/* Botón para crear nuevo evento */}
      <Button onClick={onCreateClick} variant="secondary" className="shadow-lg shadow-black/20 w-fit mb-8">
        <span className="text-lg font-bold">+</span> Nuevo evento
      </Button>
      {/* Events List */}
      {displayEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {displayEvents.map((event) => {
            // Normalizar datos para visualización (Firebase vs Local)
            const eventTitle = event.title || event.nombreEvento || 'Evento sin nombre';
            const eventDate = event.date || (event.fecha ? `${event.fecha}${event.hora ? ' - ' + event.hora : ''}` : 'Fecha no definida');
            const eventGuestList = event.guestList || (event.invitados ? event.invitados : []);
            const numInvitados = eventGuestList.length || event.totalInvitados || 0;

            return (
              <div
                key={event.id || event.title}
                className="bg-[#2B2738] rounded-xl p-6 flex flex-col gap-4 shadow-lg hover:bg-[#342F42] transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  {/* Event Icon Placeholder */}
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-[#1E1B29] font-bold text-xl shrink-0">
                    <span className="text-[#3B1C57] text-2xl">
                      {eventTitle.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditClick(event)}
                      className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                      title="Editar"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                      </svg>
                    </button>

                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (isSendingEmails) return;

                        const confirmar = window.confirm(`¿Estás seguro de que quieres enviar correos a todos los invitados de "${eventTitle}"?`);
                        if (!confirmar) return;

                        setIsSendingEmails(true);
                        try {
                          const invitados = await getInvitadosByEvento(event.id);

                          if (!invitados || invitados.length === 0) {
                            alert("No hay invitados registrados en este evento.");
                            setIsSendingEmails(false);
                            return;
                          }

                          const result = await sendInvitationsToAll(event, invitados);
                          alert(`Proceso finalizado.\nEnviados con éxito: ${result.success}\nFallidos: ${result.failed}`);

                          if (result.failed > 0) {
                            console.error("Errores en el envío:", result.errors);
                          }
                        } catch (error) {
                          console.error("Error al procesar el envío masivo:", error);
                          alert("Error al enviar las invitaciones: " + error.message);
                        } finally {
                          setIsSendingEmails(false);
                        }
                      }}
                      disabled={isSendingEmails}
                      className={`${isSendingEmails ? 'opacity-20' : 'text-white/60 hover:text-white'} transition-colors p-2 hover:bg-white/10 rounded-lg`}
                      title={isSendingEmails ? "Enviando..." : "Enviar Invitaciones"}
                    >
                      {isSendingEmails ? (
                        <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"></line>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Event Info */}
                <div className="flex flex-col gap-1 mt-1">
                  <h3 className="text-white font-bold text-lg line-clamp-1">{eventTitle}</h3>
                  <span className="text-white/60 text-sm line-clamp-1">{eventDate}</span>
                  {numInvitados > 0 ? (
                    <span className="text-xs text-[#7738B0] font-medium mt-2 bg-[#7738B0]/10 w-fit px-2.5 py-1 rounded-md">
                      {numInvitados} invitados
                    </span>
                  ) : (
                    <span className="text-xs text-white/30 font-medium mt-2 bg-white/5 w-fit px-2.5 py-1 rounded-md">
                      0 invitados
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 mt-10">
          <h1 className="text-white/60 text-3xl md:text-5xl font-bold text-center tracking-tight leading-tight">
            Aún no hay eventos disponibles.
          </h1>
        </div>
      )}

    </div>
  );
};

export default EventList;