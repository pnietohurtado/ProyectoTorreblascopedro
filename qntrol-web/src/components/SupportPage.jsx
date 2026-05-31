import { useState } from 'react';

const faqs = [
  {
    question: '¿Cómo cargo invitados?',
    answer: 'Desde la creación o edición de un evento puedes subir un archivo CSV con la lista de personas invitadas. Al cargarlo, Qntrol detecta los invitados y los asocia al evento.',
  },
  {
    question: '¿Cómo envío invitaciones?',
    answer: 'En la lista de eventos, pulsa el botón de envío del evento correspondiente. Qntrol enviará las invitaciones a los invitados que tengan correo registrado.',
  },
  {
    question: '¿Puedo cambiar asientos?',
    answer: 'Sí. En la edición del evento puedes ajustar el mapa del salón, activar butacas, marcar pasillos y guardar los cambios.',
  },
  {
    question: '¿Qué columnas debe tener el CSV?',
    answer: 'Las columnas recomendadas son Nombre, Email, Telefono, numInvitados y Asiento. Nombre y Email son las más importantes para crear invitados y enviar invitaciones.',
  },
  {
    question: '¿Puedo reenviar invitaciones?',
    answer: 'Sí. Puedes volver a enviar invitaciones desde el evento si necesitas recordar el acceso o corregir información enviada anteriormente.',
  },
  {
    question: '¿Cómo elimino un evento?',
    answer: 'En la lista de eventos, usa el icono de papelera del evento. Qntrol pedirá confirmación antes de eliminarlo de forma permanente.',
  },
  {
    question: '¿Qué hago si he cargado mal un invitado?',
    answer: 'Puedes editar el evento o volver a cargar una lista corregida. Antes de enviar invitaciones, revisa que el número de invitados detectados sea el esperado.',
  },
];

const quickSteps = [
  { title: 'Crear evento', text: 'Define nombre, fecha, ubicación y mapa de salón.' },
  { title: 'Cargar invitados', text: 'Sube el CSV y revisa que el conteo sea correcto.' },
  { title: 'Enviar invitaciones', text: 'Lanza el envío desde la tarjeta del evento cuando todo esté revisado.' },
];

const SupportPage = () => {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="flex-1 flex flex-col p-6 md:p-10 bg-[#0D0E22] overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl w-full">
        <div className="flex items-center gap-5 text-white mb-10">
          <span className="bg-gradient-to-br from-[#7738B0] to-[#4A236D] p-3.5 rounded-2xl shadow-2xl shadow-purple-900/50 border border-purple-500/30 text-2xl font-black">
            ?
          </span>
          <div>
            <h1 className="text-4xl font-black tracking-tight leading-none">Soporte</h1>
            <p className="text-gray-500 text-sm mt-1 font-medium">Ayuda rápida para trabajar con eventos, invitados y correos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8 items-start">
          <div className="space-y-8">
            <section className="rounded-[2rem] border border-white/5 bg-[#2B2738] p-7 shadow-2xl">
              <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-300">Preguntas frecuentes</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Resuelve dudas habituales</h2>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {faqs.map((faq, index) => {
                  const isOpen = openIndex === index;
                  return (
                    <div key={faq.question} className="overflow-hidden rounded-2xl border border-white/10 bg-[#1e1b2e]">
                      <button
                        type="button"
                        onClick={() => setOpenIndex(isOpen ? -1 : index)}
                        className="flex w-full items-center justify-between gap-4 p-5 text-left text-white transition hover:bg-white/[0.03]"
                      >
                        <span className="font-black">{faq.question}</span>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-xl font-black text-purple-300">
                          {isOpen ? '-' : '+'}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="border-t border-white/5 px-5 pb-5 pt-4 text-sm leading-6 text-gray-300">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-purple-500/20 bg-purple-500/10 p-7 shadow-2xl shadow-purple-950/20">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-200">Contacto</p>
              <h2 className="mt-3 text-2xl font-black text-white">¿Necesitas ayuda?</h2>
              <p className="mt-3 text-sm leading-6 text-purple-100/80">
                Escríbenos con el nombre del evento, una descripción breve del problema y una captura si aplica.
              </p>
              <a
                className="mt-6 block rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-center font-black text-white transition hover:bg-white/15"
                href="mailto:soporte@qntrol.es"
              >
                soporte@qntrol.es
              </a>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-purple-500/20 bg-purple-500/10 p-7 shadow-2xl shadow-purple-950/20">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-200">Guía rápida</p>
              <h2 className="mt-3 text-2xl font-black text-white">Flujo recomendado</h2>
              <div className="mt-6 space-y-4">
                {quickSteps.map((step, index) => (
                  <div key={step.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7738B0] text-sm font-black text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-black text-white">{step.title}</p>
                      <p className="mt-1 text-sm leading-5 text-purple-100/75">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/5 bg-[#2B2738] p-7 shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-300">Consejos</p>
              <h2 className="mt-3 text-2xl font-black text-white">Antes de enviar</h2>
              <div className="mt-5 space-y-3 text-sm leading-6 text-gray-300">
                <p className="rounded-2xl bg-[#1e1b2e] p-4">Revisa que el nombre, la fecha y la ubicación del evento sean correctos.</p>
                <p className="rounded-2xl bg-[#1e1b2e] p-4">Comprueba que todos los invitados tienen correo si quieres que reciban invitación.</p>
                <p className="rounded-2xl bg-[#1e1b2e] p-4">Haz una prueba con pocos invitados antes de enviar una lista grande.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
