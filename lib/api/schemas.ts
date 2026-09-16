import { z } from 'zod';

export const createDeckSchema = z.object({
  name: z.string().min(1, 'El mazo necesita un nombre'),
  groups: z.array(z.string()).optional(),
});

export const renameSchema = z.object({
  name: z.string().min(1, 'Hace falta un nombre'),
});

export const createCardSchema = z.object({
  prompt: z.string().min(1, 'La carta necesita un texto en japonés'),
  meaning: z.string().nullish(),
  answers: z.array(z.string().min(1)).min(1, 'Hace falta al menos una romanización'),
});

export const updateCardSchema = z.object({
  prompt: z.string().min(1).optional(),
  meaning: z.string().nullish(),
  answers: z.array(z.string().min(1)).min(1).optional(),
  groupId: z.number().int().positive().optional(),
});

export const openRoundSchema = z.object({
  groupIds: z.array(z.number().int().positive()).min(1, 'Elegí al menos un grupo'),
});
