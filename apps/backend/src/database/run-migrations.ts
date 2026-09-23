import AppDataSource from './data-source';

async function runMigrations() {
  console.log('🔄 Initializing database connection...');
  try {
    await AppDataSource.initialize();
    console.log('✅ Connected to database. Running pending migrations...');
    const migrations = await AppDataSource.runMigrations();
    if (migrations.length === 0) {
      console.log('ℹ️ No pending migrations to execute.');
    } else {
      console.log(`✅ Successfully executed ${migrations.length} migration(s):`);
      migrations.forEach((m) => console.log(`   - ${m.name}`));
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

runMigrations();
