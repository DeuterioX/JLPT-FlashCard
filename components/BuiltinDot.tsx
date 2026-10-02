import { Tooltip } from '@mantine/core';

/**
 * Marca los mazos que vienen con la app. Es solo un punto, a propósito:
 * una etiqueta de texto agregaría una palabra más al vocabulario de la UI
 * para decir algo que el botón Borrar ausente ya comunica.
 */
export function BuiltinDot() {
  return (
    <Tooltip label="Incluido en la app · no se puede borrar" withArrow>
      <span className="knd-builtin-dot" />
    </Tooltip>
  );
}
