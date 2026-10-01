/**
 * El corte entre teléfono y escritorio, en un solo lugar.
 *
 * Son 640px y los decide el diseño, no Mantine: ninguno de sus breakpoints por
 * defecto (576/768/992/1200/1408) cae ahí. El valor vive a la vez en el CSS
 * -`@media (max-width: 640px)` en `app/globals.css`- y en el puñado de lugares
 * donde hay que preguntarlo desde JavaScript, y estaba escrito a mano en cada
 * uno: cambiar el corte obligaba a acordarse de todos, sin ningún error de
 * compilación que avisara del que faltó.
 *
 * Esto cubre la mitad de JavaScript. La del CSS sigue escrita en cada bloque,
 * porque una media query no puede leer una constante de TypeScript.
 */
export const TELEFONO = '(max-width: 640px)';

/**
 * Si la pantalla es de teléfono, preguntado AHORA.
 *
 * Se consulta en el momento del gesto y no se guarda en estado a propósito:
 * `useMediaQuery` devuelve un valor distinto en el render del servidor y en el
 * del cliente, lo que parpadea o desincroniza la hidratación. Preguntando en
 * el manejador no hay nada que sincronizar, y rotar el teléfono tampoco deja
 * un valor viejo dando vueltas.
 */
export function esTelefono() {
  return window.matchMedia(TELEFONO).matches;
}
