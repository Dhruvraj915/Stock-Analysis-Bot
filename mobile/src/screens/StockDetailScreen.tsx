import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';

import { CategoryDot } from '@/components/CategoryDot';
import { LevelsChart } from '@/components/LevelsChart';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { StatusBadge } from '@/components/StatusBadge';
import { Text, View } from '@/components/Themed';
import { fetchLedger, isActive } from '@/lib/data';
import {
  CATEGORY_LABEL,
  daysBetweenDates,
  formatDate,
  formatPct,
  formatPrice,
  HORIZON_LABEL,
  STATUS_LABEL,
} from '@/lib/format';
import { LedgerEntry } from '@/lib/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StockDetail'>;

export default function StockDetailScreen({ route, navigation }: Props) {
  const { ticker } = route.params;
  const colors = useThemeColors();
  const loader = useCallback(fetchLedger, []);
  const { state, refreshing, refresh } = useAsyncData<LedgerEntry[]>(loader);

  const entries =
    state.status === 'ready'
      ? state.data
          .filter(e => e.ticker === ticker)
          .sort((a, b) => (a.date < b.date ? 1 : -1))
      : [];
  const name = entries[0]?.name ?? ticker;

  useEffect(() => {
    navigation.setOptions({ title: name });
  }, [navigation, name]);

  if (state.status === 'loading') return <LoadingState />;
  if (state.status === 'error')
    return <ErrorState message={state.message} onRetry={refresh} />;

  const latestEntry = entries[0];

  return (
    <FlatList
      data={entries}
      keyExtractor={item => item.id}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.tint}
        />
      }
      ListHeaderComponent={
        <>
          <View style={styles.headerBlock}>
            <Text style={styles.heading}>{name}</Text>
            <Text style={[styles.symbol, { color: colors.textMuted }]}>
              {ticker} · {latestEntry ? CATEGORY_LABEL[latestEntry.category] : ''}
            </Text>
          </View>

          {/* Centered Return Highlights */}
          {latestEntry && latestEntry.returnPct != null && (
            <View style={[styles.returnBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.returnLabel, { color: colors.textMuted }]}>
                {isActive(latestEntry.status) ? 'Current Unrealized Return' : 'Resolved Return'}
              </Text>
              <Text
                style={[
                  styles.returnBigValue,
                  {
                    color:
                      latestEntry.returnPct >= 0
                        ? colors.successText
                        : colors.critical,
                  },
                ]}
              >
                {formatPct(latestEntry.returnPct)}
              </Text>
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 8, marginBottom: 8 }]}>
            Trade History ({entries.length})
          </Text>
        </>
      }
      renderItem={({ item, index }) => (
        <PickDetailCard entry={item} isLatest={index === 0} />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <EmptyState message="No ledger entries found for this ticker." />
      }
    />
  );
}

function PickDetailCard({
  entry,
  isLatest,
}: {
  entry: LedgerEntry;
  isLatest: boolean;
}) {
  const colors = useThemeColors();
  const resolved = !isActive(entry.status);
  const currentPrice = entry.lastCheckedPrice ?? entry.resolvedPrice ?? null;
  const daysHeld = daysBetweenDates(entry.date, entry.resolvedDate);
  const horizonLabel = entry.horizon
    ? HORIZON_LABEL[entry.horizon]
    : `${entry.suggestedHoldingDays} Days`;

  const targetPct =
    entry.entryReference > 0
      ? ((entry.target - entry.entryReference) / entry.entryReference) * 100
      : null;
  const stopPct =
    entry.entryReference > 0
      ? ((entry.stopLoss - entry.entryReference) / entry.entryReference) * 100
      : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isLatest ? colors.tint : colors.border,
          borderWidth: isLatest ? 1.5 : 1,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <CategoryDot category={entry.category} />
          <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
            {formatDate(entry.date)}
          </Text>
        </View>
        <StatusBadge status={entry.status} />
      </View>

      {/* 4-Box Key Stats Grid */}
      <View style={[styles.detailGrid, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.detailBox}>
          <Text style={[styles.detailBoxLabel, { color: colors.textMuted }]}>Score</Text>
          <Text style={[styles.detailBoxValue, { color: colors.text }]}>
            {entry.compositeScore.toFixed(1)}
          </Text>
        </View>

        <View style={styles.detailBox}>
          <Text style={[styles.detailBoxLabel, { color: colors.textMuted }]}>Horizon</Text>
          <Text style={[styles.detailBoxValue, { color: colors.text }]}>
            {horizonLabel}
          </Text>
        </View>

        <View style={styles.detailBox}>
          <Text style={[styles.detailBoxLabel, { color: colors.textMuted }]}>Days Held</Text>
          <Text style={[styles.detailBoxValue, { color: colors.text }]}>
            {daysHeld}d / {entry.suggestedHoldingDays}d
          </Text>
        </View>

        <View style={styles.detailBox}>
          <Text style={[styles.detailBoxLabel, { color: colors.textMuted }]}>Status</Text>
          <Text style={[styles.detailBoxValue, { color: colors.text }]}>
            {STATUS_LABEL[entry.status]}
          </Text>
        </View>
      </View>

      {/* Levels Visualization Chart */}
      <LevelsChart
        stopLoss={entry.stopLoss}
        target={entry.target}
        entry={entry.entryReference}
        currentPrice={currentPrice}
        isResolved={resolved}
      />

      {/* Numerical Levels Breakdown */}
      <View style={styles.levelsRow}>
        <Text style={[styles.levelText, { color: colors.critical }]}>
          Stop: {formatPrice(entry.stopLoss)} {stopPct != null ? `(${stopPct.toFixed(1)}%)` : ''}
        </Text>
        <Text style={[styles.levelText, { color: colors.textSecondary }]}>
          Entry: {formatPrice(entry.entryReference)}
        </Text>
        <Text style={[styles.levelText, { color: colors.good }]}>
          Target: {formatPrice(entry.target)} {targetPct != null ? `(+${targetPct.toFixed(1)}%)` : ''}
        </Text>
      </View>

      {/* Footer Return */}
      <View style={[styles.footerRow, { borderTopColor: colors.gridline }]}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          {entry.resolvedDate ? `Resolved ${formatDate(entry.resolvedDate)}` : 'Position Active'}
        </Text>
        <Text
          style={[
            styles.footerReturn,
            {
              color:
                (entry.returnPct ?? 0) >= 0
                  ? colors.successText
                  : colors.critical,
            },
          ]}
        >
          {formatPct(entry.returnPct)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 14 },
  headerBlock: {
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  heading: { fontSize: 24, fontWeight: '800' },
  symbol: { fontSize: 13, marginTop: 2 },
  returnBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  returnLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  returnBigValue: {
    fontSize: 32,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  card: {
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  cardDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
  },
  detailBox: {
    width: '50%',
    padding: 6,
    backgroundColor: 'transparent',
    gap: 2,
  },
  detailBoxLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailBoxValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  levelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  footerText: { fontSize: 11 },
  footerReturn: { fontSize: 15, fontWeight: '800' },
  separator: { height: 12, backgroundColor: 'transparent' },
});

