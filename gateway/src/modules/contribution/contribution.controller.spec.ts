import { Test, TestingModule } from '@nestjs/testing';
import { ContributionController } from './contribution.controller';
import { ContributionService } from './contribution.service';
import { JwtAuthGuard } from 'src/common/secure/guards/jwt-auth.guard';
import { UserService } from '../user/user.service';
import { CacheHelper } from 'src/common/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from 'src/common/logger/logger.service';

describe('ContributionController', () => {
  let controller: ContributionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContributionController],
      providers: [
        {
          provide: ContributionService,
          useValue: {},
        },
        {
          provide: UserService,
          useValue: {},
        },
        {
          provide: CacheHelper,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: AppLogger,
          useValue: { info: jest.fn(), error: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ContributionController>(ContributionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
