import React, { useState, useEffect } from 'react';
import { collection, serverTimestamp, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { sendVerificationNotification, sendProfessionalStatusEmail } from '../../services/emailService';

const ManageProfessionals = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [professionals, setProfessionals] = useState([]);
  const [loadingProfessionals, setLoadingProfessionals] = useState(true);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const { currentUser } = useAuth();

  // Cargar profesionales
  const loadProfessionals = async () => {
    try {
      setLoadingProfessionals(true);
      const professionalsRef = collection(db, 'professionals');
      const q = query(professionalsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const professionalsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('🔄 Profesionales cargados:', professionalsData.map(p => ({
        name: p.name,
        email: p.email,
        totalSessions: p.totalSessions,
        lastLoginAt: p.lastLoginAt
      })));
      
      setProfessionals(professionalsData);
    } catch (error) {
      console.error('Error al cargar profesionales:', error);
      setError('Error al cargar la lista de profesionales');
    } finally {
      setLoadingProfessionals(false);
    }
  };

  useEffect(() => {
    loadProfessionals();
  }, []);

  // Filtrar profesionales
  const filteredProfessionals = professionals.filter(professional => {
    const searchLower = searchTerm.toLowerCase();
    const professionalName = professional.fullName || professional.name || '';
    const matchesSearch = professionalName.toLowerCase().includes(searchLower) ||
                         (professional.email?.toLowerCase() || '').includes(searchLower) ||
                         (professional.professionalcode?.toLowerCase() || '').includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || professional.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Verificar profesional
  const handleVerifyProfessional = async (professionalId) => {
    try {
    setLoading(true);
    setError('');

      const professional = professionals.find(p => p.id === professionalId);
      
      // Generar código de acceso aleatorio
      const accessCode = Math.floor(10000 + Math.random() * 90000).toString();
      
      await updateDoc(doc(db, 'professionals', professionalId), {
        status: 'active',
        isVerified: true,
        verifiedAt: serverTimestamp(),
        verifiedBy: currentUser?.uid,
        accessCode: accessCode,
        accessCodeGeneratedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid
      });
      
      // Enviar notificación de verificación con código de acceso
      const professionalName = professional.fullName || professional.name || 'Profesional';
      let emailSent = false;
      let emailError = null;
      
      if (professional.email) {
        try {
          console.log('📧 Enviando email de verificación a:', professional.email);
          const emailResult = await sendVerificationNotification(
            professional.email, 
            professionalName, 
            true,
            accessCode
          );
          
          if (emailResult.success) {
            emailSent = true;
            console.log('✅ Email de verificación enviado exitosamente');
          } else {
            emailError = emailResult.error;
            console.error('❌ Error al enviar email de verificación:', emailResult.error);
          }
        } catch (emailErr) {
          emailError = emailErr.message || emailErr.toString();
          console.error('❌ Excepción al enviar notificación por email:', emailErr);
        }
      } else {
        console.warn('⚠️ No se puede enviar email: el profesional no tiene email');
      }
      
      const emailMessage = emailSent 
        ? 'Se ha enviado notificación por email.' 
        : emailError 
          ? `Nota: No se pudo enviar el email (${emailError}).` 
          : 'Nota: No se pudo enviar el email.';
      
      setMessage(`Profesional verificado exitosamente. Código de acceso: ${accessCode}. ${emailMessage}`);
      await loadProfessionals();
      setShowVerifyModal(false);
      
      setTimeout(() => setMessage(''), 10000);
    } catch (error) {
      console.error('Error al verificar profesional:', error);
      setError('Error al verificar el profesional');
    } finally {
      setLoading(false);
    }
  };

  // Rechazar profesional
  const handleRejectProfessional = async (professionalId) => {
    try {
      setLoading(true);
    setError('');
      
      const professional = professionals.find(p => p.id === professionalId);
      
      await updateDoc(doc(db, 'professionals', professionalId), {
        status: 'rejected',
        isVerified: false,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid
      });
      
      // Enviar notificación de rechazo
      const professionalName = professional.fullName || professional.name || 'Profesional';
      try {
        const emailResult = await sendVerificationNotification(
          professional.email, 
          professionalName, 
          false
        );
        if (!emailResult.success) {
          console.warn('⚠️ Error al enviar email de rechazo:', emailResult.error);
        }
      } catch (emailError) {
        console.error('❌ Error al enviar notificación por email:', emailError);
        // No fallar la operación si el email falla
      }
      
      setMessage(`Profesional rechazado. ${professional.email ? 'Se ha enviado notificación por email.' : 'Nota: No se pudo enviar el email (email no disponible).'}`);
      await loadProfessionals();
      setShowRejectModal(false);
      
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Error al rechazar profesional:', error);
      setError('Error al rechazar el profesional');
    } finally {
      setLoading(false);
    }
  };

  // Desactivar profesional
  const handleDeactivateProfessional = async (professionalId) => {
    try {
      setLoading(true);
      setError('');
      
      const professional = professionals.find(p => p.id === professionalId);
      if (!professional) {
        throw new Error('Profesional no encontrado en la lista local');
      }
      
      await updateDoc(doc(db, 'professionals', professionalId), {
        status: 'inactive',
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid
      });

      const professionalName = professional.fullName || professional.name || 'Profesional';
      try {
        const emailResult = await sendProfessionalStatusEmail({
          email: professional.email,
          name: professionalName,
          status: 'inactive',
          reason: 'Perfil puesto en pausa por administrador'
        });
        if (!emailResult.success) {
          console.warn('⚠️ Error al enviar email de desactivación:', emailResult.error);
        }
      } catch (emailError) {
        console.error('❌ Error al enviar notificación por email:', emailError);
        // No fallar la operación si el email falla
      }
      
      setMessage(`Profesional desactivado. ${professional.email ? 'Se ha enviado notificación por email.' : 'Nota: No se pudo enviar el email (email no disponible).'}`);
      await loadProfessionals();
      setShowDeactivateModal(false);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error al desactivar profesional:', error);
      setError('Error al desactivar el profesional');
    } finally {
      setLoading(false);
    }
  };

  // Reactivar profesional
  const handleReactivateProfessional = async (professionalId) => {
    try {
      setLoading(true);
      setError('');
      
      const professional = professionals.find(p => p.id === professionalId);

      await updateDoc(doc(db, 'professionals', professionalId), {
        status: 'active',
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid
      });

      const professionalName = professional.fullName || professional.name || 'Profesional';
      try {
        const emailResult = await sendProfessionalStatusEmail({
          email: professional.email,
          name: professionalName,
          status: 'reactivated',
          reason: 'Perfil reactivado por el administrador'
        });
        if (!emailResult.success) {
          console.warn('⚠️ Error al enviar email de reactivación:', emailResult.error);
        }
      } catch (emailError) {
        console.error('❌ Error al enviar notificación por email:', emailError);
        // No fallar la operación si el email falla
      }
      
      setMessage(`Profesional reactivado. ${professional.email ? 'Se ha enviado notificación por email.' : 'Nota: No se pudo enviar el email (email no disponible).'}`);
      await loadProfessionals();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error al reactivar profesional:', error);
      setError('Error al reactivar el profesional');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status, isVerified) => {
    if (status === 'pending') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pendiente</span>;
    }
    if (status === 'active' && isVerified) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Activo</span>;
    }
    if (status === 'inactive') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactivo</span>;
    }
    if (status === 'rejected') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Rechazado</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Desconocido</span>;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestión de Profesionales</h2>
            <p className="text-gray-600">Verifica y gestiona las cuentas de profesionales registrados</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={loadProfessionals}
              disabled={loadingProfessionals}
              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loadingProfessionals ? 'Actualizando...' : 'Actualizar'}
            </button>
            <div className="text-sm text-gray-500">
              Total: {professionals.length} profesionales
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar profesional
            </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre, email o código profesional..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="rejected">Rechazados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Lista de profesionales */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loadingProfessionals ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando profesionales...</p>
          </div>
        ) : filteredProfessionals.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No se encontraron profesionales
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profesional
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código Profesional
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProfessionals.map((professional) => (
                <tr key={professional.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                      {professional.photoURL ? (
                            <img className="h-10 w-10 rounded-full" src={professional.photoURL} alt="" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {(professional.fullName || professional.name)?.charAt(0)?.toUpperCase()}
                        </span>
                            </div>
                          )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{professional.fullName || professional.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{professional.email}</div>
                      </div>
                    </div>
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {professional.professionalcode || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(professional.status, professional.isVerified)}
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(professional.createdAt)}
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {/* Botón Ver */}
                      <button 
                        onClick={() => {
                          setSelectedProfessional(professional);
                          setShowViewModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Ver detalles"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      
                      {/* Botones según estado */}
                      {professional.status === 'pending' && (
                        <>
                      <button 
                            onClick={() => {
                              setSelectedProfessional(professional);
                              setShowVerifyModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="Verificar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                          <button
                            onClick={() => {
                              setSelectedProfessional(professional);
                              setShowRejectModal(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Rechazar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                        </>
                      )}
                      
                      {professional.status === 'active' && (
                  <button
                          onClick={() => {
                            setSelectedProfessional(professional);
                            setShowDeactivateModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Desactivar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                      )}
                      
                      {professional.status === 'inactive' && (
                <button
                          onClick={() => handleReactivateProfessional(professional.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Reactivar"
                >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
                  </svg>
                </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
                </div>
              )}
                </div>

      {/* Modal Ver Profesional - Detalles Completos */}
      {showViewModal && selectedProfessional && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-gray-900">Detalles Completos del Profesional</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
                  </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Información Personal */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Información Personal</h4>
                
                <div className="grid grid-cols-2 gap-4">
                      <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre</label>
                    <p className="text-sm text-gray-900">{selectedProfessional.fullName || selectedProfessional.name || 'N/A'}</p>
                      </div>
                      <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900">{selectedProfessional.email}</p>
                              </div>
                      </div>

                      <div>
                  <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <p className="text-sm text-gray-900">{selectedProfessional.phone || 'N/A'}</p>
                      </div>

                      <div>
                  <label className="block text-sm font-medium text-gray-700">Biografía</label>
                  <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded-md">{selectedProfessional.bio || 'N/A'}</p>
                      </div>
                      </div>

              {/* Información Profesional */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Información Profesional</h4>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-700">Código Profesional</label>
                    <p className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">{selectedProfessional.professionalcode || 'N/A'}</p>
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700">Años de Experiencia</label>
                    <p className="text-sm text-gray-900">{selectedProfessional.exprecienceYears || 'N/A'}</p>
                        </div>
                        </div>

                        <div>
                  <label className="block text-sm font-medium text-gray-700">Especialidades</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedProfessional.specialities?.map((speciality, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {speciality}
                      </span>
                    ))}
                  </div>
                        </div>

                        <div>
                  <label className="block text-sm font-medium text-gray-700">Código de Acceso</label>
                  <p className="text-sm text-gray-900 font-mono bg-yellow-100 px-2 py-1 rounded">{selectedProfessional.accessCode || 'N/A'}</p>
                        </div>
                      </div>

              {/* Estado y Fechas */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Estado y Fechas</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <div className="mt-1">
                      {getStatusBadge(selectedProfessional.status, selectedProfessional.isVerified)}
                    </div>
                    </div>
                      <div>
                    <label className="block text-sm font-medium text-gray-700">Verificado</label>
                    <p className="text-sm text-gray-900">{selectedProfessional.isVerified ? 'Sí' : 'No'}</p>
                      </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                      <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Registro</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedProfessional.createdAt)}</p>
                      </div>
                      <div>
                    <label className="block text-sm font-medium text-gray-700">Último Login</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedProfessional.lastLoginAt)}</p>
                      </div>
                    </div>

                {selectedProfessional.verifiedAt && (
                    <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Verificación</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedProfessional.verifiedAt)}</p>
                  </div>
                )}
              </div>

              {/* Estadísticas */}
                    <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Estadísticas</h4>
                
                <div className="grid grid-cols-2 gap-4">
                      <div>
                    <label className="block text-sm font-medium text-gray-700">Sesiones Totales</label>
                    <p className="text-sm text-gray-900">{selectedProfessional.totalSessions || 0}</p>
                      </div>
                      <div>
                    <label className="block text-sm font-medium text-gray-700">Pacientes Totales</label>
                    <p className="text-sm text-gray-900">{selectedProfessional.totalPatients || 0}</p>
                      </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                      <div>
                    <label className="block text-sm font-medium text-gray-700">Calificación</label>
                    <p className="text-sm text-gray-900">{selectedProfessional.rating || 0}/5</p>
                      </div>
                      <div>
                    <label className="block text-sm font-medium text-gray-700">Intentos de Login</label>
                    <p className="text-sm text-gray-900">{selectedProfessional.loginAttempts || 0}</p>
                            </div>
                        </div>
                      </div>
                    </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cerrar
              </button>
                      </div>
                    </div>
                  </div>
                )}

      {/* Modal Verificar Profesional */}
      {showVerifyModal && selectedProfessional && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Verificar Profesional</h3>
                  <button
                onClick={() => setShowVerifyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
                  </button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                ¿Estás seguro de que quieres verificar a <strong>{selectedProfessional.fullName || selectedProfessional.name || 'este profesional'}</strong>?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Importante:</strong> Al verificar este profesional, se activará su cuenta y podrá iniciar sesión en la plataforma. Se enviará una notificación por email.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
                      <button
                onClick={() => setShowVerifyModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                Cancelar
                      </button>
                      <button
                onClick={() => handleVerifyProfessional(selectedProfessional.id)}
                        disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                {loading ? 'Verificando...' : 'Verificar'}
                      </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rechazar Profesional */}
      {showRejectModal && selectedProfessional && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Rechazar Profesional</h3>
                <button
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-gray-600"
                >
                ✕
                </button>
              </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                ¿Estás seguro de que quieres rechazar a <strong>{selectedProfessional.fullName || selectedProfessional.name || 'este profesional'}</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-800">
                  <strong>Importante:</strong> Al rechazar este profesional, no podrá acceder a la plataforma. Se enviará una notificación por email.
                </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                onClick={() => handleRejectProfessional(selectedProfessional.id)}
                    disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                {loading ? 'Rechazando...' : 'Rechazar'}
                  </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Desactivar Profesional */}
      {showDeactivateModal && selectedProfessional && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Desactivar Profesional</h3>
              <button
                onClick={() => setShowDeactivateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
                </button>
              </div>
              
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                ¿Estás seguro de que quieres desactivar a <strong>{selectedProfessional.fullName || selectedProfessional.name || 'este profesional'}</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-800">
                  <strong>Importante:</strong> Al desactivar este profesional, no podrá iniciar sesión en la plataforma hasta que sea reactivado.
                  </p>
                </div>
              </div>
              
            <div className="flex justify-end space-x-3">
                <button
                onClick={() => setShowDeactivateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                onClick={() => handleDeactivateProfessional(selectedProfessional.id)}
                  disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                {loading ? 'Desactivando...' : 'Desactivar'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageProfessionals;
