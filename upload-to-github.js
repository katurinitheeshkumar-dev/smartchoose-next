// upload-to-github.js
// Uploads all playwright-service files to GitHub via REST API
// Usage: node upload-to-github.js TOKEN USERNAME

const https = require('https');
const fs = require('fs');
const path = require('path');

const token = process.argv[2];
let username = process.argv[3];
const repo = 'smartchoose-playwright';

if (!token) {
    console.error('Usage: node upload-to-github.js TOKEN [USERNAME]');
    process.exit(1);
}

const FILES_DIR = path.join(__dirname, 'playwright-service');
const FILES_TO_UPLOAD = ['server.js', 'scraper.js', 'extractors.js', 'Dockerfile', 'package.json', 'railway.json'];

function apiRequest(method, urlPath, body = null) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const req = https.request({
            hostname: 'api.github.com',
            path: urlPath,
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'SmartChoose-Uploader/1.0',
                'X-GitHub-Api-Version': '2022-11-28',
                ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
            }
        }, (res) => {
            let out = '';
            res.on('data', d => out += d);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(out) }); }
                catch { resolve({ status: res.statusCode, body: out }); }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function getFileSha(filePath) {
    const res = await apiRequest('GET', `/repos/${username}/${repo}/contents/${filePath}`);
    if (res.status === 200 && res.body.sha) return res.body.sha;
    return null;
}

async function uploadFile(filename) {
    const filePath = path.join(FILES_DIR, filename);
    const content = fs.readFileSync(filePath);
    const base64 = content.toString('base64');

    // Check if file already exists (need SHA for updates)
    const existingSha = await getFileSha(filename);

    const body = {
        message: `Update ${filename} - Add Docker support for Playwright`,
        content: base64,
        ...(existingSha ? { sha: existingSha } : {}),
    };

    const res = await apiRequest('PUT', `/repos/${username}/${repo}/contents/${filename}`, body);

    if (res.status === 200 || res.status === 201) {
        console.log(`   ✅ ${filename} → uploaded`);
        return true;
    } else {
        console.log(`   ❌ ${filename} → failed: ${JSON.stringify(res.body?.message || res.body)}`);
        return false;
    }
}

async function main() {
    const me = await apiRequest('GET', '/user');
    if (me.status !== 200) {
        console.error(`\n❌ GitHub token invalid! Status: ${me.status}`);
        console.error('Please create a new token at https://github.com/settings/tokens/new');
        process.exit(1);
    }
    username = username || me.body.login;

    console.log(`\nUploading to github.com/${username}/${repo}...`);
    console.log('─'.repeat(50));
    console.log(`✅ Authenticated as: ${username}\n`);

    let success = 0;
    for (const file of FILES_TO_UPLOAD) {
        const filePath = path.join(FILES_DIR, file);
        if (!fs.existsSync(filePath)) {
            console.log(`   ⚠️  ${file} → not found, skipping`);
            continue;
        }
        const ok = await uploadFile(file);
        if (ok) success++;
    }

    console.log('\n' + '─'.repeat(50));
    console.log(`Upload complete: ${success}/${FILES_TO_UPLOAD.filter(f => fs.existsSync(path.join(FILES_DIR, f))).length} files uploaded`);
    console.log(`\nRailway will auto-redeploy in 3-5 minutes.`);
    console.log(`Watch progress at: https://railway.app/dashboard`);
    console.log(`\nAfter deploy completes, the AI agent will work for ALL platforms!`);
}

main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
