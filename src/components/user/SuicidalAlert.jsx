import React from 'react';

const SuicidalAlert = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Modal container */}
      <div className="bg-white w-full max-w-md sm:max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden mx-auto">
        
        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 sm:px-6 sm:py-6">
          <div className="text-center">
            {/* Icono */}
            <div className="mx-auto flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-red-100 mb-3 sm:mb-4">
              <svg className="h-7 w-7 sm:h-8 sm:w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            {/* Título */}
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
              Tu vida es valiosa 💙
            </h2>

            {/* Mensaje principal */}
            <p className="text-sm sm:text-base text-gray-700 mb-5 leading-relaxed">
              Si estás teniendo pensamientos suicidas, por favor recuerda que{' '}
              <strong>no estás solo</strong> y que hay personas que quieren ayudarte.
            </p>

            {/* Líneas de ayuda */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-4 text-left">
              <h3 className="font-semibold text-blue-900 text-sm sm:text-base mb-2">
                Líneas de ayuda disponibles:
              </h3>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex items-center justify-between">
                  <span><strong>Línea de Crisis:</strong> 155 (Paraguay)</span>
                  <a href="tel:155"
                    className="text-xs bg-blue-200 hover:bg-blue-300 text-blue-900 font-semibold px-2.5 py-1 rounded-lg transition-colors">
                    Llamar
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span><strong>Emergencias:</strong> 911</span>
                  <a href="tel:911"
                    className="text-xs bg-blue-200 hover:bg-blue-300 text-blue-900 font-semibold px-2.5 py-1 rounded-lg transition-colors">
                    Llamar
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span><strong>Centro de Ayuda:</strong> 0800-333-0333</span>
                  <a href="tel:08003330333"
                    className="text-xs bg-blue-200 hover:bg-blue-300 text-blue-900 font-semibold px-2.5 py-1 rounded-lg transition-colors">
                    Llamar
                  </a>
                </div>
              </div>
            </div>

            {/* Mensaje de apoyo */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4 mb-5 text-left">
              <p className="text-green-800 text-xs sm:text-sm leading-relaxed">
                <strong>Recuerda:</strong> Los pensamientos suicidas son temporales y con la
                ayuda adecuada puedes superarlos. Hablar con alguien es el primer paso hacia
                la recuperación.
              </p>
            </div>
          </div>
        </div>

        {/* Footer con botones — siempre visible */}
        <div className="flex-shrink-0 px-5 pb-5 pt-3 sm:px-6 sm:pb-6 space-y-2.5 border-t border-gray-100 bg-white">
          <button
            onClick={() => window.open('tel:155', '_self')}
            className="w-full min-h-[48px] bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 active:bg-red-800 transition-colors duration-200 font-semibold text-sm sm:text-base"
          >
            📞 Llamar Línea de Crisis (155)
          </button>

          <button
            onClick={onClose}
            className="w-full min-h-[44px] bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200 text-sm sm:text-base"
          >
            Continuar con la evaluación
          </button>

          {/* Información adicional */}
          <p className="text-xs text-gray-400 text-center pt-1">
            Esta alerta se muestra cuando detectamos que podrías necesitar apoyo profesional.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuicidalAlert;
