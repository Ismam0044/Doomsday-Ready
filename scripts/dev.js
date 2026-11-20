import { spawn } from 'node:child_process';

const useNpmCli = process.platform === 'win32' && process.env.npm_execpath;
const command = useNpmCli ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
const options = { stdio: 'inherit' };
let stopping = false;

const children = ['dev:server', 'dev:client'].map((script) => {
  const args = useNpmCli
    ? [process.env.npm_execpath, 'run', script]
    : ['run', script];
  const child = spawn(command, args, options);

  child.on('error', (error) => {
    console.error(`Could not start ${script}:`, error.message);
    process.exitCode = 1;
    stop();
  });

  child.on('exit', (code) => {
    if (stopping) return;
    process.exitCode = code || 1;
    stop();
  });

  return child;
});

function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
