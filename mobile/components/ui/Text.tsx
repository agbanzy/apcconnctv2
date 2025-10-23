import { Text as RNText, StyleSheet, TextProps as RNTextProps, TextStyle } from 'react-native';

interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
  style?: TextStyle;
}

export function Text({ variant = 'body', style, ...props }: TextProps) {
  return <RNText style={[styles[variant], style]} {...props} />;
}

const styles = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  body: {
    fontSize: 16,
    color: '#374151',
  },
  caption: {
    fontSize: 14,
    color: '#6B7280',
  },
});
