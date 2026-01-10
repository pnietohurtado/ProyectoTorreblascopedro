import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Layout from './components/Layout';
import EventList from './components/EventList';
import EventForm from './components/EventForm';
import Login from './components/Login';
import Register from './components/Register';
import { AuthProvider, useAuth } from './contexts/authContext';
import './index.css';
import { useNavigate } from 'react-router-dom';



const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div>Cargando...</div>; 
  }
  
  return currentUser ? children : <Navigate to="/login" />;
};


const EventListWrapper = ({ events }) => {
  const navigate = useNavigate();
  return <EventList events={events} onCreateClick={() => navigate('/create')} />;
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

        {/* Rutas protegidas */}
        <Route path="/" element={
          <PrivateRoute>
            <Layout>
              <EventListWrapper events={events} />
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