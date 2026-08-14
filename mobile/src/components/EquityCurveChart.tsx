import { LineChart } from 'react-native-gifted-charts';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useThemeColors } from '@/hooks/useThemeColors';

/** Single series → sequential blue, no legend box needed (title names it). */
export function EquityCurveChart({ points }: { points: { label: string; value: number }[] }) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width, 600) - 64;

  if (points.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: colors.textMuted }}>Not enough resolved picks yet for a curve.</Text>
      </View>
    );
  }

  const last = points[points.length - 1].value;

  return (
    <View style={{ backgroundColor: 'transparent' }}>
      <LineChart
        data={points.map((p) => ({ value: p.value }))}
        width={chartWidth}
        height={160}
        thickness={2}
        color={colors.tint}
        curved
        hideDataPoints
        areaChart
        startFillColor={colors.tint}
        startOpacity={0.12}
        endFillColor={colors.tint}
        endOpacity={0.01}
        hideRules
        hideYAxisText
        xAxisColor={colors.baseline}
        yAxisColor="transparent"
        xAxisThickness={1}
        initialSpacing={0}
        endSpacing={0}
        isAnimated
        animationDuration={600}
      />
      <Text style={[styles.endLabel, { color: last >= 0 ? colors.successText : colors.critical }]}>
        {last >= 0 ? '+' : ''}
        {last.toFixed(1)}% cumulative
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  endLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
});
