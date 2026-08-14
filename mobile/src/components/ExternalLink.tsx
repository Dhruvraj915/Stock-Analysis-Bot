import type { ReactNode } from 'react';
import { Linking, Pressable, StyleProp, ViewStyle } from 'react-native';

export function ExternalLink({
  href,
  style,
  children,
}: {
  href: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <Pressable onPress={() => Linking.openURL(href)} style={style}>
      {children}
    </Pressable>
  );
}
