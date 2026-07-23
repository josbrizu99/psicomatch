/**
 * Script de Pruebas de Rendimiento con Lighthouse
 *
 * Analiza las páginas clave de PsicoMatch y genera:
 *   - Un reporte HTML por página en tests/reports/lighthouse/
 *   - Un resumen en consola con los puntajes principales
 *
 * Requiere que la app esté corriendo en localhost:3000
 * Ejecutar con: npm run test:perf
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// Páginas a analizar
const PAGES_TO_AUDIT = [
  { name: 'Home', url: 'http://localhost:3000/' },
  { name: 'Login', url: 'http://localhost:3000/login' },
  { name: 'Registro', url: 'http://localhost:3000/crear-cuenta' },
  { name: 'Login-Profesional', url: 'http://localhost:3000/professional-login' },
];

// Directorio de reportes
const REPORTS_DIR = path.join(__dirname, '..', 'reports', 'lighthouse');

// Umbrales mínimos aceptables (0-1)
const THRESHOLDS = {
  performance:    0.50, // 50 puntos (mínimo tolerable, ideal >70)
  accessibility:  0.80, // 80 puntos
  'best-practices': 0.80,
  seo:            0.80,
};

// Colores para consola
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const CYAN   = '\x1b[36m';

function getScoreColor(score, threshold) {
  if (score >= threshold && score >= 0.90) return GREEN;
  if (score >= threshold)                  return YELLOW;
  return RED;
}

function scoreBar(score) {
  const filled = Math.round(score * 20);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
  return `[${bar}]`;
}

async function runAudit(pageConfig, chrome) {
  console.log(`\n${CYAN}Auditando: ${pageConfig.name} (${pageConfig.url})${RESET}`);

  const options = {
    logLevel: 'silent',
    output: ['html', 'json'],
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
  };

  const runnerResult = await lighthouse(pageConfig.url, options);
  return runnerResult;
}

function saveReport(runnerResult, pageName) {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseName = `${pageName}-${timestamp}`;

  // Guardar reporte HTML
  const htmlPath = path.join(REPORTS_DIR, `${baseName}.html`);
  fs.writeFileSync(htmlPath, runnerResult.report[0]);

  // Guardar reporte JSON
  const jsonPath = path.join(REPORTS_DIR, `${baseName}.json`);
  fs.writeFileSync(jsonPath, runnerResult.report[1]);

  return htmlPath;
}

function printResults(pageName, categories) {
  console.log(`\n${BOLD}  Resultados - ${pageName}${RESET}`);
  console.log('  ' + '─'.repeat(55));

  const metrics = [
    { key: 'performance',     label: 'Rendimiento   ' },
    { key: 'accessibility',   label: 'Accesibilidad ' },
    { key: 'best-practices',  label: 'Buenas Prác.  ' },
    { key: 'seo',             label: 'SEO           ' },
  ];

  for (const metric of metrics) {
    const cat = categories[metric.key];
    if (!cat) continue;

    const score = cat.score ?? 0;
    const pct   = Math.round(score * 100);
    const threshold = THRESHOLDS[metric.key] ?? 0.8;
    const color = getScoreColor(score, threshold);
    const bar   = scoreBar(score);
    const status = score >= threshold ? '✓' : '✗';

    console.log(`  ${color}${status} ${metric.label} ${bar} ${String(pct).padStart(3)}%${RESET}`);
  }
}

async function main() {
  console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}  Pruebas de Rendimiento - PsicoMatch Lighthouse   ${RESET}`);
  console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════${RESET}`);
  console.log(`\n  Analizando ${PAGES_TO_AUDIT.length} página(s)...`);
  console.log(`  Reportes HTML: ${REPORTS_DIR}\n`);

  let chrome;
  const allResults = [];
  let failedThresholds = 0;

  try {
    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] });

    for (const pageConfig of PAGES_TO_AUDIT) {
      try {
        const runnerResult = await runAudit(pageConfig, chrome);
        const categories = runnerResult.lhr.categories;
        const htmlPath = saveReport(runnerResult, pageConfig.name);

        printResults(pageConfig.name, categories);
        console.log(`  Reporte HTML: ${path.basename(htmlPath)}`);

        // Verificar umbrales
        for (const [key, threshold] of Object.entries(THRESHOLDS)) {
          const score = categories[key]?.score ?? 0;
          if (score < threshold) {
            failedThresholds++;
            console.log(`  ${RED}  ! ${key} (${Math.round(score * 100)}%) está por debajo del umbral mínimo (${Math.round(threshold * 100)}%)${RESET}`);
          }
        }

        allResults.push({ page: pageConfig.name, categories });
      } catch (err) {
        console.error(`\n  ${RED}Error auditando ${pageConfig.name}: ${err.message}${RESET}`);
        console.error(`  Asegúrate de que la app esté corriendo en ${pageConfig.url}`);
      }
    }

  } finally {
    if (chrome) await chrome.kill();
  }

  // Resumen global
  console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  Resumen Global${RESET}`);
  console.log('  ' + '─'.repeat(55));

  if (allResults.length === 0) {
    console.log(`\n  ${RED}No se pudo auditar ninguna página. Verifica que la app esté corriendo.${RESET}`);
    process.exit(1);
  }

  const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
  for (const cat of categories) {
    const scores = allResults.map(r => r.categories[cat]?.score ?? 0);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const threshold = THRESHOLDS[cat] ?? 0.8;
    const color = getScoreColor(avg, threshold);
    const label = cat.padEnd(16);
    console.log(`  ${color}${label}: ${Math.round(avg * 100)}% promedio${RESET}`);
  }

  console.log(`\n  Páginas auditadas: ${allResults.length}/${PAGES_TO_AUDIT.length}`);
  console.log(`  Umbrales fallidos: ${failedThresholds}`);
  console.log(`  Reportes guardados en: ${REPORTS_DIR}`);

  if (failedThresholds > 0) {
    console.log(`\n  ${YELLOW}Revisa los reportes HTML para ver los detalles.${RESET}`);
  } else {
    console.log(`\n  ${GREEN}Todas las métricas cumplen con los umbrales minimos.${RESET}`);
  }

  console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════${RESET}\n`);

  process.exit(failedThresholds > 0 ? 1 : 0);
}

main();
