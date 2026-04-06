import { createServerClient, type CookieMethods } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = Parameters<CookieMethods['setAll']>[0][number];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas — login não precisa de autenticação
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Verifica sessão
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verifica se é admin ativo
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, role, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!adminUser) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL('/login?error=unauthorized', request.url)
    );
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login).*)'],
};