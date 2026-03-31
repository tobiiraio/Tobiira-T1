import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CoreClientService } from './core-client.service';

@Module({
  imports: [HttpModule],
  providers: [CoreClientService],
  exports: [CoreClientService],
})
export class CoreClientModule {}
