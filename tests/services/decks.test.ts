import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, migrate, type Db } from '../../lib/db/client';
import { seedKana } from '../../lib/db/seed';
import {
  listDecks, getDeck, createDeck, renameDeck, deleteDeck,
  createGroup, deleteGroup, createCard, updateCard, deleteCard,
} from '../../lib/services/decks';
import { AppError } from '../../lib/services/errors';

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
    // か行 tiene 5 cartas: se previsualiza.
    expect(hira.groups.find((g) => g.name === 'か行')!.preview)
      .toEqual(['か', 'き', 'く', 'け', 'こ']);
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

  it('acepta varias romanizaciones y la primera es la primaria', () => {
    const d = createDeck(db, { name: 'Prestamos' });
    const { id } = createCard(db, d.groups[0].id, {
      prompt: 'スーパー', meaning: 'supermercado', answers: ['suupaa', 'sūpā'],
    });
    updateCard(db, id, { meaning: 'súper' });
    expect(getDeck(db, d.id).cardCount).toBe(1);
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
});

describe('errores', () => {
  it('404 al pedir un mazo que no existe', () => {
    expect(() => getDeck(db, 9999)).toThrow(AppError);
  });

  it('404 al renombrar un mazo que no existe', () => {
    expect(() => renameDeck(db, 9999, 'x')).toThrow(AppError);
  });
});
