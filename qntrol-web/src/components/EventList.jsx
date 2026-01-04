import Button from './Button';

const EventList = ({ events, onCreateClick }) => {
  // If undefined/null, default to empty array
  const displayEvents = events || [];

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

      {/* Events List */}
      {displayEvents.length > 0 && (
        <div className="flex flex-col gap-4 mb-8">
          {displayEvents.map((event) => (
            <div
              key={event.id}
              className="bg-[#2B2738] rounded-xl p-6 flex items-center justify-between shadow-lg hover:bg-[#342F42] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-6">
                {/* Event Icon Placeholder */}
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-[#1E1B29] font-bold text-xl">
                  <span className="text-[#3B1C57] text-2xl">
                    {event.title ? event.title.charAt(0).toUpperCase() : 'E'}
                  </span>
                </div>

                {/* Event Info */}
                <div className="flex flex-col gap-1">
                  <h3 className="text-white font-bold text-lg">{event.title}</h3>
                  <span className="text-white/60 text-sm">{event.date}</span>
                </div>
              </div>

              {/* Edit Action */}
              <button className="text-white/40 hover:text-white transition-colors p-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <Button onClick={onCreateClick} variant="secondary" className="shadow-lg shadow-black/20 w-fit mb-8">
        <span className="text-lg font-bold">+</span> Nuevo evento
      </Button>

      {/* Empty State */}
      {displayEvents.length === 0 && (
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