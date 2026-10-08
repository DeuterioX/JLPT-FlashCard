'use client';

import { useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  Stack, Group, SegmentedControl, Button, SimpleGrid, Paper, Text, Progress,
} from '@mantine/core';
import { MetricTile, type Tone } from './MetricTile';
import { errorFrom } from '@/lib/client/errors';
import { useAction } from '@/lib/client/action';
import { ROUND_KEY, USED_ROUND_KEY } from '@/lib/quiz/stored-round';
import type { Overview, WorstCard, StatsRange } from '@/lib/services/stats';
import styles from './StatsBoard.module.css';

/** Semáforo del spec: jade ≥85%, ámbar 60–85%, shu <60%. Único lugar de la
 * app donde aparece un tercer color además de jade/shu. */
// Semáforo del diseño: verde sobre 85%, ámbar entre 60 y 85, rojo debajo.
// El ámbar no sale de la escala de Mantine -su `yellow.6` es `#fab005`, un
// amarillo anaranjado, contra el latón apagado del diseño- pero tampoco es
// un hex suelto acá: vive en `theme.other.ambar` con el resto de los colores
// que no son jade ni shu.
function tone(acc: number, ambar: string) {
  if (acc >= 0.85) return 'jade.6';
  if (acc >= 0.6) return ambar;
  return 'shu.6';
}

/**
 * El mismo semáforo, pero para TEXTO. Son dos escalas y no una porque los
 * rellenos y las cifras no piden lo mismo: el ámbar del diseño se ve bien como
 * barra y como texto sobre la página clara da 2,35:1, y el shu lleno da 4,56:1
 * de relleno pero 3,21:1 de letra. Las dos variantes bajadas viven en el tema
 * (`--knd-ambar-txt`, `--knd-shu-txt`) y cambian con el esquema; el jade sirve
 * igual en los dos lados porque su tono ya está calibrado por esquema.
 */
function toneOf(acc: number): Tone {
  if (acc >= 0.85) return 'good';
  if (acc >= 0.6) return 'warn';
  return 'bad';
}

