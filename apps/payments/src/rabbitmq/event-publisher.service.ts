import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientRmq } from '@nestjs/microservices';
import type { PaymentsEvent } from '@tobiira/common';
import { RABBITMQ_CLIENT } from './rabbitmq.module';

@Injectable()
export class EventPublisher implements OnModuleInit {
  private readonly logger = new Logger(EventPublisher.name);

  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly client: ClientRmq,
  ) {}

  async onModuleInit() {
    await this.client.connect();
  }

  emit<T>(event: PaymentsEvent, payload: T): void {
    this.client.emit<void, T>(event, payload).subscribe({
      error: (err) => this.logger.error(err, `Failed to emit event: ${event}`),
    });
  }
}
