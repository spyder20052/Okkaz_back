import { UserStatus, UserRole, ListingStatus } from '@prisma/client';
import { prismaMock } from '../singleton';
import bcrypt from 'bcrypt';
import * as usersService from '../../src/modules/users/users.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('Users Service (Unit)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMe', () => {
    it('doit rejeter si l\'utilisateur n\'existe pas', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(usersService.getMe('invalid-id')).rejects.toThrow(/introuvable/);
    });

    it('doit retourner l\'utilisateur', async () => {
      const mockUser = { id: '123', email: 'test@test.com' } as any;
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      const result = await usersService.getMe('123');
      expect(result).toEqual(mockUser);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
        select: expect.any(Object),
      });
    });
  });

  describe('updateMe', () => {
    it('doit mettre à jour les données de l\'utilisateur', async () => {
      const mockUser = { id: '123', firstName: 'NewName' } as any;
      prismaMock.user.update.mockResolvedValue(mockUser);
      
      const result = await usersService.updateMe('123', { firstName: 'NewName' });
      expect(result).toEqual(mockUser);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { firstName: 'NewName' },
        select: expect.any(Object),
      });
    });
  });

  describe('changePassword', () => {
    it('doit rejeter si l\'utilisateur n\'existe pas', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(usersService.changePassword('123', 'old', 'new')).rejects.toThrow(/introuvable/);
    });

    it('doit rejeter si le mot de passe actuel est erroné', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: '123', passwordHash: 'hash' } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      await expect(usersService.changePassword('123', 'bad', 'new')).rejects.toThrow(/invalide/);
    });

    it('doit changer le mot de passe et invalider les sessions', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: '123', passwordHash: 'hash' } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHash');
      
      const transactionMock = prismaMock.$transaction as jest.Mock;
      transactionMock.mockResolvedValue([]);

      await usersService.changePassword('123', 'old', 'new');
      expect(bcrypt.hash).toHaveBeenCalledWith('new', 12);
      expect(transactionMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPublicProfile', () => {
    it('doit rejeter si l\'utilisateur est bloqué ou introuvable', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      await expect(usersService.getPublicProfile('123')).rejects.toThrow(/introuvable/);
    });

    it('doit retourner le profil public avec ses annonces et notes', async () => {
      const mockUser = { id: '123', firstName: 'John' } as any;
      prismaMock.user.findFirst.mockResolvedValue(mockUser);
      
      prismaMock.listing.findMany.mockResolvedValue([
        { id: 'l1', title: 'Listing 1' } as any
      ]);
      
      prismaMock.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: { _all: 10 }
      } as any);

      const result = await usersService.getPublicProfile('123');
      expect(result.id).toBe('123');
      expect(result.ratingAverage).toBe(4.5);
      expect(result.ratingCount).toBe(10);
      expect(result.activeListings).toHaveLength(1);
    });
  });

  describe('Paginated Getters (Listings, Contacts, Payments)', () => {
    it('doit récupérer mes annonces avec pagination meta', async () => {
      prismaMock.listing.findMany.mockResolvedValue([{ id: 'l1' }] as any[]);
      prismaMock.listing.count.mockResolvedValue(1);

      const result = await usersService.getMyListings('123', { limit: '10', page: '1' });
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('doit récupérer mes accès de contact', async () => {
      prismaMock.contactAccess.findMany.mockResolvedValue([{ id: 'c1' }] as any[]);
      prismaMock.contactAccess.count.mockResolvedValue(1);

      const result = await usersService.getMyContactAccesses('123', {});
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('doit récupérer mes paiements', async () => {
      prismaMock.payment.findMany.mockResolvedValue([{ id: 'p1' }] as any[]);
      prismaMock.payment.count.mockResolvedValue(1);

      const result = await usersService.getMyPayments('123', {});
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });
});
