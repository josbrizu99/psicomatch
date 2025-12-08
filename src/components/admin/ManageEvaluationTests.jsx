import React, { useState, useEffect } from 'react';
import { 
  getEvaluationTests, 
  deleteEvaluationTest, 
  updateTestState,
  TEST_STATES,
  QUESTION_TYPES 
} from '../../services/evaluationTestService';
import CreateEvaluationTest from './CreateEvaluationTest';

const ManageEvaluationTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Especialidades disponibles
  const specialities = [
    'Ansiedad',
    'Depresión', 
    'Estrés',
    'Trauma',
    'Parejas',
    'Familiar',
    'Infantil',
    'Adolescentes',
    'Adultos',
    'TOC',
    'Fobias',
    'Duelo',
    'Adicciones',
    'Autoestima',
    'Desarrollo personal',
    'Crisis existencial',
    'Problemas laborales',
    'Problemas académicos',
    'Trastornos alimentarios',
    'Trastornos del sueño',
    'Otros'
  ];

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await getEvaluationTests();
      if (result.success) {
        setTests(result.tests);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error al cargar tests:', error);
      setError('Error al cargar los tests de evaluación');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async () => {
    if (!selectedTest) return;

    try {
      const result = await deleteEvaluationTest(selectedTest.id);
      if (result.success) {
        setMessage('Test eliminado exitosamente');
        setTests(tests.filter(test => test.id !== selectedTest.id));
        setShowDeleteModal(false);
        setSelectedTest(null);
        
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error al eliminar test:', error);
      setError('Error al eliminar el test');
    }
  };

  const handleStateChange = async (testId, newState) => {
    try {
      const result = await updateTestState(testId, newState);
      if (result.success) {
        setMessage(`Estado del test actualizado a ${newState === TEST_STATES.ACTIVE ? 'Activo' : 'Inactivo'}`);
        setTests(tests.map(test => 
          test.id === testId ? { ...test, state: newState } : test
        ));
        
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      setError('Error al cambiar el estado del test');
    }
  };

  const getStateBadge = (state) => {
    switch (state) {
      case TEST_STATES.ACTIVE:
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Activo</span>;
      case TEST_STATES.DRAFT:
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Borrador</span>;
      case TEST_STATES.INACTIVE:
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Inactivo</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Desconocido</span>;
    }
  };

  const getQuestionTypeLabel = (type) => {
    switch (type) {
      case QUESTION_TYPES.MULTIPLE_CHOICE:
        return 'Opciones múltiples';
      case QUESTION_TYPES.LIKERT:
        return 'Escala Likert';
      case QUESTION_TYPES.TRUE_FALSE:
        return 'Verdadero/Falso';
      default:
        return 'Desconocido';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  // Filtrar tests
  const filteredTests = tests.filter(test => {
    const matchesSearch = !searchTerm || 
      test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesState = stateFilter === 'all' || test.state === stateFilter;
    
    const matchesSpecialty = specialtyFilter === 'all' || 
      (test.specialties && test.specialties.includes(specialtyFilter));
    
    return matchesSearch && matchesState && matchesSpecialty;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tests de evaluación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Tests de Evaluación</h1>
            <p className="text-gray-600 mt-1">Administra los tests psicológicos para evaluar usuarios</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadTests}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Crear Nuevo Test</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
            <input
              type="text"
              placeholder="Título o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value={TEST_STATES.ACTIVE}>Activos</option>
              <option value={TEST_STATES.DRAFT}>Borradores</option>
              <option value={TEST_STATES.INACTIVE}>Inactivos</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Especialidad</label>
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">Todas las especialidades</option>
              {specialities.map(specialty => (
                <option key={specialty} value={specialty}>{specialty}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStateFilter('all');
                setSpecialtyFilter('all');
              }}
              className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de tests */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Especialidades
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preguntas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Creado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{test.title}</div>
                      <div className="text-sm text-gray-500">{test.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {test.specialties?.slice(0, 2).map(specialty => (
                        <span key={specialty} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          {specialty}
                        </span>
                      ))}
                      {test.specialties?.length > 2 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          +{test.specialties.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {test.questions?.length || 0} preguntas
                    </div>
                    <div className="text-xs text-gray-500">
                      {test.categorizationQuestions?.length || 0} de categorización
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStateBadge(test.state)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {formatDate(test.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedTest(test);
                          setShowPreviewModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="Vista previa"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedTest(test);
                          setShowEditModal(true);
                        }}
                        className="text-green-600 hover:text-green-900 transition-colors"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => handleStateChange(test.id, 
                          test.state === TEST_STATES.ACTIVE ? TEST_STATES.INACTIVE : TEST_STATES.ACTIVE
                        )}
                        className={`transition-colors ${
                          test.state === TEST_STATES.ACTIVE 
                            ? 'text-orange-600 hover:text-orange-900' 
                            : 'text-green-600 hover:text-green-900'
                        }`}
                        title={test.state === TEST_STATES.ACTIVE ? 'Desactivar' : 'Activar'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedTest(test);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredTests.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No se encontraron tests que coincidan con los filtros</p>
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {tests.filter(t => t.state === TEST_STATES.ACTIVE).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Borradores</p>
              <p className="text-2xl font-bold text-gray-900">
                {tests.filter(t => t.state === TEST_STATES.DRAFT).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inactivos</p>
              <p className="text-2xl font-bold text-gray-900">
                {tests.filter(t => t.state === TEST_STATES.INACTIVE).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{tests.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && selectedTest && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-2xl rounded-xl bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Confirmar Eliminación</h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedTest(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <strong>Advertencia:</strong> Esta acción no se puede deshacer. Se eliminará permanentemente el test <strong>{selectedTest.title}</strong> y todos sus datos asociados.
                  </p>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p><strong>Test:</strong> {selectedTest.title}</p>
                  <p><strong>Especialidades:</strong> {selectedTest.specialties?.join(', ')}</p>
                  <p><strong>Preguntas:</strong> {selectedTest.questions?.length || 0}</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedTest(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteTest}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Eliminar Test
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de vista previa */}
      {showPreviewModal && selectedTest && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-2xl rounded-xl bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Vista Previa del Test</h3>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setSelectedTest(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Información básica */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Información General</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Título</label>
                    <p className="text-gray-900">{selectedTest.title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <div className="mt-1">{getStateBadge(selectedTest.state)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tiempo estimado</label>
                    <p className="text-gray-900">{selectedTest.estimatedTime} minutos</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de creación</label>
                    <p className="text-gray-900">{formatDate(selectedTest.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Descripción</label>
                  <p className="text-gray-900 mt-1">{selectedTest.description}</p>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Especialidades</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTest.specialties?.map(specialty => (
                      <span key={specialty} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
                {selectedTest.instructions && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Instrucciones</label>
                    <p className="text-gray-900 mt-1 bg-blue-50 p-3 rounded-lg">{selectedTest.instructions}</p>
                  </div>
                )}
              </div>

              {/* Preguntas de categorización */}
              {selectedTest.categorizationQuestions && selectedTest.categorizationQuestions.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Preguntas de Categorización</h4>
                  <div className="space-y-4">
                    {selectedTest.categorizationQuestions.map((question, index) => (
                      <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3">
                          {index + 1}. {question.text}
                        </h5>
                        <div className="space-y-2">
                          {question.options.map((option, optIndex) => (
                            <div key={option.id} className="flex items-center text-sm text-gray-600">
                              <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mr-3 text-xs font-medium">
                                {optIndex + 1}
                              </span>
                              {option.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preguntas del test */}
              {selectedTest.questions && selectedTest.questions.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Preguntas del Test ({selectedTest.questions.length})
                  </h4>
                  <div className="space-y-4">
                    {selectedTest.questions.map((question, index) => (
                      <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h5 className="font-medium text-gray-900">
                            {index + 1}. {question.text}
                            {question.required && <span className="text-red-500 ml-1">*</span>}
                          </h5>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              question.type === QUESTION_TYPES.MULTIPLE_CHOICE ? 'bg-blue-100 text-blue-800' :
                              question.type === QUESTION_TYPES.LIKERT ? 'bg-green-100 text-green-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {getQuestionTypeLabel(question.type)}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              question.importance === 'high' ? 'bg-red-100 text-red-800' :
                              question.importance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {question.importance === 'high' ? 'Alta' :
                               question.importance === 'medium' ? 'Media' : 'Baja'}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {question.options.map((option, optIndex) => (
                            <div key={option.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                              <div className="flex items-center">
                                <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center mr-3 text-xs font-medium">
                                  {optIndex + 1}
                                </span>
                                <span className="text-sm text-gray-900">{option.text}</span>
                              </div>
                              <span className="text-sm font-medium text-gray-600">
                                {option.score} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rangos de puntuación */}
              {selectedTest.scoreRanges && selectedTest.scoreRanges.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Rangos de Puntuación ({selectedTest.scoreRanges.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedTest.scoreRanges.map((range, index) => (
                      <div key={range.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 mb-2">
                              {range.level} ({range.minScore}-{range.maxScore || '∞'})
                            </h5>
                            <p className="text-sm text-gray-600 mb-2">{range.description}</p>
                            {range.recommendation && (
                              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                <h6 className="text-sm font-medium text-blue-900 mb-1">Recomendación:</h6>
                                <p className="text-sm text-blue-800">{range.recommendation}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="flex justify-between pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowEditModal(true);
                    setShowPreviewModal(false);
                  }}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Editar Test
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setSelectedTest(null);
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de creación */}
      {showCreateModal && (
        <CreateEvaluationTest
          onClose={() => {
            setShowCreateModal(false);
            loadTests();
          }}
        />
      )}

      {/* Modal de edición */}
      {showEditModal && selectedTest && (
        <CreateEvaluationTest
          testToEdit={selectedTest}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTest(null);
            loadTests();
          }}
        />
      )}

      {/* Mensajes */}
      {message && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl z-50">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{message}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-xl shadow-2xl z-50">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageEvaluationTests;
