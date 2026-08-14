import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useThemeColors } from '@/hooks/useThemeColors';

export function LoadingState() {
  const colors = useThemeColors();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.tint} />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const colors = useThemeColors();
  return (
    <View style={styles.center}>
      <Text style={[styles.errorTitle, { color: colors.critical }]}>Couldn&apos;t load data</Text>
      <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{message}</Text>
      <Pressable
        onPress={onRetry}
        style={[styles.retryButton, { backgroundColor: colors.tint }]}
      >
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.center}>
      <Text style={{ color: colors.textMuted }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});
