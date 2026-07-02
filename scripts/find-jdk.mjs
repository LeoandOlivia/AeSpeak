import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function javaVersion(javaExe) {
  const result = spawnSync(javaExe, ['-version'], { encoding: 'utf8' });
  const output = `${result.stderr ?? ''}${result.stdout ?? ''}`;
  const match = output.match(/version "(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function collectCandidates() {
  const seen = new Set();
  const candidates = [];

  const add = (dir) => {
    const normalized = path.resolve(dir);
    if (seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push(normalized);
  };

  if (process.env.JAVA_HOME) add(process.env.JAVA_HOME);

  if (process.platform === 'win32') {
    const programFiles = process.env['ProgramFiles'] ?? 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
    const localAppData = process.env.LOCALAPPDATA ?? '';

    const roots = [
      path.join(programFiles, 'Microsoft'),
      path.join(programFiles, 'Java'),
      path.join(programFiles, 'Eclipse Adoptium'),
      path.join(programFiles, 'Android', 'Android Studio', 'jbr'),
      path.join(localAppData, 'Programs', 'Android', 'Android Studio', 'jbr'),
      path.join(programFilesX86, 'Android', 'android-studio', 'jbr'),
    ];

    for (const root of roots) {
      if (!fs.existsSync(root)) continue;
      try {
        for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
          if (entry.isDirectory()) add(path.join(root, entry.name));
        }
      } catch {
        // ignore unreadable dirs
      }
      add(root);
    }
  } else {
    add('/usr/lib/jvm/java-21-openjdk');
    add('/usr/lib/jvm/java-21');
    add('/Library/Java/JavaVirtualMachines');
  }

  return candidates;
}

export function findJdk(minMajor = 21) {
  const javaName = process.platform === 'win32' ? 'java.exe' : 'java';

  for (const dir of collectCandidates()) {
    const javaExe = path.join(dir, 'bin', javaName);
    if (!fs.existsSync(javaExe)) continue;
    const major = javaVersion(javaExe);
    if (major >= minMajor) {
      return { home: dir, major, javaExe };
    }
  }

  return null;
}

export function withJdkEnv(jdkHome) {
  const env = { ...process.env, JAVA_HOME: jdkHome };
  const bin = path.join(jdkHome, 'bin');
  const sep = path.delimiter;
  const pathKey = process.platform === 'win32' ? 'Path' : 'PATH';
  env[pathKey] = env[pathKey] ? `${bin}${sep}${env[pathKey]}` : bin;
  return env;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const jdk = findJdk();
  if (!jdk) {
    console.error('No JDK 21+ found. Install Microsoft OpenJDK 21 or set JAVA_HOME.');
    process.exit(1);
  }
  console.log(`JAVA_HOME=${jdk.home}`);
  console.log(`Java version: ${jdk.major}`);
}
