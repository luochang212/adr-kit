import { hookCheck, hookInstall, hookUninstall } from '../core/hook.js';

export function hookInstallCommand(cwd: string, entry?: string): string {
  return hookInstall(cwd, entry);
}

export function hookUninstallCommand(cwd: string): string {
  return hookUninstall(cwd);
}

export function hookRunCommand(cwd: string): { output: string; ok: boolean } {
  return hookCheck(cwd);
}
