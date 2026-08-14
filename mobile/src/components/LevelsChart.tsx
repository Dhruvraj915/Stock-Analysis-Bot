import Svg, { Circle, Line } from 'react-native-svg';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { Text, View } from '@/components/Themed';
import { formatPrice } from '@/lib/format';
import { useThemeColors } from '@/hooks/useThemeColors';

const TRACK_HEIGHT = 56;
const H_PADDING = 28;

/**
 * No OHLC history is persisted for picks (see mobile/AGENTS context), so this
 * substitutes a "how far did it get toward target vs stop" range mark: a
 * track from stop-loss to target, with entry and current/resolved price
 * plotted on it. Status colors carry meaning (never color alone — every
 * marker is paired with a direct label).
 */
export function LevelsChart({
  stopLoss,
  target,
  entry,
  currentPrice,
  isResolved,
}: {
  stopLoss: number;
  target: number;
  entry: number;
  currentPrice: number | null;
  isResolved: boolean;
}) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width, 600) - 64;
  const trackWidth = chartWidth - H_PADDING * 2;

  const domainMin = Math.min(stopLoss, entry, currentPrice ?? entry);
  const domainMax = Math.max(target, entry, currentPrice ?? entry);
  const span = domainMax - domainMin || 1;
  const x = (v: number) => H_PADDING + ((v - domainMin) / span) * trackWidth;

  const y = TRACK_HEIGHT / 2;
  const currentColor =
    currentPrice == null
      ? colors.neutral
      : currentPrice >= entry
        ? colors.successText
        : colors.critical;

  return (
    <View style={{ backgroundColor: 'transparent' }}>
      <Svg width={chartWidth} height={TRACK_HEIGHT}>
        <Line x1={H_PADDING} y1={y} x2={chartWidth - H_PADDING} y2={y} stroke={colors.gridline} strokeWidth={1} />
        <Line x1={x(stopLoss)} y1={y} x2={x(target)} y2={y} stroke={colors.baseline} strokeWidth={2} strokeLinecap="round" />

        {/* Entry tick */}
        <Line x1={x(entry)} y1={y - 8} x2={x(entry)} y2={y + 8} stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" />

        {/* Stop-loss marker */}
        <Circle cx={x(stopLoss)} cy={y} r={6} fill={colors.critical} stroke={colors.surface} strokeWidth={2} />
        {/* Target marker */}
        <Circle cx={x(target)} cy={y} r={6} fill={colors.good} stroke={colors.surface} strokeWidth={2} />

        {/* Current / resolved price marker */}
        {currentPrice != null && (
          <Circle cx={x(currentPrice)} cy={y} r={5} fill={currentColor} stroke={colors.surface} strokeWidth={2} />
        )}
      </Svg>

      <View style={styles.labelRow}>
        <LevelLabel label="Stop" value={formatPrice(stopLoss)} color={colors.critical} />
        <LevelLabel label="Entry" value={formatPrice(entry)} color={colors.textSecondary} />
        <LevelLabel
          label={isResolved ? 'Resolved' : 'Current'}
          value={currentPrice != null ? formatPrice(currentPrice) : '—'}
          color={currentColor}
        />
        <LevelLabel label="Target" value={formatPrice(target)} color={colors.good} />
      </View>
    </View>
  );
}

function LevelLabel({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.levelLabel}>
      <Text style={[styles.labelText, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.valueText, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  levelLabel: {
    backgroundColor: 'transparent',
    gap: 2,
    minWidth: 70,
  },
  labelText: {
    fontSize: 11,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
