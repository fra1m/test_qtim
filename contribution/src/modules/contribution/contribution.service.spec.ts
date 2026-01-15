import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ContributionService } from './contribution.service';
import { ContributionEntity } from './entities/contribution.entity';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';

describe('ContributionService business logic', () => {
  let service: ContributionService;
  let repo: {
    create: jest.Mock<ContributionEntity, [Partial<ContributionEntity>]>;
    save: jest.Mock<Promise<ContributionEntity>, [ContributionEntity]>;
    createQueryBuilder: jest.Mock<any, [string]>;
    findOne: jest.Mock<Promise<ContributionEntity | null>, [any]>;
    delete: jest.Mock<Promise<{ affected?: number }>, [any]>;
  };
  let qb: {
    andWhere: jest.Mock<any, any>;
    orderBy: jest.Mock<any, any>;
    skip: jest.Mock<any, any>;
    take: jest.Mock<any, any>;
    getManyAndCount: jest.Mock<Promise<[ContributionEntity[], number]>, []>;
  };

  const makeContribution = (
    overrides: Partial<ContributionEntity> = {},
  ): ContributionEntity =>
    ({
      id: 1,
      title: 'Title',
      description: 'Description',
      publishedAt: new Date('2024-01-01T00:00:00.000Z'),
      authorId: 10,
      authorName: 'Author',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      ...overrides,
    }) as ContributionEntity;

  const expectHttpError = async (promise: Promise<unknown>, status: number) => {
    try {
      await promise;
      fail('Expected HttpException');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(status);
    }
  };

  beforeEach(async () => {
    qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    repo = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributionService,
        { provide: getRepositoryToken(ContributionEntity), useValue: repo },
      ],
    }).compile();

    service = module.get<ContributionService>(ContributionService);
  });

  it('create persists contribution with publishedAt Date', async () => {
    const dto: CreateContributionDto = {
      title: 'Post',
      description: 'Body',
      publishedAt: '2024-02-01T10:00:00.000Z',
      authorId: 2,
      authorName: 'Author',
    };
    const entity = makeContribution({ id: 2 });
    repo.create.mockReturnValue(entity);
    repo.save.mockResolvedValue(entity);

    await expect(service.create(dto)).resolves.toBe(entity);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: dto.title,
        description: dto.description,
        authorId: dto.authorId,
        authorName: dto.authorName,
        publishedAt: expect.any(Date),
      }),
    );
    expect(repo.save).toHaveBeenCalledWith(entity);
  });

  it('findAll applies filters and pagination', async () => {
    const items = [makeContribution({ id: 1 }), makeContribution({ id: 2 })];
    qb.getManyAndCount.mockResolvedValue([items, 2]);

    const result = await service.findAll({
      page: 2,
      limit: 10,
      authorId: 7,
      publishedFrom: '2024-01-01T00:00:00.000Z',
      publishedTo: '2024-02-01T00:00:00.000Z',
    });

    expect(qb.andWhere).toHaveBeenCalledWith('c.authorId = :authorId', {
      authorId: 7,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('c.publishedAt >= :from', {
      from: expect.any(Date),
    });
    expect(qb.andWhere).toHaveBeenCalledWith('c.publishedAt <= :to', {
      to: expect.any(Date),
    });
    expect(qb.orderBy).toHaveBeenCalledWith('c.publishedAt', 'DESC');
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.take).toHaveBeenCalledWith(10);
    expect(result).toEqual({ items, total: 2, page: 2, limit: 10 });
  });

  it('findAll clamps limit to 100 and page to >= 1', async () => {
    qb.getManyAndCount.mockResolvedValue([[], 0]);

    const result = await service.findAll({ page: 0, limit: 500 });

    expect(qb.take).toHaveBeenCalledWith(100);
    expect(qb.skip).toHaveBeenCalledWith(0);
    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 100 });
  });

  it('findOne throws when missing', async () => {
    repo.findOne.mockResolvedValue(null);

    await expectHttpError(service.findOne(99), HttpStatus.NOT_FOUND);
  });

  it('findOne returns entity when found', async () => {
    const entity = makeContribution({ id: 5 });
    repo.findOne.mockResolvedValue(entity);

    await expect(service.findOne(5)).resolves.toBe(entity);
  });

  it('update throws when entity not found', async () => {
    repo.findOne.mockResolvedValue(null);

    await expectHttpError(
      service.update(1, { title: 'Updated' }),
      HttpStatus.NOT_FOUND,
    );
  });

  it('update throws when actor is not the author', async () => {
    const entity = makeContribution({ id: 3, authorId: 9 });
    repo.findOne.mockResolvedValue(entity);

    await expectHttpError(
      service.update(3, { title: 'Updated' }, 7),
      HttpStatus.FORBIDDEN,
    );
  });

  it('update saves entity and converts publishedAt', async () => {
    const updated = makeContribution({ id: 3, title: 'Updated' });
    repo.findOne.mockResolvedValue(updated);
    repo.save.mockResolvedValue(updated);

    const dto: UpdateContributionDto = {
      title: 'Updated',
      publishedAt: '2024-03-01T00:00:00.000Z',
    };

    await expect(service.update(3, dto, updated.authorId)).resolves.toBe(
      updated,
    );
    expect(repo.save).toHaveBeenCalledWith(updated);
  });

  it('remove throws when entity not found', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.delete.mockResolvedValue({ affected: 0 });

    await expectHttpError(service.remove(1), HttpStatus.NOT_FOUND);
  });

  it('remove throws when actor is not the author', async () => {
    repo.findOne.mockResolvedValue(makeContribution({ authorId: 10 }));

    await expectHttpError(service.remove(1, 7), HttpStatus.FORBIDDEN);
  });

  it('remove returns id on success', async () => {
    const entity = makeContribution();
    repo.findOne.mockResolvedValue(entity);
    repo.delete.mockResolvedValue({ affected: 1 });

    await expect(service.remove(1, entity.authorId)).resolves.toEqual({
      id: 1,
    });
  });
});
