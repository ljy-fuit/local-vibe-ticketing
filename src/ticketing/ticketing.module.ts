import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketingRedisModule } from './common/redis/ticketing-redis.module';
import { TicketingStateGuard } from './common/guards/ticketing-state.guard';
import {
  TicketingEvent,
  TicketType,
  TicketingSession,
  TicketingReservation,
  TicketingPayment,
} from './persistence/entities';
import { QueueController } from './queue/queue.controller';
import { QueueService } from './queue/queue.service';
import { AdmissionService } from './admission/admission.service';
import { AdmissionScheduler } from './admission/admission.scheduler';
import { ReservationController } from './reservation/reservation.controller';
import { ReservationService } from './reservation/reservation.service';
import { PaymentController } from './payment/payment.controller';
import { PaymentWebhookController } from './payment/payment-webhook.controller';
import { PaymentService } from './payment/payment.service';
import { PG_ADAPTER } from './payment/pg/pg.interface';
import { TossAdapter } from './payment/pg/toss.adapter';
import { TicketingAdminController } from './admin/ticketing-admin.controller';
import { TicketingAdminService } from './admin/ticketing-admin.service';
import { PersistenceService } from './persistence/persistence.service';
import { PersistenceScheduler } from './persistence/persistence.scheduler';
import { CleanupService } from './cleanup/cleanup.service';

@Module({
  imports: [
    TicketingRedisModule,
    TypeOrmModule.forFeature([
      TicketingEvent,
      TicketType,
      TicketingSession,
      TicketingReservation,
      TicketingPayment,
    ]),
  ],
  controllers: [
    QueueController,
    ReservationController,
    PaymentController,
    PaymentWebhookController,
    TicketingAdminController,
  ],
  providers: [
    TicketingStateGuard,
    QueueService,
    AdmissionService,
    AdmissionScheduler,
    ReservationService,
    PaymentService,
    {
      provide: PG_ADAPTER,
      useClass: TossAdapter,
    },
    TicketingAdminService,
    PersistenceService,
    PersistenceScheduler,
    CleanupService,
  ],
})
export class TicketingModule {}
