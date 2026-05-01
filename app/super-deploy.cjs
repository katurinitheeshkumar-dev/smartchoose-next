const { spawnSync } = require('child_process');
const path = require('path');

const nodePath = path.join(__dirname, 'node', 'node-v20.11.1-win-x64', 'node.exe');
const firebasePath = path.join(__dirname, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
const projectDir = __dirname;

console.log('🚀 Starting Super-Direct Deployment (No-Shell Mode)...');

const res = spawnSync(nodePath, [
  firebasePath,
  'deploy',
  '--only',
  'hosting'
], {
  cwd: projectDir,
  env: {
    ...process.env,
    PATH: `${path.dirname(nodePath)};${process.env.PATH}`
  },
  stdio: 'inherit',
  shell: false
});

if (res.status === 0) {
  console.log('✅ DEPLOYMENT SUCCESSFUL!');
} else {
  console.error('❌ DEPLOYMENT FAILED with status:', res.status);
  process.exit(1);
}
