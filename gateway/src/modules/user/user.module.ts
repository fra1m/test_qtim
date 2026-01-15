import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { RmqModule } from 'src/common/rmq/rmq.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, RmqModule.forUser()],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
