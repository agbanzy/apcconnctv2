import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours for offline persistence
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Create persister for offline cache storage
export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  hydrateOptions: {
    // Only persist GET queries (queries), not mutations
    shouldDehydrateQuery: (query) => {
      const queryState = query.state;
      return queryState.status === 'success';
    },
  },
});

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown
): Promise<T> {
  let response;
  
  switch (method.toUpperCase()) {
    case 'GET':
      response = await api.get(url);
      break;
    case 'POST':
      response = await api.post(url, data);
      break;
    case 'PUT':
      response = await api.put(url, data);
      break;
    case 'PATCH':
      response = await api.patch(url, data);
      break;
    case 'DELETE':
      response = await api.delete(url);
      break;
    default:
      throw new Error(`Unsupported method: ${method}`);
  }

  if (!response.success) {
    throw new Error(response.error || 'Request failed');
  }

  return response.data as T;
}
