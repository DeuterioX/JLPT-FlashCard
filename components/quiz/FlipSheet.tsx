import { useLayoutEffect, useRef } from 'react';
import { Text } from '@mantine/core';
import styles from './FlipSheet.module.css';

let canvas: HTMLCanvasElement | null = null;

/**
 * Cuánto correr el texto, en `em`, para que su TINTA quede en el centro de la
 * línea y no su caja: «se» no tiene letras altas y se veía baja, «gyo» aún más.
 * En dos o más renglones no se corre.
 */
function inkShift(el: HTMLElement): number {
  const cs = getComputedStyle(el);
  const size = parseFloat(cs.fontSize);
  if (el.getBoundingClientRect().height > parseFloat(cs.lineHeight) * 1.5) return 0;
  canvas ??= document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const m = ctx.measureText(el.textContent ?? '');
  // Centros relativos a la línea de base, positivos hacia abajo.
  const line = (m.fontBoundingBoxDescent - m.fontBoundingBoxAscent) / 2;
  const ink = (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
  return (line - ink) / size;
}

/**
 * La hoja de la carta: el kana adelante y, al revelar, la lectura y el
 * significado atrás, con un giro sobre X. La usan Escribir y Significados.
 *
 * El dorso está siempre renderizado: agregarlo al revelar hacía crecer la caja
 * en pleno giro. Quien la usa le pone un `key` por carta, para que la nueva
 * arranque de frente y no muestre su respuesta en el giro de regreso.
 */
export function FlipSheet({
  flipped, front, reading, meaning, readingId, meaningId,
}: {
  flipped: boolean;
  /** La cara de adelante: la hoja de 原稿用紙 con el kana. */
  front: React.ReactNode;
  reading?: string | null;
  meaning?: string | null;
  readingId?: string;
  meaningId?: string;
}) {
  const readingRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = readingRef.current;
    if (!el) return;
    const apply = () => el.style.setProperty('--knd-ink-shift', `${inkShift(el)}em`);
    apply();
    // Con la fuente de respaldo las métricas son otras.
    void document.fonts.ready.then(apply);
  }, [reading]);

  return (
    <div className={styles.turn} data-revealed={flipped || undefined}>
      <div className={styles.face}>{front}</div>
      {/* `aria-hidden` sin revelar: si no, un lector de pantalla canta la respuesta. */}
      <div className={`${styles.face} ${styles.back}`} aria-hidden={!flipped}>
        {(reading || meaning) && (
          <div className={styles.backContent}>
            {reading && (
              <Text ref={readingRef} id={readingId} className={`romaji ${styles.revealedAnswer}`}>
                {reading}
              </Text>
            )}
            {meaning && <Text id={meaningId} className={styles.revealedMeaning}>{meaning}</Text>}
          </div>
        )}
      </div>
    </div>
  );
}
