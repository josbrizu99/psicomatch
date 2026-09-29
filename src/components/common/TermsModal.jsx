import React, { useState } from 'react';

const TermsModal = ({ isOpen, onClose, onAccept }) => {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  if (!isOpen) return null;

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop - clientHeight < 30) {
      setScrolledToBottom(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Términos y Condiciones</h2>
              <p className="text-xs text-gray-500">PsicoMatch · Última actualización: Septiembre 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto p-6 space-y-5 text-sm text-gray-700 leading-relaxed"
          onScroll={handleScroll}
        >
          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">1. Introducción</h3>
            <p>
              Bienvenido a <strong>PsicoMatch</strong>, una plataforma digital diseñada para conectar personas
              con profesionales de la salud mental de manera segura, confiable y personalizada. Al registrarte
              y utilizar nuestros servicios, aceptás los presentes Términos y Condiciones en su totalidad.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">2. Descripción del Servicio</h3>
            <p>
              PsicoMatch es una plataforma de intermediación que facilita el contacto entre usuarios que
              buscan apoyo psicológico y profesionales certificados de la salud mental. La plataforma
              ofrece:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
              <li>Evaluación emocional inicial mediante cuestionarios validados</li>
              <li>Algoritmo de emparejamiento con profesionales adecuados</li>
              <li>Gestión de sesiones y seguimiento del progreso</li>
              <li>Chat seguro entre usuario y profesional</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">3. Registro y Cuenta</h3>
            <p>
              Para acceder a los servicios de PsicoMatch debés crear una cuenta con información veraz y
              actualizada. Sos responsable de mantener la confidencialidad de tus credenciales de acceso
              y de todas las actividades que ocurran en tu cuenta. Notificá inmediatamente cualquier uso
              no autorizado de tu cuenta.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">4. Privacidad y Datos Personales</h3>
            <p>
              Tu privacidad es nuestra prioridad. Los datos personales y de salud que compartas en la
              plataforma serán tratados con estricta confidencialidad, conforme a la legislación vigente
              en materia de protección de datos. Nunca compartiremos tu información con terceros sin tu
              consentimiento expreso, salvo en los casos previstos por la ley.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">5. Limitaciones del Servicio</h3>
            <p>
              PsicoMatch <strong>no es un servicio de emergencias</strong>. Si te encontrás en una situación
              de crisis o riesgo inmediato para tu vida o la de otros, contactá inmediatamente a los servicios
              de emergencia de tu localidad (911 en Paraguay). La plataforma no sustituye la atención médica
              de urgencia.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">6. Responsabilidades del Usuario</h3>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Proveer información veraz y actualizada</li>
              <li>No utilizar la plataforma con fines ilegales o maliciosos</li>
              <li>Respetar la privacidad y los derechos de los profesionales</li>
              <li>No compartir contenido inapropiado, ofensivo o dañino</li>
              <li>Cumplir con los horarios y compromisos de sesión acordados</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">7. Responsabilidades de los Profesionales</h3>
            <p>
              Los profesionales registrados en PsicoMatch son responsables de mantener su información
              actualizada, respetar la confidencialidad de sus pacientes y actuar conforme al código
              deontológico de su profesión. PsicoMatch verifica las credenciales de los profesionales
              pero no asume responsabilidad por las actuaciones de los mismos.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">8. Propiedad Intelectual</h3>
            <p>
              Todos los contenidos de la plataforma (diseño, código, textos, algoritmos) son propiedad
              de PsicoMatch y están protegidos por las leyes de propiedad intelectual aplicables. Queda
              prohibida su reproducción o uso sin autorización expresa.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">9. Modificaciones</h3>
            <p>
              PsicoMatch se reserva el derecho de modificar estos términos en cualquier momento. Las
              modificaciones serán notificadas por email y estarán disponibles en la plataforma. El uso
              continuado del servicio después de los cambios implica la aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">10. Uso por Menores de Edad</h3>
            <p>
              El uso de la plataforma por parte de menores de 18 años queda bajo la <strong>absoluta responsabilidad de sus padres o tutores legales</strong>. PsicoMatch se deslinda de cualquier responsabilidad derivada del uso no supervisado del servicio por parte de menores. Al registrar a un menor o permitirle el uso de la plataforma, el padre o tutor asume plenamente la responsabilidad de supervisar las interacciones, sesiones y decisiones terapéuticas correspondientes.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">11. Jurisdicción</h3>
            <p>
              Estos términos se rigen por las leyes de la República del Paraguay. Cualquier disputa que
              surja en relación a estos términos será sometida a la jurisdicción de los tribunales competentes
              de la República del Paraguay.
            </p>
          </section>

          <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="font-semibold text-amber-900 text-base mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              11. Deslinde de Responsabilidad — Menores de 18 Años
            </h3>
            <p className="text-amber-800 mb-3">
              <strong>PsicoMatch está diseñado para personas mayores de 18 años.</strong> Si un menor de edad utiliza
              la plataforma, ya sea con o sin conocimiento de sus representantes legales, la responsabilidad sobre
              dicho uso recae <strong>exclusivamente y en su totalidad</strong> sobre los padres, tutores o
              representantes legales del menor.
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-amber-800 text-sm">
              <li>PsicoMatch no verifica la edad de los usuarios al momento del registro.</li>
              <li>Los padres o tutores son los únicos responsables de supervisar el uso de internet y plataformas
                  digitales de salud por parte de sus hijos o pupilos menores de edad.</li>
              <li>Cualquier consecuencia derivada del uso de la plataforma por parte de un menor —incluyendo
                  la recepción de contenido relacionado con salud mental, resultados de evaluaciones o
                  comunicación con profesionales— es de responsabilidad exclusiva del adulto a cargo.</li>
              <li>En caso de detectarse que un usuario es menor de 18 años, PsicoMatch se reserva el derecho
                  de suspender o eliminar su cuenta sin previo aviso.</li>
            </ul>
            <p className="text-amber-700 text-xs mt-3 font-medium">
              Al aceptar estos Términos y Condiciones, el usuario declara ser mayor de 18 años o, en su defecto,
              confirma contar con autorización expresa de su padre, madre o tutor legal, quien asume plena
              responsabilidad por el uso de la plataforma.
            </p>
          </section>

          {!scrolledToBottom && (
            <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white pt-8 pb-2 text-center">
              <p className="text-xs text-gray-400 animate-bounce">↓ Seguí leyendo</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
          {onAccept && (
            <button
              onClick={() => { onAccept(); onClose(); }}
              className="flex-1 py-3 px-4 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-md"
            >
              He leído y acepto los Términos
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