/** `2:14` del diseño. */
function formatDuration(ms: number | null) {
  if (ms === null || ms < 0) return null;
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const RANGE_DAYS: Record<string, number | null> = { '7d': 7, '30d': 30, all: null };
const RANGE_LABEL: Record<string, string> = { '7d': '7 días', '30d': '30 días', all: 'siempre' };

function subscribeNoop() {
  return () => {};
}

/**
 * `true` recién después de montar en el cliente. Formatear una fecha con
 * `toLocaleString` durante el render del servidor puede dar un resultado
 * distinto al del navegador (husos horarios distintos), lo que dispara un
 * warning de hidratación si se hace directo. Con `useSyncExternalStore` el
 * primer render del cliente (el que hidrata) usa `getServerSnapshot` (false,
 * igual que el servidor) y recién el siguiente render -ya hidratado- usa
 * `getSnapshot` (true) y muestra la fecha real. Mismo patrón que
 * `app/quiz/page.tsx` usa para leer `sessionStorage`.
 */
function useMounted(): boolean {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

const HOUR_24 = { hour: '2-digit', minute: '2-digit', hour12: false } as const;

/** "Hoy 18:30", "Ayer 09:05" o "17/9/26 18:30" según qué tan lejos esté `iso`
 * del día de hoy. Siempre en formato 24 horas -nunca a. m./p. m., en ningún
 * lado de la app. */
function formatRoundDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  const time = date.toLocaleTimeString('es-AR', HOUR_24);
  if (days === 0) return `Hoy ${time}`;
  if (days === 1) return `Ayer ${time}`;
  return `${date.toLocaleDateString('es-AR')} ${time}`;
}

function HistoryDate({ iso }: { iso: string }) {
  const mounted = useMounted();
  // 96px y `dark.3` (`--a-dimmer`) del diseño, no los 130px y el `dimmed`
  // (`--a-dim`) de antes: la fecha es el dato más apagado de la fila.
  const props = { size: '0.6875rem', lh: 1.4, c: 'dark.3', w: 96 } as const;
  if (!mounted) return <Text {...props}>&nbsp;</Text>;
  return <Text {...props}>{formatRoundDate(iso)}</Text>;
}

const REVIEW_LIMIT = 20;

export function StatsBoard({
  overview: o, worst, range,
}: { overview: Overview; worst: WorstCard[]; range: StatsRange }) {
  const router = useRouter();
  // `keepLockedOnSuccess`: en el camino feliz la guarda NO se libera. `router.push`
  // deja el componente montado mientras navega, y un segundo click en esa
  // ventana abriría una segunda sesión de repaso que nunca se cierra. El
  // componente se desmonta al llegar a /quiz, así que no hace falta resetearla.
  const reviewAction = useAction({ keepLockedOnSuccess: true });

  const review = () => reviewAction.run(async () => {
    const res = await fetch('/api/sessions/review', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // Se manda el `range` que está mirando la pantalla: si el botón prometió
      // "N peores" calculadas sobre "Siempre", la ronda tiene que armarse
      // sobre ese mismo rango y no sobre los 30 días por defecto del service.
      body: JSON.stringify({ limit: REVIEW_LIMIT, range }),
    });
    if (!res.ok) return errorFrom(res);
    sessionStorage.setItem(ROUND_KEY, JSON.stringify(await res.json()));
    // Ronda nueva sin jugar: cualquier marca de "ya usada" es de otra.
    sessionStorage.removeItem(USED_ROUND_KEY);
    router.push('/quiz');
  });

  const reviewCount = Math.min(REVIEW_LIMIT, worst.length);
  const rangeDays = RANGE_DAYS[range];
  const rangeLabel = RANGE_LABEL[range];
  // "1,4 por día" del diseño. Con el rango "Siempre" no hay denominador
  // honesto -no se sabe sobre cuántos días-, así que la línea no se muestra.
  const roundsPerDay = rangeDays === null
    ? null
    : `${(o.rounds / rangeDays).toFixed(1).replace('.', ',')} por día`;

  return (
    <Stack id="stats-screen" gap="md">
      {/* En teléfono el orden real del documento es rango → tiles → botón
          (así el botón queda debajo de las tiles y a lo ancho completo);
          en escritorio `.${styles.statsTop}` los reacomoda con CSS Grid para que
          el botón vuelva a estar al lado del selector de rango, como en el
          diseño. Nada se duplica ni se oculta: es el mismo único botón en
          los dos casos. */}
      <div id="stats-top" className={styles.statsTop}>
        <div id="stats-range" className={styles.statsRange}>
          <SegmentedControl
            id="stats-range-control"
            value={range}
            onChange={(v) => router.push(`/stats?window=${v}`)}
            data={[
              { value: '7d', label: '7 días' },
              { value: '30d', label: '30 días' },
              { value: 'all', label: 'Siempre' },
            ]}
          />
        </div>

        <SimpleGrid id="stats-tiles" className={styles.statsTiles} cols={{ base: 2, sm: 4 }} spacing={9}>
          {/* La cifra de Aciertos va en el semáforo, como en el diseño: es el
              número que resume la pantalla, así que dice cómo vas con el color
              antes de que lo leas. */}
          <MetricTile id="stat-accuracy" label="Aciertos" value={`${Math.round(o.accuracy * 100)}%`}
            tone={toneOf(o.accuracy)}
            hint={`${o.correct} de ${o.attempts}`} />
          {/* "Errores" y "Rondas" no tenían la línea de abajo que el diseño
              sí les da, así que quedaban truncadas al lado de las otras dos.
              Las dos dependen del rango elegido, no de un "30 días" fijo. */}
          <MetricTile id="stat-errors" label="Errores" value={o.incorrect} tone="bad"
            hint={rangeDays === null ? 'en total' : `en ${rangeLabel}`} />
          <MetricTile id="stat-rounds" label="Rondas" value={o.rounds}
            hint={roundsPerDay ?? undefined} />
          <MetricTile id="stat-mastered" label="Dominadas" value={o.mastered}
            hint={`de ${o.totalCards} cartas`} />
        </SimpleGrid>

        <Stack id="stats-review" className={styles.statsReview}>
          <Button
            id="review-btn"
            className={styles.reviewBtn}
            onClick={review}
            loading={reviewAction.busy}
            disabled={reviewAction.busy || worst.length === 0}
          >
            {worst.length === 0 ? 'Practicar mis peores' : `Practicar mis ${reviewCount} peores`}
          </Button>
          {reviewAction.error && <Text className={`knd-error ${styles.reviewError}`}>{reviewAction.error}</Text>}
        </Stack>
      </div>

      <SimpleGrid id="stats-panels" cols={{ base: 1, sm: 2 }} spacing="md">
        {/* Los tres paneles son `.card-box` del diseño: borde
            `--a-border-soft` (no el `dark.4` que trae `withBorder`), radio 9
            y padding 13. El encabezado lleva el título a la izquierda y una
            aclaración al ras de la derecha, un escalón más chica y apagada. */}
        <Paper id="worst-panel" withBorder className={styles.panel}>
          <Stack id="worst-list" className={styles.panelList}>
            <Group wrap="nowrap" className={styles.panelHead}>
              <Text id="worst-title" className={styles.panelTitle}>Las que más errás</Text>
              <Text className={styles.panelNote}>errores / veces vista</Text>
            </Group>
            {worst.length === 0 && <Text className={styles.panelEmpty}>Todavía no hay datos suficientes.</Text>}
            {/* Una grilla y no una fila con anchos fijos, como «Las que te
                costaron» del resumen de ronda: las columnas son COMPARTIDAS,
                así que la palabra más larga ensancha la de todas, las barras
                arrancan alineadas y miden lo mismo en cada fila. Con anchos
                fijos pensados para un kana suelto, これはにほんごで… se partía
                en renglones de dos caracteres y su romaji se montaba sobre la
                barra. */}
            {worst.length > 0 && (
              <div className={styles.worstGrid}>
                {worst.slice(0, 8).map((w) => (
                  <div key={w.cardId} id={`worst-row-${w.cardId}`} className={styles.statRow}>
                    <Text className={`kana ${styles.statCell} ${styles.worstKana}`} title={w.prompt}>{w.prompt}</Text>
                    <Text className={`romaji ${styles.statCell} ${styles.worstRom}`} title={w.primary}>{w.primary}</Text>
                    <Progress
                      value={w.rate * 100} color="shu.6" size={4} radius={2}
                      styles={{ root: { backgroundColor: 'var(--knd-border-soft)' } }}
                    />
                    <Text className={`${styles.worstNum} tabular`}>{w.errors}/{w.seen}</Text>
                  </div>
                ))}
              </div>
            )}
          </Stack>
        </Paper>

        <Paper id="by-group-panel" withBorder className={styles.panel}>
          <Stack id="by-group-list" className={styles.panelList}>
            <Group wrap="nowrap" className={styles.panelHead}>
              <Text id="by-group-title" className={styles.panelTitle}>Aciertos por grupo</Text>
              {/* Esta aclaración faltaba por completo. Sigue al rango
                  elegido en vez de decir siempre "últimos 30 días". */}
              <Text className={styles.panelNote}>
                {rangeDays === null ? 'siempre' : `últimos ${rangeLabel}`}
              </Text>
            </Group>
            {o.byGroup.length === 0 && <Text className={styles.panelEmpty}>Todavía no practicaste nada.</Text>}
            {/* La misma grilla que «Las que más errás»: el nombre toma el
                largo del más largo y sólo corta con elipsis si no entra. Con
                ancho fijo, «Pronombres y formas de dirigirse a alguien» quedaba
                en «Pronombres y f…» aunque la barra ocupara medio panel. */}
            {o.byGroup.length > 0 && (
              <div className={styles.groupGrid}>
                {o.byGroup.slice(0, 10).map((g) => (
                  <div key={g.groupId} id={`group-row-${g.groupId}`} className={styles.statRow}>
                    <Text className={`${styles.statCell} ${styles.groupName}`} title={g.name}>{g.name}</Text>
                    <Progress
                      value={g.accuracy * 100} color={tone(g.accuracy, 'var(--knd-ambar)')} size={6} radius={3}
                      styles={{ root: { backgroundColor: 'var(--knd-border-soft)' } }}
                    />
                    <Text className={`tabular ${styles.groupPct}`}>
                      {Math.round(g.accuracy * 100)}%
                    </Text>
                  </div>
                ))}
              </div>
            )}
          </Stack>
        </Paper>
      </SimpleGrid>

      <Paper id="history-panel" withBorder className={styles.panel}>
        <Stack id="history-list" className={styles.historyList}>
          {/* Los otros dos paneles tienen su aclaración al ras de la derecha y
              éste no tenía ninguna: el diseño le pone cuántas rondas está
              mostrando, que acá es lo que el servicio devuelve. */}
          <Group wrap="nowrap" className={styles.panelHead}>
            <Text id="history-title" className={styles.panelTitle}>Historial de rondas</Text>
            {o.history.length > 0 && (
              <Text className={styles.panelNote}>
                {o.history.length === 1 ? 'última ronda' : `últimas ${o.history.length}`}
              </Text>
            )}
          </Group>
          {o.history.length === 0 && <Text className={styles.panelEmpty}>Sin rondas terminadas.</Text>}
          {/* Sin `Divider` entre filas: en el diseño esta lista va sin
              líneas (`border: none`), separada solo por el padding de cada
              fila. Las líneas las tiene la lista de mazos, no esta. */}
          {o.history.map((h) => (
            <Group key={h.id} id={`history-row-${h.id}`} wrap="nowrap" className={styles.historyRow}>
              <HistoryDate iso={h.startedAt} />
              <Text className={`knd-fill ${styles.historyLabel}`}>{h.label}</Text>
              {/* Columna de duración del diseño, que faltaba entera. El dato
                  sale de `finishedAt - startedAt` en el servicio. */}
              <Text className={`romaji ${styles.historyLabel}`}>
                {formatDuration(h.durationMs) ?? ''}
              </Text>
              {/* El porcentaje de cada ronda va en el semáforo, como en el
                  diseño: es lo único de la fila que dice si la ronda salió
                  bien, y sin color había que leer el número para saberlo. */}
              <Text className={`tabular ${styles.historyPct}`} ta="right" data-tone={toneOf(h.accuracy)}>
                {Math.round(h.accuracy * 100)}%
              </Text>
            </Group>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
