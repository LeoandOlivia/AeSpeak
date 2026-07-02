import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findJdk, withJdkEnv } from './find-jdk.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function gradleBin(androidDir) {
  return process.platform === 'win32'
    ? path.join(androidDir, 'gradlew.bat')
    : path.join(androidDir, 'gradlew');
}

function nodeTool(...segments) {
  const script = path.join(root, 'node_modules', ...segments);
  if (!fs.existsSync(script)) {
    console.error(`Missing tool: ${script}`);
    console.error('Run pnpm install first.');
    process.exit(1);
  }
  return script;
}

function run(label, command, args, options = {}) {
  console.log(`\n> ${label}`);
  const isWindowsBatch = process.platform === 'win32' && command.toLowerCase().endsWith('.bat');
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: isWindowsBatch,
    ...options,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const jdk = findJdk(21);
if (!jdk) {
  console.error('\nERROR: JDK 21+ is required for Android builds.');
  console.error('Install: https://learn.microsoft.com/java/openjdk/download');
  console.error('Or set JAVA_HOME to a JDK 21 folder, then retry.');
  console.error('\nRun diagnostics: pnpm doctor:android');
  process.exit(1);
}

const env = withJdkEnv(jdk.home);
console.log(`Using JAVA_HOME=${jdk.home} (Java ${jdk.major})`);

const node = process.execPath;

run('Build web assets', node, [nodeTool('vite', 'bin', 'vite.js'), 'build'], { cwd: root, env });
run('Sync Capacitor Android', node, [nodeTool('@capacitor', 'cli', 'bin', 'capacitor'), 'sync', 'android'], {
  cwd: root,
  env,
});

const androidDir = path.join(root, 'android');
const gradlew = gradleBin(androidDir);

run('Stop stale Gradle daemons', gradlew, ['--stop'], { cwd: androidDir, env });
run('Install debug APK on device', gradlew, ['installDebug'], { cwd: androidDir, env });

console.log('\nDone. Open eSpeak on your phone if it did not launch automatically.');
