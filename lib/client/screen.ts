/**
 * El corte entre teléfono y escritorio, en un solo lugar.
 *
 * Es el `sm` de Mantine -48em, 768px- y no un número propio. Antes eran 640px,
 * que no coincidían con ningún breakpoint de la librería, y eso obligaba a
 * resolver TODO mostrar/ocultar con CSS propio: para usar `hiddenFrom` o
 * `visibleFrom` hay que nombrar una clave del tema, y la única forma de llegar
 * a 640 era correrle el valor a `xs`, dejándolo significando algo distinto de
 * lo que significa en la documentación de Mantine. Con el corte en `sm` -que
 * la app ya usa para la grilla de Estadísticas- hay UNA sola escala y las
 * props de la librería dicen lo que parece que dicen.
 *
 * Lo que cambió en la práctica es la franja 640-767: ahí ahora se ve el
 * teléfono. Medido antes de moverlo: en esa franja la grilla de grupos ya era
 * de 3 columnas igual que en teléfono -recién pasa a 4 en 800-, así que el
 * layout chico encaja igual o mejor que el grande.
 *
 * El `.9` es la convención de Mantine para el lado de abajo: `MantineClasses`
 * genera `max-width: {bp - 0.1}`, así que los dos lados no se pisan ni dejan
 * un hueco de un píxel.
 */
export const PHONE_QUERY = '(max-width: 767.9px)';

/**
 * Si la pantalla es de teléfono, preguntado AHORA.
 *
 * Se consulta en el momento del gesto y no se guarda en estado a propósito:
 * `useMediaQuery` devuelve un valor distinto en el render del servidor y en el
 * del cliente, lo que parpadea o desincroniza la hidratación. Preguntando en
 * el manejador no hay nada que sincronizar, y rotar el teléfono tampoco deja
 * un valor viejo dando vueltas.
 */
export function isPhone() {
  return window.matchMedia(PHONE_QUERY).matches;
}
