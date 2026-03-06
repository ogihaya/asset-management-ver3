import '@testing-library/jest-dom';

// MSW サーバーのセットアップ
import { server } from './src/__mocks__/server';
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
