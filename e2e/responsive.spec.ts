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
    await expect(page.getByRole('switch', { name: 'Practicar Serie K' })).toBeVisible();
    expect(await hasNoHorizontalScroll(page)).toBe(true);
  });

  test('/mazos', async ({ page }) => {
    await page.goto('/mazos');
    expect(await hasNoHorizontalScroll(page)).toBe(true);
  });

  test('/mazos/<hiragana>', async ({ page, request, baseURL }) => {
    const id = await hiraganaDeckId(request, baseURL);
    await page.goto(`/mazos/${id}`);
    expect(await hasNoHorizontalScroll(page)).toBe(true);
  });

  test('/estadisticas', async ({ page }) => {
    await page.goto('/estadisticas');
    expect(await hasNoHorizontalScroll(page)).toBe(true);
  });
});

test.describe('editor de mazo en teléfono', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, 'solo aplica al proyecto de teléfono (ancho angosto real)');
  });

  // Sin scroll horizontal (arriba) no alcanza para detectar esto: el bug es
  // que la columna de cartas se queda en su `minWidth: 280` en vez de
  // estirarse a lo ancho del contenedor cuando el layout pasa a columna en
  // 640px, dejando un margen vacío a la derecha SIN que nada desborde.
  test('la columna de cartas ocupa todo el ancho del layout', async ({ page, request, baseURL }) => {
    const id = await hiraganaDeckId(request, baseURL);
    await page.goto(`/mazos/${id}`);

    const layout = page.locator('.knd-editor-layout');
    const cards = page.locator('.knd-editor-cards');
    await expect(cards).toBeVisible();

    const layoutBox = await layout.boundingBox();
    const cardsBox = await cards.boundingBox();
    if (!layoutBox || !cardsBox) throw new Error('no se pudo medir el layout del editor');

    expect(Math.abs(cardsBox.width - layoutBox.width)).toBeLessThanOrEqual(1);
  });
});
