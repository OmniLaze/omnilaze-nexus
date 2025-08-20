const jwt = require('jsonwebtoken');

const secret = 'RR6K8/NwTa9D5OPGyb0ML63oI/+k3zL1lcht+0mtuXA=';

const payload = {
  sub: 'dev_admin_user',
  phone: '13800000000',
  role: 'admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
};

const token = jwt.sign(payload, secret);
console.log('Admin JWT Token:');
console.log(token);