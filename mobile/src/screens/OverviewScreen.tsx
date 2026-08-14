import { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';

import { EquityCurveChart } from '@/components/EquityCurveChart';
import { PickCard } from '@/components/PickCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { StatCard } from '@/components/StatCard';
import { Text, View } from '@/components/Themed';
import {
  buildEquityCurve,
  computeLedgerStats,
  fetchLedger,
  isActive,
} from '@/lib/data';
import { formatPct } from '@/lib/format';
import { LedgerEntry } from '@/lib/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function OverviewScreen() {
  const colors = useThemeColors();
  const loader = useCallback(fetchLedger, []);
  const { state, refreshing, refresh } = useAsyncData<LedgerEntry[]>(loader);

  if (state.status === 'loading') return <LoadingState />;
  if (state.status === 'error')
    return <ErrorState message={state.message} onRetry={refresh} />;

  const entries = state.data;
  const stats = computeLedgerStats(entries);
  const openPicks = entries
    .filter(e => isActive(e.status))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const curve = buildEquityCurve(entries);

  return (
    <FlatList
      data={openPicks}
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
          <Text style={styles.heading}>NSE Positional Research</Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>
            Heuristic research picks — not financial advice.
          </Text>

          <View style={styles.statsGrid}>
            <StatCard label="Picks logged" value={String(stats.total)} />
            <StatCard
              label="Win rate (closed)"
              value={formatPct(stats.winRatePct, 0)}
              deltaGood={(stats.winRatePct ?? 0) >= 50}
            />
            <StatCard
              label="Avg return (closed)"
              value={formatPct(stats.avgReturnClosedPct)}
              deltaGood={(stats.avgReturnClosedPct ?? 0) >= 0}
            />
            <StatCard label="Open picks" value={String(stats.open)} />
          </View>

          <View style={[styles.section, { borderColor: colors.border }]}>
            <Text style={styles.sectionTitle}>Cumulative return</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
              Resolved picks, equal-weighted, in resolution order
            </Text>
            <EquityCurveChart points={curve} />
          </View>

          <Text style={styles.sectionTitle}>
            Currently open ({openPicks.length})
          </Text>
        </>
      }
      renderItem={({ item }) => <PickCard entry={item} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={<EmptyState message="No open picks right now." />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 12,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
  },
  subheading: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: -8,
    marginBottom: 10,
  },
  separator: {
    height: 10,
    backgroundColor: 'transparent',
  },
});
