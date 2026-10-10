import { Anchor, Stack, Text } from '@mantine/core';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import logo from '../../public/logo.png';
import { Screen } from '../Screen';
import { SectionLabel } from '../SectionLabel';
import { GenkoSheet } from '../quiz/GenkoSheet';
import { APP_NAME, APP_NAME_JP } from '@/lib/app-meta';
import styles from './AboutScreen.module.css';

/**
 * Acerca de: la marca, el nombre escrito en la hoja de 原稿用紙 del quiz, el
 * texto del proyecto y los datos de la app.
 *
 * La hoja es la misma pieza que la del quiz y no un dibujo aparte: es lo más
 * propio que tiene la app, y acá presenta el nombre como se presenta cada
 * carta.
 *
 * La línea del diccionario no es decorativa: JMdict se distribuye con licencia
 * CC BY-SA y exige atribución, y ésta es la pantalla donde esa obligación se
 * cumple.
 */
export function AboutScreen({ version, buildDate }: { version: string; buildDate?: string }) {
  const t = useTranslations('about');
  const locale = useLocale();
  return (
    <Screen
      nav={{
        id: 'about-crumb',
        levels: [{ label: t('settings'), href: '/settings' }, { label: t('title') }],
      }}
    >
      <div id="about" className={styles.column}>
        <Stack className={styles.hero}>
          <Image src={logo} alt="" priority className={styles.logo} />
          <Stack className={styles.names}>
            <Text component="h1" className={styles.name}>{APP_NAME}</Text>
            <Text className={`kana ${styles.nameJp}`}>{APP_NAME_JP}</Text>
          </Stack>
          <div className={styles.sheet}>
            <GenkoSheet text="キツネ" />
          </div>
        </Stack>

        <Stack className={styles.section}>
          <SectionLabel jp="由">{t('sections.project')}</SectionLabel>
          <Stack className={styles.prose} lang="es">
            {(['p1', 'p2', 'p3', 'p4', 'p5'] as const).map((k) => (
              <Text key={k} inherit>{t(`story.${k}`)}</Text>
            ))}
          </Stack>
        </Stack>

        <Stack className={styles.section}>
          <SectionLabel jp="情報">{t('sections.info')}</SectionLabel>
          <dl className={styles.facts}>
            <Fact label={t('facts.version')}>
              {buildDate ? `${version} · ${formatDate(buildDate, locale)}` : version}
            </Fact>
            <Fact label={t('facts.builtWith')}>{t('facts.builtWithValue')}</Fact>
            <Fact label={t('facts.fonts')}>
              {t('facts.fontsValue')}
            </Fact>
            <Fact label={t('facts.dictionary')}>
              <Anchor href="https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project" target="_blank" rel="noreferrer" inherit>
                JMdict
              </Anchor>
              {t('facts.dictionaryBy')}
              <Anchor href="https://www.edrdg.org/edrdg/licence.html" target="_blank" rel="noreferrer" inherit>
                CC BY-SA 4.0
              </Anchor>
            </Fact>
          </dl>
        </Stack>
      </div>
    </Screen>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.fact}>
      <dt className={`romaji ${styles.factLabel}`}>{label}</dt>
      <dd className={styles.factValue}>{children}</dd>
    </div>
  );
}

/** `2026-10-05` → «5 de octubre de 2026». En UTC, que es como se anotó. */
function formatDate(iso: string, locale: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale === 'es' ? 'es-AR' : locale, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}
