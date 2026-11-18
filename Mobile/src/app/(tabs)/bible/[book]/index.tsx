import { getBook } from '@selah/domain';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { fonts, useTheme } from '@/theme';

/** The chapters of one book as a grid of large touch targets. */
export default function Chapters() {
  const { book: id } = useLocalSearchParams<{ book: string }>();
  const { c } = useTheme();
  const router = useRouter();
  const book = getBook(String(id));
  if (!book) return <Text style={{ padding: 20, color: c.text, fontFamily: fonts.ui }}>That book was not found.</Text>;
  const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: book.name }} />
      <FlatList
        data={chapters}
        keyExtractor={(n) => String(n)}
        numColumns={5}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        columnWrapperStyle={{ gap: 10 }}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${book.name} chapter ${item}`}
            onPress={() => router.push({ pathname: '/bible/[book]/[chapter]', params: { book: book.id, chapter: String(item) } })}
            style={({ pressed }) => ({ flex: 1, aspectRatio: 1, maxWidth: '20%', alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: pressed ? c.surfaceHover : c.surface })}
          >
            <Text style={{ fontFamily: fonts.uiBold, fontSize: 16, color: c.text }}>{item}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
