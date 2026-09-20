import 'reflect-metadata'
import 'dotenv/config'
import { DataSource } from 'typeorm'
import { OAuthAccount } from '../auth/oauth-account.entity'
import { User } from '../auth/user.entity'
import { CreateAuthTables1710000000000 } from './migrations/1710000000000-CreateAuthTables'

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, OAuthAccount],
  migrations: [CreateAuthTables1710000000000],
  synchronize: false,
})
