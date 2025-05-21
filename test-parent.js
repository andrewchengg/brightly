const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const parent = await prisma.parent.create({
      data: {
        id: 'test-parent-id',
        username: 'test-parent',
        name: 'Test Parent'
      }
    });
    console.log('Created parent:', parent);
  } catch (error) {
    console.error('Error creating parent:', error);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect()); 