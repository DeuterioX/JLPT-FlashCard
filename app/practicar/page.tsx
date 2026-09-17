'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Center, Loader } from '@mantine/core';
import { QuizRunner } from '@/components/quiz/QuizRunner';
import { parseStoredRound, ROUND_KEY, type StoredRound } from '@/lib/quiz/stored-round';

// `sessionStorage` es un sistema externo al render de React: se lee con
// `useSyncExternalStore` en vez de leerla en un efecto y volcarla a un
// `useState` (lo que dispara un setState síncrono dentro del efecto, un
// patrón que el linter de hooks marca como error). El valor no cambia
// mientras la pantalla está montada, así que `subscribe` no tiene nada que
// escuchar; solo hace falta un `getSnapshot` que devuelva SIEMPRE la misma
// referencia mientras el `raw` no cambie -si no, cada llamada devolvería un
// objeto nuevo y React entraría en un loop de renders-.
function subscribe() {
  return () => {};
}

// El cache de abajo vive a nivel de módulo y sobrevive a la navegación del
// lado del cliente, así que su clave tiene que incluir TODO lo que cambia su
// resultado: acá eso es solo el `raw` de la ronda. A propósito NO se mezcla
// la marca de "ronda ya usada" (`ronda-usada`): esa la lee `QuizRunner` una
// sola vez al montarse (ver ahí), y si la página la cacheara o la observara
// podría quedar vieja tras un Back o, peor, cambiar a mitad de ronda.
let cachedRaw: string | null | undefined;
let cachedRound: StoredRound | null = null;

function getSnapshot(): StoredRound | null {
  const raw = sessionStorage.getItem(ROUND_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedRound = raw ? parseStoredRound(raw) : null;
  }
  return cachedRound;
}

function getServerSnapshot(): StoredRound | null {
  return null;
}

export default function Page() {
  const router = useRouter();
  const round = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    // Sin ronda guardada, o con un JSON roto o incompleto, no hay nada que
    // practicar: se vuelve a la home en vez de romper la pantalla.
    if (!round) router.replace('/');
  }, [round, router]);

  if (!round) return <Center h="100vh"><Loader /></Center>;
  // `key`: si alguna vez cambiara la ronda guardada con la página montada,
  // se remonta QuizRunner y vuelve a decidir cómo arrancar (ver ahí).
  return <QuizRunner key={round.sessionId} round={round} />;
}
