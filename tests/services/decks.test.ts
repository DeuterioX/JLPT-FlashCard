import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDb, migrate, type Db } from '../../lib/db/client';
import { seedKana } from '../../lib/db/seed';
import { card, cardAnswer } from '../../lib/db/schema';
import {
  listDecks, getDeck, createDeck, renameDeck, deleteDeck,
  createGroup, renameGroup, deleteGroup, createCard, updateCard, deleteCard,
} from '../../lib/services/decks';
import { AppError } from '../../lib/services/errors';
import { matchesAnswer } from '../../lib/kana/normalize';

let db: Db;
beforeEach(() => {
  db = createDb(':memory:');
  migrate(db);
  seedKana(db);
});

describe('listDecks', () => {
  it('devuelve los mazos incluidos con sus conteos', () => {
    const decks = listDecks(db);
    const hira = decks.find((d) => d.name === 'Hiragana')!;
    expect(hira.isBuiltin).toBe(true);
    expect(hira.groupCount).toBe(26);
    expect(hira.cardCount).toBe(104);
  });

  it('previsualiza los grupos de 6 cartas o menos y deja vacío el resto', () => {
    const hira = listDecks(db).find((d) => d.name === 'Hiragana')!;
    // Serie K tiene 5 cartas: se previsualiza.
    expect(hira.groups.find((g) => g.name === 'Serie K')!.preview)
      .toEqual([
        { prompt: 'か', romaji: 'ka' },
        { prompt: 'き', romaji: 'ki' },
        { prompt: 'く', romaji: 'ku' },
        { prompt: 'け', romaji: 'ke' },
        { prompt: 'こ', romaji: 'ko' },
      ]);
  });
});

describe('createDeck', () => {
  it('crea el mazo con los grupos que se le pasan', () => {
    const d = createDeck(db, { name: 'Comidas', groups: ['Pescado', 'Verdura', 'Frutas'] });
    expect(d.name).toBe('Comidas');
    expect(d.isBuiltin).toBe(false);
    expect(d.groups.map((g) => g.name)).toEqual(['Pescado', 'Verdura', 'Frutas']);
  });

  it('sin grupos crea uno llamado General, para que la carta siempre tenga padre', () => {
    const d = createDeck(db, { name: 'N5' });
    expect(d.groups).toHaveLength(1);
    expect(d.groups[0].name).toBe('General');
  });

  it('deja la sección en null: los mazos propios no tienen encabezados', () => {
    const d = createDeck(db, { name: 'Comidas', groups: ['Pescado'] });
    expect(d.groups[0].section).toBeNull();
  });
});

describe('deleteDeck', () => {
  it('borra un mazo propio y todo lo que cuelga', () => {
    const d = createDeck(db, { name: 'Comidas', groups: ['Pescado'] });
    createCard(db, d.groups[0].id, { prompt: 'さかな', meaning: 'pescado', answers: ['sakana'] });
    deleteDeck(db, d.id);
    expect(listDecks(db).find((x) => x.name === 'Comidas')).toBeUndefined();
  });

  it('se niega a borrar un mazo incluido en la app', () => {
    const hira = listDecks(db).find((d) => d.name === 'Hiragana')!;
    expect(() => deleteDeck(db, hira.id)).toThrow(AppError);
    try {
      deleteDeck(db, hira.id);
    } catch (e) {
      expect((e as AppError).status).toBe(403);
    }
  });
});

