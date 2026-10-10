import { Tooltip } from '@mantine/core';
import { useTranslations } from 'next-intl';
import styles from './BuiltinDot.module.css';

/**
 * Marca los mazos que vienen con la app. Es solo un punto, a propósito:
 * una etiqueta de texto agregaría una palabra más al vocabulario de la UI
 * para decir algo que el botón Borrar ausente ya comunica.
 */
export function BuiltinDot() {
  const t = useTranslations('decks');
  return (
    <Tooltip label={t('builtin')} withArrow>
      <span className={styles.builtinDot} />
    </Tooltip>
  );
}
