const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.avatarFrame.count()
  .then(c => { console.log('AvatarFrame count:', c); })
  .catch(e => { console.log('Error:', e.message); })
  .finally(() => p.$disconnect());