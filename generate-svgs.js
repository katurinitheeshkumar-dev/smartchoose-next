const fs = require('fs');
const path = require('path');

const icons = [
    { name: 'amazon', color: '#FF9900', initial: 'A' },
    { name: 'flipkart', color: '#2874F0', initial: 'F' },
    { name: 'shopsy', color: '#10B981', initial: 'S' },
    { name: 'meesho', color: '#F43397', initial: 'M' },
    { name: 'myntra', color: '#FF3F6C', initial: 'M' },
    { name: 'ajio', color: '#2C3E50', initial: 'A' },
    { name: 'tatacliq', color: '#6A1B9A', initial: 'T' },
    { name: 'nykaa', color: '#FC2779', initial: 'N' },
    { name: 'reliancedigital', color: '#D32F2F', initial: 'R' },
    { name: 'croma', color: '#00A8E8', initial: 'C' },
    { name: 'generic', color: '#9CA3AF', initial: '🛍️' }
];

const dir = path.join(__dirname, 'app', 'public', 'assets', 'platform-icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

icons.forEach(({ name, color, initial }) => {
    const isEmoji = initial.length > 1;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="${color}" />
  <text x="50" y="50" fill="white" font-family="Arial, sans-serif" font-size="${isEmoji ? '50' : '60'}" font-weight="bold" text-anchor="middle" dominant-baseline="central">
    ${initial}
  </text>
</svg>`;
    fs.writeFileSync(path.join(dir, `${name}.svg`), svg);
});

console.log('SVGs created successfully.');
