import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findJdk, withJdkEnv } from './find-jdk.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function section(title) {
  console.log(`\n=== ${title} ===`);
}

function runCapture(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    ...options,
  });
}

section('Shell JAVA_HOME');
console.log(process.env.JAVA_HOME ?? '(not set)');

section('java -version (from PATH)');
runCapture('java', ['-version']);

section('JDK 21+ auto-detect');
const jdk = findJdk(21);
if (jdk) {
  console.log(`Found: ${jdk.home} (Java ${jdk.major})`);
} else {
  console.log('NOT FOUND — install JDK 21 or fix JAVA_HOME');
}

section('Gradle (with detected JDK)');
if (jdk) {
  const env = withJdkEnv(jdk.home);
  const androidDir = path.join(root, 'android');
  const gradlew =
    process.platform === 'win32'
      ? path.join(androidDir, 'gradlew.bat')
      : path.join(androidDir, 'gradlew');
  runCapture(gradlew, ['--stop'], { cwd: androidDir, env });
  const version = runCapture(gradlew, ['-version'], { cwd: androidDir, env });
  process.stdout.write(version.stdout ?? '');
  process.stderr.write(version.stderr ?? '');
} else {
  console.log('Skipped — no JDK 21');
}

section('ADB devices');
const adb = runCapture('adb', ['devices']);
process.stdout.write(adb.stdout ?? '');
process.stderr.write(adb.stderr ?? '');
if (adb.status !== 0) {
  console.log('adb not found or failed — enable USB debugging and install platform-tools');
}

section('Android SDK');
const localProps = path.join(root, 'android', 'local.properties');
if (fs.existsSync(localProps)) {
  console.log(fs.readFileSync(localProps, 'utf8').trim());
} else {
  console.log('android/local.properties missing — run Android Studio once or set ANDROID_HOME');
}

console.log('\nIf install fails with "无效的源发行版：21", stale Gradle daemons or wrong JAVA_HOME is the usual cause.');
console.log('Use: pnpm install:android  (auto-fixes JDK for this project)');
