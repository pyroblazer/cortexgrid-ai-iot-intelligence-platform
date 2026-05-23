export const mockPage = {
  setContent: jest.fn().mockResolvedValue(undefined),
  pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf')),
  close: jest.fn().mockResolvedValue(undefined),
};

export const mockBrowser = {
  connected: true,
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn().mockResolvedValue(undefined),
};

export default {
  launch: jest.fn().mockResolvedValue(mockBrowser),
};
