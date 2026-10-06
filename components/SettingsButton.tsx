import { Button } from '@mantine/core';
import Link from 'next/link';
import { GearFill } from 'react-bootstrap-icons';
import { Icon } from './Icon';
import styles from './SettingsButton.module.css';

/**
 * La entrada a Ajustes, al ras de la derecha de la barra de la app.
 *
 * Un engranaje y no un kanji: los kanji de la app rotulan CONTENIDO -文, 冊 y
 * 計 son los tres lugares donde se estudia- y los ajustes no son contenido, son
 * la app configurándose a sí misma. Tampoco es una cuarta pestaña, por lo
 * mismo: las pestañas son comparables entre sí porque las tres son lugares de
 * estudio.
 *
 * Vive en la barra de la app, que en teléfono sólo se ve en las pantallas raíz
 * -Práctica, Mazos, Estadísticas-: en las de adentro la tapa la barra de
 * pantalla, y ese rincón ya es de «Renombrar». Desde adentro se sale a la raíz,
 * que está a un toque.
 */
export function SettingsButton() {
  return (
    <Button
      id="settings-button"
      component={Link}
      href="/settings"
      className={styles.settingsButton}
      variant="default"
      size="compact-xs"
      aria-label="Ajustes"
      title="Ajustes"
    >
      <Icon glyph={GearFill} />
    </Button>
  );
}
