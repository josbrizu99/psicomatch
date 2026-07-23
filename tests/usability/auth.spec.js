// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Pruebas de Usabilidad - Flujo de Autenticación
 *
 * Cubre:
 *   - Carga correcta de la página de login
 *   - Validación de campos vacíos
 *   - Mensaje de error con credenciales incorrectas
 *   - Navegación entre login y registro
 *   - Visibilidad de contraseña
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Página de Inicio de Sesión', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('Carga correctamente la página de login', async ({ page }) => {
    await expect(page).toHaveTitle(/PsicoMatch/i);
    await expect(page.getByLabel(/correo electrónico/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
  });

  test('Muestra errores de validación con campos vacíos', async ({ page }) => {
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    // El campo requerido debería ser inválido (HTML5 native validation)
    const emailInput = page.getByLabel(/correo electrónico/i);
    await expect(emailInput).toHaveAttribute('required');
  });

  test('Muestra error con credenciales incorrectas', async ({ page }) => {
    await page.getByLabel(/correo electrónico/i).fill('usuario.falso@test.com');
    await page.getByLabel(/contraseña/i).fill('contraseña_incorrecta_123');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // Esperar respuesta del servidor (máx 8s)
    const errorMessage = page.locator('.bg-red-50, [class*="error"]').first();
    await expect(errorMessage).toBeVisible({ timeout: 8000 });
  });

  test('El toggle de contraseña cambia la visibilidad', async ({ page }) => {
    const passwordInput = page.getByLabel(/contraseña/i);
    await passwordInput.fill('miContraseña123');

    // Por defecto es type="password"
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click en el botón del ojo
    await page.locator('button[type="button"]').filter({ has: page.locator('svg') }).first().click();

    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('El enlace "Regístrate aquí" navega a la página de registro', async ({ page }) => {
    await page.getByRole('link', { name: /regístrate aquí/i }).click();
    await expect(page).toHaveURL(/crear-cuenta/);
  });

  test('El enlace del logo navega al inicio', async ({ page }) => {
    await page.getByRole('link', { name: /Psicomatch/i }).first().click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Página de Registro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/crear-cuenta');
    await page.waitForLoadState('networkidle');
  });

  test('Carga correctamente la página de registro', async ({ page }) => {
    await expect(page.getByText(/crear cuenta|crear tu cuenta|regístrate/i).first()).toBeVisible();
  });

  test('El enlace de inicio de sesión navega al login', async ({ page }) => {
    await page.getByRole('link', { name: /inicia sesión/i }).click();
    await expect(page).toHaveURL(/login/);
  });
});
