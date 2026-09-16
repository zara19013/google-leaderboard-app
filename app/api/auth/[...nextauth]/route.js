import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const ALLOWED_EMAILS = [
  'liran@incubatorlab.ai',
  'karen.hardwick@resilia.shop',
  'deric@resilia.shop',
  'deric@incubatorlab.ai',
  'ilanmussaffi@gmail.com',
  'ilan@incubatorlab.ai',
  'zaydpe@gmail.com',
  'zaydzayd@resilia.shop',
  'moises@incubatorlab.ai',
  'jsack010@gmail.com',
  'johnathan@resilia.shop',
  'karenhardwick@incubatorlab.ai',
  'zara@incubatorlab.ai',
  'farwa@incubatorlab.ai',
  'david@incubatorlab.ai',
  'will@resilia.shop',
  'kacie@resilia.shop',
  'ezra@incubatorlab.ai',
  'ezra@resilia.shop',
  'mia.leitch@resilia.shop',
  'lucas.correia@resilia.shop',
  'oliver.hybholt@resilia.shop',
  'marco.fernandez.delaorden@gmail.com',
  'abdullah.sakhi@resilia.shop',
];

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return ALLOWED_EMAILS.includes(user.email);
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error:  '/login',
  },
});

export { handler as GET, handler as POST };
