import { ImageResponse } from 'next/og';
import { theme } from '@/theme';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// El mismo cuadrado de `icon.tsx`, en el tamaño que iOS pide para la pantalla
// de inicio. Sin este archivo, al «agregar a inicio» Safari usa una captura de
// la página, que a ese tamaño no se entiende.
//
// Sin radio, al revés que el favicon: iOS le recorta las esquinas por su
// cuenta, y un radio propio quedaría recortado dos veces.
//
// Los colores salen de `theme.ts`, por lo mismo que en `icon.tsx`: acá estaban
// copiados a mano y se habían quedado con el índigo de la paleta anterior.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: theme.other!.papel,
          color: theme.other!.sumi,
          fontSize: 124,
          fontWeight: 700,
        }}
      >
        あ
      </div>
    ),
    { ...size },
  );
}
