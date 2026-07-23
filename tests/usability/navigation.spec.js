// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Pruebas de Usabilidad - Navegación General y Carga de Páginas
 *
 * Cubre:
 *   - Home page (landing) se carga correctamente
 *   - Navbar y Footer visibles
 *   - Rutas principales devuelven contenido
 *   - Página 404 para rutas inexistentes
 *   - Tiempo de carga aceptable
 *   - Botones y CTAs principales visibles y clickeables
 *   - Responsividad básica (viewport móvil)
 */

test.describe('Home - Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Usar domcontentloaded para evitar timeout con Firebase (conexiones persistentes)
    await page.waitForLoadState('domcontentloaded');
  });

  test('Carga correctamente la página principal', async ({ page }) => {
    await expect(page).toHaveTitle(/PsicoMatch/i);
    // Verificar que hay un encabezado principal visible
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });

  test('El navbar está visible y contiene los enlaces principales', async ({ page }) => {
    const navbar = page.locator('nav, header').first();
    await expect(navbar).toBeVisible();

    // Verificar que hay links de navegación
    const links = page.locator('nav a, header a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });

  test('El footer está presente', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('Existen botones de llamada a la acción (CTA)', async ({ page }) => {
    const ctaButtons = page.getByRole('link', { name: /iniciar|comenzar|registrar|empezar|acceder/i });
    const count = await ctaButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('El enlace de Login navega correctamente', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /inicia sesión|iniciar sesión/i }).first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/login/);
    } else {
      test.skip(true, 'Enlace de login no visible en el viewport actual');
    }
  });

  test('La página carga en menos de 5 segundos', async ({ page }) => {
    // Medir el tiempo desde navegación hasta DOM cargado
    // La página ya fue cargada por beforeEach, medimos una recarga limpia
    const startTime = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe('Navegación entre páginas públicas', () => {
  const publicRoutes = [
    { path: '/', name: 'Home' },
    { path: '/login', name: 'Login' },
    { path: '/crear-cuenta', name: 'Registro' },
    { path: '/professional-login', name: 'Login Profesional' },
    { path: '/professional-registration', name: 'Registro Profesional' },
  ];

  for (const route of publicRoutes) {
    test(`${route.name} (${route.path}) carga sin errores`, async ({ page }) => {
      /**
       * @type {string[]}
       */
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');

      // No debe haber errores críticos de JavaScript
      const criticalErrors = errors.filter(e =>
        !e.includes('Warning') &&
        !e.includes('ResizeObserver') &&
        !e.includes('non-passive')
      );
      expect(criticalErrors).toHaveLength(0);

      // La página debe tener al menos un elemento visible
      await expect(page.locator('body')).toBeVisible();
    });
  }
});

test.describe('Página 404 - Rutas no encontradas', () => {
  test('Muestra una página de error amigable para rutas inexistentes', async ({ page }) => {
    await page.goto('/ruta-que-no-existe-xyz-123');
    await page.waitForLoadState('domcontentloaded');

    // Debe mostrar algún contenido de error (no una pantalla en blanco)
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(0);

    // Buscar texto relacionado con error o página no encontrada
    const errorText = page.getByText(/404|no encontrad|perdid|error/i).first();
    await expect(errorText).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Accesibilidad básica', () => {
  test('Las imágenes tienen atributos alt', async ({ page }) => {
    await page.goto('/');
    // Usar domcontentloaded para evitar timeout con Firebase (conexiones persistentes)
    await page.waitForLoadState('domcontentloaded');
    // Esperar un poco más para que carguen los componentes dinámicos
    await page.waitForTimeout(2000);

    const images = page.locator('img:not([alt])');
    const countWithoutAlt = await images.count();

    // Ninguna imagen crítica debería carecer del atributo alt
    expect(countWithoutAlt).toBe(0);
  });

  test('Los inputs de login tienen labels asociados', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const inputs = page.locator('input[type="email"], input[type="password"]');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const labelCount = await label.count();
        expect(labelCount).toBeGreaterThan(0);
      }
    }
  });
});
