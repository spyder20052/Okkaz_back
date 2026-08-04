process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://okkaz:okkaz@localhost:5432/okkaz_test?schema=public';
process.env.JWT_SECRET ??= 'test-access-secret-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-at-least-32-characters';
process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 'test').toString('base64');
process.env.WCC_PHONE_NUMBER ??= '+22900000000';

