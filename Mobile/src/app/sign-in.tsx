import { loginSchema } from '@selah/domain';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Body, Button, Field, Heading, Screen } from '@/components/ui';
import { TextBox } from '@/components/TextBox';
import { useAccount } from '@/lib/account';
import { describeError } from '@/lib/api';
import { fonts, useTheme } from '@/theme';

export default function SignIn() {
  const { c } = useTheme();
  const router = useRouter();
  const { signIn } = useAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setFailure('');
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setFailure('Enter your email and password.');
    setBusy(true);
    try {
      await signIn(parsed.data);
      router.back();
    } catch (err) {
      setFailure(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Heading>Sign in</Heading>
          <Body muted>Welcome back. Pick up where you left off.</Body>
          {failure ? (
            <View accessibilityRole="alert" style={{ padding: 12, borderRadius: 8, backgroundColor: c.risk + '1f' }}>
              <Text style={{ fontFamily: fonts.ui, color: c.risk }}>{failure}</Text>
            </View>
          ) : null}
          <Field label="Email">
            <TextBox value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoCorrect={false} />
          </Field>
          <Field label="Password">
            <TextBox value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={() => void submit()} />
          </Field>
          <Button kind="primary" label="Sign in" busy={busy} onPress={() => void submit()} />
          <Button kind="quiet" label="Continue without an account" onPress={() => router.back()} />
          <Body muted small>Everything works on this device. Create an account later and nothing is lost.</Body>
          <Link href="/create-account" replace style={{ fontFamily: fonts.uiBold, color: c.ref, fontSize: 15 }}>
            New to SELAH? Create an account
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
