import { ConfigModule } from '@nestjs/config'
import { AppDataSource } from './data-source'

ConfigModule.forRoot({ isGlobal: true })

async function runMigrations() {
  await AppDataSource.initialize()
  await AppDataSource.runMigrations()
  await AppDataSource.destroy()
}

void runMigrations()
