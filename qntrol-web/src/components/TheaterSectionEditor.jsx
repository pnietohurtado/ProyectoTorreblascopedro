import React, { useMemo, useState } from 'react';
import AppModal from './AppModal';
import { getSeatId } from '../utils/theaterSeating';

const TheaterSectionEditor = ({ sections, reservedSeatIds = [], onReservedSeatIdsChange }) => {
  const [activeSection, setActiveSection] = useState(null);
  const reservedSet = useMemo(() => new Set(reservedSeatIds), [reservedSeatIds]);

  const toggleSeat = (section, row, number) => {
    const seatId = getSeatId(section.id, row, number);
    const next = new Set(reservedSeatIds);
    next.has(seatId) ? next.delete(seatId) : next.add(seatId);
    onReservedSeatIdsChange(Array.from(next));
  };

  const getReservedCount = (section) => {
    let count = 0;
    for (let row = 1; row <= section.rows; row += 1) {
      for (let number = section.seatStart; number <= section.seatEnd; number += 1) {
        if (reservedSet.has(getSeatId(section.id, row, number))) count += 1;
      }
    }
    return count;
  };

  const sortByDisplayOrder = (items) => (
    [...items].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
  );

  const renderSectionCard = (section) => (
    <button
      key={section.id}
      type="button"
      onClick={() => setActiveSection(section)}
      className="rounded-2xl border border-white/10 p-4 text-left transition-all hover:-translate-y-1 hover:border-white/30 hover:shadow-2xl"
      style={{ backgroundColor: `${section.color}22` }}
    >
      <div className="flex justify-between items-start gap-4">
        <div>
          <p className="text-white font-black text-sm">{section.name}</p>
          <p className="text-white/45 text-[10px] mt-1 uppercase tracking-widest">{section.capacity} butacas</p>
        </div>
        <span className="rounded-full px-3 py-1 text-[10px] font-black text-white" style={{ backgroundColor: section.color }}>
          Sector {section.sector}
        </span>
      </div>
      {section.id === 'patio-c' && (
        <div className="mt-4 rounded-xl bg-yellow-400/20 border border-yellow-300/30 px-3 py-2 text-yellow-100 text-[11px] font-bold">
          Zona discapacitados integrada en este sector
        </div>
      )}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="grid grid-cols-10 gap-1 flex-1">
          {Array.from({ length: Math.min(section.capacity, section.level === 'Anfiteatro' ? 70 : 100) }).map((_, index) => (
            <span key={index} className="h-2 rounded-sm" style={{ backgroundColor: section.color }} />
          ))}
        </div>
        <span className="shrink-0 rounded-xl bg-black/25 px-3 py-2 text-[10px] font-black text-white/70">
          {getReservedCount(section)} reserv.
        </span>
      </div>
    </button>
  );

  return (
    <>
      <div className="bg-[#13111C] p-8 rounded-[3rem] border border-white/5 overflow-auto shadow-inner">
        <div className="min-w-[760px] flex flex-col gap-8">
          <div className="rounded-2xl border border-purple-400/20 bg-purple-500/10 px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-200">Reserva manual de butacas</p>
            <p className="mt-2 text-sm font-medium text-gray-300">
              Pulsa sobre un sector para abrir sus filas. Dentro, marca las butacas que ya estén reservadas; aparecerán en rojo y no se usarán en la asignación automática.
            </p>
          </div>

          <div>
            <p className="text-center text-white/70 text-[11px] font-black uppercase tracking-[0.3em] mb-4">Anfiteatro</p>
            <div className="grid grid-cols-3 gap-6">
              {sortByDisplayOrder(sections.filter(section => section.level === 'Anfiteatro')).map(renderSectionCard)}
            </div>
          </div>

          <div>
            <p className="text-center text-white/70 text-[11px] font-black uppercase tracking-[0.3em] mb-4">Patio de butacas</p>
            <div className="grid grid-cols-3 gap-6">
              {sortByDisplayOrder(sections.filter(section => section.level === 'Patio de Butacas' && section.type !== 'pmr')).map(renderSectionCard)}
            </div>
          </div>

          <div className="h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white/80 text-[11px] font-black uppercase tracking-[0.3em]">
            Escenario
          </div>
        </div>
      </div>

      <AppModal
        open={Boolean(activeSection)}
        title={activeSection ? activeSection.name : ''}
        confirmLabel="Cerrar"
        size="wide"
        onClose={() => setActiveSection(null)}
      >
        {activeSection && (
          <div className="space-y-5">
            <p className="text-sm text-gray-300">
              Marca las butacas reservadas para que no entren en la asignación automática.
            </p>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-5 text-gray-300">
              <p><strong className="text-white">Cómo hacerlo:</strong> haz clic en una butaca para reservarla. Si te equivocas, vuelve a pulsarla para dejarla disponible.</p>
              <p className="mt-1">Las butacas rojas quedan bloqueadas para la asignación automática.</p>
            </div>
            <div className="max-h-[58vh] overflow-y-auto rounded-2xl bg-[#0D0E22] p-5 border border-white/10">
              <div className="flex flex-col gap-3">
                {Array.from({ length: activeSection.rows }).map((_, rowIndex) => {
                  const row = rowIndex + 1;
                  return (
                    <div key={row} className="grid grid-cols-[64px_1fr] items-center gap-3">
                      <span className="text-right text-[10px] font-black text-gray-500">Fila {row}</span>
                      <div
                        className="grid gap-2"
                        style={{ gridTemplateColumns: `repeat(${activeSection.seatEnd - activeSection.seatStart + 1}, minmax(34px, 1fr))` }}
                      >
                        {Array.from({ length: activeSection.seatEnd - activeSection.seatStart + 1 }).map((__, seatIndex) => {
                          const number = activeSection.seatEnd - seatIndex;
                          const seatId = getSeatId(activeSection.id, row, number);
                          const isReserved = reservedSet.has(seatId);
                          return (
                            <button
                              key={seatId}
                              type="button"
                              onClick={() => toggleSeat(activeSection, row, number)}
                              className={`h-10 min-w-0 rounded-t-xl rounded-b-md text-[9px] font-black border transition-all ${
                                isReserved
                                  ? 'bg-red-500 border-red-300 text-white shadow-[0_0_12px_rgba(239,68,68,0.45)]'
                                  : 'bg-gray-800 border-white/5 text-gray-400 hover:bg-gray-700 hover:text-white'
                              }`}
                              title={isReserved ? 'Reservado' : 'Disponible para asignación'}
                            >
                              {number}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
              <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Reservadas en esta sección</span>
              <span className="text-white font-black">{getReservedCount(activeSection)}</span>
            </div>
          </div>
        )}
      </AppModal>
    </>
  );
};

export default TheaterSectionEditor;
