import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, useTheme } from '@/theme';

/** A screen with the app background that respects the notch and the home bar. */
export function Screen({ children, edges = ['top'], style }: { children: ReactNode; edges?: ('top' | 'bottom')[]; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        { flex: 1, backgroundColor: c.bg, paddingTop: edges.includes('top') ? insets.top : 0, paddingBottom: edges.includes('bottom') ? insets.bottom : 0 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Heading({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return <Text accessibilityRole="header" style={[{ fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: c.heading }, style]}>{children}</Text>;
}

export function Body({ children, muted, small, style }: { children: ReactNode; muted?: boolean; small?: boolean; style?: StyleProp<TextStyle> }) {
  const { c, size } = useTheme();
  return (
    <Text style={[{ fontFamily: fonts.ui, fontSize: small ? size.sm : size.base, lineHeight: small ? 19 : 22, color: muted ? c.text3 : c.text2 }, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c, radius } = useTheme();
  return (
    <View style={[{ backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.lg, padding: 16 }, style]}>
      {children}
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'plain' | 'quiet';
  busy?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** At least 44 points tall, the smallest comfortable touch target. */
export function Button({ label, onPress, kind = 'plain', busy, disabled, icon, style }: ButtonProps) {
  const { c, radius } = useTheme();
  const primary = kind === 'primary';
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 46,
          paddingHorizontal: 16,
          borderRadius: radius.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: primary ? c.accent : kind === 'quiet' ? 'transparent' : c.surface,
          borderWidth: primary || kind === 'quiet' ? 0 : 1,
          borderColor: c.borderStrong,
          opacity: off ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={primary ? c.accentText : c.text} /> : icon}
      <Text style={{ fontFamily: fonts.uiBold, fontSize: 15, color: primary ? c.accentText : c.text }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.uiBold, fontSize: 13, color: c.text }}>{label}</Text>
      {children}
      {error ? <Text accessibilityRole="alert" style={{ fontFamily: fonts.ui, fontSize: 13, color: c.risk }}>{error}</Text> : null}
    </View>
  );
}
