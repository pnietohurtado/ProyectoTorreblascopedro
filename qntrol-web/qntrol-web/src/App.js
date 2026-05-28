import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import EventList from './components/EventList';
import EventForm from './components/EventForm';
import Login from './components/Login';
import Register from './components/Register';

import { AuthProvider, useAuth } from './contexts/authContext';
import { getEventosUsuario } from './firebase/firebase';
import './index.css';
import { useNavigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0D0E22] flex items-center justify-center text-white font-black tracking-widest">CARGANDO...</div>;
  return currentUser ? children : <Navigate to="/login" />;
};

const EventListWrapper = ({ events, onEditEvent, onDeleteEvent }) => {
  const navigate = useNavigate();
  return (
    <EventList 
      events={events} 
      onEditEvent={onEditEvent} 
      onDeleteEvent={onDeleteEvent} 
      onCreateClick={() => navigate('/create')} 
    />
  );
};

const EventFormWrapper = ({ onAddEvent }) => {
  const navigate = useNavigate();
  const handleSave = (newEvent) => {
    onAddEvent(newEvent);
    navigate('/');
  };
  return <EventForm onSave={handleSave} onCancel={() => navigate('/')} />;
};

function AppContent() {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar eventos desde Firebase
  useEffect(() => {
    async function loadEvents() {
      if (currentUser?.email) {
        setLoading(true);
        try {
          const userEvents = await getEventosUsuario(currentUser.email);
          if (userEvents) setEvents(userEvents);
        } catch (error) {
          console.error("Error cargando eventos:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setEvents([]);
      }
    }
    loadEvents();
  }, [currentUser]);

  // Manejar nuevo evento (Creación)
  const handleAddEvent = (eventData) => {
    // Normalizamos el ID (Firebase suele devolverlo como id o eventoId)
    const newEvent = {
      ...eventData,
      id: eventData.id || eventData.eventoId,
      title: eventData.title || eventData.nombreEvento,
      date: eventData.date || eventData.fecha
    };
    
    setEvents(prev => [newEvent, ...prev]);
  };

  // Manejar actualización
  const handleUpdateEvent = (updatedEvent) => {
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === updatedEvent.id ? { ...event, ...updatedEvent } : event
      )
    );
  };

  // Manejar eliminación
  const handleDeleteEvent = (eventId) => {
    setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Ruta Principal: Lista de Eventos */}
        <Route path="/" element={
          <PrivateRoute>
            <Layout>
              <EventListWrapper 
                events={events} 
                onEditEvent={handleUpdateEvent} 
                onDeleteEvent={handleDeleteEvent} 
              />
            </Layout>
          </PrivateRoute>
        } />

        {/* Ruta: Creación de Eventos */}
        <Route path="/create" element={
          <PrivateRoute>
            <Layout>
              <EventFormWrapper onAddEvent={handleAddEvent} />
            </Layout>
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;