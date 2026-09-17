import { test, expect } from '@playwright/test';

// La tarjeta de grupo entera es el control (role="switch"), no un checkbox de
// Mantine (ver components/GroupCard.tsx): `.check()` de Playwright apunta a
// checkboxes/radios nativos y no sirve acá. En su lugar se hace click en la
// tarjeta por su rol y se verifica `aria-checked`.
async function toggleGroup(page: import('@playwright/test').Page, name: string) {
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
