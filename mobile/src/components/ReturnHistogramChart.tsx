import { BarChart } from 'react-native-gifted-charts';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useThemeColors } from '@/hooks/useThemeColors';

/** Polarity (loss vs gain) → diverging pair, split at the 0% baseline. */
export function ReturnHistogramChart({
  buckets,
}: {
  buckets: { label: string; value: number; isLoss: boolean }[];
}) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width, 600) - 64;

  if (buckets.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: colors.textMuted }}>No resolved backtest trades yet.</Text>
      </View>
    );
  }

  const data = buckets.map((b) => ({
    value: b.value,
    label: b.label,
    frontColor: b.isLoss ? colors.divergingNeg : colors.divergingPos,
    labelTextStyle: { color: colors.textMuted, fontSize: 9 },
  }));

  return (
    <View style={{ backgroundColor: 'transparent' }}>
      <BarChart
        data={data}
        width={chartWidth}
        height={150}
        barWidth={16}
        spacing={10}
        barBorderTopLeftRadius={3}
        barBorderTopRightRadius={3}
        hideRules
        hideYAxisText
        yAxisColor="transparent"
        xAxisColor={colors.baseline}
        xAxisThickness={1}
        isAnimated
        animationDuration={500}
      />
      <View style={styles.legend}>
        <LegendDot color={colors.divergingNeg} label="Loss" />
        <LegendDot color={colors.divergingPos} label="Gain" />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
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
