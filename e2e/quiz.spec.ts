import { test, expect, type Page } from '@playwright/test';
import { SELECTION_COOKIE } from '../lib/selection-cookie';

// El botón que arranca la ronda de escribir se llamaba «Comenzar» hasta que
// entró el segundo verbo («Significados ➜ | Escribir ➜»). Se apunta por id y
// no por rótulo: el id es parte del contrato de la pantalla, el texto no.

// La tarjeta de grupo entera es el control (role="switch"), no un checkbox de
// Mantine (ver components/GroupCard.tsx): `.check()` de Playwright apunta a
// checkboxes/radios nativos y no sirve acá. En su lugar se hace click en la
// tarjeta por su rol y se verifica `aria-checked`.
async function toggleGroup(page: Page, name: string) {
  const card = page.getByRole('switch', { name: `Practicar ${name}`, exact: true });
  await card.click();
  return card;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // El mazo por defecto es Hiragana (PracticeBoard abre en decks[0]); Serie K
  // tiene que estar visible antes de interactuar con él.
  await expect(page.getByRole('switch', { name: 'Practicar Serie K', exact: true })).toBeVisible();
  // Cada test arranca sin NINGÚN grupo puesto y prende lo que necesita, así el
  // orden de ejecución no importa aunque compartan la cookie `grupos` y la DB.
  //
  // Se borra la cookie en vez de apretar «Ninguno»: ese atajo existe sólo en
  // escritorio -en teléfono la franja envuelve y el control se queda solo en un
  // renglón, así que no se dibuja-, y este `beforeEach` corre en los DOS
  // proyectos. Además es determinista: no depende de que un control esté
  // visible ni de en qué estado quedó el test anterior.
  await page.context().clearCookies({ name: SELECTION_COOKIE });
  await page.reload();
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
  const input = page.locator('#answer-input');
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
  const card = await toggleGroup(page, 'Serie K');
  await expect(card).toHaveAttribute('aria-checked', 'true');

  await expect(page.locator('#begin-round-btn')).toBeEnabled();
  await page.locator('#begin-round-btn').click();

  const input = page.locator('#answer-input');
  await expect(input).toBeFocused();

  const prompt = page.getByTestId('quiz-prompt');
  const before = await prompt.textContent();

  // Errar a propósito: la carta tiene que quedarse.
  await input.fill('zzz');
  await input.press('Enter');
  await expect(prompt).toHaveText(before ?? '');
  await expect(input).toHaveValue('');

  // Corregir: contestar bien todas las cartas de Serie K.
  await answerAll(page);
  const summary = page.getByText('Ronda completa');
  await expect(summary).toBeVisible();

  // Encadenar: SÓLO Enter arranca la ronda siguiente. Este test apretaba
  // una letra cualquiera y esperaba que además quedara escrita como primera
  // letra de la carta nueva; eso dejó de valer cuando el resumen pasó a
  // quedarse hasta que el usuario decide seguir (ver el manejador de teclas
  // en QuizRunner: «cualquier tecla arranca la próxima» hacía que el resumen
  // desapareciera solo). El test se quedó atrás y venía fallando desde
  // entonces.
  await page.keyboard.press('k');
  await expect(summary).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(summary).toBeHidden();
  await expect(prompt).toBeVisible();
  await expect(input).toHaveValue('');
});

test('recargar una ronda ya jugada abre una sesión nueva y no escribe en la cerrada', async ({ page }) => {
  await toggleGroup(page, 'Serie K');
  await page.locator('#begin-round-btn').click();
  await expect(page.locator('#answer-input')).toBeFocused();
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
  // render de hidratación no ve sessionStorage: ver app/quiz/page.tsx).
  await expect(page).toHaveURL(/\/quiz$/);
  expect(statuses.filter((s) => s.status >= 400)).toEqual([]);
  expect(statuses.filter((s) => s.url.endsWith(`/api/sessions/${first}`))).toHaveLength(1);
});

