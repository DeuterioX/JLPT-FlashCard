import { Button } from '@mantine/core';
import { PencilFill } from 'react-bootstrap-icons';
import { Icon } from './Icon';
import styles from './RenameButton.module.css';

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
      className={styles.renameBtn}
      variant="default"
      bg="transparent"
      size="compact-xs"
      aria-label="Renombrar"
      onClick={onClick}
    >
      <span className={styles.renameLabel}>Renombrar</span>
      {/* El ícono va envuelto en un span y la clase que lo prende y apaga va
          en el SPAN, no en el SVG: `Icon` escribe su `display` como estilo
          inline, y un estilo inline le gana a la hoja de estilos. Con la
          clase en el SVG, en escritorio se veían la etiqueta Y el ícono. */}
      <span className={styles.renameIcon}>
        <Icon glyph={PencilFill} rem={0.875} />
      </span>
    </Button>
  );
}
