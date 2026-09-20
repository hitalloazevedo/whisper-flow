import { ConfigModule } from '@nestjs/config'
import { AppDataSource } from './data-source'

ConfigModule.forRoot({ isGlobal: true })

async function runMigrations() {
  await AppDataSource.initialize()
  try {
    await AppDataSource.runMigrations()
  } finally {
    await AppDataSource.destroy()
  }
}

void runMigrations().catch((error: unknown) => {
  console.error('Database migrations failed', error)
  process.exitCode = 1
})
