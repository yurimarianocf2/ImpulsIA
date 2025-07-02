const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('Environment Variables Check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
console.log('SUPABASE_ANON_KEY length:', process.env.SUPABASE_ANON_KEY?.length || 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 'Missing');
console.log('');

// Decode JWT to check if keys are valid
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return 'Invalid JWT format';
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch (e) {
    return 'Cannot decode JWT: ' + e.message;
  }
}

console.log('ANON Key payload:', decodeJWT(process.env.SUPABASE_ANON_KEY));
console.log('SERVICE Key payload:', decodeJWT(process.env.SUPABASE_SERVICE_ROLE_KEY));

// Test a simple request to see detailed error
async function testDetailed() {
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    console.log('\nTesting simple query...');
    const { data, error } = await client.from('farmacias').select('count');
    console.log('Data:', data);
    console.log('Error:', error);
  } catch (err) {
    console.log('Caught error:', err);
  }
}

testDetailed();
