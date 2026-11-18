import { CormorantGaramond_600SemiBold, useFonts as useCormorant } from '@expo-google-fonts/cormorant-garamond';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Literata_400Regular, Literata_600SemiBold } from '@expo-google-fonts/literata';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccountProvider } from '@/lib/account';
import { BootProvider, useBoot } from '@/lib/boot';
import { ThemeProvider, fonts, useTheme } from '@/theme';

/** What shows while the database opens and, once, the King James Version is prepared. */
function Splash({ label, progress, error }: { label: string; progress: number; error?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0b1f44', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 44, letterSpacing: 8, color: '#fbf8ef' }}>SELAH</Text>
      <Text style={{ fontFamily: fonts.ui, marginTop: 18, fontSize: 15, color: '#c9ceda', textAlign: 'center' }}>
        {error ? `SELAH could not open your library. ${error}` : label}
      </Text>
      {!error && (
        <View style={{ marginTop: 14, width: 200, height: 4, borderRadius: 2, backgroundColor: '#27406b' }}>
          <View style={{ width: `${Math.max(3, progress * 100)}%`, height: 4, borderRadius: 2, backgroundColor: '#d4af37' }} />
        </View>
      )}
    </View>
  );
}

function Shell() {
  const { phase, label, progress, error } = useBoot();
  const { c, mode } = useTheme();
  if (phase !== 'ready') return <Splash label={label} progress={progress} error={error} />;
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
        <Stack.Screen name="create-account" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useCormorant({
    CormorantGaramond_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Literata_400Regular,
    Literata_600SemiBold,
  });
  // Until the fonts are ready, show the plain navy start screen. Nothing reads a font before this.
  if (!loaded) return <View style={{ flex: 1, backgroundColor: '#0b1f44' }} />;
  return (
    <SafeAreaProvider>
      <BootProvider>
        <ThemeProvider>
          <AccountProvider>
            <Shell />
          </AccountProvider>
        </ThemeProvider>
      </BootProvider>
    </SafeAreaProvider>
  );
}