describe('cartas', () => {
  it('crea la carta con su romaji normalizado y una sola primaria', () => {
    const d = createDeck(db, { name: 'Comidas' });
    const { id } = createCard(db, d.groups[0].id, {
      prompt: 'さかな', meaning: 'pescado', answers: ['  SAKANA  '],
    });
    const deck = getDeck(db, d.id);
    expect(deck.cardCount).toBe(1);
    expect(id).toBeGreaterThan(0);
  });

  it('guarda el significado con la primera letra en mayúscula, y el romaji no', () => {
    const d = createDeck(db, { name: 'Comidas' });
    const { id } = createCard(db, d.groups[0].id, {
      prompt: 'さかな', meaning: 'pescado', answers: ['sakana'],
    });
    const [row] = db.select().from(card).where(eq(card.id, id)).all();
    expect(row.meaning).toBe('Pescado');
    // El romaji NO: es una transcripción fonética, no una palabra de una
    // frase, y se guarda como lo dejó `normalizeAnswer`.
    const [ans] = db.select().from(cardAnswer).where(eq(cardAnswer.cardId, id)).all();
    expect(ans.romaji).toBe('sakana');

    // Sólo la primera letra: el resto puede traer nombres propios o siglas.
    updateCard(db, id, { meaning: 'pescado de río, tipo JLPT N5' });
    const [tras] = db.select().from(card).where(eq(card.id, id)).all();
    expect(tras.meaning).toBe('Pescado de río, tipo JLPT N5');

    expect(matchesAnswer('SAKANA', [ans.romaji])).toBe(true);
  });

  it('normaliza y deduplica las romanizaciones, y la primera normalizada queda primaria', () => {
    const d = createDeck(db, { name: 'Prestamos' });
    const { id } = createCard(db, d.groups[0].id, {
      prompt: 'し', answers: ['  SHI  ', 'shi', 'si'],
    });
    const rows = db.select().from(cardAnswer).where(eq(cardAnswer.cardId, id)).all();
    expect(rows.map((r) => r.romaji).sort()).toEqual(['shi', 'si']);
    expect(rows.find((r) => r.isPrimary)?.romaji).toBe('shi');
  });

  it('al actualizar las respuestas reemplaza las anteriores en vez de sumarlas', () => {
    const d = createDeck(db, { name: 'Prestamos' });
    const { id } = createCard(db, d.groups[0].id, { prompt: 'パン', answers: ['pan'] });
    updateCard(db, id, { answers: ['pang'] });
    const rows = db.select().from(cardAnswer).where(eq(cardAnswer.cardId, id)).all();
    expect(rows.map((r) => r.romaji)).toEqual(['pang']);
  });

  it('rechaza una carta sin ninguna romanización válida y no la crea', () => {
    const d = createDeck(db, { name: 'Prestamos' });
    expect(() => createCard(db, d.groups[0].id, { prompt: 'x', answers: ['   ', ''] }))
      .toThrow(AppError);
    try {
      createCard(db, d.groups[0].id, { prompt: 'x', answers: ['   ', ''] });
    } catch (e) {
      expect((e as AppError).status).toBe(400);
    }
    expect(getDeck(db, d.id).cardCount).toBe(0);
  });

  it('rechaza dejar el prompt en blanco al actualizar', () => {
    const d = createDeck(db, { name: 'Comidas' });
    const { id } = createCard(db, d.groups[0].id, { prompt: 'えび', answers: ['ebi'] });
    expect(() => updateCard(db, id, { prompt: '   ' })).toThrow(AppError);
  });

  it('rechaza mover una carta a un grupo que no existe', () => {
    const d = createDeck(db, { name: 'Comidas' });
    const { id } = createCard(db, d.groups[0].id, { prompt: 'えび', answers: ['ebi'] });
    expect(() => updateCard(db, id, { groupId: 9999 })).toThrow(AppError);
    try {
      updateCard(db, id, { groupId: 9999 });
    } catch (e) {
      expect((e as AppError).status).toBe(404);
    }
  });

  it('mover una carta de grupo no la borra', () => {
    const d = createDeck(db, { name: 'Comidas', groups: ['Pescado', 'Verdura'] });
    const { id } = createCard(db, d.groups[1].id, { prompt: 'まぐろ', answers: ['maguro'] });
    updateCard(db, id, { groupId: d.groups[0].id });

    const after = getDeck(db, d.id);
    expect(after.groups.find((g) => g.name === 'Pescado')!.cardCount).toBe(1);
    expect(after.groups.find((g) => g.name === 'Verdura')!.cardCount).toBe(0);
  });

  it('borrar la carta se lleva sus respuestas', () => {
    const d = createDeck(db, { name: 'Comidas' });
    const { id } = createCard(db, d.groups[0].id, { prompt: 'えび', answers: ['ebi'] });
    deleteCard(db, id);
    expect(getDeck(db, d.id).cardCount).toBe(0);
  });
});

