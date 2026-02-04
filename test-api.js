const fetch = require('node-fetch');

async function testAPI() {
  try {
    // Get token from your browser's localStorage or use a test token
    const token = 'YOUR_TOKEN_HERE'; // Replace with actual token
    
    console.log('Testing /api/vteptests endpoint...');
    const response = await fetch('http://localhost:4000/api/vteptests', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    console.log('\nResponse:', JSON.stringify(data, null, 2));
    console.log('\nTotal tests:', data.length);
    
    const speakingTests = data.filter(t => t.skill === 'Speaking');
    const otherTests = data.filter(t => t.skill !== 'Speaking');
    
    console.log('Speaking tests:', speakingTests.length);
    console.log('Other tests:', otherTests.length);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testAPI();
