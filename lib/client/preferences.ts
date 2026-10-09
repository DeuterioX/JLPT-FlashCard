import { useSyncExternalStore } from 'react';

// Preferencias de este navegador, en `localStorage` como el tema. Todo acceso
// va en try/catch: una ventana privada puede hacer que `localStorage` tire.

const CONFIRM_QUIZ_EXIT = 'kitsune.confirmQuizExit';

// `storage` sólo avisa a las otras pestañas; esta se entera por acá.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Si salir del quiz con Esc pide confirmación. Por omisión, sí. */
export function readConfirmQuizExit(): boolean {
  try {
    return localStorage.getItem(CONFIRM_QUIZ_EXIT) !== 'false';
  } catch {
    return true;
  }
}

export function writeConfirmQuizExit(on: boolean) {
  try {
    localStorage.setItem(CONFIRM_QUIZ_EXIT, on ? 'true' : 'false');
  } catch {
    // Sin almacenamiento la preferencia no sobrevive, pero la app sigue.
  }
  for (const l of listeners) l();
}

/** Para Ajustes. El servidor no la conoce y renderiza el valor por omisión. */
export function useConfirmQuizExit(): boolean {
  return useSyncExternalStore(subscribe, readConfirmQuizExit, () => true);
}
