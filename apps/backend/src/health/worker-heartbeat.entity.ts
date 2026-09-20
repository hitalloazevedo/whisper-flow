import { Column, Entity, PrimaryColumn } from 'typeorm'

export enum WorkerHeartbeatStatus {
  Idle = 'idle',
  Processing = 'processing',
}

@Entity('worker_heartbeats')
export class WorkerHeartbeat {
  @PrimaryColumn({ type: 'varchar' })
  hostname!: string

  @PrimaryColumn({ type: 'integer' })
  pid!: number

  @Column({ type: 'varchar', enum: WorkerHeartbeatStatus })
  status!: WorkerHeartbeatStatus

  @Column({ type: 'uuid', nullable: true })
  currentJobId!: string | null

  @Column({ type: 'timestamptz' })
  lastSeenAt!: Date
}
