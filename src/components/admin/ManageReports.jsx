import React, { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';
import SkeletonLoader, { SkeletonStats, SkeletonTable } from '../common/SkeletonLoader';
import ExportReports from './ExportReports';

// SVG icons for KPI cards
const IconUsers = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const IconProfessionals = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const IconCalendar = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const IconStar = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const IconDownload = () => (
  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const formatDate = (val) => {
  if (!val) return 'N/A';
  try {
    const d = val?.toDate ? val.toDate() : new Date(val);
    return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'N/A';
  }
};

const StatusBadge = ({ status }) => {
  const isActive = status === 'Activo' || status === 'active';
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {isActive ? 'Activo' : status || 'Inactivo'}
    </span>
  );
};

const KpiCard = ({ icon, iconBg, iconColor, label, value, sub }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <div className={`p-2 rounded-lg ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
    </div>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
    {sub && <p className="text-xs text-gray-500 mt-1.5">{sub}</p>}
  </div>
);

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

        setData({ system: systemMetrics, users: userStats, professionals: profStats, sessions: sessionStats, userList, sessionList });
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
      <div className="space-y-8">
        <div>
          <div className="h-7 w-40 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
        </div>
        <SkeletonStats />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SkeletonLoader variant="card" height="200px" />
          <SkeletonLoader variant="card" height="200px" />
        </div>
        <SkeletonTable rows={5} columns={5} />
        <SkeletonTable rows={5} columns={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm flex items-center justify-between">
        <span>{error}</span>
        <button onClick={() => window.location.reload()} className="text-sm underline hover:text-red-800 ml-4">
          Reintentar
        </button>
      </div>
    );
  }

  const { system, users, professionals, sessions, userList, sessionList } = data;

  const downloadCSV = (rows, filename) => {
    if (!rows || !rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] || '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Actividad reciente: usuarios ordenados por ultimo login
  const recentActivity = [...(userList || [])]
    .filter(u => u.lastLoginAt || u.createdAt)
    .sort((a, b) => {
      const da = a.lastLoginAt?.toDate ? a.lastLoginAt.toDate() : new Date(a.lastLoginAt || a.createdAt);
      const db_ = b.lastLoginAt?.toDate ? b.lastLoginAt.toDate() : new Date(b.lastLoginAt || b.createdAt);
      return db_ - da;
    })
    .slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500 text-sm mt-1">Vision general de la plataforma y actividad reciente</p>
        </div>
      </div>
      
      {/* Export Section */}
      <ExportReports stats={system} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          icon={<IconUsers />}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
          label="Total Usuarios"
          value={system?.totalUsers || 0}
          sub={`${users?.newThisMonth || 0} nuevos este mes`}
        />
        <KpiCard
          icon={<IconProfessionals />}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          label="Profesionales"
          value={system?.totalProfessionals || 0}
          sub={`${professionals?.active || 0} activos · ${professionals?.pending || 0} pendientes`}
        />
        <KpiCard
          icon={<IconCalendar />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="Sesiones Totales"
          value={system?.totalSessions || 0}
          sub={`Tasa de completado: ${sessions?.completionRate || 0}%`}
        />
        <KpiCard
          icon={<IconStar />}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          label="Valoracion Media"
          value={system?.averageRating || 0}
          sub={`Basado en ${system?.totalReviews || 0} reseñas`}
        />
      </div>

      {/* Distribuciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profesionales por especialidad */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-5 uppercase tracking-wide">Profesionales por especialidad</h3>
          <div className="space-y-3">
            {Object.entries(professionals?.specialtyDistribution || {}).length > 0 ? (
              Object.entries(professionals.specialtyDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([specialty, count], index) => {
                  const pct = Math.round((count / (system?.totalProfessionals || 1)) * 100);
                  return (
                    <div key={specialty}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 font-medium">{specialty}</span>
                        <span className="text-gray-400">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-gray-400 text-sm text-center py-6">Sin datos de especialidades</p>
            )}
          </div>
        </div>

        {/* Estado de sesiones */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-5 uppercase tracking-wide">Estado de sesiones</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Programadas', value: sessions?.byStatus?.scheduled || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Completadas', value: sessions?.byStatus?.completed || 0, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'En progreso', value: sessions?.byStatus?.inProgress || 0, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Canceladas', value: sessions?.byStatus?.cancelled || 0, color: 'text-red-600', bg: 'bg-red-50' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`p-4 rounded-xl ${bg} text-center`}>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-gray-600 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actividad reciente de usuarios */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Actividad reciente de usuarios</h3>
            <p className="text-xs text-gray-400 mt-0.5">Ultimas sesiones registradas en la plataforma</p>
          </div>
          <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
            {recentActivity.length} registros
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Usuario', 'Ultimo acceso', 'IP de acceso', 'Sesiones', 'Estado'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {recentActivity.length > 0 ? recentActivity.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-teal-700">
                          {(user.name || user.email || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{user.name || 'Sin nombre'}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(user.lastLoginAt || user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                    {user.lastLoginIP || user.lastIp || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.loginCount || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={user.status} />
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                    Sin actividad registrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ultimas sesiones */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Sesiones recientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Paciente', 'Profesional', 'Fecha', 'Tipo', 'Estado'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {sessionList?.slice(0, 8).map((session) => (
                <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{session.patientName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.professionalName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.date} {session.time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{session.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      session.status === 'completed' ? 'bg-green-100 text-green-700' :
                      session.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      session.status === 'inProgress' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {session.status === 'scheduled' ? 'Programada' :
                       session.status === 'completed' ? 'Completada' :
                       session.status === 'inProgress' ? 'En progreso' : session.status}
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
