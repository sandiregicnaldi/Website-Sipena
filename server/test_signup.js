const http = require('http');

const data = JSON.stringify({
  email: 'vinapratama186@gmail.com',
  password: 'Manchester-1996',
  name: 'Vina'
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/sign-up/email',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, res => {
  console.log('Status Code:', res.statusCode);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response Body:', body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
