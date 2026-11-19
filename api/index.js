import { createApp } from '../backend/app.js';

let appPromise;
export function resolveApiUrl(requestUrl) {
  const url = new URL(requestUrl, 'https://antam.local');
  const rewrittenPath = url.searchParams.get('__antam_path');
  if (['/api/index', '/api/index.js'].includes(url.pathname) && rewrittenPath) {
    const path = rewrittenPath.replace(/^\/+/, '');
    if (/^[A-Za-z0-9_./%-]+$/.test(path) && !path.split('/').includes('..'))
      url.pathname = `/api/${path}`;
  }
  url.searchParams.delete('__antam_path');
  return url.pathname + url.search;
}

export default async function handler(req, res) {
  appPromise ||= createApp({ hosted: true }).catch((error) => {
    appPromise = undefined;
    throw error;
  });
  let app;
  try {
    app = await appPromise;
  } catch (error) {
    console.error('An Tâm startup:', error.code || 'CONFIG');
    res.writeHead(503, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    return res.end(
      JSON.stringify({
        error:
          'Ứng dụng chưa sẵn sàng. Kiểm tra cấu hình PostgreSQL và Supabase Storage.',
      }),
    );
  }
  req.url = resolveApiUrl(req.url);
  return app(req, res);
}
