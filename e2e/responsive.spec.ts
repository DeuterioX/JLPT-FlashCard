import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

// Breakpoint de diseño: 640px. Ninguna pantalla puede generar scroll
// horizontal a ese ancho o por debajo (ver app/globals.css).
async function hasNoHorizontalScroll(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}

// Hiragana tiene varios grupos (a diferencia de un mazo con uno solo), así
// que es el único mazo donde el editor realmente renderiza la columna de
// grupos / tira de chips que este archivo pone a prueba.
async function hiraganaDeckId(request: APIRequestContext, baseURL: string | undefined) {
  const res = await request.get(`${baseURL}/api/decks`);
  const decks = await res.json();
  const hiragana = decks.find((d: { name: string }) => d.name === 'Hiragana');
  expect(hiragana).toBeTruthy();
  return hiragana.id as number;
}

test.describe('sin scroll horizontal en teléfono', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, 'solo aplica al proyecto de teléfono (ancho angosto real)');
  });

  test('/', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('switch', { name: 'Practicar Serie K', exact: true })).toBeVisible();
    expect(await hasNoHorizontalScroll(page)).toBe(true);
  });

  test('/decks', async ({ page }) => {
    await page.goto('/decks');
    expect(await hasNoHorizontalScroll(page)).toBe(true);
  });

  test('/decks/<hiragana>', async ({ page, request, baseURL }) => {
    const id = await hiraganaDeckId(request, baseURL);
    await page.goto(`/decks/${id}`);
    expect(await hasNoHorizontalScroll(page)).toBe(true);
  });

  test('/stats', async ({ page }) => {
    await page.goto('/stats');
    expect(await hasNoHorizontalScroll(page)).toBe(true);
  });
});

test.describe('editor de mazo en teléfono', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, 'solo aplica al proyecto de teléfono (ancho angosto real)');
  });

  // El bug que guardaba la versión anterior de este test -la columna de
  // cartas quedándose en su `minWidth` en vez de estirarse cuando el layout
  // de dos paneles pasaba a columna- ya no puede pasar: ese layout se fue
  // con la navegación por niveles. Lo que sí sigue valiendo la pena vigilar
  // es la propiedad de fondo: en teléfono la lista ocupa todo el ancho.
  test('la lista de cartas ocupa todo el ancho en teléfono', async ({ page, request, baseURL }) => {
    const id = await hiraganaDeckId(request, baseURL);
    await page.goto(`/decks/${id}`);
    await page.locator('[id^=group-open-]').first().click();
    await page.waitForURL(/\/groups\/\d+/);

    const screen = page.locator('#group-cards-screen');
    const list = page.locator('#cards-list');
    await expect(list).toBeVisible();

    const screenBox = await screen.boundingBox();
    const listBox = await list.boundingBox();
    if (!screenBox || !listBox) throw new Error('no se pudo medir la lista de cartas');

    expect(Math.abs(listBox.width - screenBox.width)).toBeLessThanOrEqual(1);
  });
});
