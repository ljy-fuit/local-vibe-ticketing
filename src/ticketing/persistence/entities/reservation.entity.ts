import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ticketing_reservations')
export class TicketingReservation {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 36, unique: true })
  reservationId: string;

  @Column({ type: 'bigint' })
  eventId: string;

  @Column({ type: 'bigint' })
  userId: string;

  @Column({ type: 'bigint' })
  ticketTypeId: string;

  @Column({ type: 'int4' })
  quantity: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: 'pending' | 'paid' | 'expired' | 'cancelled';

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
