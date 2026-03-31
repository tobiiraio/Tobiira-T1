import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import type { UsersRepository } from './users.repository';

const makeRepo = (overrides: Partial<UsersRepository> = {}): UsersRepository =>
  ({
    findById: jest.fn().mockResolvedValue(null),
    updateById: jest.fn().mockResolvedValue(null),
    ...overrides,
  }) as unknown as UsersRepository;

const makeUser = (overrides: object = {}) => ({
  _id: 'u1',
  email: 'user@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  isEmailVerified: true,
  systemRole: 'user',
  ...overrides,
});

describe('UsersService.getMe', () => {
  it('returns mapped user when found', async () => {
    const service = new UsersService(makeRepo({ findById: jest.fn().mockResolvedValue(makeUser()) }));
    const result = await service.getMe({ userId: 'u1' });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'u1',
        email: 'user@example.com',
        firstName: 'Alice',
        lastName: 'Smith',
        isEmailVerified: true,
        systemRole: 'user',
      }),
    );
  });

  it('throws NotFoundException when user does not exist', async () => {
    const service = new UsersService(makeRepo());
    await expect(service.getMe({ userId: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('UsersService.updateMe', () => {
  it('updates and returns the mapped user', async () => {
    const updated = makeUser({ firstName: 'Bob' });
    const updateById = jest.fn().mockResolvedValue(updated);
    const service = new UsersService(makeRepo({ updateById }));

    const result = await service.updateMe({ userId: 'u1', dto: { firstName: 'Bob' } });

    expect(updateById).toHaveBeenCalledWith('u1', expect.objectContaining({ firstName: 'Bob' }));
    expect(result.firstName).toBe('Bob');
  });

  it('throws NotFoundException when user does not exist', async () => {
    const service = new UsersService(makeRepo({ updateById: jest.fn().mockResolvedValue(null) }));
    await expect(
      service.updateMe({ userId: 'missing', dto: { firstName: 'X' } }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('trims whitespace from string fields', async () => {
    const updateById = jest.fn().mockResolvedValue(makeUser({ firstName: 'Bob' }));
    const service = new UsersService(makeRepo({ updateById }));

    await service.updateMe({ userId: 'u1', dto: { firstName: '  Bob  ' } });

    expect(updateById).toHaveBeenCalledWith('u1', expect.objectContaining({ firstName: 'Bob' }));
  });

  it('sets field to undefined when blank string is passed', async () => {
    const updateById = jest.fn().mockResolvedValue(makeUser({ firstName: undefined }));
    const service = new UsersService(makeRepo({ updateById }));

    await service.updateMe({ userId: 'u1', dto: { firstName: '   ' } });

    expect(updateById).toHaveBeenCalledWith('u1', expect.objectContaining({ firstName: undefined }));
  });
});
