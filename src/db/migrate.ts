import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../config/env';

const runMigration = async () => {
  console.log('⏳ Running migrations...');

  const migrationClient = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(migrationClient);

  await migrate(db, { migrationsFolder: './drizzle' });

  await migrationClient.end();

  console.log('✅ Migrations completed!');
  process.exit(0);
};

runMigration().catch((err) => {
  console.error('❌ Migration failed!');
  console.error(err);
  process.exit(1);
});
