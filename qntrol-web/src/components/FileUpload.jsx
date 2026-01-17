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

  return (
    <div className="file-upload-container">
      <div
        className={`drag-drop-area ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{
          border: dragActive ? '2px dashed #4CAF50' : '2px dashed #ccc',
          padding: '40px 20px',
          textAlign: 'center',
          borderRadius: '8px',
          cursor: 'pointer',
          backgroundColor: dragActive ? '#f0f8ff' : '#f9f9f9',
          transition: 'all 0.3s ease'
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
            <p>Archivo seleccionado:</p>
            <p><strong>{fileName}</strong></p>
            <p>Haz clic o arrastra otro archivo para cambiar</p>
          </div>
        ) : (
          <div>
            <p>📁 Arrastra y suelta tu archivo CSV aquí</p>
            <p>o</p>
            <p>Haz clic para seleccionar un archivo</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
              Solo archivos CSV (.csv)
            </p>
          </div>
        )}
      </div>
      
      {fileName && (
        <button
          onClick={() => {
            setFileName('');
            if (inputRef.current) inputRef.current.value = '';
          }}
          style={{
            marginTop: '10px',
            padding: '5px 15px',
            backgroundColor: '#ff6b6b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Quitar archivo
        </button>
      )}
    </div>
  );
};

export default FileUpload;