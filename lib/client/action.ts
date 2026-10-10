'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Una acción contra la API: guarda de reentrada, estado de ocupado y el error
 * que se muestra en pantalla.
 *
 * Esta forma estaba escrita catorce veces, byte por byte, en cada botón que
 * crea, borra, renombra o mueve algo. Las catorce hacían lo mismo y las
 * catorce tenían que acordarse de lo mismo, incluida la parte sutil: la guarda
 * es una REF y no el estado `busy`, porque dos clicks del mismo evento
 * discreto pueden procesarse antes de que React vuelva a pintar y el
 * `disabled` llegue al botón.
 *
 * El proyecto ya había hecho este movimiento dos veces sin terminarlo:
 * `errors.ts` extrajo el mensaje pero no la cáscara que lo envuelve, y
 * `lib/api/handler.ts` hizo el equivalente completo del lado servidor. Esto es
 * el paso que faltaba de este lado.
 *
 * El cuerpo devuelve `string` para fallar con ese mensaje y nada para andar
 * bien. Así el camino de error de la API -leer el cuerpo de la respuesta con
 * `errorFrom`- queda donde se conoce la respuesta, y el de red -que no tiene
 * respuesta que leer- lo cubre el `catch` de acá.
 */
export function useAction(opts: {
  /**
   * No soltar la guarda ni apagar `busy` cuando la acción sale bien.
   *
   * Lo necesitan las acciones que NAVEGAN: `router.push` deja el componente
   * montado mientras navega, y en esa ventana un segundo click abriría una
   * segunda sesión que nunca se cierra. El componente se desmonta al llegar,
   * así que no hace falta soltarla después.
   */
  keepLockedOnSuccess?: boolean;
} = {}) {
  const t = useTranslations('errors');
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (body: () => Promise<string | void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    let succeeded = false;
    try {
      const failure = await body();
      if (failure) setError(failure);
      else succeeded = true;
    } catch {
      // `fetch` tiró (sin red, DNS, CORS): no hubo respuesta que leer.
      setError(t('network'));
    } finally {
      if (!(succeeded && opts.keepLockedOnSuccess)) {
        running.current = false;
        setBusy(false);
      }
    }
  }, [opts.keepLockedOnSuccess, t]);

  return { busy, error, setError, run };
}
