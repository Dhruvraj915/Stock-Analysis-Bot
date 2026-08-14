import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet } from 'react-native';

import { CategoryDot } from '@/components/CategoryDot';
import { StatusBadge } from '@/components/StatusBadge';
import { Text, View } from '@/components/Themed';
import {
  daysBetweenDates,
  formatDate,
  formatPct,
  formatPrice,
  HORIZON_SHORT_LABEL,
} from '@/lib/format';
import { LedgerEntry } from '@/lib/types';
import { isActive } from '@/lib/data';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

export function PickCard({ entry }: { entry: LedgerEntry }) {
  const colors = useThemeColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const latestReturn = entry.returnPct;
  const active = isActive(entry.status);

  // Target and stop percentages relative to entry reference
  const targetPct =
    entry.entryReference > 0
      ? ((entry.target - entry.entryReference) / entry.entryReference) * 100
      : null;
  const stopPct =
    entry.entryReference > 0
      ? ((entry.stopLoss - entry.entryReference) / entry.entryReference) * 100
      : null;

  // Days held calculation
  const daysHeld = daysBetweenDates(entry.date, entry.resolvedDate);
  const totalDays = entry.suggestedHoldingDays || 90;
  const progress = Math.min(1, Math.max(0, daysHeld / totalDays));
  const horizonText = entry.horizon
    ? HORIZON_SHORT_LABEL[entry.horizon]
    : `${entry.suggestedHoldingDays}d`;

  const currentPrice =
    entry.resolvedPrice ?? entry.lastCheckedPrice ?? entry.entryReference;

  return (
    <Pressable
      onPress={() =>
        navigation.navigate('StockDetail', { ticker: entry.ticker })
      }
    >
      {({ pressed }) => (
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          {/* Header Row: Company name & Ticker on left, Current Price & Return on right */}
          <View style={styles.headerRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.ticker} numberOfLines={1}>
                {entry.name}
              </Text>
              <Text style={[styles.symbol, { color: colors.textMuted }]}>
                {entry.ticker}
              </Text>
            </View>
            <View style={styles.returnBlock}>
              <Text style={[styles.currentPriceText, { color: colors.text }]}>
                {formatPrice(currentPrice)}
              </Text>
              <Text
                style={[
                  styles.returnValue,
                  {
                    color:
                      latestReturn == null
                        ? colors.textMuted
                        : latestReturn >= 0
                        ? colors.successText
                        : colors.critical,
                  },
                ]}
              >
                {formatPct(latestReturn)}
              </Text>
            </View>
          </View>

          {/* Subtitle / Meta row: Category Dot + Horizon tag + Status Badge */}
          <View style={styles.metaRow}>
            <View style={styles.categoryHorizonWrap}>
              <CategoryDot category={entry.category} />
              <Text
                style={[
                  styles.horizonPillText,
                  { color: colors.textSecondary },
                ]}
              >
                {horizonText} horizon
              </Text>
            </View>
            <StatusBadge status={entry.status} />
          </View>

          {/* Trade Levels: Entry, Target (+%), Stop (-%) in one clear line */}
          <View
            style={[
              styles.levelsRow,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.levelItem}>
              <Text style={[styles.levelLabel, { color: colors.textMuted }]}>
                Entry
              </Text>
              <Text style={[styles.levelValue, { color: colors.text }]}>
                {formatPrice(entry.entryReference)}
              </Text>
            </View>

            <View style={styles.levelDivider} />

            <View style={styles.levelItem}>
              <Text style={[styles.levelLabel, { color: colors.good }]}>
                Target {targetPct != null ? `(+${targetPct.toFixed(1)}%)` : ''}
              </Text>
              <Text style={[styles.levelValue, { color: colors.good }]}>
                {formatPrice(entry.target)}
              </Text>
            </View>

            <View style={styles.levelDivider} />

            <View style={styles.levelItem}>
              <Text style={[styles.levelLabel, { color: colors.critical }]}>
                Stop {stopPct != null ? `(${stopPct.toFixed(1)}%)` : ''}
              </Text>
              <Text style={[styles.levelValue, { color: colors.critical }]}>
                {formatPrice(entry.stopLoss)}
              </Text>
            </View>
          </View>

          {/* Progress bar for Active Open Picks */}
          {active && (
            <View style={styles.progressContainer}>
              <View style={styles.progressLabelRow}>
                <Text
                  style={[styles.progressText, { color: colors.textSecondary }]}
                >
                  {daysHeld} {daysHeld === 1 ? 'day' : 'days'} held
                </Text>
                <Text
                  style={[styles.progressText, { color: colors.textMuted }]}
                >
                  {Math.max(0, totalDays - daysHeld)}d remaining of {totalDays}d
                </Text>
              </View>
              <View
                style={[
                  styles.progressBarTrack,
                  { backgroundColor: colors.gridline },
                ]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.round(progress * 100)}%`,
                      backgroundColor:
                        progress > 0.85 ? colors.warning : colors.tint,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Footer info: Pick date & Composite score */}
          <View style={styles.footerRow}>
            <Text style={[styles.dateLine, { color: colors.textMuted }]}>
              Picked {formatDate(entry.date)} · Score{' '}
              <Text style={{ fontWeight: '600', color: colors.textSecondary }}>
                {entry.compositeScore.toFixed(1)}
              </Text>
            </Text>
            {entry.riskRewardRatio != null && entry.riskRewardRatio > 0 && (
              <Text style={[styles.rrTag, { color: colors.textSecondary }]}>
                R:R {entry.riskRewardRatio.toFixed(1)}:1
              </Text>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  titleBlock: {
    backgroundColor: 'transparent',
    flex: 1,
    marginRight: 8,
  },
  ticker: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  symbol: {
    fontSize: 12,
    marginTop: 2,
  },
  returnBlock: {
    backgroundColor: 'transparent',
    alignItems: 'flex-end',
  },
  currentPriceText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  returnValue: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  categoryHorizonWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  horizonPillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  levelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  levelItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
    gap: 2,
  },
  levelDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: 'rgba(150,150,150,0.25)',
  },
  levelLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  levelValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressContainer: {
    backgroundColor: 'transparent',
    gap: 4,
    marginTop: 2,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  progressText: {
    fontSize: 11,
  },
  progressBarTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginTop: 2,
  },
  dateLine: {
    fontSize: 11,
  },
  rrTag: {
    fontSize: 11,
    fontWeight: '600',
  },
});
