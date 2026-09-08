import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = resolve(root, 'contracts/echo-gate.compact');
const target = resolve(root, 'contracts/managed/echo-gate');
const args = [source, target];
const windowsPath = (value) => value.replace(/^([A-Za-z]):/, (_, drive) => `/mnt/${drive.toLowerCase()}`).replaceAll('\\', '/');
const candidates = process.platform === 'win32'
  ? [
      ['compactc', args],
      ['wsl.exe', ['--', 'compactc', windowsPath(source), windowsPath(target)]],
      ['wsl.exe', ['--', '/home/deep_saha/.compact/bin/compactc', windowsPath(source), windowsPath(target)]],
      ['compact', ['compile', ...args]],
    ]
  : [['compactc', args], ['compact', ['compile', ...args]]];

if (!existsSync(source)) throw new Error(`Missing Compact source: ${source}`);
let lastError = '';
for (const [command, commandArgs] of candidates) {
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit', shell: false });
  if (result.status === 0) process.exit(0);
  lastError = `${command} exited with ${result.status ?? result.error?.message ?? 'an unknown error'}`;
}
throw new Error(`Unable to run the Compact compiler. Tried compactc and compact. ${lastError}`);
