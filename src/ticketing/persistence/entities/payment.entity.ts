import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ticketing_payments')
export class TicketingPayment {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 36, unique: true })
  paymentId: string;

  @Column({ type: 'bigint' })
  eventId: string;

  @Column({ type: 'bigint' })
  userId: string;

  @Column({ type: 'varchar', length: 36 })
  reservationId: string;

  @Column({ type: 'varchar', length: 100 })
  pgOrderId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  pgPaymentKey: string | null;

  @Column({ type: 'int4' })
  amount: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';

  @Column({ type: 'jsonb', nullable: true })
  pgResponse: Record<string, any> | null;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
