const DEV_HTTP = 'http://localhost:5001';
const DEV_WS = 'ws://localhost:5001';

const PROD_HTTP = 'https://gastly-extension-api.tools';
const PROD_WS = 'wss://gastly-extension-api.tools';

export const IS_DEV = import.meta.env.MODE === 'development';
export const API_HTTP_BASE = IS_DEV ? DEV_HTTP : PROD_HTTP;
export const API_WS_BASE = IS_DEV ? DEV_WS : PROD_WS;
