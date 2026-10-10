'use client';

import { useState, useSyncExternalStore, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Paper, SegmentedControl, Switch } from '@mantine/core';
import { useMantineColorScheme, type MantineColorScheme } from '@mantine/core';
import { Screen } from '../Screen';
import { MobileNavbar } from '../MobileNavbar';
import { SectionLabel } from '../SectionLabel';
import { SettingRow } from './SettingRow';
import { ChoiceModal } from './ChoiceModal';
import { APP_NAME } from '@/lib/app-meta';
import { useConfirmQuizExit, writeConfirmQuizExit } from '@/lib/client/preferences';
import { setLocale } from '@/lib/i18n/actions';
import { LOCALES } from '@/lib/i18n/locales';
import styles from './SettingsBoard.module.css';

const THEMES: MantineColorScheme[] = ['auto', 'light', 'dark'];

// Cada idioma con su propio nombre: quien no entiende la interfaz igual
// reconoce el suyo.
const LANGUAGE_NAMES: Record<(typeof LOCALES)[number], string> = {
  es: 'Español',
  en: 'English',
  'pt-BR': 'Português (Brasil)',
};

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
 * Ajustes: el tema, la confirmación al salir del quiz, el idioma y la entrada a
 * Acerca de.
 *
 * El tema tiene tres estados y no dos: automático, que sigue al sistema y es
 * el valor por omisión, claro y oscuro. Con un interruptor, volver a «seguir al
 * sistema» después de fijar uno dejaría de poder elegirse.
 */
export function SettingsBoard() {
  const t = useTranslations('settings');
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const mounted = useMounted();
  const confirmQuizExit = useConfirmQuizExit();
  const [editing, setEditing] = useState<'theme' | 'language' | null>(null);
  const close = () => setEditing(null);

  const themes = THEMES.map((value) => ({ value, label: t(`theme.options.${value}`) }));
  const themeLabel = themes.find((o) => o.value === colorScheme)?.label;

  // La cookie la escribe el server, y `refresh` vuelve a renderizar todo con
  // los mensajes del idioma nuevo.
  const changeLanguage = (value: string) => startTransition(async () => {
    await setLocale(value);
    router.refresh();
  });

  return (
    <Screen top={<MobileNavbar up={{ href: '/', label: t('back') }} title={t('title')} />}>
      <div id="settings" className={styles.column}>
        <SectionLabel jp="表示">{t('sections.appearance')}</SectionLabel>
        <Paper withBorder className="knd-list">
          {/* En escritorio, el segmento: hay lugar de sobra y ver las tres
              opciones a la vez es mejor que esconderlas. En teléfono no entra
              al lado del nombre, y es una fila que abre un modal. Las dos se
              renderizan y el CSS decide, para que servidor y cliente emitan lo
              mismo. */}
          <SettingRow
            className={styles.wide}
            glyph="色"
            title={t('theme.title')}
            description={t('theme.description')}
            control={
              <SegmentedControl
                id="theme-control"
                size="xs"
                value={mounted ? colorScheme : ''}
                onChange={(v) => setColorScheme(v as MantineColorScheme)}
                data={themes}
              />
            }
          />
          <SettingRow
            id="theme-row"
            className={styles.narrow}
            glyph="色"
            title={t('theme.title')}
            description={t('theme.description')}
            value={mounted ? themeLabel : undefined}
            onClick={() => setEditing('theme')}
          />
        </Paper>

        <SectionLabel jp="練習">{t('sections.practice')}</SectionLabel>
        <Paper withBorder className="knd-list">
          <SettingRow
            glyph="退"
            title={t('confirmQuizExit.title')}
            description={t('confirmQuizExit.description')}
            control={
              <Switch
                id="confirm-quiz-exit"
                aria-label={t('confirmQuizExit.title')}
                checked={confirmQuizExit}
                onChange={(e) => writeConfirmQuizExit(e.currentTarget.checked)}
              />
            }
          />
        </Paper>

        <SectionLabel jp="言語">{t('sections.language')}</SectionLabel>
        <Paper withBorder className="knd-list">
          {/* Fila y no segmento: con más idiomas, un segmento deja de entrar. */}
          <SettingRow
            id="language-row"
            glyph="語"
            title={t('language.title')}
            description={t('language.description')}
            value={LANGUAGE_NAMES[locale]}
            onClick={() => setEditing('language')}
          />
        </Paper>

        <SectionLabel jp="情報">{t('sections.info')}</SectionLabel>
        <Paper withBorder className="knd-list">
          <SettingRow
            id="about-row"
            glyph="情"
            title={t('about.title', { app: APP_NAME })}
            description={t('about.description')}
            href="/settings/about"
          />
        </Paper>
      </div>

      <ChoiceModal
        id="theme"
        opened={editing === 'theme'}
        onClose={close}
        jp="色"
        title={t('theme.title')}
        value={colorScheme}
        options={themes.map((o) => ({
          ...o,
          hint: o.value === 'auto' ? t('theme.autoHint') : undefined,
        }))}
        onSave={(v) => setColorScheme(v as MantineColorScheme)}
      />
      <ChoiceModal
        id="language"
        opened={editing === 'language'}
        onClose={close}
        jp="語"
        title={t('language.modalTitle')}
        value={locale}
        options={LOCALES.map((value) => ({ value, label: LANGUAGE_NAMES[value] }))}
        onSave={changeLanguage}
      />
    </Screen>
  );
}
