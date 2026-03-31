import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Device, DeviceSchema } from './schemas/device.schema';
import { DevicesRepository } from './devices.repository';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DeviceApiKeyGuard } from './guards/device-api-key.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Device.name, schema: DeviceSchema }]),
  ],
  controllers: [DevicesController],
  providers: [DevicesRepository, DevicesService, DeviceApiKeyGuard],
  exports: [DevicesService, DeviceApiKeyGuard],
})
export class DevicesModule {}
