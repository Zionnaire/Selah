import { TRANSLATIONS } from '@selah/domain';
import { Link } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Body, Button, Card, Heading, Screen } from '@/components/ui';
import { useAccount } from '@/lib/account';
import { API_CONFIGURED } from '@/lib/api';
import { fonts, useTheme, type ThemePref } from '@/theme';

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'Match device' },
];

export default function SettingsScreen() {
  const { c, size, pref, setPref } = useTheme();
  const { status, user, signOut } = useAccount();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Heading style={{ marginTop: 8 }}>Settings</Heading>

        <Card>
          <Text style={{ fontFamily: fonts.uiBold, color: c.text, fontSize: size.base }}>Account</Text>
          {status === 'signedIn' && user ? (
            <View style={{ gap: 4, marginTop: 8 }}>
              <Text style={{ fontFamily: fonts.uiBold, color: c.text, fontSize: 17 }}>{user.name}</Text>
              <Body muted small>{user.email}{user.church ? `, ${user.church}` : ''}</Body>
              <Body muted small style={{ marginTop: 6 }}>Backup and sync arrive in a coming update. Until then your work is saved on this device only.</Body>
              <Button label="Sign out of this device" icon={<LogOut size={16} color={c.text} />} onPress={() => void signOut()} style={{ marginTop: 12, alignSelf: 'flex-start' }} />
              <Body muted small style={{ marginTop: 6 }}>Signing out never deletes work on this device.</Body>
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 8 }}>
              <Body muted small>You are using SELAH as a guest. Your work is saved on this device only. An account adds a backup and the same work on every device.</Body>
              {!API_CONFIGURED && <Body muted small>Accounts are not switched on in this version yet.</Body>}
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', display: API_CONFIGURED ? 'flex' : 'none' }}>
                <Link href="/create-account" asChild>
                  <Button kind="primary" label="Create account" onPress={() => undefined} />
                </Link>
                <Link href="/sign-in" asChild>
                  <Button label="Sign in" onPress={() => undefined} />
                </Link>
              </View>
            </View>
          )}
        </Card>

        <Card>
          <Text style={{ fontFamily: fonts.uiBold, color: c.text, fontSize: size.base }}>Appearance</Text>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', marginTop: 10, backgroundColor: c.surface2, borderRadius: 10, padding: 3 }}>
            {THEMES.map((t) => (
              <Pressable
                key={t.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: pref === t.id }}
                onPress={() => setPref(t.id)}
                style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: pref === t.id ? c.surface : 'transparent' }}
              >
                <Text style={{ fontFamily: pref === t.id ? fonts.uiBold : fonts.uiMedium, fontSize: size.sm, color: c.text }}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={{ fontFamily: fonts.uiBold, color: c.text, fontSize: size.base }}>Credits</Text>
          <View style={{ gap: 4, marginTop: 8 }}>
            {TRANSLATIONS.filter((t) => t.bundled).map((t) => (
              <Body key={t.id} muted small>{t.attribution}</Body>
            ))}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
