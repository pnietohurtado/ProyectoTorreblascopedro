import React, { useState, useRef } from 'react';
import Button from './Button';
import excelIcon from '../assets/excel-icon.png';
import {getAlumnoData, sendAlumnoData} from "../firebase/firebase"; 

const EventForm = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [guestList, setGuestList] = useState([]);
  const [showUploadArea, setShowUploadArea] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Procesar archivos arrastrados
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  // Click en el área de Excel
  const handleExcelClick = () => {
    setShowUploadArea(true);
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 100);
  };

  // Archivo seleccionado por input
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  // Leer y procesar el archivo CSV/Excel
  const processFile = (file) => {
    // Verificar extensión
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
        const data = parseCSV(text); // Variable donde se encuentran todos los datos 
        setGuestList(data);
        
        // =========== MUY IMPORTANTE ==============
        // Se trata de la función encargada de traer los datos de la base de datos de 
        // firestore.
        
        getAlumnoData();
        // =========================================

        // Mostrar confirmación
        alert(`${data.length} invitados cargados exitosamente desde "${file.name}"`);
        
        // Aquí cargamos todos los datos dentro del .csv que hemos pasado 
        if (data.length > 0) {
          for(let i = 0; i < data.length; i++){
            // Espacio para enviar todos los datos a la base de datos de firebase 

            sendAlumnoData(data[i].Escaneo, data[i].Nombre, data[i].QR, data[i].id_evento,title, address, date, time); 
            
            // ==================================================================

            console.log('Datos cargados:', data[i].Nombre);
          }
        }
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
    const delimiter = firstLine.includes(';') ? ';' : ','; // Se puede usar tanto el ";" como la "," para separar los campos 
    
    const headers = firstLine.split(delimiter).map(h => h.trim());
    
    // Procesar cada línea
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(delimiter);
      const obj = {};
      
      headers.forEach((header, index) => {
        obj[header] = values[index] ? values[index].trim() : '';
      });
      
      // Solo agregar si tiene algún dato
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

  const handleSubmit = () => {
    // Validate inputs roughly
    if (!title || !date) {
      alert('Por favor rellena al menos el título y la fecha.');
      return;
    }

    const dateObj = new Date(date + 'T' + (time || '00:00'));
    const formattedDate = dateObj.toLocaleDateString('es-ES') + ' - ' + (time ? time + 'h' : '');

    const newEvent = {
      title, // Nombre del evento
      address, // Dirección donde se va a hacer el evento
      date: formattedDate, // Fecha y hora 
      guestList: guestList.length > 0 ? guestList : null // Lista de los invitados 
    };

    onSave(newEvent);
  };

  return (
    <div className="flex-1 p-10 flex flex-col h-full overflow-hidden text-left">
      <div className="bg-[#0f0f1b] rounded-3xl max-w-5xl w-full mx-auto shadow-2xl flex flex-col overflow-hidden max-h-full border border-white/5">

        <div className="bg-[#7738B0] p-6 text-white min-h-[80px] flex items-center">
          <h2 className="text-xl font-bold ml-4">Detalles del evento</h2>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar bg-[#0D0E22] flex-1">
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

              {/* Área de carga de invitados - Versión mejorada */}
              <div className="col-span-2 mt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                />
                
                {showUploadArea ? (
                  // Área de drag & drop
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
                  // Archivo cargado
                  <div className="bg-[#1e1c30] p-4 rounded-xl border border-[#7738B0]/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10">
                          <img src={excelIcon} alt="Excel" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-300">{fileName}</span>
                          <span className="text-xs text-gray-500">
                            {guestList.length} invitados cargados
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowUploadArea(true)}
                          className="text-xs text-[#7738B0] hover:text-white px-3 py-1.5 rounded-lg hover:bg-[#7738B0]/10 transition-colors"
                        >
                          Cambiar
                        </button>
                        <button
                          onClick={handleRemoveFile}
                          className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                    
                    {/* Vista previa de datos */}
                    {guestList.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-xs text-gray-400 mb-2">Vista previa de datos:</p>
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
                                  {Object.values(guest).map((value, i) => (
                                    <td key={i} className="p-1.5 text-gray-300">{value}</td>
                                  ))}
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
                  // Botón inicial para cargar archivo
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
                        <span className="text-xs text-gray-500">Sube un archivo .xlsx o .csv</span>
                      </div>
                    </div>
                    <span className="text-gray-500 group-hover:text-white">Clic para cargar</span>
                  </div>
                )}
              </div>

              <div className="col-span-2 mt-8 flex flex-col gap-3">
                <Button 
                  onClick={handleSubmit} 
                  className={`w-full py-3.5 text-lg shadow-lg font-semibold tracking-wide ${
                    guestList.length > 0 
                      ? 'shadow-purple-900/30 bg-gradient-to-r from-[#7738B0] to-[#9a4ad4]' 
                      : 'shadow-purple-900/20'
                  }`}
                >
                  {guestList.length > 0 ? `Crear evento con ${guestList.length} invitados` : 'Crear evento'}
                </Button>
                <button onClick={onCancel} className="w-full py-3 text-gray-400 hover:text-white transition-colors text-sm font-medium hover:bg-white/5 rounded-xl">
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