// Runs the API against a throwaway in-memory MongoDB replica set. Nothing is saved when it stops.
// Useful for trying sign in and sync locally without a database, and for end to end tests.
//
//   pnpm --filter @selah/api dev:memory
//
// Email is not sent: the reset link is printed in this terminal.
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
process.env.MONGODB_URI = rs.getUri('selah-dev');

await import('../src/server');

// DEV_AI_STUB=1 answers suggestions from a fixed reply, so the screens can be tried with no provider key and no cost.
if (process.env.DEV_AI_STUB === '1') {
  const { setProvider } = await import('../src/Services/ai');
  setProvider({
    complete: async () =>
      JSON.stringify({
        suggestions: [
          { heading: 'Blessing begins with where we walk', body: 'The psalm opens by describing the blessed person by what they refuse and what they delight in.', refs: [{ book: 'PSA', chapter: 1, verseStart: 1, verseEnd: 3 }, { book: 'JER', chapter: 17, verseStart: 7, verseEnd: 8 }, { book: 'XXX', chapter: 1, verseStart: 1, verseEnd: 1 }] },
          { heading: 'Rooted like a tree by the water', body: 'Fruit comes in its season because the roots are near the stream.', refs: [{ book: 'PSA', chapter: 1, verseStart: 3, verseEnd: 3 }] },
        ],
      }),
  });
  console.log('DEV_AI_STUB is on: suggestions come from a fixed reply.');
}

const stop = async () => {
  await rs.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
