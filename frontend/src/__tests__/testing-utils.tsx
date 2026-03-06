import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import type { RootState } from '@/store';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function createTestStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: preloadedState as RootState | undefined,
  });
}

interface TestProvidersProps {
  children: React.ReactNode;
  preloadedState?: Partial<RootState>;
  queryClient?: QueryClient;
}

export function TestProviders({
  children,
  preloadedState,
  queryClient,
}: TestProvidersProps) {
  const testQueryClient = queryClient || createTestQueryClient();
  const store = createTestStore(preloadedState);

  return (
    <Provider store={store}>
      <QueryClientProvider client={testQueryClient}>
        {children}
      </QueryClientProvider>
    </Provider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>;
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  { preloadedState, queryClient, ...renderOptions }: CustomRenderOptions = {},
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders preloadedState={preloadedState} queryClient={queryClient}>
      {children}
    </TestProviders>
  );

  return {
    store: createTestStore(preloadedState),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// render を除外して re-export（renderWithProviders を render として使用するため）
export {
  screen,
  waitFor,
  fireEvent,
  within,
  act,
  cleanup,
  renderHook,
} from '@testing-library/react';
export { renderWithProviders as render };
