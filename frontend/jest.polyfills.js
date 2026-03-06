// Polyfills required for MSW v2 and undici
// This file is loaded via setupFiles (before test environment is set up)

const { TextEncoder, TextDecoder } = require('util');
const { ReadableStream, TransformStream, WritableStream } = require('stream/web');

Object.defineProperty(globalThis, 'TextEncoder', {
  value: TextEncoder,
  writable: true,
});

Object.defineProperty(globalThis, 'TextDecoder', {
  value: TextDecoder,
  writable: true,
});

Object.defineProperty(globalThis, 'ReadableStream', {
  value: ReadableStream,
  writable: true,
});

Object.defineProperty(globalThis, 'TransformStream', {
  value: TransformStream,
  writable: true,
});

Object.defineProperty(globalThis, 'WritableStream', {
  value: WritableStream,
  writable: true,
});

// Fetch API polyfills from undici
const { fetch, Headers, Request, Response, FormData } = require('undici');

Object.defineProperty(globalThis, 'fetch', {
  value: fetch,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'Headers', {
  value: Headers,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'Request', {
  value: Request,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'Response', {
  value: Response,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'FormData', {
  value: FormData,
  writable: true,
  configurable: true,
});

// BroadcastChannel polyfill
class BroadcastChannelPolyfill {
  constructor() {}
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}

Object.defineProperty(globalThis, 'BroadcastChannel', {
  value: BroadcastChannelPolyfill,
  writable: true,
});
