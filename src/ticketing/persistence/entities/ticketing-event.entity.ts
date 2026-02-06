import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { TicketType } from './ticket-type.entity';

@Entity('ticketing_events')
export class TicketingEvent {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'timestamptz' })
  eventDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  venue: string | null;

  @Column({ type: 'int4', default: 3000 })
  maxActive: number;

  @Column({ type: 'int4', default: 600 })
  activeTtlSeconds: number;

  @Column({ type: 'int4', default: 300 })
  reservationTtlSeconds: number;

  @Column({ type: 'int4', default: 300 })
  paymentTtlSeconds: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'closed',
  })
  status: 'closed' | 'open' | 'paused';

  @Column({ type: 'timestamptz', nullable: true })
  openedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @OneToMany(() => TicketType, (ticketType) => ticketType.event)
  ticketTypes: TicketType[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
