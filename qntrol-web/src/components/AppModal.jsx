import React from 'react';

const AppModal = ({
  open,
  title,
  children,
  confirmLabel = 'Aceptar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  onConfirm,
  onClose,
  showCancel = false,
  loading = false,
  size = 'default',
}) => {
  if (!open) return null;

  const confirmClass = variant === 'danger'
    ? 'bg-red-500 hover:bg-red-600 shadow-red-950/30'
    : 'bg-[#7738B0] hover:bg-[#602c8c] shadow-purple-950/40';

  const sizeClass = size === 'wide'
    ? 'max-w-5xl'
    : 'max-w-lg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className={`w-full ${sizeClass} max-h-[92vh] overflow-hidden rounded-[2rem] border border-white/10 bg-[#151326] p-7 text-white shadow-2xl shadow-black/60 flex flex-col`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-300">Qntrol</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            X
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto text-sm leading-6 text-gray-300">{children}</div>

        <div className="mt-7 flex justify-end gap-3">
          {showCancel && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-gray-300 transition hover:bg-white/5 hover:text-white"
              disabled={loading}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm || onClose}
            className={`rounded-xl px-5 py-3 text-sm font-black text-white shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}
            disabled={loading}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppModal;
