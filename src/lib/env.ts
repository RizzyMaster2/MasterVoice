
import { config } from 'dotenv';

// Load environment variables from a .env file into process.env
// This should be the first import in any server-side entry point.
config({ path: '.env' });
