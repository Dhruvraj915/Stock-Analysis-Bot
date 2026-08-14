import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';

import { PickCard } from '@/components/PickCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { StatusStackedBar } from '@/components/StatusStackedBar';
import { Text, View } from '@/components/Themed';
import { fetchLedger } from '@/lib/data';
import { CATEGORY_LABEL, HORIZON_LABEL, STATUS_LABEL } from '@/lib/format';
import {
  CapCategory,
  CAP_CATEGORIES,
  HoldingHorizon,
  HOLDING_HORIZONS,
  LedgerEntry,
  PickStatus,
} from '@/lib/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useThemeColors } from '@/hooks/useThemeColors';

const STATUS_FILTERS: PickStatus[] = [
  'OPEN',
  'STILL_OPEN',
  'HIT_TARGET',
  'HIT_STOPLOSS',
  'EXPIRED_OPEN',
];

export default function LedgerScreen() {
  const colors = useThemeColors();
  const loader = useCallback(fetchLedger, []);
  const { state, refreshing, refresh } = useAsyncData<LedgerEntry[]>(loader);
  const [horizon, setHorizon] = useState<HoldingHorizon | null>(null);
  const [category, setCategory] = useState<CapCategory | null>(null);
  const [status, setStatus] = useState<PickStatus | null>(null);

  const filtered = useMemo(() => {
    if (state.status !== 'ready') return [];
    return state.data
      .filter(e => (horizon ? (e.horizon ?? 'positional') === horizon : true))
      .filter(e => (category ? e.category === category : true))
      .filter(e => (status ? e.status === status : true))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [state, horizon, category, status]);

  if (state.status === 'loading') return <LoadingState />;
  if (state.status === 'error')
    return <ErrorState message={state.message} onRetry={refresh} />;

  return (
    <FlatList
      data={filtered}
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
          <Text style={styles.heading}>Full Trade Ledger</Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>
            {state.data.length} historical picks across all strategies and time horizons
          </Text>

          <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={styles.sectionTitle}>Outcomes by Category</Text>
            <StatusStackedBar entries={state.data} />
          </View>

          {/* Horizon Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
          >
            <FilterChip
              label="All Horizons"
              active={horizon === null}
              onPress={() => setHorizon(null)}
            />
            {HOLDING_HORIZONS.map(h => (
              <FilterChip
                key={h}
                label={HORIZON_LABEL[h]}
                active={horizon === h}
                onPress={() => setHorizon(h)}
              />
            ))}
          </ScrollView>

          {/* Category Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
          >
            <FilterChip
              label="All Categories"
              active={category === null}
              onPress={() => setCategory(null)}
            />
            {CAP_CATEGORIES.map(c => (
              <FilterChip
                key={c}
                label={CATEGORY_LABEL[c]}
                active={category === c}
                onPress={() => setCategory(c)}
              />
            ))}
          </ScrollView>

          {/* Status Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
          >
            <FilterChip
              label="All Statuses"
              active={status === null}
              onPress={() => setStatus(null)}
            />
            {STATUS_FILTERS.map(s => (
              <FilterChip
                key={s}
                label={STATUS_LABEL[s]}
                active={status === s}
                onPress={() => setStatus(s)}
              />
            ))}
          </ScrollView>

          <Text style={[styles.sectionTitle, { marginTop: 10, marginBottom: 4 }]}>
            Showing {filtered.length} {filtered.length === 1 ? 'Pick' : 'Picks'}
          </Text>
        </>
      }
      renderItem={({ item }) => <PickCard entry={item} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <EmptyState message="No picks match these filters." />
      }
    />
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress} style={styles.chipWrap}>
      <View
        style={[
          styles.chip,
          {
            backgroundColor: active ? colors.tint : colors.surface,
            borderColor: active ? colors.tint : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.chipLabel,
            { color: active ? '#fff' : colors.textSecondary },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
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
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterRow: {
    marginBottom: 8,
  },
  chipWrap: {
    marginRight: 8,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 10,
    backgroundColor: 'transparent',
  },
});
