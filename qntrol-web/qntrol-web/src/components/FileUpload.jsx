import React, { useState, useRef } from 'react';

const FileUpload = ({ onFileUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef(null);

  // Manejar archivos arrastrados
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Procesar archivos
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  // Click en el área
  const handleClick = () => {
    inputRef.current.click();
  };

  // Archivo seleccionado por input
  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  // Leer y procesar el archivo CSV
  const processFile = (file) => {
    // Verificar que sea CSV
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Por favor sube un archivo CSV');
      return;
    }

    setFileName(file.name);
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target.result;
      const data = parseCSV(text);
      
      // Pasar los datos al componente padre
      if (onFileUpload) {
        onFileUpload(data);
      }
    };
    
    reader.readAsText(file);
  };

  // Parsear CSV básico
  const parseCSV = (text) => {
    const lines = text.split('\n');
    const result = [];
    
    // Suponiendo que la primera línea son los encabezados
    const headers = lines[0].split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const obj = {};
      const currentLine = lines[i].split(',');
      
      headers.forEach((header, index) => {
        obj[header] = currentLine[index] ? currentLine[index].trim() : '';
      });
      
      result.push(obj);
    }
    
    return result;
  };

  // Función para descargar plantilla
  const downloadTemplate = () => {
    const headers = ['NOMBRE Y APELLIDOS', 'EMAIL', 'EMAIL CORPORATIVO', 'ASISTENCIA', 'ACOMPAÑANTES'];
    const rows = [];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_invitados.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="file-upload-container" style={{ width: '100%', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Importar Invitados
        </span>
        <button
          onClick={downloadTemplate}
          style={{
            fontSize: '11px',
            fontWeight: '900',
            color: '#7738B0',
            background: 'rgba(119, 56, 176, 0.1)',
            border: '1px solid rgba(119, 56, 176, 0.3)',
            padding: '6px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(119, 56, 176, 0.2)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(119, 56, 176, 0.1)'}
        >
          📥 Descargar Plantilla
        </button>
      </div>

      <div
        className={`drag-drop-area ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{
          border: dragActive ? '2px dashed #7738B0' : '2px dashed rgba(255,255,255,0.1)',
          padding: '40px 20px',
          textAlign: 'center',
          borderRadius: '24px',
          cursor: 'pointer',
          backgroundColor: dragActive ? 'rgba(119, 56, 176, 0.05)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.3s ease',
          color: '#fff'
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        
        {fileName ? (
          <div>
            <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#888' }}>Archivo seleccionado:</p>
            <p style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '900', color: '#7738B0' }}>{fileName}</p>
            <p style={{ margin: '0', fontSize: '12px', color: '#555' }}>Haz clic o arrastra otro archivo para cambiar</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '32px', opacity: '0.5' }}>📄</span>
            <p style={{ margin: '0', fontWeight: 'bold', fontSize: '14px', color: '#aaa' }}>Arrastra y suelta tu archivo CSV aquí</p>
            <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>o haz clic para seleccionar</p>
          </div>
        )}
      </div>
      
      {fileName && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setFileName('');
            if (inputRef.current) inputRef.current.value = '';
          }}
          style={{
            marginTop: '15px',
            padding: '8px 20px',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            color: '#ff6b6b',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
        >
          Quitar archivo
        </button>
      )}
    </div>
  );
};

export default FileUpload;