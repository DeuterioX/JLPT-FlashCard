'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, TextInput, Group, Text, Button, Badge, Divider } from '@mantine/core';
import type { DictHit } from '@/lib/services/dict';
import { posEnCastellano } from '@/lib/services/pos';
import { errorFrom, NETWORK_ERROR } from '@/lib/client/errors';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;
const SEARCH_ERROR = 'No se pudo buscar en el diccionario.';

export function DictSearchPanel({
  opened, onClose, groupId, groupName, dictionaryLoaded,
}: {
  opened: boolean; onClose: () => void; groupId: number; groupName: string;
  /** Si hay algún diccionario importado; lo calcula el servidor (ver app/decks/[id]/page.tsx). */
  dictionaryLoaded: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [rawHits, setRawHits] = useState<DictHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [addingId, setAddingId] = useState<number | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const addRef = useRef(false);

  const trimmed = q.trim();
  // Se deriva en el render, no con un `setHits([])` síncrono dentro del
  // efecto: así una búsqueda demasiado corta nunca deja resultados viejos
  // dando vueltas ni dispara un set-state redundante.
  const tooShort = trimmed.length < MIN_QUERY;
  const hits = tooShort ? [] : rawHits;

  useEffect(() => {
    if (trimmed.length < MIN_QUERY) return;

    const controller = new AbortController();
    // El debounce y el fetch quedan dentro del callback del timer: el cuerpo
    // del efecto en sí no llama a ningún setState de forma síncrona, solo
    // suscribe un timer que hace el trabajo real más tarde.
    const timer = setTimeout(() => {
      setLoading(true);
      setSearchError(null);
      fetch(`/api/dict/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then(async (res) => {
          if (!res.ok) {
            setSearchError(await errorFrom(res, SEARCH_ERROR));
            setRawHits([]);
            return;
          }
          setRawHits(await res.json());
        })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          setSearchError(NETWORK_ERROR);
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  async function addHit(h: DictHit) {
    if (addRef.current) return;
    addRef.current = true;
    setAddingId(h.id);
    setAddError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/cards`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt: h.kana,
          // Las glosas de JMdict a veces son largas: se deja la primera acepción.
          meaning: h.gloss.split(',')[0].trim(),
          answers: [h.romaji],
        }),
      });
      if (!res.ok) {
        setAddError(await errorFrom(res));
        return;
      }
      setAddedIds((prev) => new Set(prev).add(h.id));
      router.refresh();
    } catch {
      setAddError(NETWORK_ERROR);
    } finally {
      addRef.current = false;
      setAddingId(null);
    }
  }

  // Ancho: el mockup lo dibuja ocupando el stage entero, no una caja
  // angosta -las filas tienen kana, kanji, romaji, glosa, categoría y un
  // botón, y con `size="lg"` la glosa se truncaba a la mitad-. El valor
  // para teléfono lo baja `.knd-dict-modal` en globals.css, que es donde
  // puede haber una media query.
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      // El margen sale de una variable en vez de estar escrito acá: Mantine
      // pasa `size` a un `--modal-size` INLINE en el root, y un estilo inline
      // le gana a cualquier regla de hoja -así que una media query no puede
      // tocarlo-. Lo que sí puede tocar es la variable que ese valor usa
      // adentro, y eso es lo que hace `.knd-dict-modal` en globals.css para
      // dejarlo a pantalla completa en teléfono.
      size="calc(100vw - var(--knd-dict-gutter, 6rem))"
      className="knd-dict-modal"
      // Anclado arriba, contra el `centered: true` que el tema pone para
      // todos los demás. Este no es un diálogo de tamaño fijo: arranca con
      // el campo vacío y crece hacia abajo a medida que llegan resultados.
      // Centrado, cada tecleo lo reacomoda vertical y el campo de búsqueda
      // se mueve solo bajo el cursor.
      centered={false}
      title="Buscar en el diccionario"
    >
      {/* Tres bandas: el buscador arriba, los resultados con su propio
          scroll en el medio, y el pie abajo. Antes scrolleaba el cuerpo
          entero, así que al bajar por los resultados se iban de pantalla
          tanto el campo de búsqueda -que es donde se corrige la consulta-
          como la línea que dice a qué grupo se está agregando. */}
      <div className="knd-dict-head">
        <TextInput
          id="dict-q"
          placeholder="pescado"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          autoFocus
          rightSection={
            <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
              {loading ? '…' : hits.length}
            </Text>
          }
        />
        {searchError && <Text c="shu.6" size="sm">{searchError}</Text>}
      </div>

      <div className="knd-dict-results">

        {!dictionaryLoaded && (
          <Text size="sm" c="dimmed">
            El diccionario no está cargado, así que la búsqueda no va a
            encontrar nada. Para importarlo, seguí la sección «Diccionario» del
            README del proyecto.
          </Text>
        )}

        {hits.map((h, i) => (
          <div key={h.id}>
            {i > 0 && <Divider mb="sm" />}
            {/* Mismas columnas que la tabla de palabras y por la misma razón:
                con ancho fijo, una lectura de once kana o su romaji se partían
                en dos renglones. Las clases están en globals.css. */}
            <Group className="knd-dict-row" gap="sm" align="flex-start">
              <Text className="kana knd-dict-kana">{h.kana}</Text>
              <Text className="kana knd-dict-kanji" c="dimmed">{h.kanji ?? ''}</Text>
              <Text className="romaji knd-dict-romaji" size="sm" c="dimmed">{h.romaji}</Text>
              <Group className="knd-dict-gloss" gap={6}>
                <Text size="sm" c="dimmed" truncate>{h.gloss}</Text>
                {h.lang === 'eng' && <Badge size="xs" variant="outline" color="gray">en inglés</Badge>}
              </Group>
              {/* La categoría gramatical, que el diseño muestra (`.pos`).
                  Traducida: JMdict la guarda como código -`n`, `v5s`,
                  `adj-na`- y así salía a la pantalla, donde no le dice nada
                  a nadie que no conozca el formato. */}
              {posEnCastellano(h.pos) && (
                <Text className="knd-dict-pos" size="xs" c="dark.3" fs="italic">
                  {posEnCastellano(h.pos)}
                </Text>
              )}
              {addedIds.has(h.id) ? (
                <Text className="knd-dict-add" size="xs" c="jade.6">Agregada</Text>
              ) : (
                <Button
                  className="knd-dict-add"
                  size="compact-xs"
                  onClick={() => addHit(h)}
                  loading={addingId === h.id}
                  disabled={addingId !== null}
                >
                  Agregar
                </Button>
              )}
            </Group>
          </div>
        ))}

        {dictionaryLoaded && !tooShort && !loading && hits.length === 0 && !searchError && (
          <Text size="sm" c="dimmed">
            Sin resultados. JMdict tiene unas 39.000 entradas con traducción al
            castellano; para términos poco comunes puede no haber.
          </Text>
        )}

        {addError && <Text c="shu.6" size="sm">{addError}</Text>}

      </div>

      <Text className="knd-dict-foot" size="xs" c="dimmed">
        Se agrega al grupo <b>{groupName}</b>. Podés editar kana, romaji y significado después.
      </Text>
    </Modal>
  );
}
