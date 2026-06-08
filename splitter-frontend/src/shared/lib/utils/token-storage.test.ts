import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveToken, getToken, removeToken } from './token-storage';
import { Platform } from 'react-native';

// Suppress console logs during testing
const originalLog = console.log;
const originalError = console.error;
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});
afterAll(() => {
  console.log = originalLog;
  console.error = originalError;
});

describe('token-storage utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('When SecureStore is available (Mobile)', () => {
    beforeAll(() => {
      Platform.OS = 'ios';
      (SecureStore as any).isAvailableAsync = jest.fn().mockResolvedValue(true);
    });

    it('should save token to SecureStore', async () => {
      await saveToken('test-token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'test-token');
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should retrieve token from SecureStore', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-token-get');
      const token = await getToken();
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_token');
      expect(token).toBe('test-token-get');
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it('should delete token from SecureStore', async () => {
      await removeToken();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('When SecureStore is NOT available (Web / Fallback)', () => {
    beforeAll(() => {
      Platform.OS = 'web';
      delete (SecureStore as any).isAvailableAsync;
    });

    it('should save token to AsyncStorage', async () => {
      await saveToken('test-token-async');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token-async');
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should retrieve token from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('async-token');
      const token = await getToken();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('auth_token');
      expect(token).toBe('async-token');
      expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    });

    it('should delete token from AsyncStorage', async () => {
      await removeToken();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    });
  });
});
