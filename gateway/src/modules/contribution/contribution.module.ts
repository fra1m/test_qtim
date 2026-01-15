import { Module } from '@nestjs/common';
import { ContributionService } from './contribution.service';
import { ContributionController } from './contribution.controller';
import { RmqModule } from 'src/common/rmq/rmq.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [RmqModule.forContribution(), UserModule],
  controllers: [ContributionController],
  providers: [ContributionService],
})
export class ContributionModule {}
