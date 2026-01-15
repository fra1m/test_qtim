import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { USERS_CLIENT } from 'src/common/rmq/rmq.module';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: USERS_CLIENT,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
