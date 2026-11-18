import { Stack } from 'expo-router';
import { Text } from 'react-native';
import { fonts, useTheme } from '@/theme';

/** The Bible tab is its own stack: books, then chapters, then the reader. */
export default function BibleLayout() {
  const { c } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.heading,
        // Titles carry chapter numbers, and the display face draws the digit 1 like a small capital I. The native
        // header does not apply a custom font to its title, so the title is drawn here, in the reading face.
        headerTitle: ({ children }) => <Text style={{ fontFamily: fonts.readBold, fontSize: 18, color: c.heading }}>{children}</Text>,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Bible' }} />
      <Stack.Screen name="[book]/index" options={{ title: 'Chapters' }} />
      <Stack.Screen name="[book]/[chapter]" options={{ title: '' }} />
    </Stack>
  );
}
