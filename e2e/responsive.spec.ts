import { test, expect, type Page } from '@playwright/test';

// Breakpoint de diseño: 640px. Ninguna pantalla puede generar scroll
// horizontal a ese ancho o por debajo (ver app/globals.css).
async function hasNoHorizontalScroll(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}

test.describe('sin scroll horizontal en teléfono', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, 'solo aplica al proyecto de teléfono (ancho angosto real)');
  });

  test('/', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('switch', { name: 'Practicar か行' })).toBeVisible();
    expect(await hasNoHorizontalScroll(page)).toBe(true);
  });

  test('/mazos', async ({ page }) => {
    await page.goto('/mazos');
    expect(await hasNoHorizontalScroll(page)).toBe(true);
  });

  test('/mazos/<hiragana>', async ({ page, request, baseURL }) => {
    const res = await request.get(`${baseURL}/api/decks`);
    const decks = await res.json();
    const hiragana = decks.find((d: { name: string }) => d.name === 'Hiragana');
    expect(hiragana).toBeTruthy();

    await page.goto(`/mazos/${hiragana.id}`);
    expect(await hasNoHorizontalScroll(page)).toBe(true);
  });

  test('/estadisticas', async ({ page }) => {
    await page.goto('/estadisticas');
    expect(await hasNoHorizontalScroll(page)).toBe(true);
  });
});
