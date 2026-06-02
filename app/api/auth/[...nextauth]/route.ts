import NextAuth, { AuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: AuthOptions = {
  providers: [
    // 1. GitHub OAuth
    GithubProvider({
      clientId: process.env.GITHUB_ID || 'dummy_client_id',
      clientSecret: process.env.GITHUB_SECRET || 'dummy_client_secret',
    }),
    
    // 2. Sandbox Credentials Fallback (Ensures zero-setup local execution)
    CredentialsProvider({
      name: 'Sandbox Creator Portal',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'creator' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Safe, hardcoded sandbox demo user
        if (credentials?.username === 'creator' || credentials?.username === 'demo') {
          return {
            id: '1',
            name: 'Demo Creator',
            email: 'demo@contentdna.ai',
            image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/', // Gracefully redirect to homepage for seamless dashboard usage
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'f3fbca533b664d4da58a8a65f9cdcd31',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
