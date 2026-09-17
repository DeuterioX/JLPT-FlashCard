'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Stack, TextInput, Group, Text, Button, Badge, Divider } from '@mantine/core';
import type { DictHit } from '@/lib/services/dict';
import { errorFrom, NETWORK_ERROR } from '@/lib/client/errors';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;
const SEARCH_ERROR = 'No se pudo buscar en el diccionario.';

export function DictSearchPanel({
  opened, onClose, groupId, groupName,
}: { opened: boolean; onClose: () => void; groupId: number; groupName: string }) {
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

  return (
    <Modal opened={opened} onClose={onClose} size="lg" title="Buscar en el diccionario">
      <Stack gap="sm">
        <TextInput
          id="dict-q"
          placeholder="pescado"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          autoFocus
          rightSection={<Text size="xs" c="dimmed">{loading ? '…' : hits.length}</Text>}
        />

        {searchError && <Text c="shu.6" size="sm">{searchError}</Text>}

        {hits.map((h, i) => (
          <div key={h.id}>
            {i > 0 && <Divider mb="sm" />}
            <Group wrap="nowrap" gap="sm">
              <Text className="kana" w={88}>{h.kana}</Text>
              <Text className="kana" c="dimmed" w={54}>{h.kanji ?? ''}</Text>
              <Text className="romaji" size="sm" c="dimmed" w={78}>{h.romaji}</Text>
              <Group gap={6} style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" c="dimmed" truncate>{h.gloss}</Text>
                {h.lang === 'eng' && <Badge size="xs" variant="outline" color="gray">en inglés</Badge>}
              </Group>
              {addedIds.has(h.id) ? (
                <Text size="xs" c="jade.6">Agregada</Text>
              ) : (
                <Button
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

        {!tooShort && !loading && hits.length === 0 && !searchError && (
          <Text size="sm" c="dimmed">
            Sin resultados. JMdict tiene unas 39.000 entradas con traducción al
            castellano; para términos poco comunes puede no haber.
          </Text>
        )}

        {addError && <Text c="shu.6" size="sm">{addError}</Text>}

        <Text size="xs" c="dimmed">
          Se agrega al grupo <b>{groupName}</b>. Podés editar kana, romaji y significado después.
        </Text>
      </Stack>
    </Modal>
  );
}
