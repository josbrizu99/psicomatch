import React from 'react';
import toast from 'react-hot-toast';

const ExportReports = ({ stats, onExport }) => {
    const handleExportCSV = () => {
        try {
            // Crear CSV con estadísticas
            const csvData = [
                ['Métrica', 'Valor'],
                ['Total Usuarios', stats?.totalUsers || 0],
                ['Total Profesionales', stats?.totalProfessionals || 0],
                ['Total Sesiones', stats?.totalSessions || 0],
                ['Sesiones Completadas', stats?.completedSessions || 0],
                ['Rating Promedio', stats?.averageRating || 0],
                ['Fecha de Reporte', new Date().toLocaleDateString('es-ES')]
            ];

            const csvContent = csvData.map(row => row.join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `reporte-psicomatch-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success('Reporte CSV descargado exitosamente');
        } catch (error) {
            console.error('Error exportando CSV:', error);
            toast.error('Error al exportar el reporte');
        }
    };

    const handleExportJSON = () => {
        try {
            const jsonData = {
                fecha: new Date().toISOString(),
                estadisticas: stats,
                generadoPor: 'PsicoMatch Admin Dashboard'
            };

            const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `reporte-psicomatch-${new Date().toISOString().split('T')[0]}.json`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success('Reporte JSON descargado exitosamente');
        } catch (error) {
            console.error('Error exportando JSON:', error);
            toast.error('Error al exportar el reporte');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Exportar Reportes</h3>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                    <div>
                        <h4 className="font-semibold text-gray-900">Reporte CSV</h4>
                        <p className="text-sm text-gray-600">Exportar estadísticas en formato CSV</p>
                    </div>
                    <button
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Descargar CSV</span>
                    </button>
                </div>

                <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                    <div>
                        <h4 className="font-semibold text-gray-900">Reporte JSON</h4>
                        <p className="text-sm text-gray-600">Exportar datos completos en formato JSON</p>
                    </div>
                    <button
                        onClick={handleExportJSON}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Descargar JSON</span>
                    </button>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <h5 className="font-medium text-blue-900 mb-1">Información</h5>
                            <p className="text-sm text-blue-700">
                                Los reportes incluyen las estadísticas actuales del sistema.
                                Para reportes más detallados con rangos de fechas personalizados,
                                contacta al equipo de desarrollo.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExportReports;
