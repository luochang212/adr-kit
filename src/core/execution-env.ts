import type { DecidedBy } from './adr.js';

/**
 * Environment keys that identify an agent session. Presence of any one of
 * them means the command was invoked by an agent rather than typed by a
 * person. The list is data: extending it needs no new logic, only a test.
 */
export const AGENT_ENV_MARKERS = [
  'CLAUDECODE',
  'CLAUDE_CODE_ENTRYPOINT',
  'CURSOR_TRACE_ID',
  'CODEX_SANDBOX',
  'AI_AGENT',
  'AGENT',
] as const;

/**
 * Whether the decision being written was initiated by a person or by a
 * machine, inferred from the environment the command ran in.
 *
 * This is an environment stamp, not attestation: clearing or masking a
 * marker, wrapping the binary, or editing the record afterwards all defeat
 * it. It buys the end of accidental mislabeling, nothing more. The probe
 * takes its environment as an argument so callers can pass `process.env`
 * and tests can pass a mapping without touching the real process.
 */
export function detectDecidedBy(env: Record<string, string | undefined>): DecidedBy {
  return AGENT_ENV_MARKERS.some((marker) => isSet(env[marker])) ? 'machine' : 'human';
}

function isSet(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}
