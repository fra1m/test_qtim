import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UserService business logic', () => {
  let service: UserService;
  let repo: {
    findOne: jest.Mock<Promise<UserEntity | null>, [any]>;
    find: jest.Mock<Promise<UserEntity[]>, [any?]>;
    save: jest.Mock<Promise<UserEntity>, [any]>;
    preload: jest.Mock<Promise<UserEntity | undefined>, [any]>;
    delete: jest.Mock<Promise<{ affected?: number }>, [any]>;
  };

  const makeUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
    ({
      id: 1,
      email: 'test@example.com',
      name: 'Tester',
      ...overrides,
    }) as UserEntity;

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
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      preload: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: repo },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('createUser rejects duplicate email', async () => {
    const dto: CreateUserDto = {
      email: 'test@example.com',
      name: 'Tester',
    };
    repo.findOne.mockResolvedValue(makeUser({ id: 2 }));

    await expectHttpError(service.createUser(dto), HttpStatus.BAD_REQUEST);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('createUser persists new user', async () => {
    const dto: CreateUserDto = {
      email: 'test@example.com',
      name: 'Tester',
    };
    const user = makeUser();
    repo.findOne.mockResolvedValue(null);
    repo.save.mockResolvedValue(user);

    await expect(service.createUser(dto)).resolves.toBe(user);
    expect(repo.save).toHaveBeenCalledWith(dto);
  });

  it('getUserByEmailOrFail throws when missing', async () => {
    repo.findOne.mockResolvedValue(null);

    await expectHttpError(
      service.getUserByEmailOrFail('missing@example.com'),
      HttpStatus.NOT_FOUND,
    );
  });

  it('getUserByEmailOrFail returns user when found', async () => {
    const user = makeUser({ id: 3, email: 'found@example.com' });
    repo.findOne.mockResolvedValue(user);

    await expect(
      service.getUserByEmailOrFail('found@example.com'),
    ).resolves.toBe(user);
  });

  it('getUserById throws when missing', async () => {
    repo.findOne.mockResolvedValue(null);

    await expectHttpError(service.getUserById(99), HttpStatus.NOT_FOUND);
  });

  it('getUserById returns user when found', async () => {
    const user = makeUser({ id: 10 });
    repo.findOne.mockResolvedValue(user);

    await expect(service.getUserById(10)).resolves.toBe(user);
  });

  it('getAllUsers returns repository results', async () => {
    const list = [makeUser(), makeUser({ id: 2, email: 'second@example.com' })];
    repo.find.mockResolvedValue(list);

    await expect(service.getAllUsers()).resolves.toBe(list);
  });

  it('updateUser rejects when email belongs to another user', async () => {
    const dto: UpdateUserDto = { id: 1, email: 'taken@example.com' };
    repo.findOne.mockResolvedValue(
      makeUser({ id: 2, email: 'taken@example.com' }),
    );

    await expectHttpError(service.updateUser(1, dto), HttpStatus.BAD_REQUEST);
    expect(repo.preload).not.toHaveBeenCalled();
  });

  it('updateUser throws when user not found', async () => {
    const dto: UpdateUserDto = { id: 1, name: 'Updated' };
    repo.preload.mockResolvedValue(undefined);

    await expectHttpError(service.updateUser(1, dto), HttpStatus.NOT_FOUND);
  });

  it('updateUser saves and returns updated user', async () => {
    const dto: UpdateUserDto = {
      id: 1,
      email: 'test@example.com',
      name: 'Updated',
    };
    const updated = makeUser({ name: 'Updated' });
    repo.findOne.mockResolvedValue(makeUser({ id: 1 }));
    repo.preload.mockResolvedValue(updated);
    repo.save.mockResolvedValue(updated);

    await expect(service.updateUser(1, dto)).resolves.toBe(updated);
    expect(repo.preload).toHaveBeenCalledWith({ ...dto, id: 1 });
    expect(repo.save).toHaveBeenCalledWith(updated);
  });

  it('removeUser throws when user not found', async () => {
    repo.delete.mockResolvedValue({ affected: 0 });

    await expectHttpError(service.removeUser(1), HttpStatus.NOT_FOUND);
  });

  it('removeUser returns id on success', async () => {
    repo.delete.mockResolvedValue({ affected: 1 });

    await expect(service.removeUser(1)).resolves.toEqual({ id: 1 });
  });

  it('addContribution appends id to empty list', async () => {
    const user = makeUser({ id: 5, contributionIds: null });
    repo.findOne.mockResolvedValue(user);
    repo.save.mockResolvedValue(user);

    await expect(service.addContribution(5, 10)).resolves.toBe(user);
    expect(user.contributionIds).toEqual([10]);
  });

  it('addContribution does not duplicate ids', async () => {
    const user = makeUser({ id: 5, contributionIds: [10] });
    repo.findOne.mockResolvedValue(user);
    repo.save.mockResolvedValue(user);

    await expect(service.addContribution(5, 10)).resolves.toBe(user);
    expect(user.contributionIds).toEqual([10]);
  });

  it('removeContribution removes id and returns null when empty', async () => {
    const user = makeUser({ id: 5, contributionIds: [10] });
    repo.findOne.mockResolvedValue(user);
    repo.save.mockResolvedValue(user);

    await expect(service.removeContribution(5, 10)).resolves.toBe(user);
    expect(user.contributionIds).toBeNull();
  });
});
