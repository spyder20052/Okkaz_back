import {
  listListingsQuerySchema,
  createListingSchema,
} from '../../src/modules/listings/listings.validator';

/**
 * Filtres de recherche d'annonces — bornes de prix.
 *
 * Cas de test terrain n°1 : saisir un prix négatif dans « prix minimum » /
 * « prix maximum » ne doit jamais produire un filtre valide.
 */
describe('listListingsQuerySchema (Unit)', () => {
  it('doit accepter une fourchette de prix valide', () => {
    const res = listListingsQuerySchema.safeParse({ minPrice: '1000', maxPrice: '5000' });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.minPrice).toBe(1000);
      expect(res.data.maxPrice).toBe(5000);
      expect(res.data.sort).toBe('recent');
    }
  });

  it('doit refuser un prix minimum négatif', () => {
    const res = listListingsQuerySchema.safeParse({ minPrice: '-1' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toBe('Le prix minimum ne peut pas être négatif.');
    }
  });

  it('doit refuser un prix maximum négatif', () => {
    const res = listListingsQuerySchema.safeParse({ maxPrice: '-5000' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toBe('Le prix maximum ne peut pas être négatif.');
    }
  });

  it('doit signaler les deux bornes négatives à la fois', () => {
    const res = listListingsQuerySchema.safeParse({ minPrice: '-10', maxPrice: '-20' });
    expect(res.success).toBe(false);
    if (!res.success) {
      const messages = res.error.issues.map((issue) => issue.message);
      expect(messages).toContain('Le prix minimum ne peut pas être négatif.');
      expect(messages).toContain('Le prix maximum ne peut pas être négatif.');
    }
  });

  it('doit refuser une valeur de prix non numérique', () => {
    const res = listListingsQuerySchema.safeParse({ minPrice: 'gratuit' });
    expect(res.success).toBe(false);
  });

  it('doit refuser une fourchette inversée (min > max)', () => {
    const res = listListingsQuerySchema.safeParse({ minPrice: '9000', maxPrice: '1000' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toBe(
        'Le prix minimum ne peut pas dépasser le prix maximum.',
      );
    }
  });

  it('doit accepter une fourchette dégénérée mais cohérente (min = max)', () => {
    const res = listListingsQuerySchema.safeParse({ minPrice: '2500', maxPrice: '2500' });
    expect(res.success).toBe(true);
  });

  it('doit accepter 0 comme borne', () => {
    const res = listListingsQuerySchema.safeParse({ minPrice: '0', maxPrice: '0' });
    expect(res.success).toBe(true);
  });

  it('doit accepter une requête sans aucun filtre de prix', () => {
    const res = listListingsQuerySchema.safeParse({ city: 'Cotonou' });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.minPrice).toBeUndefined();
      expect(res.data.maxPrice).toBeUndefined();
    }
  });
});

describe('createListingSchema (Unit)', () => {
  const valid = {
    title: 'Berline confortable',
    description: 'Une berline en très bon état, disponible immédiatement.',
    categoryId: '11111111-1111-4111-8111-111111111111',
    rentalPrice: '15000',
    rentalPeriod: 'DAY',
    condition: 'GOOD',
    locationCity: 'Cotonou',
    contactPhone: '+22997000000',
  };

  it('doit accepter une annonce valide', () => {
    expect(createListingSchema.safeParse(valid).success).toBe(true);
  });

  it('doit refuser un prix de location négatif', () => {
    expect(createListingSchema.safeParse({ ...valid, rentalPrice: '-15000' }).success).toBe(false);
  });

  it('doit refuser un prix de location nul', () => {
    expect(createListingSchema.safeParse({ ...valid, rentalPrice: '0' }).success).toBe(false);
  });

  it('doit refuser un prix d achat négatif', () => {
    expect(createListingSchema.safeParse({ ...valid, purchasePrice: '-1' }).success).toBe(false);
  });
});
