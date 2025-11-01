export const Asset = {
  fromModule: jest.fn(() => ({
    downloadAsync: jest.fn(() => Promise.resolve()),
  })),
  loadAsync: jest.fn(() => Promise.resolve()),
};
