import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useThemeColors } from '@/hooks/useThemeColors';

/** Stat tile: label + value (+ optional delta colored by direction). */
export function StatCard({
  label,
  value,
  deltaGood,
}: {
  label: string;
  value: string;
  deltaGood?: boolean;
}) {
  const colors = useThemeColors();
  const valueColor =
    deltaGood === undefined ? colors.text : deltaGood ? colors.successText : colors.critical;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  value: {
    fontSize: 22,
    fontWeight: '600',
  },
});
