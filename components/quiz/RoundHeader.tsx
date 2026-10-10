import { Group, Kbd, Text, UnstyledButton } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { Brand } from '../Brand';
import { MobileNavbar } from '../MobileNavbar';
import styles from './RoundHeader.module.css';

/**
 * La barra de arriba de una ronda, compartida por el quiz y el repaso de
 * significados.
 *
 * Estaba copiada en las dos pantallas, y la copia ya había divergido: el borde
 * de abajo era `dark-4` en una y `dark-5` en la otra. Esa es la clase de
 * diferencia que nadie introduce a propósito y que aparece sola cuando el
 * mismo marcado vive en dos archivos.
 *
 * **En teléfono es `MobileNavbar`, el mismo componente que Mazos, Grupos y
 * Palabras.** Antes esto era una segunda implementación que la imitaba: se le
 * fueron copiando a mano las medidas de la flecha, después el título, después
 * el estirado, y cada arreglo había que acordarse de hacerlo dos veces -el
 * último descentró el título de la ronda y en la otra barra no, justamente
 * porque eran dos-. Es el mismo problema que este componente vino a resolver,
 * un nivel más arriba.
 *
 * Se renderizan las dos y el CSS elige, sin `useMediaQuery`: `MobileNavbar` ya
 * se apaga sola cuando no hay `[data-phone]`, y la de escritorio se apaga
 * cuando lo hay. La de teléfono pasa de 43px a 48, que es lo que mide la del
 * resto de la app; esos 5px salen del escenario cuando se abre el teclado, y
 * se aceptan a cambio de que las dos barras sean una sola cosa.
 *
 * El `py` de la de escritorio es más chico que en el resto de la app a
 * propósito: con el zorro de 34px, el padding de `xs` la dejaría 12px más
 * alta. Por lo mismo va `flexShrink: 0`: con el teclado abierto el alto útil
 * se vuelve escasísimo y el reparto del faltante no puede tocar ni a esta
 * barra ni al pie, sólo al escenario.
 */
export function RoundHeader({
  id, brandId, nameId, title, context, onExit,
}: {
  id: string;
  brandId?: string;
  nameId?: string;
  /** Cómo se llama esta ronda: «Repasar escritura», «Repasar significados». */
  title: string;
  /** «Hiragana · 1 grupo». Vacío si no hay nada que decir. */
  context?: string;
  /** Abandonar la ronda desde el «salir» de escritorio. Lo mismo que `Esc`. */
  onExit: () => void;
}) {
  const t = useTranslations('round');
  return (
    <>
      {/* `replace` y no `push`: con `push`, el Back del sistema devuelve a una
          ronda que ya se abandonó. Es lo mismo que hace `Esc`. */}
      <MobileNavbar
        up={{ href: '/', label: t('back'), replace: true }}
        title={title}
        action={context ? <Text className={styles.navContext}>{context}</Text> : undefined}
      />

      <Group
        id={id}
        px="md"
        py={4}
        justify="space-between"
        bg="dark.6"
        className={styles.header}
        wrap="nowrap"
      >
        <Brand id={brandId} nameId={nameId} />
        {/* `Group` con `gap`, no texto suelto con espacios intercalados a mano:
            un espacio de texto JSX pegado al cierre de un tag puede colapsar a
            ancho CERO -pasó de verdad, confirmado midiendo en vivo-, y ajustar
            «cuánto» espacio con más espacios o `nbsp` no es un valor real, es
            adivinar. El `gap` va en rem y no en un número pelado, que Mantine
            interpreta en px y no crece con el resto de la app. */}
        <Group gap="0.5rem" wrap="nowrap">
          {context && <Text size="xs" c="dimmed">{`${context} ·`}</Text>}
          <Kbd>Esc</Kbd>
          <UnstyledButton id={`${id}-exit`} className={styles.exitText} onClick={onExit}>
            {t('exit')}
          </UnstyledButton>
        </Group>
      </Group>
    </>
  );
}

/** «Hiragana · 1 grupo»: el mazo -si hay uno, un repaso puede mezclar- y los grupos. */
export function useRoundContext(deckName: string | undefined, groups: number) {
  const t = useTranslations('round');
  return [deckName, t('groups', { count: groups })].filter(Boolean).join(' · ');
}
