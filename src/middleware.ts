import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // For Firebase, we don't need server-side middleware for auth
  // Firebase handles authentication on the client side
  // This middleware can be used for other purposes like rate limiting, etc.
  
  const response = NextResponse.next({
    request,
  });

  // Add CORS headers if needed
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
