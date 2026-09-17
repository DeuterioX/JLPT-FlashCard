'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Center, Loader } from '@mantine/core';
import { QuizRunner, type Round } from '@/components/quiz/QuizRunner';

function parseRound(raw: string): Round | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !parsed || typeof parsed !== 'object'
    || typeof (parsed as Round).sessionId !== 'number'
    || !Array.isArray((parsed as Round).cards)
    || !Array.isArray((parsed as Round).groupIds)
    || !(parsed as Round).groupIds.every((g) => typeof g === 'number')
  ) {
    return null;
  }
  // `mode` es nuevo (Task 15, sección B): un `sessionStorage` viejo de antes
  // de este cambio no lo trae, así que su ausencia se toma como 'normal' en
  // vez de invalidar la ronda entera.
  const withMode = parsed as Round & { mode?: unknown };
  return { ...withMode, mode: withMode.mode === 'review' ? 'review' : 'normal' };
}

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

let cachedRaw: string | null | undefined;
let cachedRound: Round | null = null;

function getSnapshot(): Round | null {
  const raw = sessionStorage.getItem('ronda');
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedRound = raw ? parseRound(raw) : null;
  }
  return cachedRound;
}

function getServerSnapshot(): Round | null {
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
  return <QuizRunner round={round} />;
}
