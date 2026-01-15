import { Test, TestingModule } from '@nestjs/testing';
import { ContributionService } from './contribution.service';
import { CONTRIBUTIONS_CLIENT } from 'src/common/rmq/rmq.module';

describe('ContributionService', () => {
  let service: ContributionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributionService,
        {
          provide: CONTRIBUTIONS_CLIENT,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ContributionService>(ContributionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
