import { Stack, Text } from '@mantine/core';
import styles from './FlipSheet.module.css';

/**
 * La hoja de la carta con sus dos caras: el kana adelante y, al revelar, la
 * lectura y el significado atrás. Revelar la da vuelta con un giro sobre X.
 *
 * Es un componente y no marcado copiado porque la usan las dos rondas,
 * Escribir y Significados, y el giro tiene detalles que costó medir -la capa
 * de GPU permanente, la curva, la falta de perspectiva, el dorso del ancho
 * exacto del frente-. Copiado, la segunda copia los iba a ir perdiendo.
 *
 * El dorso está SIEMPRE renderizado, no sólo una vez revelado: agregándolo al
 * revelar, la caja crecía en el mismo momento del giro -medido en teléfono con
 * けんきゅうしゃ, de 83 a 308px-. Como está dado vuelta y con
 * `backface-visibility: hidden`, no se ve hasta que la hoja gira.
 *
 * Quien la usa le pone un `key` por carta. Sin eso, calificar una carta
 * revelada pasaba a la siguiente con la hoja todavía dada vuelta, y el giro de
 * regreso mostraba durante su primera mitad el dorso de la carta NUEVA: su
 * respuesta, antes de que la intentaras. Remontada, la carta nueva arranca de
 * frente y sin transición.
 *
 * `aria-hidden` mientras no esté revelado: escondido para el ojo pero presente
 * en el DOM, un lector de pantalla cantaría la respuesta antes de que la pidas.
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
  return (
    // El estado va en un `data-*` y no en una clase: las clases de un módulo
    // se hashean y una escrita a mano deja de matchear.
    <div className={styles.turn} data-revealed={flipped || undefined}>
      <div className={styles.face}>{front}</div>
      <div className={`${styles.face} ${styles.back}`} aria-hidden={!flipped}>
        {/* El hueco entre la lectura y el significado es más grande que el de
            un Stack normal a propósito: son dos datos distintos -cómo se dice
            y qué quiere decir-, no dos renglones del mismo. */}
        {(reading || meaning) && (
          <Stack align="center" gap={14}>
            {reading && <Text id={readingId} className={`romaji ${styles.revealedAnswer}`}>{reading}</Text>}
            {meaning && <Text id={meaningId} className={styles.revealedMeaning}>{meaning}</Text>}
          </Stack>
        )}
      </div>
    </div>
  );
}
