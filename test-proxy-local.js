import handler from './proxy-server/api/ai-blog-helper.js';

const req = { query: { action: 'get-topic' }, method: 'GET' };
const res = {
    setHeader: () => {},
    status: (code) => ({ json: (data) => { console.log('STATUS:', code, '\nDATA:', JSON.stringify(data, null, 2)); return data; } })
};

console.log('Testing locally...');
handler(req, res).catch(console.error);
