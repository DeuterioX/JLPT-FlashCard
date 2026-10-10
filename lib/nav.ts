// `id` es el sufijo del `id=""` de cada link (`nav-desktop-practice`, ...) y
// la clave de su nombre en los mensajes (`nav.practice`).
// Los íconos de las pestañas son kanji en mincho, como el resto de los rótulos
// japoneses de la app: 文 escritura, 冊 volumen, 計 medición.
export const LINKS = [
  { href: '/', jp: '文', id: 'practice' },
  { href: '/decks', jp: '冊', id: 'decks' },
  { href: '/stats', jp: '計', id: 'stats' },
] as const;

/**
 * Activo cuando la pantalla está DENTRO de la sección (`/decks/3/groups/7` es
 * Mazos). Contra `href + '/'` para que un `/decksomething` no encienda Mazos.
 */
export function isActive(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}
