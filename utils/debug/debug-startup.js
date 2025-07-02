console.log('Starting debug...');

// Test if basic modules load
try {
  console.log('Loading dotenv...');
  require('dotenv/config');
  console.log('✓ dotenv loaded');
  
  console.log('Loading next...');
  const next = require('next');
  console.log('✓ next loaded');
  
  console.log('Testing app creation...');
  const app = next({ dev: true });
  console.log('✓ next app created');
  
  console.log('Testing prepare...');
  app.prepare().then(() => {
    console.log('✓ next app prepared');
    process.exit(0);
  }).catch(err => {
    console.error('✗ next app prepare failed:', err);
    process.exit(1);
  });
  
  setTimeout(() => {
    console.error('✗ Timeout waiting for prepare');
    process.exit(1);
  }, 30000);
  
} catch (error) {
  console.error('✗ Error:', error);
  process.exit(1);
}