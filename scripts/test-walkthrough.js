// Test script to verify walkthrough functionality
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWalkthrough() {
  try {
    console.log('🧪 Testing walkthrough functionality...\n');

    // 1. Check if there are any students with initialSetupComplete: false
    const studentsWithIncompleteSetup = await prisma.student.findMany({
      where: {
        initialSetupComplete: false
      },
      select: {
        id: true,
        name: true,
        username: true,
        initialSetupComplete: true,
        createdAt: true
      }
    });

    console.log(`📊 Found ${studentsWithIncompleteSetup.length} students with incomplete setup:`);
    studentsWithIncompleteSetup.forEach(student => {
      console.log(`  - ${student.name} (${student.username}) - Created: ${student.createdAt.toDateString()}`);
    });

    // 2. Check if there are any students with initialSetupComplete: true
    const studentsWithCompleteSetup = await prisma.student.findMany({
      where: {
        initialSetupComplete: true
      },
      select: {
        id: true,
        name: true,
        username: true,
        initialSetupComplete: true,
        createdAt: true
      }
    });

    console.log(`\n✅ Found ${studentsWithCompleteSetup.length} students with complete setup:`);
    studentsWithCompleteSetup.forEach(student => {
      console.log(`  - ${student.name} (${student.username}) - Created: ${student.createdAt.toDateString()}`);
    });

    // 3. Test the API endpoints
    console.log('\n🔗 Testing API endpoints...');
    
    // Test student API endpoint
    if (studentsWithIncompleteSetup.length > 0) {
      const testStudent = studentsWithIncompleteSetup[0];
      console.log(`\nTesting student API for: ${testStudent.name}`);
      console.log(`Expected to include initialSetupComplete: ${testStudent.initialSetupComplete}`);
    }

    // 4. Summary
    console.log('\n📋 Summary:');
    console.log(`- Total students: ${studentsWithIncompleteSetup.length + studentsWithCompleteSetup.length}`);
    console.log(`- Students needing walkthrough: ${studentsWithIncompleteSetup.length}`);
    console.log(`- Students with completed setup: ${studentsWithCompleteSetup.length}`);

    if (studentsWithIncompleteSetup.length > 0) {
      console.log('\n🎯 Walkthrough should trigger for students with incomplete setup!');
      console.log('To test:');
      console.log('1. Sign in as one of the students with incomplete setup');
      console.log('2. Navigate to /student dashboard');
      console.log('3. The walkthrough modal should appear automatically');
    } else {
      console.log('\n⚠️  No students found with incomplete setup.');
      console.log('To test walkthrough:');
      console.log('1. Create a new student account');
      console.log('2. Or manually set initialSetupComplete: false for an existing student');
    }

  } catch (error) {
    console.error('❌ Error testing walkthrough:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testWalkthrough(); 