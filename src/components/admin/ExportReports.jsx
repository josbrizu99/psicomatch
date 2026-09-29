import React, { useState } from 'react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import XLSXStyle from 'xlsx-js-style';
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

  // ─── Helper: obtiene especialidades de un profesional ───────────────────
  // Campos posibles en Firestore (distintos typos históricos):
  //   specialities (doble i — CAMPO REAL confirmado en ProfessionalRegistration.jsx línea 350)
  //   specialties  (correcto)
  //   specialty    (string singular)
  //   speciality   (typo singular)
  const getSpecialty = (p) => {
    const val =
      p.specialities ||
      p.specialties  ||
      p.specialty    ||
      p.speciality   ||
      p.Specialities ||
      p.Specialties  ||
      null;

    if (Array.isArray(val) && val.length > 0) return val.join(', ');
    if (typeof val === 'string' && val.trim() !== '') return val;
    
    // Fallback: buscar cualquier key que contenga 'special'
    const keys = Object.keys(p);
    const specKey = keys.find(k => k.toLowerCase().includes('special'));
    if (specKey && p[specKey]) {
      const v = p[specKey];
      return Array.isArray(v) && v.length > 0 ? v.join(', ') : (typeof v === 'string' ? v : JSON.stringify(v));
    }
    
    // Debugging: return keys as string to see what fields exist
    return keys.length > 0 ? `KEYS: ${keys.join(', ')}` : 'N/A';
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
        getSpecialty(p),
        p.email || 'N/A',
        p.isVerified || p.status === 'active' ? 'Verificado' : (p.status === 'rejected' ? 'Rechazado' : 'Pendiente')
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
      const wb = XLSXStyle.utils.book_new();

      // ── Paleta de colores exacta de la plantilla (Imagen 3) ──────────────
      const C = {
        titleFg:    '5B9BD5', // Azul claro/celeste grande para el título
        subFg:      '595959', // Gris oscuro para subtítulo y texto general
        colHeadBg:  'A6B9C8', // Gris-azul para cabeceras de columna
        colHeadFg:  '333333', // Gris muy oscuro para texto de cabeceras
        rowAlt:     'F2F4F8', // Azul/gris súper claro para filas alternadas
        rowNorm:    'FFFFFF', // Blanco
        border:     'D9D9D9', // Gris claro para bordes
        metaValBg:  'FFFFFF', // Fondo blanco para valores meta
        metaLblFg:  '595959', // Gris para etiquetas meta
      };

      const cell = (v, s = {}) => ({ v, t: typeof v === 'number' ? 'n' : 's', s });

      const borderThin = {
        top: { style: 'thin', color: { rgb: C.border } },
        bottom: { style: 'thin', color: { rgb: C.border } },
        left: { style: 'thin', color: { rgb: C.border } },
        right: { style: 'thin', color: { rgb: C.border } },
      };

      const sTitle = () => ({
        font: { bold: true, sz: 22, color: { rgb: C.titleFg } },
        fill: { fgColor: { rgb: C.rowNorm } },
        alignment: { horizontal: 'left', vertical: 'center' }
      });

      const sSubtitle = () => ({
        font: { italic: true, sz: 9, color: { rgb: C.subFg } },
        fill: { fgColor: { rgb: C.rowNorm } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true }
      });

      const sMetaLabel = (align = 'left') => ({
        font: { sz: 9, color: { rgb: C.metaLblFg } },
        fill: { fgColor: { rgb: C.rowNorm } },
        alignment: { horizontal: align, vertical: 'center' }
      });

      const sMetaValue = (align = 'left') => ({
        font: { sz: 10, color: { rgb: '000000' } },
        fill: { fgColor: { rgb: C.metaValBg } },
        alignment: { horizontal: align, vertical: 'center' },
        border: borderThin
      });

      const sColHead = () => ({
        font: { bold: true, sz: 9, color: { rgb: C.colHeadFg } },
        fill: { fgColor: { rgb: C.colHeadBg } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: borderThin
      });

      const sData = (alt = false, align = 'center') => ({
        font: { sz: 9, color: { rgb: '333333' } },
        fill: { fgColor: { rgb: alt ? C.rowAlt : C.rowNorm } },
        alignment: { horizontal: align, vertical: 'center' },
        border: borderThin
      });

      // Función para construir una hoja con el diseño exacto de la plantilla
      const buildTemplateSheet = ({ title, subtitle, metaRight, cols, headers, rows, colWidths }) => {
        const NCOLS = cols;
        const ws = {};
        let r = 0;

        // Fila 0: Título principal
        ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = cell(title.toUpperCase(), sTitle());
        for (let c = 1; c < NCOLS; c++) ws[XLSXStyle.utils.encode_cell({ r, c })] = cell('', sTitle());
        r++;

        // Fila 1 y 2: Subtítulo
        ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = cell(subtitle, sSubtitle());
        for (let c = 1; c < NCOLS; c++) ws[XLSXStyle.utils.encode_cell({ r, c })] = cell('', sSubtitle());
        r++; r++; // Dejar una fila vacía extra

        // Fila 3 y 4: Meta info (Izquierda: Generado por, Fecha / Derecha: Total Registros, etc)
        // Etiquetas
        ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = cell('GENERADO POR', sMetaLabel('left'));
        ws[XLSXStyle.utils.encode_cell({ r, c: 1 })] = cell('FECHA', sMetaLabel('center'));
        
        // Metas de la derecha (alineadas a la derecha)
        let rightCol = NCOLS - 2;
        if (metaRight && metaRight.length > 0) {
          metaRight.forEach((m, idx) => {
            ws[XLSXStyle.utils.encode_cell({ r: r + idx, c: rightCol })] = cell(m.label, sMetaLabel('right'));
            ws[XLSXStyle.utils.encode_cell({ r: r + idx, c: rightCol + 1 })] = cell(m.value, sMetaValue('right'));
          });
        }
        r++;

        // Valores
        ws[XLSXStyle.utils.encode_cell({ r, c: 0 })] = cell('Sistema PsicoMatch', sMetaValue('left'));
        ws[XLSXStyle.utils.encode_cell({ r, c: 1 })] = cell(`${dateStr} ${timeStr}`, sMetaValue('center'));
        
        r++; r++; // Espacio antes de la tabla

        // Cabeceras de la tabla
        headers.forEach((h, c) => {
          ws[XLSXStyle.utils.encode_cell({ r, c })] = cell(h, sColHead());
        });
        const headerRow = r;
        r++;

        // Filas de datos
        // Rellenar hasta 15 filas mínimo para mantener la estética si hay pocos datos
        const totalRows = Math.max(rows.length, 15);
        for (let i = 0; i < totalRows; i++) {
          const alt = i % 2 === 1;
          const rowData = rows[i] || Array(NCOLS).fill('-');
          
          rowData.forEach((v, c) => {
            // Alinear texto a la izquierda en columnas de nombres/emails, centrar el resto
            const align = (c === 2 || c === 3 || c === 4) && v !== '-' ? 'left' : 'center';
            ws[XLSXStyle.utils.encode_cell({ r, c })] = cell(v, sData(alt, align));
          });
          r++;
        }

        // Merges necesarios para el título y subtítulo
        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: NCOLS - 1 } }, // Título
          { s: { r: 1, c: 0 }, e: { r: 1, c: NCOLS - 1 } }, // Subtítulo
        ];

        ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: NCOLS - 1 } });
        ws['!cols'] = colWidths.map(wch => ({ wch }));
        ws['!rows'] = [
          { hpt: 35 }, // Título grande
          { hpt: 15 }, // Subtítulo
          { hpt: 10 }, // Espacio
          { hpt: 15 }, // Meta etiquetas
          { hpt: 20 }, // Meta valores
          { hpt: 10 }, // Espacio
          { hpt: 25 }, // Cabeceras de tabla
        ];

        return ws;
      };

      // ═══════════════════════════════════════════════════════════
      // HOJA 1 — PROFESIONALES (Con diseño exacto de la plantilla)
      // ═══════════════════════════════════════════════════════════
      const verifiedCount = data.professionals.filter(p => p.isVerified || p.status === 'active').length;
      
      const profsRows = data.professionals.map((p, i) => ([
        i + 1, 
        p.id || '-', 
        p.name || 'Sin nombre', 
        p.email || 'N/A',
        getSpecialty(p),
        p.isVerified || p.status === 'active' ? 'Verificado' : (p.status === 'rejected' ? 'Rechazado' : 'Pendiente'),
        p.rating ? Number(p.rating).toFixed(2) : '0.00'
      ]));

      const wsProfs = buildTemplateSheet({
        title: 'PLANTILLA DE INFORME DE PROFESIONALES REGISTRADOS',
        subtitle: 'Ingrese los datos en la pestaña correspondiente. El sistema calculará los totales automáticamente basándose en los registros de la base de datos de PsicoMatch.',
        metaRight: [
          { label: 'TOTAL PROFESIONALES', value: data.professionals.length },
          { label: 'PROFESIONALES VERIFICADOS', value: verifiedCount }
        ],
        cols: 7,
        headers: ['N.º DE REGISTRO', 'ID DE USUARIO', 'NOMBRE DEL PROFESIONAL', 'CORREO ELECTRÓNICO', 'ESPECIALIDAD', 'ESTADO', 'RATING'],
        rows: profsRows,
        colWidths: [15, 25, 30, 35, 35, 15, 12]
      });
      XLSXStyle.utils.book_append_sheet(wb, wsProfs, 'Profesionales');

      // ═══════════════════════════════════════════════════════════
      // HOJA 2 — SESIONES
      // ═══════════════════════════════════════════════════════════
      const completedCount = data.sessions.filter(s => s.status === 'completed').length;
      
      const sessionsRows = data.sessions.map((s, i) => {
        const prof = data.professionals.find(p => p.id === s.professionalId);
        const user = data.users.find(u => u.id === s.userId);
        const estado = s.status === 'completed' ? 'Completada' : s.status === 'scheduled' ? 'Programada' : s.status === 'cancelled' ? 'Cancelada' : (s.status || '-');
        
        return [
          i + 1,
          s.id || '-',
          user ? (user.name || '-') : (s.userId || '-'),
          prof ? (prof.name || '-') : (s.professionalId || '-'),
          s.sessionType || 'Evaluación',
          estado,
          s.scheduledDate || '-',
          s.duration ? `${s.duration} min` : '-'
        ];
      });

      const wsSessions = buildTemplateSheet({
        title: 'PLANTILLA DE INFORME DE SESIONES BÁSICAS',
        subtitle: 'El reporte muestra el historial detallado de las sesiones programadas, completadas o canceladas en la plataforma.',
        metaRight: [
          { label: 'TOTAL DE SESIONES', value: data.sessions.length },
          { label: 'SESIONES COMPLETADAS', value: completedCount }
        ],
        cols: 8,
        headers: ['N.º DE SESIÓN', 'ID DE SESIÓN', 'PACIENTE', 'PROFESIONAL', 'TIPO DE SESIÓN', 'ESTADO', 'FECHA PROGRAMADA', 'DURACIÓN'],
        rows: sessionsRows,
        colWidths: [15, 25, 25, 25, 20, 15, 20, 15]
      });
      XLSXStyle.utils.book_append_sheet(wb, wsSessions, 'Sesiones');

      // ═══════════════════════════════════════════════════════════
      // HOJA 3 — USUARIOS
      // ═══════════════════════════════════════════════════════════
      const activeUsersCount = data.users.filter(u => u.isActive !== false).length;
      
      const usersRows = data.users.map((u, i) => [
        i + 1,
        u.id || '-',
        u.name || 'Sin nombre',
        u.email || 'N/A',
        u.role === 'admin' ? 'Administrador' : 'Paciente',
        u.isActive !== false ? 'Activo' : 'Inactivo',
        u.createdAt?.toDate ? new Date(u.createdAt.toDate()).toLocaleDateString('es-ES') : '-'
      ]);

      const wsUsers = buildTemplateSheet({
        title: 'PLANTILLA DE INFORME DE USUARIOS PACIENTES',
        subtitle: 'Lista exhaustiva de pacientes registrados en la plataforma, indicando su estado actual.',
        metaRight: [
          { label: 'TOTAL DE USUARIOS', value: data.users.length },
          { label: 'USUARIOS ACTIVOS', value: activeUsersCount }
        ],
        cols: 7,
        headers: ['N.º DE REGISTRO', 'ID DE USUARIO', 'NOMBRE DEL USUARIO', 'CORREO ELECTRÓNICO', 'ROL', 'ESTADO', 'FECHA DE REGISTRO'],
        rows: usersRows,
        colWidths: [15, 25, 30, 35, 15, 15, 20]
      });
      XLSXStyle.utils.book_append_sheet(wb, wsUsers, 'Usuarios');

      XLSXStyle.writeFile(wb, `Reporte_PsicoMatch_${fileDate}.xlsx`);
      toast.success('Excel exportado con la plantilla oficial');
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
