import { BarChart } from 'react-native-gifted-charts';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { Text, View } from '@/components/Themed';
import { CATEGORY_LABEL } from '@/lib/format';
import { groupByCategory } from '@/lib/data';
import { CapCategory, CAP_CATEGORIES, LedgerEntry } from '@/lib/types';
import { useThemeColors } from '@/hooks/useThemeColors';

const LEGEND: { key: 'good' | 'critical' | 'warning' | 'neutral'; label: string }[] = [
  { key: 'good', label: 'Target hit' },
  { key: 'critical', label: 'Stop hit' },
  { key: 'warning', label: 'Expired' },
  { key: 'neutral', label: 'Open' },
];

/** Part-to-whole by category → stacked bar, status colors (state, not identity). */
export function StatusStackedBar({ entries }: { entries: LedgerEntry[] }) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width, 600) - 64;
  const grouped = groupByCategory(entries);

  const stackData = CAP_CATEGORIES.map((cat: CapCategory) => {
    const items = grouped[cat];
    const hitTarget = items.filter((e) => e.status === 'HIT_TARGET').length;
    const hitStop = items.filter((e) => e.status === 'HIT_STOPLOSS').length;
    const expired = items.filter((e) => e.status === 'EXPIRED_OPEN').length;
    const open = items.filter((e) => e.status === 'OPEN' || e.status === 'STILL_OPEN').length;
    return {
      label: CATEGORY_LABEL[cat],
      labelTextStyle: { color: colors.textMuted, fontSize: 11 },
      spacing: 2,
      stacks: [
        { value: hitTarget || 0.0001, color: hitTarget ? colors.good : 'transparent' },
        { value: hitStop || 0.0001, color: hitStop ? colors.critical : 'transparent' },
        { value: expired || 0.0001, color: expired ? colors.warning : 'transparent' },
        { value: open || 0.0001, color: open ? colors.neutral : 'transparent' },
      ],
    };
  });

  return (
    <View style={{ backgroundColor: 'transparent' }}>
      <BarChart
        stackData={stackData}
        width={chartWidth}
        height={140}
        barWidth={44}
        spacing={28}
        hideRules
        hideYAxisText
        yAxisColor="transparent"
        xAxisColor={colors.baseline}
        xAxisThickness={1}
        isAnimated
        animationDuration={500}
      />
      <View style={styles.legend}>
        {LEGEND.map((item) => (
          <View key={item.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors[item.key] }]} />
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  legendItem: {
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
  legendLabel: {
    fontSize: 12,
  },
});
