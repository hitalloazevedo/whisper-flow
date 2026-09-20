import 'reflect-metadata'
import 'dotenv/config'
import { DataSource } from 'typeorm'
import { OAuthAccount } from '../auth/oauth-account.entity'
import { User } from '../auth/user.entity'
import { Job } from '../jobs/job.entity'
import { CreateAuthTables1710000000000 } from './migrations/1710000000000-CreateAuthTables'
import { CreateJobsTable1720000000000 } from './migrations/1720000000000-CreateJobsTable'
import { AddOriginalFilenameToJobs1730000000000 } from './migrations/1730000000000-AddOriginalFilenameToJobs'
import { AddJobsNotifyTrigger1740000000000 } from './migrations/1740000000000-AddJobsNotifyTrigger'
import { AddTraceIdToJobs1750000000000 } from './migrations/1750000000000-AddTraceIdToJobs'
import { AddJobsNotifyUpdateTrigger1760000000000 } from './migrations/1760000000000-AddJobsNotifyUpdateTrigger'
import { AddDeletedAtToJobs1770000000000 } from './migrations/1770000000000-AddDeletedAtToJobs'

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, OAuthAccount, Job],
  migrations: [
    CreateAuthTables1710000000000,
    CreateJobsTable1720000000000,
    AddOriginalFilenameToJobs1730000000000,
    AddJobsNotifyTrigger1740000000000,
    AddTraceIdToJobs1750000000000,
    AddJobsNotifyUpdateTrigger1760000000000,
    AddDeletedAtToJobs1770000000000,
  ],
  synchronize: false,
})
