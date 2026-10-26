import { randomInt } from 'node:crypto';

export const ATLAS_THEME_CHOICES = ['folio', 'signal', 'random'] as const;
export type AtlasThemeSelection = (typeof ATLAS_THEME_CHOICES)[number];
export type AtlasTheme = Exclude<AtlasThemeSelection, 'random'>;

/** Roll once while generating; the delivered HTML never chooses again. */
export function selectAtlasTheme(selection: string = 'random'): AtlasTheme {
  // @adr 42 — Signal is the flagship theme: the random default rolls
  // 30% Folio, 70% Signal.
  if (selection === 'random') return randomInt(10) < 3 ? 'folio' : 'signal';
  if (selection === 'folio' || selection === 'signal') return selection;
  throw new Error(`--theme expects folio, signal, random, not "${selection}"`);
}
