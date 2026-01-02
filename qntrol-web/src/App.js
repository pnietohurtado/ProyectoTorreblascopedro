import './App.css';
import { useState } from 'react';
// Importamos los componentes desde la carpeta components
import Layout from './components/Layout';
import EventList from './components/EventList';
import EventForm from './components/EventForm';
import './index.css';

function App() {
  // Estado para controlar qué pestaña vemos
  const [view, setView] = useState('list');

  return (
    <Layout>
      {/* No hace falta poner <Sidebar /> aquí porque 
          el Layout ya lo contiene internamente.
      */}
      {view === 'list' ? (
        <EventList onCreateClick={() => setView('form')} />
      ) : (
        <EventForm onCancel={() => setView('list')} />
      )}
    </Layout>
  );
}

export default App;
