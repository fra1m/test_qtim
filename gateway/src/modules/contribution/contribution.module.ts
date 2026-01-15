import { Module } from '@nestjs/common';
import { ContributionService } from './contribution.service';
import { ContributionController } from './contribution.controller';
import { RmqModule } from 'src/common/rmq/rmq.module';

@Module({
  imports: [RmqModule.forContribution()],
  controllers: [ContributionController],
  providers: [ContributionService],
})
export class ContributionModule {}
