import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeasesRepository } from './leases.repository';
import { UnitsRepository } from '../properties/units.repository';

@Injectable()
export class LeaseExpiryService {
  private readonly logger = new Logger(LeaseExpiryService.name);

  constructor(
    private readonly leasesRepository: LeasesRepository,
    private readonly unitsRepository: UnitsRepository,
  ) {}

  // Runs every hour — marks active leases whose endDate has passed as expired and frees the unit
  @Cron(CronExpression.EVERY_HOUR)
  async expireLeases(): Promise<void> {
    const now = new Date();
    const expired = await this.leasesRepository.findExpiredActive(now);

    if (expired.length === 0) return;

    this.logger.log(`Expiring ${expired.length} lease(s)`);

    await Promise.all(
      expired.map(async (lease) => {
        try {
          await this.leasesRepository.update(String(lease._id), { status: 'expired' });
          await this.unitsRepository.update(String(lease.unitId), { status: 'vacant' });
        } catch (err) {
          this.logger.error(err, `Failed to expire lease ${lease._id}`);
        }
      }),
    );
  }
}
