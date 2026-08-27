import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { 
  deactivateProfessionalAccess, 
  reactivateProfessionalAccess, 
  regenerateAccessCode,
  getProfessionalAccessCode 
} from '../../services/professionalAccessCodeService';
import { 
  sendProfessionalStatusEmail, 
  sendProfessionalAccessCode 
} from '../../services/emailService';

const ManageProfessionalAccess = () => {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [showAccessCode, setShowAccessCode] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [professionalToDelete, setProfessionalToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProfessionals();
  }, []);

  const loadProfessionals = async () => {
    try {
      setLoading(true);
      const professionalsQuery = query(
        collection(db, 'professionals'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(professionalsQuery);
      const professionalsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProfessionals(professionalsData);
    } catch (error) {
      console.error('Error al cargar profesionales:', error);
      setError('Error al cargar profesionales');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateAccess = async (professionalId) => {
    try {
      setError('');
      setSuccess('');
      
      const result = await deactivateProfessionalAccess(professionalId);
      
      if (result.success) {
        setSuccess('Acceso del profesional desactivado');
        const professional = professionals.find(p => p.id === professionalId);
        if (professional && professional.email) {
          sendProfessionalStatusEmail({
            email: professional.email,
            name: professional.fullName || professional.name || 'Profesional',
            status: 'inactive',
            reason: 'Tu código de acceso profesional ha sido desactivado por el administrador. No podrás iniciar sesión en la plataforma hasta que sea reactivado.'
          }).catch(e => console.error('Error enviando email de desactivación de acceso:', e));
        }
        await loadProfessionals();
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error al desactivar acceso:', error);
      setError('Error al desactivar acceso');
    }
  };

  const handleReactivateAccess = async (professionalId) => {
    try {
      setError('');
      setSuccess('');
      
      const result = await reactivateProfessionalAccess(professionalId);
      
      if (result.success) {
        setSuccess(`Acceso del profesional reactivado. Nuevo código: ${result.newAccessCode}`);
        const professional = professionals.find(p => p.id === professionalId);
        if (professional && professional.email) {
          sendProfessionalAccessCode(
            professional.email,
            professional.fullName || professional.name || 'Profesional',
            result.newAccessCode
          ).catch(e => console.error('Error enviando email de reactivación de acceso:', e));
        }
        await loadProfessionals();
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error al reactivar acceso:', error);
      setError('Error al reactivar acceso');
    }
  };

  const handleRegenerateCode = async (professionalId) => {
    try {
      setError('');
      setSuccess('');
      
      const result = await regenerateAccessCode(professionalId);
      
      if (result.success) {
        setSuccess(`Código regenerado: ${result.newAccessCode}`);
        const professional = professionals.find(p => p.id === professionalId);
        if (professional && professional.email) {
          sendProfessionalAccessCode(
            professional.email,
            professional.fullName || professional.name || 'Profesional',
            result.newAccessCode
          ).catch(e => console.error('Error enviando email de nuevo código de acceso:', e));
        }
        await loadProfessionals();
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error al regenerar código:', error);
      setError('Error al regenerar código');
    }
  };

  const handleShowAccessCode = async (professionalId) => {
    try {
      const result = await getProfessionalAccessCode(professionalId);
      
      if (result.success) {
        setShowAccessCode(prev => ({
          ...prev,
          [professionalId]: result.accessCode
        }));
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error al obtener código:', error);
      setError('Error al obtener código');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAccessCodeStatus = (accessCode) => {
    if (!accessCode) {
      return { status: 'Sin código', color: 'text-gray-600 bg-gray-100' };
    }
    if (accessCode.startsWith('INVALID_')) {
      return { status: 'Desactivado', color: 'text-red-600 bg-red-100' };
    }
    return { status: 'Activo', color: 'text-green-600 bg-green-100' };
  };

  const openDeleteModal = (professional) => {
    setProfessionalToDelete(professional);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setProfessionalToDelete(null);
  };

  const deleteProfessional = async () => {
    if (!professionalToDelete) return;

    try {
      setDeleting(true);
      console.log('Iniciando eliminacion del profesional:', professionalToDelete.id);
      
      // Eliminar solo datos de Firestore
      await deleteDoc(doc(db, 'professionals', professionalToDelete.id));
      
      // Eliminar datos relacionados en otras colecciones
      try {
        const schedulesQuery = query(collection(db, 'professionalSchedules'), where('professionalId', '==', professionalToDelete.id));
        const schedulesSnapshot = await getDocs(schedulesQuery);
        await Promise.all(schedulesSnapshot.docs.map(doc => deleteDoc(doc.ref)));
        
        const appointmentsQuery = query(collection(db, 'appointments'), where('professionalId', '==', professionalToDelete.id));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        await Promise.all(appointmentsSnapshot.docs.map(doc => deleteDoc(doc.ref)));
        
        const messagesQuery = query(collection(db, 'messages'), where('professionalId', '==', professionalToDelete.id));
        const messagesSnapshot = await getDocs(messagesQuery);
        await Promise.all(messagesSnapshot.docs.map(doc => deleteDoc(doc.ref)));
        
        const notificationsQuery = query(collection(db, 'notifications'), where('professionalId', '==', professionalToDelete.id));
        const notificationsSnapshot = await getDocs(notificationsQuery);
        await Promise.all(notificationsSnapshot.docs.map(doc => deleteDoc(doc.ref)));
        
      } catch (relatedError) {
        console.warn('Error al eliminar datos relacionados:', relatedError);
      }
      
      console.log('Profesional eliminado exitosamente');
      setSuccess(`Profesional ${professionalToDelete.name} eliminado exitosamente`);
      
      // Recargar la lista
      await loadProfessionals();
      
      // Cerrar modal
      closeDeleteModal();
      
    } catch (error) {
      console.error('Error al eliminar profesional:', error);
      setError('Error al eliminar profesional: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const filteredProfessionals = professionals.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(term) ||
      (p.fullName || '').toLowerCase().includes(term) ||
      (p.email || '').toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-72 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-56 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center space-x-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-40" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-56" />
            </div>
            <div className="flex space-x-2">
              {[...Array(4)].map((_, j) => <div key={j} className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion de Acceso de Profesionales</h1>
          <p className="text-gray-500 text-sm mt-1">Administra los codigos de acceso y permisos de los profesionales</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 text-sm text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white shadow-sm transition-shadow"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="ml-3 text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="ml-3 text-sm text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Lista de profesionales */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Profesionales</h3>
          <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">{filteredProfessionals.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profesional
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código de Acceso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filteredProfessionals.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-400">Sin resultados para la busqueda</td></tr>
              ) : filteredProfessionals.map((professional) => {
                const accessCodeStatus = getAccessCodeStatus(professional.accessCode);
                return (
                  <tr key={professional.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-teal-700">
                            {(professional.fullName || professional.name || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{professional.fullName || professional.name}</div>
                          <div className="text-xs text-gray-400">{professional.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(professional.status)}`}>
                        {professional.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${accessCodeStatus.color}`}>
                          {accessCodeStatus.status}
                        </span>
                        {showAccessCode[professional.id] && (
                          <span className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                            {showAccessCode[professional.id]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {/* Ver codigo */}
                        <button
                          onClick={() => handleShowAccessCode(professional.id)}
                          title="Ver codigo de acceso"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        {/* Desactivar / Reactivar */}
                        {professional.status === 'active' ? (
                          <button
                            onClick={() => handleDeactivateAccess(professional.id)}
                            title="Desactivar acceso"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivateAccess(professional.id)}
                            title="Reactivar acceso"
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}

                        {/* Regenerar codigo */}
                        {professional.status === 'active' && (
                          <button
                            onClick={() => handleRegenerateCode(professional.id)}
                            title="Regenerar codigo de acceso"
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}

                        {/* Eliminar */}
                        <button
                          onClick={() => openDeleteModal(professional)}
                          title="Eliminar profesional"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Información sobre Códigos de Acceso</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>Desactivar:</strong> Cambia el código a uno inválido, impidiendo el acceso</p>
          <p><strong>Reactivar:</strong> Genera un nuevo código de 5 dígitos</p>
          <p><strong>Regenerar:</strong> Crea un nuevo código para profesionales activos</p>
          <p><strong>Seguridad:</strong> Los profesionales inactivos no pueden iniciar sesión</p>
        </div>
      </div>

      {/* Modal de confirmación para eliminar profesional */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Confirmar Eliminación</h3>
              <div className="mt-4 px-7 py-3">
                <p className="text-sm text-gray-500 mb-4">
                  ¿Estás seguro de que quieres eliminar al profesional <strong>{professionalToDelete?.name}</strong>?
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Esta acción no se puede deshacer y se eliminarán todos los datos asociados al profesional.
                </p>
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">
                    <strong>Se eliminarán de Firestore:</strong>
                  </p>
                  <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                    <li>Perfil del profesional</li>
                    <li>Horarios de disponibilidad</li>
                    <li>Citas programadas</li>
                    <li>Mensajes y notificaciones</li>
                    <li>Todos los datos relacionados</li>
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-3">
                  <p className="text-sm text-blue-800">
                    <strong>Nota:</strong> El profesional podrá registrarse nuevamente si lo desea.
                  </p>
                </div>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 mr-3"
                >
                  Cancelar
                </button>
                <button
                  onClick={deleteProfessional}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Eliminando...' : 'Eliminar Profesional'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageProfessionalAccess;

