import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TicketingEvent } from './ticketing-event.entity';

@Entity('ticket_types')
export class TicketType {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  eventId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int4' })
  price: number;

  @Column({ type: 'int4' })
  totalStock: number;

  @Column({ type: 'int4' })
  remainingStock: number;

  @Column({ type: 'int4', default: 4 })
  maxPerUser: number;

  @ManyToOne(() => TicketingEvent, (event) => event.ticketTypes)
  @JoinColumn({ name: 'event_id' })
  event: TicketingEvent;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
