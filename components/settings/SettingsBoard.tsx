'use client';

import { useState, useSyncExternalStore } from 'react';
import { Paper, SegmentedControl } from '@mantine/core';
import { useMantineColorScheme, type MantineColorScheme } from '@mantine/core';
import { Screen } from '../Screen';
import { MobileNavbar } from '../MobileNavbar';
import { SectionLabel } from '../SectionLabel';
import { SettingRow } from './SettingRow';
import { ChoiceModal } from './ChoiceModal';
import { APP_NAME } from '@/lib/app-meta';
import styles from './SettingsBoard.module.css';

const THEMES: { value: MantineColorScheme; label: string }[] = [
  { value: 'auto', label: 'Automático' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

function subscribeNoop() {
  return () => {};
}

/**
 * El tema elegido sólo existe en el navegador -Mantine lo guarda en
 * `localStorage`-, así que el servidor no lo sabe y renderiza `auto`. Mostrarlo
 * en el primer render rompería la hidratación; hasta montar no se marca nada.
 */
function useMounted(): boolean {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

/**
 * Ajustes: el tema, el idioma -todavía apagado- y la entrada a Acerca de.
 *
 * El tema tiene tres estados y no dos: automático, que sigue al sistema y es
 * el valor por omisión, claro y oscuro. Con un interruptor, volver a «seguir al
 * sistema» después de fijar uno dejaría de poder elegirse.
 */
export function SettingsBoard() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const mounted = useMounted();
  const [editing, setEditing] = useState<'theme' | 'language' | null>(null);
  const close = () => setEditing(null);

  const themeLabel = THEMES.find((t) => t.value === colorScheme)?.label;

  return (
    <Screen top={<MobileNavbar up={{ href: '/', label: 'Práctica' }} title="Ajustes" />}>
      <div id="settings" className={styles.column}>
        <SectionLabel jp="表示">apariencia</SectionLabel>
        <Paper withBorder className="knd-list">
          {/* En escritorio, el segmento: hay lugar de sobra y ver las tres
              opciones a la vez es mejor que esconderlas. En teléfono no entra
              al lado del nombre, y es una fila que abre un modal. Las dos se
              renderizan y el CSS decide, para que servidor y cliente emitan lo
              mismo. */}
          <SettingRow
            className={styles.wide}
            glyph="色"
            title="Tema"
            description="Usar el del sistema, o fijar uno."
            control={
              <SegmentedControl
                id="theme-control"
                size="xs"
                value={mounted ? colorScheme : ''}
                onChange={(v) => setColorScheme(v as MantineColorScheme)}
                data={THEMES}
              />
            }
          />
          <SettingRow
            id="theme-row"
            className={styles.narrow}
            glyph="色"
            title="Tema"
            description="Usar el del sistema, o fijar uno."
            value={mounted ? themeLabel : undefined}
            onClick={() => setEditing('theme')}
          />
        </Paper>

        <SectionLabel jp="言語">idioma</SectionLabel>
        <Paper withBorder className="knd-list">
          {/* Fila en los dos tamaños, al revés que el tema: el idioma va a
              crecer, y un segmento que crece deja de entrar. Está aunque
              todavía no haya otro idioma: mostrarlo dice qué va a haber y
              dónde, y esconderlo no dice nada. */}
          <SettingRow
            id="language-row"
            glyph="語"
            title="Idioma de la interfaz"
            description="Pronto. Las cartas no cambian: siguen en japonés."
            value="Español"
            onClick={() => setEditing('language')}
          />
        </Paper>

        <SectionLabel jp="情報">información</SectionLabel>
        <Paper withBorder className="knd-list">
          <SettingRow
            id="about-row"
            glyph="情"
            title={`Acerca de ${APP_NAME}`}
            description="Versión, fuentes y licencias."
            href="/settings/about"
          />
        </Paper>
      </div>

      <ChoiceModal
        id="theme"
        opened={editing === 'theme'}
        onClose={close}
        jp="色"
        title="Tema"
        value={colorScheme}
        options={THEMES.map((t) => ({
          ...t,
          hint: t.value === 'auto' ? 'usar el del sistema' : undefined,
        }))}
        onSave={(v) => setColorScheme(v as MantineColorScheme)}
      />
      <ChoiceModal
        id="language"
        opened={editing === 'language'}
        onClose={close}
        jp="語"
        title="Idioma"
        value="es"
        options={[
          { value: 'es', label: 'Español' },
          { value: 'ja', label: '日本語', hint: 'pronto', disabled: true },
          { value: 'en', label: 'English', hint: 'pronto', disabled: true },
        ]}
        onSave={() => {}}
      />
    </Screen>
  );
}
