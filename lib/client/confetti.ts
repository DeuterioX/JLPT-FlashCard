// Sakura: rosas de flor de cerezo, el papel y el rojo de la app. El canvas no
// entiende `var()`, así que el papel y el rojo se leen del tema en el momento.
const SAKURA = ['#F2B8C6', '#E890A8', '#FBE3EA'];
const FROM_THEME = ['--knd-papel', '--mantine-color-shu-6'];

/** Dos ráfagas desde las esquinas de abajo. */
export async function celebrate() {
  const confetti = (await import('canvas-confetti')).default;
  const css = getComputedStyle(document.documentElement);
  const colors = [...SAKURA, ...FROM_THEME.map((v) => css.getPropertyValue(v).trim()).filter(Boolean)];
  const shared = {
    particleCount: 90, spread: 70, startVelocity: 55, ticks: 220,
    shapes: ['square' as const], colors, disableForReducedMotion: true, zIndex: 1000,
  };
  void confetti({ ...shared, angle: 60, origin: { x: 0, y: 1 } });
  void confetti({ ...shared, angle: 120, origin: { x: 1, y: 1 } });
}
