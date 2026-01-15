import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RmqModule } from 'src/common/rmq/rmq.module';

@Module({
  imports: [RmqModule.forAuth()],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
