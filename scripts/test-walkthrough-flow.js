// Test script to verify the new walkthrough flow
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWalkthroughFlow() {
  try {
    console.log('🧪 Testing new walkthrough flow...\n');

    // 1. Check students with different states
    const students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        initialSetupComplete: true,
        walkthroughComplete: true,
        createdAt: true
      },
      take: 10
    });

    console.log(`📊 Found ${students.length} students:`);
    
    const newStudents = students.filter(s => !s.walkthroughComplete && !s.initialSetupComplete);
    const walkthroughComplete = students.filter(s => s.walkthroughComplete && !s.initialSetupComplete);
    const setupComplete = students.filter(s => s.initialSetupComplete);
    const walkthroughOnly = students.filter(s => s.walkthroughComplete && s.initialSetupComplete);

    console.log(`  - New students (no walkthrough, no setup): ${newStudents.length}`);
    newStudents.forEach(s => {
      console.log(`    * ${s.name} (${s.username}) - Created: ${s.createdAt.toDateString()}`);
    });

    console.log(`\n  - Walkthrough complete, setup pending: ${walkthroughComplete.length}`);
    walkthroughComplete.forEach(s => {
      console.log(`    * ${s.name} (${s.username}) - Created: ${s.createdAt.toDateString()}`);
    });

    console.log(`\n  - Setup complete: ${setupComplete.length}`);
    setupComplete.forEach(s => {
      console.log(`    * ${s.name} (${s.username}) - Created: ${s.createdAt.toDateString()}`);
    });

    console.log(`\n  - Both complete: ${walkthroughOnly.length}`);
    walkthroughOnly.forEach(s => {
      console.log(`    * ${s.name} (${s.username}) - Created: ${s.createdAt.toDateString()}`);
    });

    // 2. Test the flow logic
    console.log('\n🔄 Flow Logic Test:');
    console.log('1. New student logs in → walkthroughComplete: false, initialSetupComplete: false');
    console.log('   → Should see walkthrough on dashboard');
    console.log('   → After completing/skipping walkthrough → walkthroughComplete: true');
    console.log('   → Should redirect to /student/complete-setup');
    console.log('   → After completing setup → initialSetupComplete: true');
    console.log('   → Should see normal dashboard');

    // 3. Summary
    console.log('\n📋 Summary:');
    console.log(`- Total students: ${students.length}`);
    console.log(`- Students needing walkthrough: ${newStudents.length}`);
    console.log(`- Students needing setup: ${walkthroughComplete.length}`);
    console.log(`- Students with completed setup: ${setupComplete.length}`);
    console.log(`- Students with both complete: ${walkthroughOnly.length}`);

    if (newStudents.length > 0) {
      console.log('\n🎯 Test walkthrough with these students:');
      newStudents.slice(0, 3).forEach(student => {
        console.log(`  - ${student.name} (${student.username})`);
      });
    } else {
      console.log('\n⚠️  No students found needing walkthrough.');
      console.log('To test: Create a new student account or manually set walkthroughComplete: false');
    }

  } catch (error) {
    console.error('❌ Error testing walkthrough flow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testWalkthroughFlow(); 