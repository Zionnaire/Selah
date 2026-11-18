import { TextInput, type TextInputProps } from 'react-native';
import { fonts, useTheme } from '@/theme';

/** A text field in the app's style. Labels sit above it, see Field in ui.tsx. */
export function TextBox(props: TextInputProps) {
  const { c, radius } = useTheme();
  return (
    <TextInput
      placeholderTextColor={c.text3}
      {...props}
      style={[
        { minHeight: 48, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surface, color: c.text, fontFamily: fonts.ui, fontSize: 16 },
        props.style,
      ]}
    />
  );
}
