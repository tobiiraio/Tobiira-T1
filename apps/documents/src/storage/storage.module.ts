import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { R2StorageProvider } from './r2-storage.provider';
import { STORAGE_PROVIDER } from './storage.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    R2StorageProvider,
    { provide: STORAGE_PROVIDER, useExisting: R2StorageProvider },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
