import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { adminDb } from '@/app/lib/firebaseAdmin';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // Runs once at sign-in — store isAdmin in the JWT so no per-page Firestore reads needed
    async jwt({ token, user }) {
      if (user && adminDb) {
        try {
          const usersSnap = await adminDb
            .collection('users')
            .where('email', '==', token.email)
            .limit(1)
            .get();

          if (!usersSnap.empty) {
            const linkedId = usersSnap.docs[0].data().linkedLegacyMemberId?.toString() ?? '';
            if (linkedId) {
              const memberDoc = await adminDb.collection('members').doc(linkedId).get();
              token.isAdmin = memberDoc.exists && memberDoc.data()?.account_type === 'admin';
            }
          }
        } catch {
          token.isAdmin = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).isAdmin = token.isAdmin ?? false;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };