import 'reflect-metadata'
import 'dotenv/config'
import { DataSource } from 'typeorm'
import { OAuthAccount } from '../auth/oauth-account.entity'
import { User } from '../auth/user.entity'
import { Job } from '../jobs/job.entity'
import { CreateAuthTables1710000000000 } from './migrations/1710000000000-CreateAuthTables'
import { CreateJobsTable1720000000000 } from './migrations/1720000000000-CreateJobsTable'

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, OAuthAccount, Job],
  migrations: [CreateAuthTables1710000000000, CreateJobsTable1720000000000],
  synchronize: false,
})
