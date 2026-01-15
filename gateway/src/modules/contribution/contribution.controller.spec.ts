import { Test, TestingModule } from '@nestjs/testing';
import { ContributionController } from './contribution.controller';
import { ContributionService } from './contribution.service';
import { JwtAuthGuard } from 'src/common/secure/guards/jwt-auth.guard';

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
