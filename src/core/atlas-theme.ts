import { randomInt } from 'node:crypto';

export const ATLAS_THEME_CHOICES = ['folio', 'signal', 'random'] as const;
export type AtlasThemeSelection = (typeof ATLAS_THEME_CHOICES)[number];
export type AtlasTheme = Exclude<AtlasThemeSelection, 'random'>;

/** Roll once while generating; the delivered HTML never chooses again. */
export function selectAtlasTheme(selection?: string): AtlasTheme {
  // @adr 51 — Omission is deterministic: Signal is the default theme.
  // `--theme random` is an opt-in feature rolling a fair 50/50 coin.
  if (selection === undefined) return 'signal';
  if (selection === 'random') return randomInt(2) === 0 ? 'folio' : 'signal';
  if (selection === 'folio' || selection === 'signal') return selection;
  throw new Error(`--theme expects folio, signal, random, not "${selection}"`);
}
