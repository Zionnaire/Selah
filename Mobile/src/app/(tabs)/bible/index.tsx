import { BOOKS } from '@selah/domain';
import { useRouter } from 'expo-router';
import { SectionList, Pressable, Text } from 'react-native';
import { fonts, useTheme } from '@/theme';

const SECTIONS = [
  { title: 'Old Testament', data: BOOKS.filter((b) => b.testament === 'OT') },
  { title: 'New Testament', data: BOOKS.filter((b) => b.testament === 'NT') },
];

/** Every book, in canonical order. */
export default function BookList() {
  const { c, size } = useTheme();
  const router = useRouter();
  return (
    <SectionList
      sections={SECTIONS}
      keyExtractor={(b) => b.id}
      contentContainerStyle={{ paddingBottom: 24 }}
      renderSectionHeader={({ section }) => (
        <Text style={{ fontFamily: fonts.uiBold, fontSize: size.sm, color: c.text3, backgroundColor: c.bg, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {section.title}
        </Text>
      )}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${item.chapters} chapters`}
          onPress={() => router.push({ pathname: '/bible/[book]', params: { book: item.id } })}
          style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 20, justifyContent: 'center', backgroundColor: pressed ? c.surfaceHover : 'transparent', borderBottomWidth: 1, borderBottomColor: c.border })}
        >
          <Text style={{ fontFamily: fonts.read, fontSize: 17, color: c.text }}>{item.name}</Text>
        </Pressable>
      )}
    />
  );
}