test('Esc sale del quiz sin dejar /quiz en el historial', async ({ page, isMobile }) => {
  await toggleGroup(page, 'Serie K');
  await page.locator('#begin-round-btn').click();
  await expect(page.locator('#answer-input')).toBeFocused();

  await page.keyboard.press('Escape');
  if (!isMobile) {
    // En escritorio pregunta antes: otro Esc vuelve a la ronda, Enter sale.
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('#answer-input')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Enter');
  }
  await expect(page).toHaveURL(/\/$/);
  await page.goBack();
  await expect(page).not.toHaveURL(/\/quiz/);
});

test('con la confirmación apagada en Ajustes, Esc sale directo', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('kitsune.confirmQuizExit', 'false'));
  await toggleGroup(page, 'Serie K');
  await page.locator('#begin-round-btn').click();
  await expect(page.locator('#answer-input')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/$/);
});

test('el botón queda deshabilitado sin ningún grupo', async ({ page }) => {
  await expect(page.locator('#begin-round-btn')).toBeDisabled();
});

test('el input del quiz no deja que el teléfono lo autocorrija', async ({ page }) => {
  await toggleGroup(page, 'Serie K');
  await page.locator('#begin-round-btn').click();

  const input = page.locator('#answer-input');
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

  await toggleGroup(page, 'Serie K');
  await page.locator('#begin-round-btn').click();

  const input = page.locator('#answer-input');
  await input.click();
  // Playwright emula un teléfono pero no abre un teclado virtual real: esto
  // detecta un layout roto por 100vh, no el comportamiento exacto de iOS.
  // Verificación pendiente en un dispositivo real (ver reporte).
  await expect(input).toBeInViewport();
});

/**
 * Una sesión que no se puede abrir tiene que AVISAR, en las dos pantallas de
 * ronda. Este test existe porque el repaso de significados no lo hacía: el
 * recorder tira el buffer y se queda en `failed`, así que se podía calificar
 * la ronda entera y no guardarse nada, sin una sola señal en pantalla.
 *
 * El mazo se crea acá y no en el seed: los mazos de kana no tienen
 * significados -`card.meaning` es NULL- y sin significados el modo ni siquiera
 * se puede arrancar.
 */
test.describe('una sesión que falla avisa', () => {
  test('el repaso de significados muestra el aviso', async ({ page, request }) => {
    const name = `Vocab ${Date.now()}`;
    const mazo = await request.post('/api/decks', {
      data: { name: name, groups: ['Prueba'] },
    });
    const { groups } = await mazo.json();
    await request.post(`/api/groups/${groups[0].id}/cards`, {
      data: { prompt: 'えび', answers: ['ebi'], meaning: 'camarón' },
    });

    await page.goto('/');
    // El selector de mazo es un `SegmentedControl`: cada opción es un
    // `<input type="radio">` con su `<label>` al lado. Se clickea el label.
    const option = page.locator('#deck-segmented-control label', { hasText: name });
    await expect(option).toBeVisible();
    await option.click();
    // El grupo se prende por su interruptor y no con «Todos»: ese atajo no
    // existe en teléfono, y acá el mazo tiene un solo grupo igual.
    await page.getByRole('switch', { name: 'Practicar Prueba', exact: true }).click();

    await page.locator('#begin-meaning-btn').click();
    await page.waitForURL('**/quiz');
    await expect(page.locator('#meaning-kana')).toBeVisible();

    // El camino que falla es el de RECARGAR: la primera vez el recorder reusa
    // la sesión que ya abrió `PracticeBoard`, y recién al volver a entrar a una
    // ronda ya jugada abre una sesión nueva por su cuenta. Ese POST es el que
    // se corta acá, que es exactamente el caso que se perdía en silencio.
    await page.route('**/api/sessions', (route) =>
      (route.request().method() === 'POST' ? route.abort() : route.continue()));
    await page.reload();

    await expect(page.locator('#meaning-session-error')).toBeVisible();
  });
});
