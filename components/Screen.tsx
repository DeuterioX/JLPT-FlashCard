'use client';

import { Stack } from '@mantine/core';
import { Breadcrumb, type Crumb } from './Breadcrumb';
import { MobileNavbar } from './MobileNavbar';
import styles from './Screen.module.css';

/**
 * Una pantalla en tres franjas: lo de arriba, lo que scrollea y lo de abajo.
 * Sólo la del medio se mueve.
 *
 * Antes las barras de las pantallas flotaban con `position: fixed` encima de
 * la página que scrolleaba entera, y cada una tenía que reservarse el lugar
 * con un espaciador medido por `ResizeObserver`. Eso falló tres veces por lo
 * mismo: con zoom el scroll cae en fracciones de pixel, la capa fija y la que
 * se mueve redondean distinto, y por la costura se asomaba el contenido. Acá
 * no hay nada encima de nada: las barras ocupan su lugar en la columna y el
 * contenido scrollea en el espacio que queda.
 *
 * Llena el `main` del `AppShell` anulándole el padding con margen negativo,
 * así las barras van de borde a borde y el padding pasa a la franja que
 * scrollea. Las pantallas que no lo usan -Estadísticas- scrollean en el
 * `main` directamente.
 *
 * `nav` arma la navegación de las pantallas de Mazos: la barra de teléfono
 * arriba, fuera del scroll -tapa el header de la app, ver `globals.css`-, y
 * la miga de escritorio al principio del contenido, que sí scrollea con él.
 * El CSS decide cuál de las dos se ve.
 */
export function Screen({
  nav, top, bottom, children,
}: {
  nav?: {
    id?: string;
    levels: (Crumb | { label: string; href?: string })[];
    currentId?: string;
    action?: React.ReactNode;
  };
  top?: React.ReactNode;
  bottom?: React.ReactNode;
  children: React.ReactNode;
}) {
  const current = nav?.levels[nav.levels.length - 1];
  const trail = nav?.levels.slice(0, -1).filter((l): l is Crumb => Boolean(l.href)) ?? [];
  const up = trail.length > 0 ? trail[trail.length - 1] : undefined;

  return (
    <div className={styles.screen}>
      {nav && current && <MobileNavbar up={up} title={current.label} action={nav.action} />}
      {top}
      <Stack
        className={styles.screenScroll}
        gap="md"
        /* Marca si hay contenido scrolleado debajo de lo de arriba, para que
           una barra pueda mostrar su borde inferior sólo entonces. Se escribe
           directo en el DOM y no en un estado: no hay nada que volver a
           renderizar, es un atributo para el CSS. */
        onScroll={(e) => {
          const el = e.currentTarget;
          el.parentElement?.toggleAttribute('data-scrolled', el.scrollTop > 0);
        }}
      >
        {nav && current && (
          <Breadcrumb
            id={nav.id}
            trail={trail}
            current={current.label}
            currentId={nav.currentId}
          >
            {nav.action}
          </Breadcrumb>
        )}
        {children}
      </Stack>
      {bottom}
    </div>
  );
}
