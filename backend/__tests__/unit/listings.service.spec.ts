import { UserRole, ListingStatus, Prisma } from '@prisma/client';
import { prismaMock } from '../singleton';
import * as listingsService from '../../src/modules/listings/listings.service';
import * as kycService from '../../src/modules/kyc/kyc.service';
import * as settingsService from '../../src/services/settings.service';
import * as storageService from '../../src/services/storage.service';

jest.mock('../../src/modules/kyc/kyc.service', () => ({
  assertUserKycApproved: jest.fn(),
}));

jest.mock('../../src/services/settings.service', () => ({
  getSetting: jest.fn(),
  getSettingNumber: jest.fn(),
}));

jest.mock('../../src/services/storage.service', () => ({
  uploadAsset: jest.fn(),
}));

jest.mock('../../src/utils/crypto', () => ({
  encrypt: jest.fn((str) => `encrypted_${str}`),
  decrypt: jest.fn((str) => str.replace('encrypted_', '')),
}));

describe('Listings Service (Unit)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createListing', () => {
    it('doit rejeter l option LOA pour un vendeur simple', async () => {
      (kycService.assertUserKycApproved as jest.Mock).mockResolvedValue(true);
      await expect(
        listingsService.createListing('123', UserRole.SELLER, {
          title: 'Car',
          description: 'Desc',
          categoryId: 'cat1',
          rentalPrice: 100,
          rentalPeriod: 'DAY',
          condition: 'NEW',
          locationCity: 'Paris',
          contactPhone: '1234',
          isLoa: true,
        })
      ).rejects.toThrow(/réservée aux abonnés Pro/);
    });

    it('doit creer une annonce (statut PENDING)', async () => {
      (kycService.assertUserKycApproved as jest.Mock).mockResolvedValue(true);
      prismaMock.category.findUnique.mockResolvedValue({ id: 'cat1', isActive: true } as any);
      prismaMock.listing.create.mockResolvedValue({ id: 'list1', title: 'Car' } as any);

      const res = await listingsService.createListing('123', UserRole.SELLER, {
        title: 'Car',
        description: 'Desc',
        categoryId: 'cat1',
        rentalPrice: 100,
        rentalPeriod: 'DAY',
        condition: 'NEW',
        locationCity: 'Paris',
        contactPhone: '1234',
      });

      expect(res.id).toBe('list1');
      expect((res as any).contactPhone).toBeUndefined();

      expect(prismaMock.listing.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ title: 'Car', status: ListingStatus.PENDING })
      }));
    });
  });

  describe('updateListing', () => {
    it('doit rejeter si annonce inexistante', async () => {
      prismaMock.listing.findUnique.mockResolvedValue(null);
      await expect(listingsService.updateListing('list1', '123', UserRole.SELLER, {})).rejects.toThrow(/introuvable/);
    });

    it('doit interdire la modification si on n est pas proprio ou admin', async () => {
      prismaMock.listing.findUnique.mockResolvedValue({ id: 'list1', userId: 'other' } as any);
      await expect(listingsService.updateListing('list1', '123', UserRole.SELLER, {})).rejects.toThrow(/pas propriétaire/);
    });

    it('doit mettre l annonce en statu PENDING si modifier par SELLER', async () => {
      prismaMock.listing.findUnique.mockResolvedValue({ id: 'list1', userId: '123' } as any);
      prismaMock.listing.update.mockResolvedValue({ id: 'list1' } as any);

      await listingsService.updateListing('list1', '123', UserRole.SELLER, { title: 'New' });
      expect(prismaMock.listing.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ title: 'New', status: ListingStatus.PENDING })
      }));
    });

    it('ne doit pas changer le statu si c est l ADMIN qui modifie', async () => {
      prismaMock.listing.findUnique.mockResolvedValue({ id: 'list1', userId: '123' } as any);
      prismaMock.listing.update.mockResolvedValue({ id: 'list1' } as any);

      await listingsService.updateListing('list1', 'admin-id', UserRole.ADMIN, { title: 'New' });
      expect(prismaMock.listing.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ title: 'New' })
      })); // no status sent here specifically because backToPending=false
    });
  });

  describe('softDeleteListing', () => {
    it('doit marquer en deletedAt et status DELETED', async () => {
      prismaMock.listing.findUnique.mockResolvedValue({ id: 'list1', userId: '123' } as any);
      prismaMock.listing.update.mockResolvedValue({} as any);

      await listingsService.softDeleteListing('list1', '123', UserRole.SELLER);
      expect(prismaMock.listing.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'list1' },
        data: expect.objectContaining({ status: ListingStatus.DELETED, deletedAt: expect.any(Date) })
      }));
    });
  });

  describe('listPublic', () => {
    it('doit gerer les filtres et la pagination', async () => {
      prismaMock.listing.findMany.mockResolvedValue([{ id: '1' }] as any[]);
      prismaMock.listing.count.mockResolvedValue(1);

      const res = await listingsService.listPublic({ q: 'voiture', minPrice: 10, sort: 'price_asc' });
      expect(prismaMock.listing.findMany).toHaveBeenCalledWith(expect.objectContaining({
        orderBy: [{ rentalPrice: 'asc' }],
        where: expect.objectContaining({
          status: ListingStatus.ACTIVE,
          deletedAt: null,
          OR: [
            { title: { contains: 'voiture', mode: 'insensitive' } },
            { description: { contains: 'voiture', mode: 'insensitive' } }
          ],
          rentalPrice: { gte: new Prisma.Decimal(10) }
        })
      }));
      expect(res.items).toHaveLength(1);
    });
  });

  describe('getDetail', () => {
    /** Annonce publiée, appartenant à `owner1`. */
    const activeListing = {
      id: 'list1',
      userId: 'owner1',
      status: ListingStatus.ACTIVE,
      contactPhone: 'encrypted_+22997000000',
      contactPhoneWcc: '123456',
    };

    it('doit incrémenter le compteur de vues et retourner lavis détaillé (masqué phone)', async () => {
      prismaMock.listing.findFirst.mockResolvedValue(activeListing as any);
      prismaMock.listing.update.mockResolvedValue({} as any);

      const res = await listingsService.getDetail('list1');
      expect(prismaMock.listing.update).toHaveBeenCalledWith({
        where: { id: 'list1' },
        data: { viewsCount: { increment: 1 } }
      });
      expect(res.contactPhoneDisplayed).toBe('123456');
      expect((res as any).contactPhone).toBeUndefined(); // test that it ignores private property
      // Le numéro réel n'est jamais exposé à un visiteur.
      expect((res as any).contactPhoneOwner).toBeUndefined();
    });

    it('doit masquer une annonce PENDING au public (404)', async () => {
      prismaMock.listing.findFirst.mockResolvedValue({
        ...activeListing,
        status: ListingStatus.PENDING,
      } as any);

      await expect(listingsService.getDetail('list1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'LISTING_NOT_FOUND',
      });
      expect(prismaMock.listing.update).not.toHaveBeenCalled();
    });

    it('doit masquer une annonce PENDING à un autre utilisateur connecté (404)', async () => {
      prismaMock.listing.findFirst.mockResolvedValue({
        ...activeListing,
        status: ListingStatus.PENDING,
      } as any);

      await expect(
        listingsService.getDetail('list1', { id: 'someone-else', role: UserRole.SELLER }),
      ).rejects.toMatchObject({ statusCode: 404, code: 'LISTING_NOT_FOUND' });
    });

    it('doit laisser le propriétaire relire son annonce PENDING sans compter la vue', async () => {
      prismaMock.listing.findFirst.mockResolvedValue({
        ...activeListing,
        status: ListingStatus.PENDING,
      } as any);

      const res = await listingsService.getDetail('list1', {
        id: 'owner1',
        role: UserRole.SELLER,
      });
      expect(res.status).toBe(ListingStatus.PENDING);
      // Le vrai numéro est rendu au propriétaire (préremplissage du formulaire).
      expect((res as any).contactPhoneOwner).toBe('+22997000000');
      expect(prismaMock.listing.update).not.toHaveBeenCalled();
    });

    it('doit laisser un ADMIN examiner une annonce PENDING avant validation', async () => {
      prismaMock.listing.findFirst.mockResolvedValue({
        ...activeListing,
        status: ListingStatus.PENDING,
      } as any);

      const res = await listingsService.getDetail('list1', {
        id: 'admin1',
        role: UserRole.ADMIN,
      });
      expect(res.status).toBe(ListingStatus.PENDING);
      expect((res as any).contactPhoneOwner).toBe('+22997000000');
      // La modération ne doit pas gonfler les statistiques de l'annonce.
      expect(prismaMock.listing.update).not.toHaveBeenCalled();
    });

    it('doit renvoyer 404 pour une annonce supprimée, même pour un ADMIN', async () => {
      // Le filtre `deletedAt: null` de la requête ne remonte rien.
      prismaMock.listing.findFirst.mockResolvedValue(null as any);

      await expect(
        listingsService.getDetail('list1', { id: 'admin1', role: UserRole.ADMIN }),
      ).rejects.toMatchObject({ statusCode: 404, code: 'LISTING_NOT_FOUND' });
    });
  });

  describe('Photos', () => {
    it('doit bloquer l ajout si SELLER depasse la limite', async () => {
      prismaMock.listing.findUnique.mockResolvedValue({
        id: 'list1', userId: '123', photos: [{}, {}, {}, {}]
      } as any);
      (settingsService.getSettingNumber as jest.Mock).mockResolvedValue(4);

      try {
        await listingsService.addPhotos('list1', '123', UserRole.SELLER, [{}] as any);
      } catch (e: any) {
        expect(e.code).toBe('PHOTO_LIMIT_EXCEEDED');
      }
    });

    it('doit effacer une photo en verifiant proprietaire', async () => {
      prismaMock.listingPhoto.findUnique.mockResolvedValue({
        id: 'photo1', listingId: 'list1', listing: { userId: '123' }
      } as any);

      await listingsService.deletePhoto('list1', 'photo1', '123', UserRole.SELLER);
      expect(prismaMock.listingPhoto.delete).toHaveBeenCalledWith({ where: { id: 'photo1' } });
    });

    it('doit promouvoir une nouvelle couverture quand la couverture est supprimée', async () => {
      prismaMock.listingPhoto.findUnique.mockResolvedValue({
        id: 'photo1', listingId: 'list1', isCover: true, listing: { userId: '123' }
      } as any);
      prismaMock.listingPhoto.findFirst.mockResolvedValue({ id: 'photo2' } as any);

      await listingsService.deletePhoto('list1', 'photo1', '123', UserRole.SELLER);

      // Sans cette promotion, l'annonce n'aurait plus aucune vignette dans les
      // listes publiques ni dans la file de modération admin.
      expect(prismaMock.listingPhoto.update).toHaveBeenCalledWith({
        where: { id: 'photo2' },
        data: { isCover: true },
      });
    });

    it('ne doit rien promouvoir si l annonce n a plus aucune photo', async () => {
      prismaMock.listingPhoto.findUnique.mockResolvedValue({
        id: 'photo1', listingId: 'list1', isCover: true, listing: { userId: '123' }
      } as any);
      prismaMock.listingPhoto.findFirst.mockResolvedValue(null as any);

      await listingsService.deletePhoto('list1', 'photo1', '123', UserRole.SELLER);
      expect(prismaMock.listingPhoto.update).not.toHaveBeenCalled();
    });
  });

  describe('pauseListing / resumeListing', () => {
    it('doit set PAUSED ou ACTIVE', async () => {
      prismaMock.listing.findUnique.mockResolvedValue({ id: 'list1', userId: '123' } as any);
      prismaMock.listing.update.mockResolvedValue({} as any);

      await listingsService.pauseListing('list1', '123', UserRole.SELLER);
      expect(prismaMock.listing.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: ListingStatus.PAUSED } }));

      await listingsService.resumeListing('list1', '123', UserRole.SELLER);
      expect(prismaMock.listing.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: ListingStatus.ACTIVE } }));
    });
  });
});
