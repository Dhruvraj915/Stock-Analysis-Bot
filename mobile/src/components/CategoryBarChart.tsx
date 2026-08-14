import { BarChart } from 'react-native-gifted-charts';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { Text, View } from '@/components/Themed';
import { categoryColor } from '@/components/CategoryDot';
import { CATEGORY_LABEL } from '@/lib/format';
import { CapCategory, CAP_CATEGORIES } from '@/lib/types';
import { useThemeColors } from '@/hooks/useThemeColors';

/** Compare magnitude across the 3 fixed categories — categorical color,
 * identity is the point (large/mid/small are always slots 0/1/2). */
export function CategoryBarChart({
  values,
  suffix = '',
}: {
  values: Record<CapCategory, number | null>;
  suffix?: string;
}) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width, 600) - 64;

  const data = CAP_CATEGORIES.map((cat) => {
    const raw = values[cat];
    return {
      value: raw ?? 0,
      label: CATEGORY_LABEL[cat],
      frontColor: categoryColor(colors, cat),
      labelTextStyle: { color: colors.textMuted, fontSize: 11 },
      topLabelComponent: () => (
        <Text style={[styles.topLabel, { color: colors.textSecondary }]}>
          {raw == null ? 'n/a' : `${raw.toFixed(1)}${suffix}`}
        </Text>
      ),
    };
  });

  return (
    <View style={{ backgroundColor: 'transparent' }}>
      <BarChart
        data={data}
        width={chartWidth}
        height={140}
        barWidth={40}
        spacing={32}
        barBorderRadius={4}
        hideRules
        hideYAxisText
        yAxisColor="transparent"
        xAxisColor={colors.baseline}
        xAxisThickness={1}
        isAnimated
        animationDuration={500}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
});
