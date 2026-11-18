import { getBook } from '@selah/domain';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { BookOpen, HardDrive } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Body, Button, Card, Screen } from '@/components/ui';
import { getSetting } from '@/data/settings';
import { useAccount } from '@/lib/account';
import { API_CONFIGURED } from '@/lib/api';
import { fonts, useTheme } from '@/theme';

const greeting = (d: Date) => (d.getHours() < 12 ? 'Good morning' : d.getHours() < 18 ? 'Good afternoon' : 'Good evening');

/** Overview. The navy header, then where to carry on reading. */
export default function Overview() {
  const { c, size } = useTheme();
  const router = useRouter();
  const { status, user } = useAccount();
  const [last, setLast] = useState<{ book: string; chapter: number }>({ book: 'JHN', chapter: 1 });

  useFocusEffect(
    useCallback(() => {
      void getSetting('lastRead').then((v) => {
        const m = v ? /^([1-3]?[A-Z]{2,3})\.(\d+)$/.exec(v) : null;
        if (m && getBook(m[1]!)) setLast({ book: m[1]!, chapter: Number(m[2]) });
      });
    }, []),
  );

  const book = getBook(last.book);
  return (
    <Screen edges={[]} style={{ backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ backgroundColor: c.navy, paddingTop: 64, paddingBottom: 28, paddingHorizontal: 20 }}>
          <Text style={{ fontFamily: fonts.ui, color: '#b9bfcc', fontSize: size.base }}>{status === 'signedIn' && user ? `${greeting(new Date())}, ${user.name.split(' ')[0]}` : greeting(new Date())}</Text>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.display, color: '#fdfcf9', fontSize: 38, lineHeight: 42, marginTop: 4 }}>
            Study deeply.{'\n'}Prepare faithfully.
          </Text>
          <Text style={{ fontFamily: fonts.read, color: '#d6dae3', fontSize: 15, lineHeight: 24, marginTop: 14, fontStyle: 'italic' }}>
            For Ezra had prepared his heart to seek the law of the LORD, and to do it, and to teach in Israel statutes and judgments.
          </Text>
          <Text style={{ fontFamily: fonts.uiBold, color: c.gold, fontSize: size.sm, marginTop: 6 }}>Ezra 7:10, KJV</Text>
        </View>

        <View style={{ padding: 16, gap: 14 }}>
          <Card>
            <Text style={{ fontFamily: fonts.uiBold, fontSize: size.base, color: c.text }}>Continue reading</Text>
            <Text style={{ fontFamily: fonts.read, fontSize: 20, color: c.heading, marginTop: 6 }}>
              {book?.name} {last.chapter}
            </Text>
            <Button
              kind="primary"
              label="Resume reading"
              icon={<BookOpen size={17} color={c.accentText} />}
              style={{ marginTop: 14, alignSelf: 'flex-start' }}
              onPress={() => router.push({ pathname: '/bible/[book]/[chapter]', params: { book: last.book, chapter: String(last.chapter) } })}
            />
          </Card>

          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <HardDrive size={16} color={c.text3} />
              <Text style={{ fontFamily: fonts.uiBold, fontSize: size.base, color: c.text }}>On this device</Text>
            </View>
            <Body style={{ marginTop: 8 }}>The King James Version is saved here and opens without internet. Your highlights and bookmarks stay on this device.</Body>
          </Card>

          {status !== 'signedIn' && API_CONFIGURED && (
            <Card>
              <Text style={{ fontFamily: fonts.uiBold, fontSize: size.base, color: c.text }}>You are using SELAH as a guest</Text>
              <Body muted small style={{ marginTop: 6 }}>An account adds a backup and the same work on every device. Nothing you already use changes.</Body>
              <Link href="/create-account" style={{ marginTop: 12, fontFamily: fonts.uiBold, color: c.ref, fontSize: size.base }}>
                Back up your work
              </Link>
            </Card>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
