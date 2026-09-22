import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// `.brand i` del diseño: cuadrado redondeado con el texto en el color de
// fondo de la página (--a-bg) sobre el color de texto normal (--a-text)
// -invertido respecto del resto de la app, a propósito: es la marca-.
export default function Icon() {
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
          fontSize: 22,
          fontWeight: 700,
          borderRadius: 7,
        }}
      >
        あ
      </div>
    ),
    { ...size },
  );
}
