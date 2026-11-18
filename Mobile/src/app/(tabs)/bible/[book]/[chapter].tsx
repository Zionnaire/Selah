import { TRANSLATIONS, formatVerseRanges, getBook } from '@selah/domain';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Bookmark, ChevronLeft, ChevronRight, Highlighter, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chapter as loadChapter, verseId, type Verse } from '@/data/bible';
import { markedInChapter, setMarks } from '@/data/marks';
import { setSetting } from '@/data/settings';
import { fonts, useTheme } from '@/theme';

const TRANSLATION = TRANSLATIONS.find((t) => t.id === 'kjv')!;

/**
 * The reader. Text comes from the database on the device. Tap a verse to select it, then highlight or
 * bookmark. Marks are keyed by the canonical verse id, such as ROM.12.2, the same as on the web.
 */
export default function Reader() {
  const { book: bookId, chapter: chapterParam } = useLocalSearchParams<{ book: string; chapter: string }>();
  const book = getBook(String(bookId));
  const chapterNo = Number(chapterParam);
  const { c, size } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [verses, setVerses] = useState<Verse[] | null>(null);
  const [highlights, setHighlights] = useState<Set<string>>(new Set());
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const refreshMarks = useCallback(async () => {
    if (!book) return;
    const [h, b] = await Promise.all([markedInChapter('highlight', book.id, chapterNo), markedInChapter('bookmark', book.id, chapterNo)]);
    setHighlights(h);
    setBookmarks(b);
  }, [book, chapterNo]);

  useEffect(() => {
    if (!book) return;
    setVerses(null);
    setSelected(new Set());
    void loadChapter(TRANSLATION.id, book.id, chapterNo).then(setVerses);
    void refreshMarks();
    void setSetting('lastRead', `${book.id}.${chapterNo}`);
  }, [book, chapterNo, refreshMarks]);

  const ids = useMemo(() => [...selected].sort((a, b) => a - b).map((v) => verseId(book?.id ?? '', chapterNo, v)), [selected, book, chapterNo]);

  if (!book || !Number.isInteger(chapterNo) || chapterNo < 1 || chapterNo > book.chapters) {
    return <Text style={{ padding: 20, color: c.text, fontFamily: fonts.ui }}>That chapter was not found.</Text>;
  }

  const toggle = (v: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });

  // If every selected verse already has the mark, the button takes it off. Otherwise it puts it on.
  const mark = async (kind: 'highlight' | 'bookmark') => {
    const set = kind === 'highlight' ? highlights : bookmarks;
    await setMarks(kind, ids, !ids.every((i) => set.has(i)));
    await refreshMarks();
    setSelected(new Set());
  };

  const go = (n: number) => router.replace({ pathname: '/bible/[book]/[chapter]', params: { book: book.id, chapter: String(n) } });
  const title = `${book.name} ${chapterNo}`;
  const label = formatVerseRanges([...selected]);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title }} />
      <FlatList
        data={verses ?? []}
        keyExtractor={(v) => String(v.verse)}
        contentContainerStyle={{ padding: 20, paddingBottom: selected.size ? 120 : 28 }}
        ListEmptyComponent={
          verses === null ? <Text style={{ fontFamily: fonts.ui, color: c.text3 }}>Loading</Text> : <Text style={{ fontFamily: fonts.ui, color: c.text3 }}>This chapter has no text in this translation.</Text>
        }
        renderItem={({ item }) => {
          const id = verseId(book.id, chapterNo, item.verse);
          const isSel = selected.has(item.verse);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              accessibilityLabel={`Verse ${item.verse}. ${item.text}`}
              onPress={() => toggle(item.verse)}
              style={{
                paddingVertical: 6,
                paddingLeft: 12,
                paddingRight: 8,
                marginBottom: 2,
                borderLeftWidth: 3,
                borderLeftColor: highlights.has(id) || isSel ? c.verseEdge : 'transparent',
                backgroundColor: isSel ? c.verseSelect : highlights.has(id) ? c.verseBg : 'transparent',
                borderRadius: 4,
              }}
            >
              <Text style={{ fontFamily: fonts.read, fontSize: 18, lineHeight: 30, color: c.text }}>
                <Text style={{ fontFamily: fonts.uiBold, fontSize: 11, color: c.ref }}>{item.verse} </Text>
                {item.text}
                {bookmarks.has(id) ? <Text style={{ color: c.ref }}> ●</Text> : null}
              </Text>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View style={{ marginTop: 20, gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous chapter" disabled={chapterNo <= 1} onPress={() => go(chapterNo - 1)} style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 4, opacity: chapterNo <= 1 ? 0.3 : 1 }}>
                <ChevronLeft size={18} color={c.text} />
                <Text style={{ fontFamily: fonts.uiBold, color: c.text }}>Previous</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Next chapter" disabled={chapterNo >= book.chapters} onPress={() => go(chapterNo + 1)} style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 4, opacity: chapterNo >= book.chapters ? 0.3 : 1 }}>
                <Text style={{ fontFamily: fonts.uiBold, color: c.text }}>Next</Text>
                <ChevronRight size={18} color={c.text} />
              </Pressable>
            </View>
            {/* Every reader screen carries the translation's attribution. */}
            <Text style={{ fontFamily: fonts.ui, fontSize: size.xs, color: c.text3 }}>{TRANSLATION.attribution}</Text>
          </View>
        }
      />

      {selected.size > 0 && (
        <View
          accessibilityRole="toolbar"
          style={{ position: 'absolute', left: 12, right: 12, bottom: 12 + insets.bottom, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderStrong, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 }}
        >
          <Text style={{ flex: 1, fontFamily: fonts.uiBold, color: c.ref, fontSize: size.sm }}>{`${book.name} ${chapterNo}:${label}`}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Highlight" onPress={() => void mark('highlight')} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Highlighter size={20} color={c.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Bookmark" onPress={() => void mark('bookmark')} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Bookmark size={20} color={c.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Clear selection" onPress={() => setSelected(new Set())} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} color={c.text3} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
