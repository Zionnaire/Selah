import { registerSchema } from '@selah/domain';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Body, Button, Field, Heading, Screen } from '@/components/ui';
import { TextBox } from '@/components/TextBox';
import { useAccount } from '@/lib/account';
import { ApiError, describeError } from '@/lib/api';
import { fonts, useTheme } from '@/theme';

export default function CreateAccount() {
  const { c } = useTheme();
  const router = useRouter();
  const { register } = useAccount();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [church, setChurch] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setFailure('');
    const parsed = registerSchema.safeParse({ name, email, password, church: church.trim() || undefined });
    const next: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        next[key] ??=
          key === 'name' ? 'Tell us what to call you.'
          : key === 'email' ? 'Enter a full email address, for example name@example.org.'
          : key === 'password' ? 'Use at least 10 characters, with letters and a number.'
          : issue.message;
      }
    }
    if (!agreed) next.agreed = 'Please confirm you have read the Privacy notice and agree to the Terms.';
    setErrors(next);
    if (!parsed.success || next.agreed) return;
    setBusy(true);
    try {
      await register(parsed.data);
      router.back();
    } catch (err) {
      setFailure(err instanceof ApiError && err.status === 409 ? 'An account with this email already exists. Sign in instead.' : describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Heading>Create your account</Heading>
          <Body muted>It takes a minute. If you already have work on this device, it comes with you.</Body>
          {failure ? (
            <View accessibilityRole="alert" style={{ padding: 12, borderRadius: 8, backgroundColor: c.risk + '1f' }}>
              <Text style={{ fontFamily: fonts.ui, color: c.risk }}>{failure}</Text>
            </View>
          ) : null}
          <Field label="Your name" error={errors.name}>
            <TextBox value={name} onChangeText={setName} autoComplete="name" />
          </Field>
          <Field label="Email" error={errors.email}>
            <TextBox value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoCorrect={false} />
          </Field>
          <Field label="Password" error={errors.password}>
            <TextBox value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
          </Field>
          <Field label="Church or ministry (optional)">
            <TextBox value={church} onChangeText={setChurch} autoComplete="organization" />
          </Field>
          <View style={{ gap: 6 }}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} onPress={() => setAgreed(!agreed)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', minHeight: 44 }}>
              <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: c.borderStrong, backgroundColor: agreed ? c.accent : c.surface, alignItems: 'center', justifyContent: 'center' }}>
                {agreed ? <Text style={{ color: c.accentText, fontFamily: fonts.uiBold }}>✓</Text> : null}
              </View>
              <Body style={{ flex: 1 }}>I have read the Privacy notice and agree to the Terms.</Body>
            </Pressable>
            {errors.agreed ? <Text accessibilityRole="alert" style={{ fontFamily: fonts.ui, fontSize: 13, color: c.risk }}>{errors.agreed}</Text> : null}
          </View>
          <Button kind="primary" label="Create account" busy={busy} onPress={() => void submit()} />
          <Link href="/sign-in" replace style={{ fontFamily: fonts.uiBold, color: c.ref, fontSize: 15 }}>
            Already have an account? Sign in
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
