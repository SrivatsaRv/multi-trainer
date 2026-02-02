import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
    throw new Error("Missing required test environment variables: TEST_USER_EMAIL or TEST_USER_PASSWORD");
}

export const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
export const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;
