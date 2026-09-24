import { Button } from '@mantine/core';

/**
 * «Renombrar», con etiqueta en escritorio e ícono en teléfono.
 *
 * Las dos formas se renderizan siempre y el CSS decide cuál se ve: con
 * `useMediaQuery` el servidor y el cliente emitirían marcado distinto y la
 * hidratación parpadearía. El nombre accesible lo da el `aria-label`, así que
 * el ícono no pierde información para un lector de pantalla.
 *
 * El ícono es un SVG y no el carácter ✎: el sistema dibuja ese carácter como
 * emoji -en color y con volumen- aunque se le pida presentación de texto con
 * U+FE0E, y desentona con el resto de la interfaz, que es plana y monocroma.
 * Un trazo en `currentColor` además sigue al botón en hover y en foco.
 *
 * Vive en un componente porque se usa en dos pantallas, y hoy ya pagamos el
 * precio de tener el mismo marcado copiado en varias (ver `Breadcrumb`).
 */
export function RenameButton({ id, onClick }: { id: string; onClick: () => void }) {
  return (
    <Button
      id={id}
      className="knd-rename-btn"
      variant="default"
      bg="transparent"
      size="compact-xs"
      aria-label="Renombrar"
      onClick={onClick}
    >
      <span className="knd-rename-label">Renombrar</span>
      <svg
        className="knd-rename-icon"
        /* En `rem` y no en px, para que acompañe al resto cuando la app escala
           subiendo el `font-size` de la raíz. Son los mismos 14px a escala
           100%. */
        style={{ width: '0.875rem', height: '0.875rem' }}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M11.4 2.3a1.4 1.4 0 0 1 2 2L5.8 11.9l-2.9.9.9-2.9 7.6-7.6z" />
        <path d="M10.1 3.6l2.3 2.3" />
      </svg>
    </Button>
  );
}
