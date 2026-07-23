import React, { useState } from 'react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

const ExportReports = ({ stats }) => {
  const [exporting, setExporting] = useState('');

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const fileDate = now.toISOString().split('T')[0];

  const buildKpiRows = () => [
    ['Usuarios Registrados', stats?.totalUsers ?? 0, 'Total de cuentas activas'],
    ['Profesionales Activos', stats?.totalProfessionals ?? 0, 'Profesionales verificados'],
    ['Sesiones Totales', stats?.totalSessions ?? 0, 'Citas registradas'],
    ['Valoración Promedio', stats?.averageRating ? Number(stats.averageRating).toFixed(2) : 'Sin datos', 'Rating global (0-5)'],
  ];

  const fetchExportData = async () => {
    try {
      const [usersSnap, profsSnap, sessionsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'professionals')),
        getDocs(collection(db, 'userSessions'))
      ]);

      const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const professionals = profsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sessions = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return { users, professionals, sessions };
    } catch (error) {
      console.error("Error fetching export data:", error);
      throw error;
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting('pdf');
      const data = await fetchExportData();
      
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      
      // Clean Invoice Style
      
      // -- Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text('PsicoMatch', 14, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('Plataforma de Salud Mental', 14, 32);
      
      // Company Info (Right aligned)
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFont('helvetica', 'bold');
      doc.text('PsicoMatch Inc.', pageW - 14, 20, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text('info@psicomatch.com', pageW - 14, 25, { align: 'right' });
      doc.text('https://psicomatch.com', pageW - 14, 30, { align: 'right' });
      
      let y = 55;
      
      // -- Report Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Reporte INV/${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${Math.floor(Math.random()*1000).toString().padStart(4, '0')}`, 14, y);
      y += 8;
      
      // Dates
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('Fecha de generación:', 14, y);
      doc.text('Sistema:', 80, y);
      
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`${dateStr} ${timeStr}`, 14, y);
      doc.text('Admin Dashboard', 80, y);
      
      y += 10;
      
      // Helper function for plain tables
      const addTable = (title, head, body, startY) => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(title, 14, startY);
        
        autoTable(doc, {
          startY: startY + 4,
          head: head,
          body: body,
          theme: 'plain',
          styles: {
            fontSize: 9,
            cellPadding: 4,
            textColor: [71, 85, 105], // slate-600
          },
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            lineWidth: { top: 0.5, bottom: 0.5 },
            lineColor: [15, 23, 42]
          },
          bodyStyles: {
            lineWidth: { bottom: 0.1 },
            lineColor: [226, 232, 240] // slate-200
          },
          margin: { left: 14, right: 14 },
        });
        return doc.lastAutoTable.finalY + 15;
      };

      // 1. KPIs Table
      y = addTable(
        'Resumen de Métricas',
        [['Descripción', 'Valor', 'Detalle']],
        buildKpiRows(),
        y
      );

      // 2. Users Table (max 20 for PDF to avoid huge files, Excel gets all)
      const usersData = data.users.slice(0, 20).map(u => [
        u.name || 'Sin nombre',
        u.email || 'N/A',
        u.role === 'admin' ? 'Administrador' : 'Paciente',
        u.createdAt?.toDate ? new Date(u.createdAt.toDate()).toLocaleDateString('es-ES') : 'N/A'
      ]);
      if(usersData.length > 0) {
        y = addTable(
          'Últimos Usuarios Registrados (Muestra)',
          [['Nombre', 'Correo Electrónico', 'Rol', 'Fecha de Registro']],
          usersData,
          y
        );
      }

      // 3. Professionals Table
      const profsData = data.professionals.slice(0, 20).map(p => [
        p.name || 'Sin nombre',
        p.specialty || 'N/A',
        p.email || 'N/A',
        p.verified ? 'Verificado' : 'Pendiente'
      ]);
      if(profsData.length > 0) {
        y = addTable(
          'Lista de Profesionales (Muestra)',
          [['Nombre', 'Especialidad', 'Correo', 'Estado']],
          profsData,
          y
        );
      }

      // 4. Sessions Table (max 20 for PDF)
      const sessionsData = data.sessions.slice(0, 20).map(s => {
        let prof = data.professionals.find(p => p.id === s.professionalId);
        let user = data.users.find(u => u.id === s.userId);
        return [
          s.scheduledDate || 'Sin fecha',
          user ? user.name : 'Usuario',
          prof ? prof.name : 'Profesional',
          s.status === 'completed' ? 'Completada' : s.status === 'scheduled' ? 'Programada' : s.status
        ];
      });
      if(sessionsData.length > 0) {
        y = addTable(
          'Sesiones Recientes (Muestra)',
          [['Fecha programada', 'Paciente', 'Profesional', 'Estado']],
          sessionsData,
          y
        );
      }
      
      // Footer Pagination
      const pageCount = doc.internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.5);
        doc.line(14, pageH - 20, pageW - 14, pageH - 20);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text('+1 (555) 123-4567', 14, pageH - 15);
        doc.text('info@psicomatch.com', 14, pageH - 11);
        doc.text('https://psicomatch.com', 14, pageH - 7);
        
        doc.text('PsicoMatch (Asunción)', pageW / 2 - 20, pageH - 15);
        
        // Page number block like in invoice
        doc.setFillColor(15, 23, 42);
        doc.rect(pageW - 22, pageH - 17, 8, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(String(i), pageW - 19, pageH - 11.5);
      }

      doc.save(`Reporte_Sistema_${fileDate}.pdf`);
      toast.success('PDF exportado correctamente');
    } catch (error) {
      console.error('Error exportando PDF:', error);
      toast.error('Error al generar el PDF');
    } finally {
      setExporting('');
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting('excel');
      const data = await fetchExportData();
      const wb = XLSX.utils.book_new();

      // -- Sheet 1: Resumen
      const kpis = buildKpiRows();
      const resumenData = [
        ['PSICOMATCH — Reporte Estadístico General'],
        [],
        ['Fecha de generación:', `${dateStr} ${timeStr}`],
        [],
        ['INDICADORES CLAVE'],
        ['Métrica', 'Valor', 'Descripción'],
        ...kpis
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(resumenData);
      ws1['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 40 }];
      ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

      // -- Sheet 2: Usuarios
      const usersSheet = [
        ['ID', 'Nombre', 'Correo', 'Rol', 'Estado', 'Fecha Registro'],
        ...data.users.map(u => [
          u.id,
          u.name || '',
          u.email || '',
          u.role || 'user',
          u.isActive !== false ? 'Activo' : 'Inactivo',
          u.createdAt?.toDate ? new Date(u.createdAt.toDate()).toISOString() : ''
        ])
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(usersSheet);
      ws2['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Usuarios');

      // -- Sheet 3: Profesionales
      const profsSheet = [
        ['ID', 'Nombre', 'Correo', 'Especialidad', 'Verificado', 'Rating'],
        ...data.professionals.map(p => [
          p.id,
          p.name || '',
          p.email || '',
          p.specialty || '',
          p.verified ? 'Sí' : 'No',
          p.rating || 0
        ])
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(profsSheet);
      ws3['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Profesionales');

      // -- Sheet 4: Sesiones
      const sessionsSheet = [
        ['ID Sesión', 'ID Paciente', 'Nombre Paciente', 'ID Profesional', 'Nombre Profesional', 'Tipo', 'Estado', 'Fecha Programada', 'Duración (min)'],
        ...data.sessions.map(s => {
          let prof = data.professionals.find(p => p.id === s.professionalId);
          let user = data.users.find(u => u.id === s.userId);
          return [
            s.id,
            s.userId,
            user ? user.name : '',
            s.professionalId,
            prof ? prof.name : '',
            s.sessionType || 'evaluation',
            s.status || 'scheduled',
            s.scheduledDate || '',
            s.duration || 0
          ];
        })
      ];
      const ws4 = XLSX.utils.aoa_to_sheet(sessionsSheet);
      ws4['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws4, 'Sesiones');

      XLSX.writeFile(wb, `Reporte_PsicoMatch_${fileDate}.xlsx`);
      toast.success('Excel exportado correctamente');
    } catch (error) {
      console.error('Error exportando Excel:', error);
      toast.error('Error al generar el Excel');
    } finally {
      setExporting('');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Reportes y Exportación</h2>
          <p className="text-sm text-gray-500 max-w-xl">
            Genera reportes detallados con información completa sobre usuarios, profesionales, y sesiones. 
            El reporte PDF está formateado para presentaciones y uso ejecutivo.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-4 sm:mt-0">
          <button
            onClick={handleExportExcel}
            disabled={!!exporting}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors border border-green-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting === 'excel' ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-green-700" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {exporting === 'excel' ? 'Generando Excel...' : 'Exportar Excel (CSV)'}
          </button>
          
          <button
            onClick={handleExportPDF}
            disabled={!!exporting}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors border border-red-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting === 'pdf' ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-700" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )}
            {exporting === 'pdf' ? 'Generando PDF...' : 'Exportar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportReports;
