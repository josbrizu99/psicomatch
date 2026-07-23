import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

const SETTINGS_KEY = 'psicomatch_admin_settings';

const defaultSettings = {
  platformName: 'PsicoMatch',
  platformDescription: 'Plataforma de salud mental y bienestar',
  maintenanceMode: false,
  emailNotifications: true,
  autoApproval: false,
  requireTwoFactor: false,
  minPasswordLength: 8,
  sessionTimeout: 60,
  theme: 'light',
};

const AdminSettings = () => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });
  const [saved, setSaved] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);
  const [dbChecking, setDbChecking] = useState(false);
  const [dbCounts, setDbCounts] = useState(null);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.removeItem(SETTINGS_KEY);
    setSaved(false);
  };

  const checkDatabase = async () => {
    setDbChecking(true);
    setDbStatus(null);
    setDbCounts(null);
    try {
      const collections = ['users', 'professionals', 'evaluationTests', 'userTestResults', 'appointments'];
      const counts = {};
      for (const col of collections) {
        try {
          const snap = await getDocs(query(collection(db, col), limit(100)));
          counts[col] = snap.size;
        } catch {
          counts[col] = 'Sin acceso';
        }
      }
      setDbCounts(counts);
      setDbStatus('connected');
    } catch {
      setDbStatus('error');
    } finally {
      setDbChecking(false);
    }
  };

  const collectionLabels = {
    users: 'Usuarios',
    professionals: 'Profesionales',
    evaluationTests: 'Tests de Evaluación',
    userTestResults: 'Resultados de Tests',
    appointments: 'Citas',
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-500 text-sm mt-1">Ajustes generales de la plataforma PsicoMatch</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Restablecer
          </button>
          <button
            onClick={handleSave}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-teal-600 text-white hover:bg-teal-700'
            }`}
          >
            {saved ? 'Guardado' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Información general */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-50 rounded-lg">
              <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Información de la plataforma</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la plataforma</label>
            <input
              type="text"
              value={settings.platformName}
              onChange={(e) => handleChange('platformName', e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={settings.platformDescription}
              onChange={(e) => handleChange('platformDescription', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none bg-white"
            />
          </div>
          <div className="flex items-center justify-between py-3 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Modo mantenimiento</p>
              <p className="text-xs text-gray-500">Los usuarios no podrán acceder mientras esté activo</p>
            </div>
            <button
              onClick={() => handleChange('maintenanceMode', !settings.maintenanceMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.maintenanceMode ? 'bg-orange-500' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Notificaciones</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {[
            { key: 'emailNotifications', label: 'Notificaciones por correo', desc: 'Enviar correos automáticos a usuarios y profesionales' },
            { key: 'autoApproval', label: 'Aprobación automática de profesionales', desc: 'Los nuevos profesionales se aprueban sin revisión manual' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <button
                onClick={() => handleChange(key, !settings[key])}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings[key] ? 'bg-teal-500' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  settings[key] ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Seguridad */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Seguridad</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-700">Autenticación de dos factores obligatoria</p>
              <p className="text-xs text-gray-500">Todos los usuarios deberán configurar 2FA al iniciar sesión</p>
            </div>
            <button
              onClick={() => handleChange('requireTwoFactor', !settings.requireTwoFactor)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.requireTwoFactor ? 'bg-teal-500' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                settings.requireTwoFactor ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Longitud mínima de contraseña
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                min={6}
                max={24}
                value={settings.minPasswordLength}
                onChange={(e) => handleChange('minPasswordLength', parseInt(e.target.value))}
                className="w-24 px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-500">caracteres</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tiempo de sesión inactiva (minutos)
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                min={15}
                max={480}
                step={15}
                value={settings.sessionTimeout}
                onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
                className="w-24 px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-500">minutos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostico de base de datos */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-900">Base de datos</h2>
            </div>
            <button
              onClick={checkDatabase}
              disabled={dbChecking}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-100 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-50"
            >
              {dbChecking ? (
                <>
                  <svg className="w-4 h-4 mr-1.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Verificando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Verificar conexión
                </>
              )}
            </button>
          </div>
        </div>
        <div className="p-6">
          {!dbStatus && !dbChecking && (
            <p className="text-sm text-gray-500">Haz clic en "Verificar conexión" para comprobar el estado de Firestore.</p>
          )}

          {dbStatus === 'connected' && dbCounts && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-700">Conectado a Firestore</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(dbCounts).map(([col, count]) => (
                  <div key={col} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">{collectionLabels[col] || col}</span>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dbStatus === 'error' && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium text-red-700">Error al conectar con Firestore</span>
            </div>
          )}
        </div>
      </div>

      {/* Sobre el sistema */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Sobre el sistema</h2>
          </div>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3">
            {[
              { label: 'Versión', value: 'v1.0.0' },
              { label: 'Entorno', value: process.env.NODE_ENV || 'development' },
              { label: 'Plataforma', value: 'Firebase / React' },
              { label: 'Región', value: 'us-central1' },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</dt>
                <dd className="mt-1 text-sm text-gray-900 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
