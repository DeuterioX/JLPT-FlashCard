import { Anchor, Stack, Text } from '@mantine/core';
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
  return (
    <Screen
      nav={{
        id: 'about-crumb',
        levels: [{ label: 'Ajustes', href: '/settings' }, { label: 'Acerca de' }],
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
          <SectionLabel jp="由">sobre el proyecto</SectionLabel>
          <Stack className={styles.prose} lang="es">
            <Text inherit>
              Este proyecto nació de una necesidad personal: quería una herramienta
              sencilla para estudiar japonés usando flashcards.
            </Text>
            <Text inherit>
              Mientras utilizaba otra aplicación para aprender hiragana, quise empezar
              a practicar katakana y descubrí que esa funcionalidad estaba detrás de
              una suscripción paga. En lugar de pagar por algo que no necesitaba que
              fuera tan complejo, decidí crear mi propia solución.
            </Text>
            <Text inherit>
              La aplicación permite practicar hiragana y katakana, reconocer palabras
              y frases en japonés y entrenar su escritura en romaji. También permite
              cargar contenido propio para adaptar la práctica a lo que cada uno
              quiera aprender.
            </Text>
            <Text inherit>
              La idea no es reinventar el aprendizaje del japonés, sino crear una
              herramienta simple, útil y libre, basada en una necesidad real.
            </Text>
            <Text inherit>
              La desarrollé originalmente para mí. Si además puede ser útil para otras
              personas que estén aprendiendo japonés, mucho mejor.
            </Text>
          </Stack>
        </Stack>

        <Stack className={styles.section}>
          <SectionLabel jp="情報">información</SectionLabel>
          <dl className={styles.facts}>
            <Fact label="Versión">
              {buildDate ? `${version} · ${formatDate(buildDate)}` : version}
            </Fact>
            <Fact label="Hecha con">Next.js, Mantine y SQLite</Fact>
            <Fact label="Tipografía">
              M PLUS 2, M PLUS 1 Code, Zen Kaku Gothic New y Zen Old Mincho — SIL Open
              Font License
            </Fact>
            <Fact label="Diccionario">
              <Anchor href="https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project" target="_blank" rel="noreferrer" inherit>
                JMdict
              </Anchor>
              {', del Electronic Dictionary Research and Development Group — '}
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
function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}
