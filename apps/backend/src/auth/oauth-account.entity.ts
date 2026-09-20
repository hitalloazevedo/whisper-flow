import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import { User } from './user.entity'

@Entity('oauth_accounts')
@Unique(['provider', 'providerSubject'])
export class OAuthAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar' })
  provider!: string

  @Column({ type: 'varchar' })
  providerSubject!: string

  @Column({ type: 'uuid' })
  userId!: string

  @ManyToOne(() => User, (user) => user.oauthAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date
}
