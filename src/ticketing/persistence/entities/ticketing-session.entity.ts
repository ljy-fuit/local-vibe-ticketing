import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('ticketing_sessions')
export class TicketingSession {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  eventId: string;

  @Column({ type: 'bigint' })
  userId: string;

  @Column({ type: 'varchar', length: 30 })
  state: string;

  @Column({ type: 'varchar', length: 30 })
  previousState: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
