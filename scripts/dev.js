const { spawn } = require('child_process');

console.log('---------------------------------------------------------');
console.log('🚀 Starting CampusOS Fullstack Development Environment');
console.log('📡 Backend API:  http://localhost:4000');
console.log('💻 Frontend App: http://localhost:5173');
console.log('---------------------------------------------------------\n');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// 1. Start Express Backend
const server = spawn(npmCmd, ['--prefix', 'server', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, FORCE_COLOR: '1' }
});

// 2. Start Vite Frontend
const client = spawn(npmCmd, ['--prefix', 'client', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, FORCE_COLOR: '1' }
});

function cleanup() {
  console.log('\n🛑 Shutting down CampusOS dev servers...');
  try {
    if (isWin) {
      // On Windows, taskkill kills the process tree
      if (server.pid) spawn('taskkill', ['/pid', server.pid, '/f', '/t']);
      if (client.pid) spawn('taskkill', ['/pid', client.pid, '/f', '/t']);
    } else {
      server.kill('SIGTERM');
      client.kill('SIGTERM');
    }
  } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
