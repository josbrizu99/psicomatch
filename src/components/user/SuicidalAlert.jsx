import React from 'react';

const SuicidalAlert = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          {/* Icono de alerta */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          {/* Título */}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Tu vida es valiosa 💙
          </h2>

          {/* Mensaje principal */}
          <p className="text-gray-700 mb-6 leading-relaxed">
            Si estás teniendo pensamientos suicidas, por favor recuerda que <strong>no estás solo</strong> y que hay personas que quieren ayudarte.
          </p>

          {/* Información de contacto */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Líneas de ayuda disponibles:</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p><strong>Línea de Crisis:</strong> 155 (Paraguay)</p>
              <p><strong>Emergencias:</strong> 911</p>
              <p><strong>Centro de Ayuda:</strong> 0800-333-0333</p>
            </div>
          </div>

          {/* Mensaje de apoyo */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 text-sm">
              <strong>Recuerda:</strong> Los pensamientos suicidas son temporales y con la ayuda adecuada puedes superarlos. 
              Hablar con alguien es el primer paso hacia la recuperación.
            </p>
          </div>

          {/* Botones */}
          <div className="space-y-3">
            <button
              onClick={() => window.open('tel:155', '_self')}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors duration-200 font-semibold"
            >
              📞 Llamar Línea de Crisis
            </button>
            
            <button
              onClick={onClose}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              Continuar con la evaluación
            </button>
          </div>

          {/* Información adicional */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Esta alerta se muestra cuando detectamos que podrías necesitar apoyo profesional. 
              La evaluación continuará después de cerrar esta ventana.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuicidalAlert;