describe('grupos', () => {
  it('agrega un grupo a un mazo existente', () => {
    const d = createDeck(db, { name: 'Comidas', groups: ['Pescado'] });
    createGroup(db, d.id, 'Frutas');
    expect(getDeck(db, d.id).groups.map((g) => g.name)).toEqual(['Pescado', 'Frutas']);
  });

  it('borrar el grupo se lleva sus cartas', () => {
    const d = createDeck(db, { name: 'Comidas', groups: ['Pescado'] });
    createCard(db, d.groups[0].id, { prompt: 'さかな', answers: ['sakana'] });
    deleteGroup(db, d.groups[0].id);
    expect(getDeck(db, d.id).cardCount).toBe(0);
  });

  it('renombra un grupo existente', () => {
    const d = createDeck(db, { name: 'Comidas', groups: ['Pescado'] });
    renameGroup(db, d.groups[0].id, 'Mariscos');
    expect(getDeck(db, d.id).groups[0].name).toBe('Mariscos');
  });

  it('404 al renombrar un grupo que no existe', () => {
    expect(() => renameGroup(db, 9999, 'x')).toThrow(AppError);
  });
});

describe('preview de seis cartas', () => {
  it('un grupo con exactamente 6 cartas se previsualiza completo', () => {
    const d = createDeck(db, { name: 'Seis' });
    for (let i = 0; i < 6; i++) {
      createCard(db, d.groups[0].id, { prompt: `p${i}`, answers: [`r${i}`] });
    }
    const group = getDeck(db, d.id).groups[0];
    expect(group.cardCount).toBe(6);
    expect(group.preview).toEqual([
      { prompt: 'p0', romaji: 'r0' },
      { prompt: 'p1', romaji: 'r1' },
      { prompt: 'p2', romaji: 'r2' },
      { prompt: 'p3', romaji: 'r3' },
      { prompt: 'p4', romaji: 'r4' },
      { prompt: 'p5', romaji: 'r5' },
    ]);
  });

  it('un grupo con 7 cartas previsualiza las primeras seis', () => {
    // La tarjeta muestra estas seis y abajo «1 palabras más», que sale de
    // restar. Antes acá no se previsualizaba NADA y una Unidad de 30 palabras
    // quedaba como una tarjeta vacía al lado de las de kana.
    const d = createDeck(db, { name: 'Siete' });
    for (let i = 0; i < 7; i++) {
      createCard(db, d.groups[0].id, { prompt: `p${i}`, answers: [`r${i}`] });
    }
    const group = getDeck(db, d.id).groups[0];
    expect(group.cardCount).toBe(7);
    expect(group.preview).toEqual([
      { prompt: 'p0', romaji: 'r0' },
      { prompt: 'p1', romaji: 'r1' },
      { prompt: 'p2', romaji: 'r2' },
      { prompt: 'p3', romaji: 'r3' },
      { prompt: 'p4', romaji: 'r4' },
      { prompt: 'p5', romaji: 'r5' },
    ]);
  });

  it('un grupo que entra entero no deja resto', () => {
    const d = createDeck(db, { name: 'Tres' });
    for (let i = 0; i < 3; i++) {
      createCard(db, d.groups[0].id, { prompt: `p${i}`, answers: [`r${i}`] });
    }
    const group = getDeck(db, d.id).groups[0];
    expect(group.cardCount).toBe(3);
    expect(group.preview).toHaveLength(3);
  });
});

describe('errores', () => {
  it('404 al pedir un mazo que no existe', () => {
    expect(() => getDeck(db, 9999)).toThrow(AppError);
  });

  it('404 al renombrar un mazo que no existe', () => {
    expect(() => renameDeck(db, 9999, 'x')).toThrow(AppError);
  });

  it('el mensaje de "no encontrado" concuerda en género con sustantivos femeninos', () => {
    expect(() => deleteCard(db, 9999)).toThrow(AppError);
    try {
      deleteCard(db, 9999);
    } catch (e) {
      expect((e as AppError).message).toBe('No se encontró la carta');
    }
  });
});
