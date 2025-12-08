import React, { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';
import SkeletonLoader from '../common/SkeletonLoader';

const ManageReports = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    system: null,
    users: null,
    professionals: null,
    sessions: null,
    userList: [],
    sessionList: []
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const [systemMetrics, userStats, profStats, sessionStats, userList, sessionList] = await Promise.all([
          analyticsService.getSystemMetrics(),
          analyticsService.getUserStats(),
          analyticsService.getProfessionalStats(),
          analyticsService.getSessionStats(),
          analyticsService.getAllUsers(),
          analyticsService.getAllSessions()
        ]);

        setData({
          system: systemMetrics,
          users: userStats,
          professionals: profStats,
          sessions: sessionStats,
          userList,
          sessionList
        });
      } catch (err) {
        console.error('Error cargando reportes:', err);
        setError('Error al cargar los datos de reportes.');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-600">Cargando métricas del sistema...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonLoader variant="card" height="120px" count={4} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        {error}
        <button
          onClick={() => window.location.reload()}
          className="ml-4 text-sm underline hover:text-red-800"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const { system, users, professionals, sessions, userList, sessionList } = data;

  const downloadCSV = (data, filename) => {
    if (!data || !data.length) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Reportes</h1>
          <p className="text-gray-600">Visión general y descarga de datos</p>
        </div>
        <div className="space-x-4">
          <button
            onClick={() => downloadCSV(userList, 'usuarios_psicomatch.csv')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            disabled={!userList?.length}
          >
            📊 Exportar Usuarios
          </button>
          <button
            onClick={() => downloadCSV(sessionList, 'sesiones_psicomatch.csv')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            disabled={!sessionList?.length}
          >
            📅 Exportar Sesiones
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Total Usuarios</h3>
            <span className="p-2 bg-blue-100 text-blue-600 rounded-full">👥</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{system?.totalUsers || 0}</p>
          <p className="text-xs text-green-600 mt-2">{users?.newThisMonth || 0} nuevos este mes</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Profesionales</h3>
            <span className="p-2 bg-purple-100 text-purple-600 rounded-full">👨‍⚕️</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{system?.totalProfessionals || 0}</p>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-green-600">{professionals?.active || 0} activos</span>
            <span className="text-gray-400">|</span>
            <span className="text-orange-600">{professionals?.pending || 0} pendientes</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Sesiones Totales</h3>
            <span className="p-2 bg-green-100 text-green-600 rounded-full">📅</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{system?.totalSessions || 0}</p>
          <p className="text-xs text-gray-500 mt-2">Tasa de completado: {sessions?.completionRate || 0}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Valoración Media</h3>
            <span className="p-2 bg-yellow-100 text-yellow-600 rounded-full">⭐</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{system?.averageRating || 0}</p>
          <p className="text-xs text-gray-500 mt-2">Basado en {system?.totalReviews || 0} reseñas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Distribución por Especialidad */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Profesionales por Especialidad</h3>
          <div className="space-y-4">
            {Object.entries(professionals?.specialtyDistribution || {}).length > 0 ? (
              Object.entries(professionals.specialtyDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([specialty, count], index) => {
                  const percentage = Math.round((count / (system?.totalProfessionals || 1)) * 100);
                  return (
                    <div key={specialty}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{specialty}</span>
                        <span className="text-gray-500">{count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${index % 2 === 0 ? 'bg-indigo-500' : 'bg-purple-500'}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-gray-500 text-center py-4">No hay datos de especialidades</p>
            )}
          </div>
        </div>

        {/* Estado de Sesiones */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Estado de Sesiones</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{sessions?.byStatus?.scheduled || 0}</div>
              <div className="text-sm text-gray-600">Programadas</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{sessions?.byStatus?.completed || 0}</div>
              <div className="text-sm text-gray-600">Completadas</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{sessions?.byStatus?.inProgress || 0}</div>
              <div className="text-sm text-gray-600">En Progreso</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{sessions?.byStatus?.cancelled || 0}</div>
              <div className="text-sm text-gray-600">Canceladas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios Recientes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Últimos Usuarios Registrados</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Registro</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userList?.slice(0, 5).map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {user.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de Sesiones Recientes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Sesiones Recientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profesional</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessionList?.slice(0, 5).map((session) => (
                <tr key={session.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{session.patientName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.professionalName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.date} {session.time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{session.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${session.status === 'completed' ? 'bg-green-100 text-green-800' :
                      session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        session.status === 'inProgress' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {session.status === 'scheduled' ? 'Programada' :
                        session.status === 'completed' ? 'Completada' :
                          session.status === 'inProgress' ? 'En Progreso' : session.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageReports;
