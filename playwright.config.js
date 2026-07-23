// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Configuración principal de Playwright para pruebas E2E de PsicoMatch.
 * La app debe estar corriendo localmente antes de ejecutar los tests.
 * Ejecutar con: npm run test:e2e
 */
module.exports = defineConfig({
  testDir: './tests/usability',
  testMatch: '**/*.spec.js',
  
  // Tiempo máximo por test completo
  timeout: 30_000,
  
  // Tiempo máximo de espera para aserciones (expect)
  expect: {
    timeout: 10_000,
  },

  // Mostrar reporte HTML al finalizar
  reporter: [
    ['html', { outputFolder: 'tests/reports/playwright-html', open: 'never' }],
    ['list'],
  ],

  // Directorio para capturas de pantalla y videos (separado del HTML reporter)
  outputDir: 'tests/reports/playwright-results',

  use: {
    // URL base de la app en desarrollo
    baseURL: 'http://localhost:3000',

    // Captura de pantalla solo en caso de fallo
    screenshot: 'only-on-failure',

    // Video solo en caso de fallo
    video: 'retain-on-failure',

    // Traza para analizar fallas
    trace: 'on-first-retry',

    // Emular un navegador real (no headless) si se quiere ver en vivo
    headless: true,
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Android',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile iPhone',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
