import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';

import { CategoryDot } from '@/components/CategoryDot';
import { LevelsChart } from '@/components/LevelsChart';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { StatusBadge } from '@/components/StatusBadge';
import { Text, View } from '@/components/Themed';
import { fetchLedger, isActive } from '@/lib/data';
import { formatDate, formatPct } from '@/lib/format';
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

  return (
    <>
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
            <Text style={styles.heading}>{name}</Text>
            <Text style={[styles.symbol, { color: colors.textMuted }]}>
              {ticker}
            </Text>
            <Text style={[styles.subheading, { color: colors.textSecondary }]}>
              {entries.length} pick{entries.length === 1 ? '' : 's'} logged
            </Text>
          </>
        }
        renderItem={({ item }) => <PickDetailCard entry={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState message="No ledger entries found for this ticker." />
        }
      />
    </>
  );
}

function PickDetailCard({ entry }: { entry: LedgerEntry }) {
  const colors = useThemeColors();
  const resolved = !isActive(entry.status);
  const currentPrice = entry.lastCheckedPrice ?? entry.resolvedPrice ?? null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardHeader}>
        <CategoryDot category={entry.category} />
        <StatusBadge status={entry.status} />
      </View>

      <LevelsChart
        stopLoss={entry.stopLoss}
        target={entry.target}
        entry={entry.entryReference}
        currentPrice={currentPrice}
        isResolved={resolved}
      />

      <View style={styles.footerRow}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Picked {formatDate(entry.date)} · score{' '}
          {entry.compositeScore.toFixed(1)} · {entry.suggestedHoldingDays}d
          horizon
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
  list: { padding: 16, gap: 12 },
  heading: { fontSize: 22, fontWeight: '700' },
  symbol: { fontSize: 13, marginTop: 2 },
  subheading: { fontSize: 13, marginTop: 6, marginBottom: 16 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  footerText: { fontSize: 11, flexShrink: 1 },
  footerReturn: { fontSize: 13, fontWeight: '700' },
  separator: { height: 10, backgroundColor: 'transparent' },
});
