import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// El mismo cuadrado de `icon.tsx`, en el tamaño que iOS pide para la
// pantalla de inicio. Sin este archivo, al "agregar a inicio" Safari usa
// una captura de la página, que a ese tamaño no se entiende.
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
          background: '#E9EBF4',
          color: '#0F1220',
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
