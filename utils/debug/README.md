# Debug Utilities

This folder contains debug and development utilities for the FarmaBot Pro system.

## Files

- `check-keys.js` - Validate Supabase environment variables and JWT tokens
- `debug-env.js` - Environment variable debugging script  
- `debug-startup.js` - Application startup debugging
- `setup-basic.js` - Basic database setup script
- `test-db.js` - Database connection testing

## Usage

```bash
# Check environment variables
node utils/debug/check-keys.js

# Debug environment setup
node utils/debug/debug-env.js

# Test database connection
node utils/debug/test-db.js
```

## Note

These are development utilities and should not be used in production.