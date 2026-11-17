import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BibleReader } from '@/features/bible/BibleReader';
import { SearchResults } from '@/features/bible/SearchResults';
import { Reference } from '@/features/reference/Reference';
import { StudyHome } from '@/features/study/StudyHome';
import { WordDetail } from '@/features/words/WordDetail';
import { WordsVerse } from '@/features/words/WordsVerse';
import { StudyWorkspace } from '@/features/study/StudyWorkspace';
import { Overview } from '@/features/overview/Overview';
import { Landing } from '@/features/landing/Landing';
import { Privacy } from '@/features/legal/Privacy';
import { Terms } from '@/features/legal/Terms';
import { hasBeenWelcomed, isInstalledApp } from '@/features/landing/welcome';
import { Login } from '@/features/account/Login';
import { Register } from '@/features/account/Register';
import { ForgotPassword, ResetPassword } from '@/features/account/Recovery';
import { AllItems } from '@/features/library/AllItems';
import { DeletedView } from '@/features/library/DeletedView';
import { Library } from '@/features/library/Library';
import { NotesView } from '@/features/library/NotesView';
import { SermonExport } from '@/features/sermons/Export';
import { PulpitLive } from '@/features/pulpit/Live';
import { PulpitPrepare } from '@/features/pulpit/Prepare';
import { PulpitList } from '@/features/pulpit/PulpitList';
import { SermonEditor } from '@/features/sermons/Editor';
import { NewSermon } from '@/features/sermons/NewSermon';
import { Studio } from '@/features/sermons/Studio';
import { Settings } from '@/features/settings/Settings';
import { useAccount } from '@/store/account';
import { useApp } from '@/store/app';
import { useReader } from '@/store/reader';
import { Boot } from './Boot';
import { Shell } from './Shell';
import { SyncHost } from '@/features/sync/SyncHost';
import { SyncReview } from '@/features/sync/Review';

function BibleIndex() {
  const last = useReader((s) => s.last);
  return <Navigate to={`/bible/${last.book}/${last.chapter}`} replace />;
}

export function App() {
  const location = useLocation();
  const status = useAccount((s) => s.status);
  const phase = useApp((s) => s.phase);
  const boot = useApp((s) => s.boot);
  useEffect(() => {
    void boot();
    void useAccount.getState().init();
  }, [boot]);

  if (phase !== 'ready') return <Boot />;

  // A new visitor sees the front page once. Someone signed in, or using the installed app, goes straight in.
  if (location.pathname === '/' && status === 'guest' && !hasBeenWelcomed() && !isInstalledApp()) {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <>
    <SyncHost />
    <Routes>
      {/* Sign in and recovery have no rail either, they are not part of the work. */}
      <Route path="welcome" element={<Landing />} />
      <Route path="privacy" element={<Privacy />} />
      <Route path="terms" element={<Terms />} />
      <Route path="sign-in" element={<Login />} />
      <Route path="create-account" element={<Register />} />
      <Route path="forgot-password" element={<ForgotPassword />} />
      <Route path="reset-password" element={<ResetPassword />} />
      {/* Focused screens have no navigation rail: writing and preaching need the whole page. */}
      <Route path="sermons/:id" element={<SermonEditor />} />
      <Route path="sermons/:id/export" element={<SermonExport />} />
      <Route path="study/:id" element={<StudyWorkspace />} />
      <Route path="pulpit/:id/live" element={<PulpitLive />} />
      <Route element={<Shell />}>
        <Route index element={<Overview />} />
        <Route path="bible" element={<BibleIndex />} />
        <Route path="bible/:book/:chapter" element={<BibleReader />} />
        <Route path="search" element={<SearchResults />} />
        <Route path="study" element={<StudyHome />} />
        <Route path="reference" element={<Reference />} />
        <Route path="reference/:id" element={<Reference />} />
        <Route path="words/:book/:chapter/:verse" element={<WordsVerse />} />
        <Route path="word/:strong" element={<WordDetail />} />
        <Route path="sermons" element={<Studio />} />
        <Route path="sermons/new" element={<NewSermon />} />
        <Route path="pulpit" element={<PulpitList />} />
        <Route path="pulpit/:id" element={<PulpitPrepare />} />
        <Route path="library" element={<Library />}>
          <Route index element={<AllItems />} />
          <Route path="sermons" element={<AllItems only="sermon" />} />
          <Route path="studies" element={<AllItems only="study" />} />
          <Route path="notes" element={<NotesView />} />
          <Route path="notes/:id" element={<NotesView />} />
          <Route path="bookmarks" element={<AllItems only="bookmark" />} />
          <Route path="deleted" element={<DeletedView />} />
        </Route>
        <Route path="settings" element={<Settings />} />
        <Route path="sync/review/:kind/:id" element={<SyncReview />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </>
  );
}
