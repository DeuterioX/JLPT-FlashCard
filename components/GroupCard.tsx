'use client';

import { Card, Switch, Stack, Text, useMantineTheme } from '@mantine/core';
import type { GroupSummary } from '@/lib/services/decks';

/**
 * La regla de las seis cartas: si el grupo trae preview, se muestran las cartas
 * (y か行 se ve como la columna de kana); si no, se muestra el conteo.
 * Es presentación pura, no hay ninguna condición en el modelo de datos.
 *
 * La tarjeta entera es el control (rol `switch`), no el `Switch` visual: en
 * Mantine 9 el track pintado del `Switch` cubre al input nativo, así que un
 * click de mouse llega primero al track y burbujea al `onClick` del `Card`
 * (toggle 1) y después, por el `<label htmlFor>` interno del propio `Switch`,
 * dispara un click sintético sobre el input que llama a `onChange`
 * (toggle 2) -`stopPropagation` en el input nunca llega a tiempo para
 * evitarlo, porque el camino que importa es el del `label`, no el del input-.
 * El resultado quedaba enmascarado porque ambos toggles calculan el mismo
 * valor, pero eran dos side effects. Por eso el `Switch` de acá abajo es
 * puramente visual (sin puntero, sin foco, oculto para lectores de pantalla)
 * y toda la interacción -mouse y teclado- vive en el `Card`.
 */
export function GroupCard({
  group, checked, onToggle,
}: { group: GroupSummary; checked: boolean; onToggle: (id: number, on: boolean) => void }) {
  const toggle = () => onToggle(group.id, !checked);
  const { other } = useMantineTheme();
  // Jerarquía de brillo de tres niveles -kana más brillante, nombre del
  // grupo en el medio, romaji el más apagado- en los dos estados: apagada
  // corre toda la escala un tono más oscuro, pero mantiene el mismo orden
  // relativo entre los tres en vez de emparejarlos.
  const kanaColor = checked ? undefined : 'dark.2';
  const nameColor = checked ? 'dark.2' : 'dark.3';
  const romajiColor = checked ? 'dark.3' : 'dark.4';

  return (
    <Card
      withBorder
      role="switch"
      aria-checked={checked}
      aria-label={`Practicar ${group.name}`}
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          // Espacio scrollea la página por default; acá el espacio es el toggle.
          e.preventDefault();
          toggle();
        }
      }}
      className="knd-group-card"
      // Colores del diseño para el estado prendido: no son un tinte
      // genérico de la escala jade, son los valores puntuales que fija
      // el sistema visual ("esta tarjeta está activa"), nombrados en
      // `theme.other` -nunca hex sueltos acá-. Van por el prop `bg` de
      // Mantine -no por `style`-: Card ya trae `defaultProps.bg` (ver
      // theme.ts) y ese `bg` se resuelve como la propiedad `background`
      // (shorthand), que pisa un `style.backgroundColor` (longhand) puesto
      // a mano apenas el componente se remonta desde cero -pasó de verdad,
      // al cambiar de Hiragana a Katakana y volver-. Pasando todo por `bg`
      // no hay dos mecanismos compitiendo por la misma propiedad CSS.
      bg={checked ? other.groupCardActiveBg : undefined}
      style={{
        cursor: 'pointer',
        minHeight: 44,
        // `--card-padding` a mano -8px 6px, el del diseño, asimétrico- en
        // vez del prop `padding`: Card resuelve ese prop a la misma
        // variable por su propio `varsResolver`, y ahí gana el que se
        // calcula último (mismo problema que `bg` vs `style` de arriba).
        // Sin pasar `padding` como prop, ese resolver no escribe nada y
        // este valor queda como el único. En rem, no en px -era el único
        // padding de toda la app que se quedaba clavado en 2K/4K
        // mientras todo alrededor escalaba, confirmado en vivo-.
        '--card-padding': '0.5rem 0.375rem',
        // Sin seleccionar usa el borde "suave" del diseño
        // (`groupCardBorder`), no el `dark.4` -"default"- que trae
        // Mantine solo con `withBorder`: son dos tonos distintos.
        borderColor: checked ? other.groupCardActiveBorder : other.groupCardBorder,
      }}
    >
      <Stack gap={6} align="center">
        {/* Tamaño, riel y color de la bolita salen enteros de
            `theme.components.Switch` -incluido el estado prendido, que
            ese `styles` lee directo del `checked` que se le pasa acá-. */}
        <Switch
          checked={checked}
          readOnly
          tabIndex={-1}
          aria-hidden
          style={{ pointerEvents: 'none' }}
        />
        {/* El nombre va en la misma tipografía que el kana -Zen Kaku
            Gothic New-, como en el diseño original (ahí decía "あ行" con
            esta letra): que ahora diga "Serie A" no cambia la fuente.
            `wordBreak` cubre un mazo propio con un nombre de grupo o una
            palabra sin espacios más larga que la tarjeta -en el grid de
            3 columnas de teléfono desbordaba de verdad, pasó probando
            con "arigatougozaimasu"-. */}
        {/* `lh` explícito: al pasarle a `size` un string libre ("11px")
            en vez de un nombre de la escala, Mantine no encuentra en qué
            entrada de `theme.lineHeights` buscar y termina devolviendo un
            line-height MENOR que el propio tamaño de letra (11px de alto
            de línea con 11px de fuente) -las líneas se pisaban de
            verdad-. Con un múltiplo sin unidad escala bien con cualquier
            tamaño. */}
        {/* Mismo color que el kana grande de abajo -brillante cuando está
            prendida, `dark.3` cuando está apagada-, ya no el "dimmed"
            genérico: así queda igual de vivo que el resto de la
            tarjeta, no más apagado que ella. */}
        <Text size="11px" lh={1.4} c={nameColor} className="kana" style={{ wordBreak: 'break-word', maxWidth: '100%' }}>
          {group.name}
        </Text>

        {group.preview.length > 0 ? (
          <Stack gap={2} align="center" style={{ maxWidth: '100%' }}>
            {group.preview.map((p) => (
              <Stack key={p.prompt} gap={0} align="center" style={{ maxWidth: '100%' }}>
                <Text className="kana" size="15px" lh={1.5} c={kanaColor} style={{ wordBreak: 'break-word', maxWidth: '100%' }}>
                  {p.prompt}
                </Text>
                <Text className="romaji" size="10px" c={romajiColor} lh={1.2} style={{ wordBreak: 'break-word', maxWidth: '100%' }}>
                  {p.romaji}
                </Text>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Text size="xs" c={nameColor} className="tabular">{group.cardCount} palabras</Text>
        )}
      </Stack>
    </Card>
  );
}
