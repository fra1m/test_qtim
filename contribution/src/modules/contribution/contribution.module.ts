import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContributionController } from './contribution.controller';
import { ContributionService } from './contribution.service';
import { ContributionEntity } from './entities/contribution.entity';
import { LoggerModule } from 'src/common/logger/logger.module';

@Module({
  imports: [TypeOrmModule.forFeature([ContributionEntity]), LoggerModule],
  controllers: [ContributionController],
  providers: [ContributionService],
})
export class ContributionModule {}
