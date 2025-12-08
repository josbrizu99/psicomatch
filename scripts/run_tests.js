const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 Iniciando Suite de Pruebas...');

try {
 

  // 3. Ejecutar pruebas E2E con Puppeteer
  console.log('🌐 Ejecutando Pruebas E2E y de Rendimiento...');
  const scenarioPath = path.join(__dirname, '../tests/e2e/scenarios.js');
  execSync(`node "${scenarioPath}"`, { stdio: 'inherit' });

  console.log('✅ Todas las pruebas completadas.');
} catch (error) {
  console.error('❌ Error ejecutando pruebas:', error);
  process.exit(1);
}
