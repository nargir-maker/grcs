import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals, and static/metadata files.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
