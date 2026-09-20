import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { User } from '../auth/user.entity'

export enum JobStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  createdBy!: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdBy' })
  user!: User

  @Column({
    type: 'enum',
    enum: JobStatus,
    enumName: 'jobs_status_enum',
    default: JobStatus.Pending,
  })
  status!: JobStatus

  @Column({ type: 'varchar' })
  inputPath!: string

  @Column({ type: 'varchar' })
  originalFilename!: string

  @Column({ type: 'varchar', nullable: true })
  traceId!: string | null

  @Column({ type: 'varchar', nullable: true })
  outputPath!: string | null

  @Column({ type: 'varchar', nullable: true })
  errorMessage!: string | null

  @Column({ type: 'integer', default: 0 })
  retryCount!: number

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date

  @Column({ type: 'timestamptz', nullable: true })
  startedAt!: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null
}
