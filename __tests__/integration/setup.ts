import nodemailer from 'nodemailer';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
    verify: jest.fn().mockResolvedValue(true),
  }),
}));

jest.mock('../../src/services/storage.service', () => ({
  uploadAsset: jest.fn().mockResolvedValue({
    url: 'https://test-storage.com/asset.jpg',
    key: 'test-key',
  }),
  storage: {
    upload: jest.fn().mockResolvedValue({
      url: 'https://test-storage.com/asset.jpg',
      key: 'test-key',
    }),
  },
}));
