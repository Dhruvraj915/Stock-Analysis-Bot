import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';

import { CategoryBarChart } from '@/components/CategoryBarChart';
import { CategoryDot } from '@/components/CategoryDot';
import { ReturnHistogramChart } from '@/components/ReturnHistogramChart';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Text, View } from '@/components/Themed';
import {
  buildReturnHistogram,
  computeBacktestAggregate,
  computeBacktestByCategory,
  fetchBacktestTrades,
} from '@/lib/data';
import { CATEGORY_LABEL, formatDate, formatPct, formatPrice } from '@/lib/format';
import { BacktestTrade, CapCategory, CAP_CATEGORIES } from '@/lib/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function BacktestScreen() {
  const colors = useThemeColors();
  const loader = useCallback(fetchBacktestTrades, []);
  const { state, refreshing, refresh } = useAsyncData<BacktestTrade[]>(loader);
  const [category, setCategory] = useState<CapCategory | null>(null);

  const filtered = useMemo(() => {
    if (state.status !== 'ready') return [];
    return category ? state.data.filter((t) => t.category === category) : state.data;
  }, [state, category]);

  if (state.status === 'loading') return <LoadingState />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={refresh} />;

  const overall = computeBacktestAggregate(state.data);
  const byCategory = computeBacktestByCategory(state.data);
  const winRateByCategory: Record<CapCategory, number | null> = {
    largecap: byCategory.largecap.winRatePct,
    midcap: byCategory.midcap.winRatePct,
    smallcap: byCategory.smallcap.winRatePct,
  };
  const avgReturnByCategory: Record<CapCategory, number | null> = {
    largecap: byCategory.largecap.avgReturnPct,
    midcap: byCategory.midcap.avgReturnPct,
    smallcap: byCategory.smallcap.avgReturnPct,
  };
  const histogram = buildReturnHistogram(filtered);

  return (
    <FlatList
      data={filtered.slice().sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1))}
      keyExtractor={(item, i) => `${item.entryDate}:${item.ticker}:${i}`}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.tint} />}
      initialNumToRender={20}
      ListHeaderComponent={
        <>
          <Text style={styles.heading}>Backtest report</Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>
            ~2y replay, sampled weekly, no price lookahead — see README for method
          </Text>

          <View style={styles.statsGrid}>
            <StatCard label="Resolved trades" value={String(overall.n)} />
            <StatCard label="Win rate" value={formatPct(overall.winRatePct, 0)} deltaGood={(overall.winRatePct ?? 0) >= 50} />
            <StatCard label="Avg return" value={formatPct(overall.avgReturnPct)} deltaGood={(overall.avgReturnPct ?? 0) >= 0} />
            <StatCard label="Avg days to resolve" value={overall.avgDaysToResolution ? overall.avgDaysToResolution.toFixed(0) : '—'} />
          </View>

          <View style={[styles.section, { borderColor: colors.border }]}>
            <Text style={styles.sectionTitle}>Win rate by category</Text>
            <CategoryBarChart values={winRateByCategory} suffix="%" />
          </View>

          <View style={[styles.section, { borderColor: colors.border }]}>
            <Text style={styles.sectionTitle}>Avg return by category</Text>
            <CategoryBarChart values={avgReturnByCategory} suffix="%" />
          </View>

          <View style={[styles.section, { borderColor: colors.border }]}>
            <Text style={styles.sectionTitle}>Return distribution</Text>
            <ReturnHistogramChart buckets={histogram} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <FilterChip label="All categories" active={category === null} onPress={() => setCategory(null)} />
            {CAP_CATEGORIES.map((c) => (
              <FilterChip key={c} label={CATEGORY_LABEL[c]} active={category === c} onPress={() => setCategory(c)} />
            ))}
          </ScrollView>

          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>{filtered.length} trades</Text>
        </>
      }
      renderItem={({ item }) => <TradeRow trade={item} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={<EmptyState message="No trades match this filter." />}
    />
  );
}

function TradeRow({ trade }: { trade: BacktestTrade }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.tradeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.tradeHeader}>
        <Text style={styles.tradeTicker}>{trade.ticker}</Text>
        <Text style={[styles.tradeReturn, { color: trade.returnPct >= 0 ? colors.successText : colors.critical }]}>
          {formatPct(trade.returnPct)}
        </Text>
      </View>
      <View style={styles.tradeMeta}>
        <CategoryDot category={trade.category} />
        <StatusBadge status={trade.status} />
      </View>
      <Text style={[styles.tradeDates, { color: colors.textMuted }]}>
        {formatDate(trade.entryDate)} → {formatDate(trade.exitDate)} ({trade.daysToResolution}d) · entry{' '}
        {formatPrice(trade.entryPrice)} → exit {formatPrice(trade.exitPrice)}
      </Text>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress} style={styles.chipWrap}>
      <View
        style={[
          styles.chip,
          { backgroundColor: active ? colors.tint : colors.surface, borderColor: active ? colors.tint : colors.border },
        ]}
      >
        <Text style={[styles.chipLabel, { color: active ? '#fff' : colors.textSecondary }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  heading: { fontSize: 22, fontWeight: '700' },
  subheading: { fontSize: 13, marginTop: 2, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  section: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  filterRow: { marginBottom: 8 },
  chipWrap: { marginRight: 8 },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipLabel: { fontSize: 12, fontWeight: '600' },
  separator: { height: 10, backgroundColor: 'transparent' },
  tradeRow: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, gap: 8 },
  tradeHeader: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'transparent' },
  tradeTicker: { fontSize: 14, fontWeight: '600' },
  tradeReturn: { fontSize: 14, fontWeight: '700' },
  tradeMeta: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'transparent' },
  tradeDates: { fontSize: 11 },
});
