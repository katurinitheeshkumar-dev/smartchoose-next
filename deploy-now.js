const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const appDir = path.join(__dirname, 'app');
const nodePath = path.join(appDir, 'node', 'node-v20.11.1-win-x64');
process.env.PATH = `${nodePath};${process.env.PATH}`;

console.log('🚀 Starting Deployment Process...');

// 1. Install Dependencies (Just in case)
console.log('📦 Installing dependencies...');
spawnSync('npm', ['install'], { cwd: appDir, shell: true, stdio: 'inherit' });

// 2. Build the App
console.log('🏗️ Building the app...');
const build = spawnSync('npm', ['run', 'build'], { cwd: appDir, shell: true, stdio: 'inherit' });

if (build.status !== 0) {
    console.error('❌ Build failed!');
    process.exit(1);
}

// 3. Deploy to Firebase
console.log('☁️ Deploying to Firebase Hosting...');
const deploy = spawnSync('npx', ['firebase-tools', 'deploy', '--only', 'hosting'], { cwd: appDir, shell: true, stdio: 'inherit' });

if (deploy.status === 0) {
    console.log('✅ Deployment successful! SmartChoose is now live with the new AI Autopilot.');
} else {
    console.error('❌ Deployment failed. Check if you are logged into Firebase (npx firebase login).');
}
