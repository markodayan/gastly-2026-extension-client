// const DEV_HTTP = 'http://localhost:5001';
// const DEV_WS = 'ws://localhost:5001';

// const PROD_HTTP = 'https://gastly-extension-api.tools';
// const PROD_WS = 'wss://gastly-extension-api.tools';

// export const IS_DEV = import.meta.env.MODE === 'development';
// export const API_HTTP_BASE = IS_DEV ? DEV_HTTP : PROD_HTTP;
// export const API_WS_BASE = IS_DEV ? DEV_WS : PROD_WS;

// src/shared/env.ts
export const API_HTTP_BASE = import.meta.env.VITE_API_HTTP_BASE as string;
export const API_WS_BASE = import.meta.env.VITE_API_WS_BASE as string;

export const IS_DEV = import.meta.env.DEV;
export const IS_PROD = import.meta.env.PROD;
export const MODE = import.meta.env.MODE;
