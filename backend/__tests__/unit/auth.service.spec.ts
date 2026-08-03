import { UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as authService from '../../src/modules/auth/auth.service';
import { prismaMock } from '../singleton';
import * as emailService from '../../src/services/email.service';
import { AppError } from '../../src/utils/AppError';

jest.mock('bcrypt');
jest.mock('../../src/services/email.service');
jest.mock('../../src/utils/jwt', () => ({
  signAccessToken: jest.fn().mockReturnValue('mockedAccessToken'),
  generateRefreshToken: jest.fn().mockReturnValue({ token: 'mockedRefreshToken', hash: 'mockedHash' }),
  hashToken: jest.fn().mockReturnValue('mockedHash'),
  getRefreshTokenExpiry: jest.fn().mockReturnValue(new Date()),
  generateRandomToken: jest.fn().mockReturnValue('mockedRandomToken'),
}));

describe('Auth Service (Unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('doit bloquer si lemail ou le telephone existe', async () => {
      // Simulation d'un utilisateur existant
      prismaMock.user.findFirst.mockResolvedValue({ id: '1' } as any);

      await expect(
        authService.register({
          email: 'test@test.com',
          phone: '+229000000',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'BUYER',
        })
      ).rejects.toThrow(AppError);
      
      // On s'assure que le hash et la DB n'ont pas été appelés pour la création
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('doit creer un utilisateur BUYER avec status ACTIVE', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      
      const mockUser = {
        id: '123',
        email: 'test@test.com',
        phone: '+229000000',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        kycStatus: 'NONE',
        isEmailVerified: false,
      };

      prismaMock.user.create.mockResolvedValue(mockUser as any);
      (emailService.sendMail as jest.Mock).mockResolvedValue(true);

      const result = await authService.register({
        email: 'test@test.com',
        phone: '+229000000',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'BUYER',
      });

      expect(prismaMock.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: UserStatus.ACTIVE,
        }),
      }));
      expect(result.tokens.accessToken).toBe('mockedAccessToken');
      expect(emailService.sendMail).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('doit rejeter des identifiants invalides (utilisateur introuvable)', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      await expect(
        authService.login({ email: 'bad@test.com', password: 'bad' })
      ).rejects.toThrow(/Identifiants invalides/);
    });

    it('doit autoriser la connexion avec les bons logs', async () => {
      const mockUser = {
        id: '123',
        email: 'test@test.com',
        passwordHash: 'hashed',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
      };
      prismaMock.user.findFirst.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login({ email: 'test@test.com', password: 'pwd' });

      expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: '123' },
      }));
      expect(result.tokens.refreshToken).toBe('mockedRefreshToken');
    });
  });

  describe('refresh', () => {
    it('doit rejeter un token invalide ou expiré', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);
      await expect(authService.refresh('badToken')).rejects.toThrow(/invalide ou expiré/);
    });

    it('doit rejeter si l\'utilisateur est bloqué', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: '1',
        userId: '123',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 10000),
        revokedAt: null,
        user: { status: UserStatus.BLOCKED } as any,
      } as any);
      await expect(authService.refresh('goodToken')).rejects.toThrow(/compte est bloqué/);
    });

    it('doit effectuer une rotation des tokens correctement', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: '1',
        userId: '123',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 10000),
        revokedAt: null,
        user: { status: UserStatus.ACTIVE, role: UserRole.BUYER } as any,
      } as any);

      const result = await authService.refresh('goodToken');
      expect(prismaMock.refreshToken.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: '1' },
      }));
      expect(result.accessToken).toBe('mockedAccessToken');
      expect(result.refreshToken).toBe('mockedRefreshToken');
    });
  });

  describe('logout', () => {
    it('doit révoquer le token', async () => {
      await authService.logout('someToken');
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: 'mockedHash', revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
    });
  });

  describe('verifyEmail', () => {
    it('doit rejeter un jeton invalide', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      await expect(authService.verifyEmail('badToken')).rejects.toThrow(/invalide/);
    });

    it('doit mettre à jour isEmailVerified', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: '123' } as any);
      await authService.verifyEmail('goodToken');
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { isEmailVerified: true, emailVerificationToken: null },
      });
    });
  });

  describe('forgotPassword', () => {
    it('ne doit rien faire si l\'email n\'existe pas', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await authService.forgotPassword('unknown@test.com');
      expect(prismaMock.user.update).not.toHaveBeenCalled();
      expect(emailService.sendMail).not.toHaveBeenCalled();
    });

    it('doit générer un token et envoyer un email', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: '123', email: 'test@test.com', firstName: 'John' } as any);
      await authService.forgotPassword('test@test.com');
      expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: '123' },
        data: expect.objectContaining({ resetPasswordToken: 'mockedRandomToken' }),
      }));
      expect(emailService.sendMail).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('doit rejeter un token invalide ou expiré', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      await expect(authService.resetPassword('badToken', 'newPass')).rejects.toThrow(/invalide ou expiré/);
    });

    it('doit mettre à jour le mot de passe et invalider les sessions', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: '123' } as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPass');
      
      const transactionMock = prismaMock.$transaction as jest.Mock;
      transactionMock.mockResolvedValue([]);

      await authService.resetPassword('goodToken', 'newPass');

      expect(bcrypt.hash).toHaveBeenCalledWith('newPass', 12);
      expect(transactionMock).toHaveBeenCalledTimes(1);
    });
  });
});
