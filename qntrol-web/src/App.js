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

  if (loading) {
    return <div>Cargando...</div>;
  }

  return currentUser ? children : <Navigate to="/login" />;
};


const EventListWrapper = ({ events, onEditEvent, onDeleteEvent }) => {
  const navigate = useNavigate();
  return <EventList events={events} onEditEvent={onEditEvent} onDeleteEvent={onDeleteEvent} onCreateClick={() => navigate('/create')} />;
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

  // Cargar eventos desde Firebase cuando hay un usuario logueado
  useEffect(() => {
    async function loadEvents() {
      if (currentUser) {
        setLoading(true);
        console.log("Loading events for user:", currentUser.email);
        const userEvents = await getEventosUsuario(currentUser.email);
        console.log("Events loaded in App.js:", userEvents);
        if (userEvents) {
          setEvents(userEvents);
        }
        setLoading(false);
      } else {
        setEvents([]);
      }
    }

    loadEvents();
  }, [currentUser]);

  const handleAddEvent = async (eventData) => {
    // Si el evento ya viene con ID (creado en Firebase), lo usamos
    // Si no, recargamos la lista para asegurar consistencia
    if (eventData.eventId) {
      const newEvent = {
        id: eventData.eventId,
        ...eventData
      };
      setEvents(prev => [...prev, newEvent]);
    } else {
      // Fallback por si acaso, recargar todo
      if (currentUser && currentUser.email) {
        const userEvents = await getEventosUsuario(currentUser.email);
        if (userEvents) setEvents(userEvents);
      }
    }
  };

  const handleUpdateEvent = async (updatedEvent) => {
    // Actualizar el estado local para reflejar los cambios inmediatamente
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === updatedEvent.id ? { ...event, ...updatedEvent } : event
      )
    );
  };

  const handleDeleteEvent = (eventId) => {
    // Actualizar el estado local eliminando el evento
    setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />


        {/* Rutas protegidas */}
        <Route path="/" element={
          <PrivateRoute>
            <Layout>
              <EventListWrapper events={events} onEditEvent={handleUpdateEvent} onDeleteEvent={handleDeleteEvent} />
            </Layout>
          </PrivateRoute>
        } />

        <Route path="/create" element={
          <PrivateRoute>
            <Layout>
              <EventFormWrapper onAddEvent={handleAddEvent} />
            </Layout>
          </PrivateRoute>
        } />

        {/* Redirección por defecto */}
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
