import { Tooltip, Box } from '@mantine/core';

/**
 * Marca los mazos que vienen con la app. Es solo un punto, a propósito:
 * una etiqueta de texto agregaría una palabra más al vocabulario de la UI
 * para decir algo que el botón Borrar ausente ya comunica.
 */
export function BuiltinDot() {
  return (
    <Tooltip label="Incluido en la app · no se puede borrar" withArrow>
      <Box
        component="span"
        w={7}
        h={7}
        ml={7}
        style={{ borderRadius: '50%', background: 'var(--mantine-color-jade-6)', display: 'inline-block' }}
      />
    </Tooltip>
  );
}
