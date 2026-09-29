'use client';

import { Card, Switch, Stack, Group, Text } from '@mantine/core';
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
  // Jerarquía de brillo de tres niveles -kana más brillante, nombre del
  // grupo en el medio, romaji el más apagado- en los dos estados: apagada
  // corre toda la escala un tono más oscuro, pero mantiene el mismo orden
  // relativo entre los tres en vez de emparejarlos.
  // El kana y el romaji van sobre PAPEL, así que su color es tinta y no la
  // escala de la interfaz: `dark.2` sobre crema daba 2,2:1. Apagados, la
  // tinta se va con el papel -lo que se lee es la hoja entera, no cada
  // renglón por separado-. El nombre sigue sobre la franja de tinta.
  const kanaColor = checked ? 'var(--knd-sumi)' : 'var(--knd-papel-ink)';
  const romajiColor = checked ? 'var(--knd-sumi-dim)' : 'var(--knd-papel-ink-dim)';
  const nameColor = checked ? 'dark.0' : 'dark.3';

  // Cuántas quedan afuera de la previsualización. 0 = el grupo entra entero.
  const resto = group.cardCount - group.preview.length;

  /**
   * El kana baja de 15 a 13px cuando el grupo tiene PALABRAS y no sílabas
   * sueltas. Lo decide el contenido y no el mazo, porque no hay nada en el
   * modelo que diga «este mazo es de vocabulario»: un grupo de kana trae
   * prompts de uno o dos caracteres -あ, きゃ- y uno de palabras arranca en
   * tres -いしゃ-.
   *
   * Los 2px compran exactamente una letra por línea en la tarjeta de
   * teléfono, que mide 113px y deja 101 de contenido: de seis a siete.
   * Medido con las palabras del mazo: alcanza para けんきゅうしゃ y para las
   * tres ましょう, que son el grueso. Para いいえ, わかりません no alcanza
   * -ni ningún tamaño alcanzaría-, y de eso se encarga el recorte.
   */
  const palabras = group.preview.some((p) => [...p.prompt].length > 2);

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
      // El contenedor ya no codifica el estado: lo dice el papel de adentro.
      // Dos señales para lo mismo -fondo de la tarjeta y color de la hoja-
      // se pelean, y la que se ve de lejos es la hoja.
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
        // (`borderSoft`), no el `dark.4` -"default"- que trae
        // Mantine solo con `withBorder`: son dos tonos distintos.
        borderColor: 'var(--knd-border-soft)',
      }}
    >
      {/* `flex: 1` para que la hoja llene la tarjeta: la grilla ya estira
          todas las tarjetas de una fila al mismo alto, pero sin esto el Stack
          medía lo que medían sus hijos y a un grupo de tres cartas le quedaba
          media tarjeta de tinta vacía abajo. */}
      <Stack gap={6} style={{ flex: 1, minHeight: 0 }}>
        {/* Una sola fila: el nombre a la izquierda y el interruptor a la
            derecha, como una franja de tinta arriba de la hoja. Antes el
            interruptor iba centrado ARRIBA del nombre, en dos renglones, que
            es el tratamiento del mockup viejo: comía alto y dejaba el nombre
            sin un borde contra el cual alinearse. */}
        <Group gap={6} wrap="nowrap" justify="space-between" style={{ padding: '0 0.125rem' }}>
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
              line-height MENOR que el propio tamaño de letra -las líneas se
              pisaban de verdad-. */}
          <Text
            size="11.5px" lh={1.4} fw={500} c={nameColor} className="kana"
            style={{ wordBreak: 'break-word', minWidth: 0 }}
          >
            {group.name}
          </Text>
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
        </Group>

        {/* Una línea por carta, recortada con puntos suspensivos. Partir no
            es una opción: con el kana envuelto, un yōon chico -el ゃ de
            けんきゅうしゃ- puede quedar solo arrancando renglón, y en
            composición japonesa eso está mal, no sólo feo. Y ningún tamaño
            de letra garantiza que cualquier palabra entre, así que el recorte
            es lo único que cubre también lo que todavía no cargaste. */}
        {/* Las cartas viven en una HOJA, no sobre la tinta: es la misma
            decisión que la del quiz, un escalón más chico. Y el estado del
            grupo lo dice el papel -crema si entra en la ronda, gris si no-,
            que es lo que se ve de lejos en una grilla de doce tarjetas; el
            interruptor de arriba lo repite de cerca.
            El alto del renglón y el paso de la pauta salen de la MISMA
            variable de CSS: separados, los renglones dejan de caer sobre las
            líneas, que es todo el punto del papel de manuscrito. */}
        <div
          className="knd-gc-papel knd-gc-words"
          data-off={checked ? undefined : ''}
          data-palabras={palabras ? '' : undefined}
        >
          {group.preview.map((p) => (
            <div key={p.prompt} className="knd-gc-fila">
              <Text className="kana knd-gc-cut knd-gc-kana" lh={1.2} c={kanaColor}>
                {p.prompt}
              </Text>
              <Text className="romaji knd-gc-cut knd-gc-romaji" c={romajiColor} lh={1.2}>
                {p.romaji}
              </Text>
            </div>
          ))}
        </div>
        {resto > 0 && (
          <Text size="xs" c={nameColor} className="tabular">
            {resto === 1 ? '1 palabra más' : `${resto} palabras más`}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
