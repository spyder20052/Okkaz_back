import { prismaMock } from '../singleton';
import * as categoriesService from '../../src/modules/categories/categories.service';

describe('Categories Service (Unit)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listActive', () => {
    it('doit lister toutes les catégories actives avec leurs sous-catégories', async () => {
      prismaMock.category.findMany.mockResolvedValue([
        { id: '1', name: 'Cat1' } as any
      ]);

      const res = await categoriesService.listActive();
      expect(res).toHaveLength(1);
      expect(prismaMock.category.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { isActive: true, parentId: null }
      }));
    });
  });

  describe('getBySlug', () => {
    it('doit rejeter si on ne trouve pas de catégorie', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);
      await expect(categoriesService.getBySlug('non-exist')).rejects.toThrow(/introuvable/);
    });

    it('doit retourner la catégorie avec son compteur dannonces', async () => {
      prismaMock.category.findUnique.mockResolvedValue({ id: 'cat1' } as any);
      prismaMock.listing.count.mockResolvedValue(5);

      const res = await categoriesService.getBySlug('cat1-slug');
      expect(res.id).toBe('cat1');
      expect(res.activeListingsCount).toBe(5);
    });
  });

  describe('create', () => {
    it('doit rejeter si le parent nexiste pas', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);
      await expect(categoriesService.create({ name: 'Sub', slug: 'sub', parentId: 'bad-id' })).rejects.toThrow(/parente introuvable/);
    });

    it('doit creer une categorie valide', async () => {
      const mockPayload = { name: 'Cat1', slug: 'cat1' };
      prismaMock.category.create.mockResolvedValue(mockPayload as any);

      const res = await categoriesService.create(mockPayload);
      expect(res.name).toBe('Cat1');
    });
  });

  describe('update', () => {
    it('doit rejeter si on modifie une catégorie introuvable', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);
      await expect(categoriesService.update('123', {})).rejects.toThrow(/introuvable/);
    });

    it('doit interdire à une catégorie d etre son propre parent', async () => {
      prismaMock.category.findUnique.mockResolvedValue({ id: '123' } as any);
      await expect(categoriesService.update('123', { parentId: '123' })).rejects.toThrow(/son propre parent/);
    });

    it('doit mettre à jour la catégorie', async () => {
      prismaMock.category.findUnique.mockResolvedValue({ id: '123' } as any);
      prismaMock.category.update.mockResolvedValue({ id: '123', name: 'NewName' } as any);

      const res = await categoriesService.update('123', { name: 'NewName' });
      expect(res.name).toBe('NewName');
    });
  });

  describe('deactivate', () => {
    it('doit desactiver la categorie au lieu de la supprimer', async () => {
      prismaMock.category.findUnique.mockResolvedValue({ id: '123' } as any);
      prismaMock.category.update.mockResolvedValue({ id: '123', isActive: false } as any);

      const res = await categoriesService.deactivate('123');
      expect(res.isActive).toBe(false);
    });
  });
});
