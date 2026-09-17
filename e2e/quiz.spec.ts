import { test, expect, type Page } from '@playwright/test';

// La tarjeta de grupo entera es el control (role="switch"), no un checkbox de
// Mantine (ver components/GroupCard.tsx): `.check()` de Playwright apunta a
// checkboxes/radios nativos y no sirve acá. En su lugar se hace click en la
// tarjeta por su rol y se verifica `aria-checked`.
async function toggleGroup(page: Page, name: string) {
  const card = page.getByRole('switch', { name: `Practicar ${name}` });
  await card.click();
  return card;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // El mazo por defecto es Hiragana (PracticeBoard abre en decks[0]); か行
  // tiene que estar visible antes de interactuar con él.
  await expect(page.getByRole('switch', { name: 'Practicar か行' })).toBeVisible();
  // Cada test arranca desde "Ninguno" y prende lo que necesita, así el orden
  // de ejecución no importa aunque compartan la cookie `grupos` y la DB.
  await page.getByRole('button', { name: 'Ninguno' }).click();
});

type StoredCard = { prompt: string; primary: string };

/** Las cartas de la ronda guardada, tal como las dejó PracticeBoard. */
async function storedRound(page: Page) {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem('ronda');
    if (!raw) throw new Error('no hay ronda guardada');
    return JSON.parse(raw) as { sessionId: number; cards: StoredCard[] };
  });
}

/**
 * Contesta bien todas las cartas que quedan, leyendo la primaria de cada una
 * desde `sessionStorage['ronda']` según el kana que está en pantalla.
 */
async function answerAll(page: Page) {
  const { cards } = await storedRound(page);
  const prompt = page.getByTestId('quiz-prompt');
  const input = page.locator('#respuesta');
  const pending = new Set(cards.map((c) => c.prompt));

  while (pending.size > 0) {
    await expect(prompt).toBeVisible();
    const shown = (await prompt.textContent()) ?? '';
    const card = cards.find((c) => c.prompt === shown);
    if (!card) throw new Error(`el kana en pantalla (${shown}) no está en la ronda guardada`);
    await input.fill(card.primary);
    await input.press('Enter');
    pending.delete(shown);
    if (pending.size > 0) await expect(prompt).not.toHaveText(shown);
  }
}

test('una ronda completa: errar, corregir y encadenar', async ({ page }) => {
  const card = await toggleGroup(page, 'か行');
  await expect(card).toHaveAttribute('aria-checked', 'true');

  await expect(page.getByRole('button', { name: /Empezar ronda/ })).toBeEnabled();
  await page.getByRole('button', { name: /Empezar ronda/ }).click();

  const input = page.locator('#respuesta');
  await expect(input).toBeFocused();

  const prompt = page.getByTestId('quiz-prompt');
  const before = await prompt.textContent();

  // Errar a propósito: la carta tiene que quedarse.
  await input.fill('zzz');
  await input.press('Enter');
  await expect(prompt).toHaveText(before ?? '');
  await expect(input).toHaveValue('');

  // Corregir: contestar bien todas las cartas de か行.
  await answerAll(page);
  const summary = page.getByText('Ronda completa');
  await expect(summary).toBeVisible();

  // Encadenar: una sola letra arranca la ronda siguiente y queda como
  // primera letra de la carta nueva.
  await page.keyboard.press('k');
  await expect(summary).toBeHidden();
  await expect(prompt).toBeVisible();
  await expect(input).toHaveValue('k');
});

test('recargar una ronda ya jugada abre una sesión nueva y no escribe en la cerrada', async ({ page }) => {
  await toggleGroup(page, 'か行');
  await page.getByRole('button', { name: /Empezar ronda/ }).click();
  await expect(page.locator('#respuesta')).toBeFocused();
  const { sessionId: first } = await storedRound(page);

  const statuses: { url: string; method: string; status: number }[] = [];
  page.on('response', (res) => {
    if (res.url().includes('/api/')) {
      statuses.push({ url: res.url(), method: res.request().method(), status: res.status() });
    }
  });

  const firstClosed = page.waitForResponse(
    (r) => r.request().method() === 'PATCH' && r.url().endsWith(`/api/sessions/${first}`),
  );
  await answerAll(page);
  await expect(page.getByText('Ronda completa')).toBeVisible();
  expect((await firstClosed).status()).toBe(200);

  // Recarga (lo mismo que un Back o una pestaña restaurada): la ronda
  // guardada sigue siendo la de la sesión ya cerrada.
  const opened = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/api/sessions'),
  );
  await page.reload();
  const fresh = (await (await opened).json()) as { sessionId: number };
  expect(fresh.sessionId).not.toBe(first);
  expect((await storedRound(page)).sessionId).toBe(first);

  const freshClosed = page.waitForResponse(
    (r) => r.request().method() === 'PATCH' && r.url().endsWith(`/api/sessions/${fresh.sessionId}`),
  );
  await answerAll(page);
  await expect(page.getByText('Ronda completa')).toBeVisible();
  expect((await freshClosed).status()).toBe(200);

  // La recarga no tiene que mandar a la home una ronda que sí existe (el
  // render de hidratación no ve sessionStorage: ver app/practicar/page.tsx).
  await expect(page).toHaveURL(/\/practicar$/);
  expect(statuses.filter((s) => s.status >= 400)).toEqual([]);
  expect(statuses.filter((s) => s.url.endsWith(`/api/sessions/${first}`))).toHaveLength(1);
});

test('Esc sale del quiz sin dejar /practicar en el historial', async ({ page }) => {
  await toggleGroup(page, 'か行');
  await page.getByRole('button', { name: /Empezar ronda/ }).click();
  await expect(page.locator('#respuesta')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/$/);
  await page.goBack();
  await expect(page).not.toHaveURL(/\/practicar/);
});

test('el botón queda deshabilitado sin ningún grupo', async ({ page }) => {
  await expect(page.getByRole('button', { name: /Empezar ronda/ })).toBeDisabled();
});

test('el input del quiz no deja que el teléfono lo autocorrija', async ({ page }) => {
  await toggleGroup(page, 'か行');
  await page.getByRole('button', { name: /Empezar ronda/ }).click();

  const input = page.locator('#respuesta');
  // Sin esto iOS convierte "ka" en "Ka" y sugiere corregir "shi": se
  // contarían errores que nunca se cometieron.
  await expect(input).toHaveAttribute('autocapitalize', 'off');
  await expect(input).toHaveAttribute('autocorrect', 'off');
  await expect(input).toHaveAttribute('spellcheck', 'false');
  await expect(input).toHaveAttribute('inputmode', 'text');
  await expect(input).toHaveAttribute('autocomplete', 'off');
});

test('en teléfono el input queda visible con el teclado abierto', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'solo aplica al proyecto de teléfono');

  await toggleGroup(page, 'か行');
  await page.getByRole('button', { name: /Empezar ronda/ }).click();

  const input = page.locator('#respuesta');
  await input.click();
  // Playwright emula un teléfono pero no abre un teclado virtual real: esto
  // detecta un layout roto por 100vh, no el comportamiento exacto de iOS.
  // Verificación pendiente en un dispositivo real (ver reporte).
  await expect(input).toBeInViewport();
});
