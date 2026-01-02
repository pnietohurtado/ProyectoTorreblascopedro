import React from 'react';
import Button from './Button';
import excelIcon from '../assets/excel-icon.png';

const EventForm = ({ onCancel }) => {
  return (
    <div className="flex-1 p-10 flex flex-col h-full overflow-hidden text-left">
      <div className="bg-[#0f0f1b] rounded-3xl max-w-5xl w-full mx-auto shadow-2xl flex flex-col overflow-hidden max-h-full border border-white/5">

        <div className="bg-[#7738B0] p-6 text-white min-h-[80px] flex items-center">
          <h2 className="text-xl font-bold ml-4">Detalles del evento</h2>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar bg-[#0D0E22] flex-1">
          <div className="flex flex-col md:flex-row gap-10">

            {/* Foto del evento */}
            <div className="flex flex-col gap-3">
              <label className="text-gray-300 text-sm font-medium ml-1">Foto del evento</label>
              <div className="w-40 h-40 border-2 border-dashed border-gray-600 rounded-2xl flex items-center justify-center cursor-pointer hover:border-[#7738B0] hover:bg-white/5 transition-all group bg-[#13111c]">
                <span className="text-5xl text-gray-500 group-hover:text-[#7738B0] transition-colors font-light relative top-[-2px]">+</span>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-6">
              <div className="col-span-2 flex flex-col gap-2">
                <label className="text-gray-300 text-sm font-medium ml-1">Nombre</label>
                <input type="text" className="bg-[#1e1b2e] border-none p-4 rounded-xl focus:ring-1 focus:ring-[#7738B0] outline-none transition-all placeholder:text-gray-600 text-white" placeholder="" />
              </div>

              <div className="col-span-2 flex flex-col gap-2">
                <label className="text-gray-300 text-sm font-medium ml-1">Dirección</label>
                <input type="text" className="bg-[#1e1b2e] border-none p-4 rounded-xl focus:ring-1 focus:ring-[#7738B0] outline-none transition-all placeholder:text-gray-600 text-white" placeholder="" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-gray-300 text-sm font-medium ml-1">Fecha</label>
                <input type="date" className="bg-[#1e1b2e] border-none p-4 rounded-xl text-gray-300 focus:ring-1 focus:ring-[#7738B0] outline-none transition-all" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-gray-300 text-sm font-medium ml-1">Hora</label>
                <input type="time" className="bg-[#1e1b2e] border-none p-4 rounded-xl text-gray-300 focus:ring-1 focus:ring-[#7738B0] outline-none transition-all" />
              </div>

              <div className="col-span-2 mt-2">
                <div className="bg-[#1e1c30] p-3 rounded-xl flex items-center justify-between border border-transparent hover:border-[#7738B0]/50 transition-all cursor-pointer group pr-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex-shrink-0">
                      <img src={excelIcon} alt="Excel" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-gray-300 group-hover:text-white">Lista de invitados (Opcional)</span>
                      <span className="text-[10px] text-gray-500">Sube un archivo .xlsx o .csv</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-2 mt-8 flex flex-col gap-3">
                <Button className="w-full py-3.5 text-lg shadow-lg shadow-purple-900/20 font-semibold tracking-wide">Crear evento</Button>
                <button onClick={onCancel} className="w-full py-3 text-gray-400 hover:text-white transition-colors text-sm font-medium hover:bg-white/5 rounded-xl">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventForm;
