import Button from './Button';

const EventList = ({ onCreateClick }) => {
  return (
    <div className="flex-1 flex flex-col p-10">
      {/* Header de la sección */}
      <div className="flex flex-col items-start gap-6 mb-12">
        <div className="flex items-center gap-4 text-white">
          <span className="bg-white/10 p-2 rounded-lg">☰</span>
          <span className="text-2xl font-bold tracking-tight">Eventos</span>
        </div>

        <Button onClick={onCreateClick} variant="secondary" className="shadow-lg shadow-black/20 w-fit">
          <span className="text-lg font-bold">+</span> Nuevo evento
        </Button>
      </div>

      {/* Estado Vacío */}
      <div className="flex-1 flex items-center justify-center p-8">
        <h1 className="text-white/60 text-3xl md:text-5xl font-bold text-center tracking-tight leading-tight">
          Aún no hay eventos disponibles.
        </h1>
      </div>
    </div>
  );
};

export default EventList;