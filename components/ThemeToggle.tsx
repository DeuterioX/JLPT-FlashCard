'use client';

import { Button, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { MoonStarsFill, SunFill } from 'react-bootstrap-icons';
import { Icon } from './Icon';

/**
 * El interruptor entre tinta clara y tinta oscura.
 *
 * La app arranca en `auto`, o sea siguiendo lo que diga el sistema, y eso está
 * bien como default: nadie tiene que elegir nada la primera vez. Pero seguir
 * al sistema y no poder desobedecerlo son dos cosas distintas -se lee de noche
 * con el sistema en claro, y al revés-, así que acá se puede fijar.
 *
 * Se lee el esquema COMPUTADO y no el elegido: mientras está en `auto`, el
 * elegido es literalmente `'auto'` y no dice cuál de los dos se está viendo,
 * que es justo lo que necesita el botón para ofrecer el otro. Al apretarlo se
 * fija uno explícito, y Mantine lo recuerda entre visitas.
 *
 * El ícono es el destino, no el estado: mostrando la luna, apretarlo lleva a
 * oscuro. Al revés -mostrar dónde estás- el botón se lee como un indicador y
 * no como un control.
 */
export function ThemeToggle({ id }: { id?: string }) {
  const { setColorScheme } = useMantineColorScheme();
  // `getInitialValueInEffect: false` para que el primer render del cliente
  // coincida con el del servidor y no parpadee: `ColorSchemeScript` ya dejó el
  // atributo puesto en el `<html>` antes de que pinte nada.
  const current = useComputedColorScheme('dark', { getInitialValueInEffect: false });
  const target = current === 'dark' ? 'light' : 'dark';

  return (
    <Button
      id={id}
      variant="default"
      size="compact-xs"
      onClick={() => setColorScheme(target)}
      aria-label={target === 'dark' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      title={target === 'dark' ? 'Modo oscuro' : 'Modo claro'}
    >
      <Icon glyph={target === 'dark' ? MoonStarsFill : SunFill} />
    </Button>
  );
}
