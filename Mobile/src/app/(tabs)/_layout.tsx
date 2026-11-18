import { BookOpen, House, Settings } from 'lucide-react-native';
import { Tabs } from 'expo-router';
import { fonts, useTheme } from '@/theme';

/** The bottom tab bar, as on the web app's phone layout. More tabs arrive as each part is built. */
export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent === c.navy ? c.navy : c.gold,
        tabBarInactiveTintColor: c.text3,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        tabBarLabelStyle: { fontFamily: fonts.uiMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <House color={color} size={size} strokeWidth={1.7} /> }} />
      <Tabs.Screen name="bible" options={{ title: 'Bible', tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} strokeWidth={1.7} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Settings color={color} size={size} strokeWidth={1.7} /> }} />
    </Tabs>
  );
}
