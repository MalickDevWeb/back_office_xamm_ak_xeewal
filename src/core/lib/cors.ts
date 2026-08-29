export const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:4200,http://localhost:3000,http://localhost:3001,https://jammakxeewal.vercel.app,https://www.jammakxeewal.sn',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function handleCors(request: Request, allowedOrigin?: string) {
  const origin = request.headers.get('origin') || '*';
  
  // Check if origin is allowed
  const allowed = corsHeaders['Access-Control-Allow-Origin'].split(',');
  const isAllowed = allowed.includes('*') || allowed.includes(origin);
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': corsHeaders['Access-Control-Allow-Methods'],
    'Access-Control-Allow-Headers': corsHeaders['Access-Control-Allow-Headers'],
    'Access-Control-Allow-Credentials': corsHeaders['Access-Control-Allow-Credentials'],
  };
  
  if (isAllowed) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else {
    headers['Access-Control-Allow-Origin'] = allowed[0];
  }
  
  return headers;
}

export function corsResponse(data: any, status = 200, origin?: string, request?: Request) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': corsHeaders['Access-Control-Allow-Methods'],
    'Access-Control-Allow-Headers': corsHeaders['Access-Control-Allow-Headers'],
    'Access-Control-Allow-Credentials': corsHeaders['Access-Control-Allow-Credentials'],
  };
  
  if (request) {
    const origin = request.headers.get('origin') || '*';
    const allowed = corsHeaders['Access-Control-Allow-Origin'].split(',');
    if (allowed.includes('*') || allowed.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
    } else {
      headers['Access-Control-Allow-Origin'] = allowed[0];
    }
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  
  return { data, status, headers };
}
