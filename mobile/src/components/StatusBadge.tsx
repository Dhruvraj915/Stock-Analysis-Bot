import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { STATUS_LABEL } from '@/lib/format';
import { PickStatus } from '@/lib/types';
import { useThemeColors } from '@/hooks/useThemeColors';

/** Status never rides on color alone — a dot + a label together. */
export function StatusBadge({ status }: { status: PickStatus }) {
  const colors = useThemeColors();
  const color =
    status === 'HIT_TARGET'
      ? colors.good
      : status === 'HIT_STOPLOSS'
        ? colors.critical
        : status === 'EXPIRED_OPEN'
          ? colors.warning
          : colors.neutral;

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color: colors.textSecondary }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

export function statusColor(colors: ReturnType<typeof useThemeColors>, status: PickStatus | 'HIT_TARGET' | 'HIT_STOPLOSS' | 'EXPIRED_OPEN') {
  if (status === 'HIT_TARGET') return colors.good;
  if (status === 'HIT_STOPLOSS') return colors.critical;
  if (status === 'EXPIRED_OPEN') return colors.warning;
  return colors.neutral;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});
