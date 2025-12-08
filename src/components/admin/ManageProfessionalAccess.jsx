import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { 
  deactivateProfessionalAccess, 
  reactivateProfessionalAccess, 
  regenerateAccessCode,
  getProfessionalAccessCode 
} from '../../services/professionalAccessCodeService';

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
      console.log('🔄 Iniciando eliminación del profesional:', professionalToDelete.id);
      
      // Eliminar solo datos de Firestore
      console.log('🔄 Eliminando datos de Firestore...');
      
      // 1. Eliminar documento principal de profesionales
      await deleteDoc(doc(db, 'professionals', professionalToDelete.id));
      console.log('✅ Documento de profesional eliminado');
      
      // 2. Eliminar datos relacionados en otras colecciones
      try {
        // Eliminar datos de professionalSchedules
        const schedulesQuery = query(collection(db, 'professionalSchedules'), where('professionalId', '==', professionalToDelete.id));
        const schedulesSnapshot = await getDocs(schedulesQuery);
        const schedulesPromises = schedulesSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(schedulesPromises);
        console.log('✅ Horarios profesionales eliminados');
        
        // Eliminar datos de appointments relacionados
        const appointmentsQuery = query(collection(db, 'appointments'), where('professionalId', '==', professionalToDelete.id));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointmentsPromises = appointmentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(appointmentsPromises);
        console.log('✅ Citas eliminadas');
        
        // Eliminar datos de messages relacionados
        const messagesQuery = query(collection(db, 'messages'), where('professionalId', '==', professionalToDelete.id));
        const messagesSnapshot = await getDocs(messagesQuery);
        const messagesPromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(messagesPromises);
        console.log('✅ Mensajes eliminados');
        
        // Eliminar datos de notifications relacionados
        const notificationsQuery = query(collection(db, 'notifications'), where('professionalId', '==', professionalToDelete.id));
        const notificationsSnapshot = await getDocs(notificationsQuery);
        const notificationsPromises = notificationsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(notificationsPromises);
        console.log('✅ Notificaciones eliminadas');
        
      } catch (relatedError) {
        console.warn('⚠️ Error al eliminar datos relacionados:', relatedError);
        // Continuar aunque haya errores en datos relacionados
      }
      
      console.log('✅ Profesional eliminado exitosamente');
      setSuccess(`Profesional ${professionalToDelete.name} eliminado exitosamente`);
      
      // Recargar la lista
      await loadProfessionals();
      
      // Cerrar modal
      closeDeleteModal();
      
    } catch (error) {
      console.error('❌ Error al eliminar profesional:', error);
      setError('Error al eliminar profesional: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando profesionales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Acceso de Profesionales</h1>
          <p className="text-gray-600">Administra los códigos de acceso de los profesionales</p>
        </div>
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
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Profesionales</h3>
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
            <tbody className="bg-white divide-y divide-gray-200">
              {professionals.map((professional) => {
                const accessCodeStatus = getAccessCodeStatus(professional.accessCode);
                return (
                  <tr key={professional.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {professional.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {professional.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(professional.status)}`}>
                        {professional.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${accessCodeStatus.color}`}>
                          {accessCodeStatus.status}
                        </span>
                        {showAccessCode[professional.id] && (
                          <span className="text-sm font-mono text-gray-900">
                            {showAccessCode[professional.id]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleShowAccessCode(professional.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Ver Código
                      </button>
                      
                      {professional.status === 'active' ? (
                        <button
                          onClick={() => handleDeactivateAccess(professional.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivateAccess(professional.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Reactivar
                        </button>
                      )}
                      
                      {professional.status === 'active' && (
                        <button
                          onClick={() => handleRegenerateCode(professional.id)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Regenerar
                        </button>
                      )}
                      
                      <button
                        onClick={() => openDeleteModal(professional)}
                        className="text-red-600 hover:text-red-900 font-medium"
                        title="Eliminar profesional"
                      >
                        Eliminar
                      </button>
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

