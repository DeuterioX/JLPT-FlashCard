import { ImageResponse } from 'next/og';
import { theme } from '@/theme';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// El favicon: la あ sobre el papel, con el mismo radio que la píldora del menú.
//
// Los colores se LEEN de `theme.ts` y no se escriben acá. Estaban copiados a
// mano, y cuando la app pasó de índigo a «tinta y papel» esta copia se quedó
// con la paleta vieja: fondo #E9EBF4 y texto #0F1220, que es el índigo que el
// propio comentario de `theme.ts` menciona como anterior. Un ícono con los
// colores de hace dos diseños no se nota en la pantalla, se nota en la
// pestaña.
//
// Esto NO se puede llevar a una clase ni a un `.module.css`: `ImageResponse`
// dibuja con Satori, que convierte el JSX a PNG sin navegador. No hay cascada,
// ni clases, ni variables CSS; sólo acepta un `style` en línea con un
// subconjunto de propiedades. Lo que sí se puede sacar, y es lo que importa,
// son los valores.
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
          background: theme.other!.papel,
          color: theme.other!.sumi,
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
