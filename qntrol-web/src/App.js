import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
// Importamos los componentes desde la carpeta components
import Layout from './components/Layout';
import EventList from './components/EventList';
import EventForm from './components/EventForm';
import Login from './components/Login';
import Register from './components/Register';
import './index.css';

// Wrapper para EventList que maneja la navegación
const EventListWrapper = ({ events }) => {
  const navigate = useNavigate();
  return <EventList events={events} onCreateClick={() => navigate('/create')} />;
};

// Wrapper para EventForm que maneja la navegación
const EventFormWrapper = ({ onAddEvent }) => {
  const navigate = useNavigate();
  const handleSave = (newEvent) => {
    onAddEvent(newEvent);
    navigate('/');
  };
  return <EventForm onSave={handleSave} onCancel={() => navigate('/')} />;
};

function App() {
  const [events, setEvents] = useState([]);

  const handleAddEvent = (eventData) => {
    const newEvent = {
      id: Date.now(),
      ...eventData
    };
    setEvents([...events, newEvent]);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rutas protegidas (por ahora sin autenticación real) dentro del Layout */}
        <Route path="/" element={
          <Layout>
            <EventListWrapper events={events} />
          </Layout>
        } />

        <Route path="/create" element={
          <Layout>
            <EventFormWrapper onAddEvent={handleAddEvent} />
          </Layout>
        } />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
