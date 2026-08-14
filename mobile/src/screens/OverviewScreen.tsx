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
import { StatCard } from '@/components/StatCard';
import { Text, View } from '@/components/Themed';
import {
  computeLedgerStats,
  fetchLedger,
  getTopRecommendedPicks,
  isActive,
} from '@/lib/data';
import { daysBetweenDates, formatPct, HORIZON_LABEL } from '@/lib/format';
import { HoldingHorizon, HOLDING_HORIZONS, LedgerEntry } from '@/lib/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function OverviewScreen() {
  const colors = useThemeColors();
  const loader = useCallback(fetchLedger, []);
  const { state, refreshing, refresh } = useAsyncData<LedgerEntry[]>(loader);
  const [horizonFilter, setHorizonFilter] = useState<HoldingHorizon | null>(
    null,
  );

  // Filter entries by selected horizon (or all)
  const entries = useMemo(() => {
    if (state.status !== 'ready') return [];
    if (!horizonFilter) return state.data;
    return state.data.filter(
      e => (e.horizon ?? 'positional') === horizonFilter,
    );
  }, [state, horizonFilter]);

  const stats = useMemo(() => computeLedgerStats(entries), [entries]);

  // Open picks
  const openPicks = useMemo(() => {
    return entries
      .filter(e => isActive(e.status))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [entries]);

  // Top recommended picks of the day (scored by entry proximity, freshness, score, R:R)
  const topPicks = useMemo(
    () => getTopRecommendedPicks(openPicks),
    [openPicks],
  );

  // Picks nearing suggested horizon expiry (within 7 days or past)
  const reviewSoonPicks = useMemo(() => {
    return openPicks.filter(e => {
      const daysHeld = daysBetweenDates(e.date);
      const total = e.suggestedHoldingDays || 90;
      return daysHeld >= total - 7;
    });
  }, [openPicks]);

  if (state.status === 'loading') return <LoadingState />;
  if (state.status === 'error')
    return <ErrorState message={state.message} onRetry={refresh} />;

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
          <Text style={styles.heading}>Stock Research & Picks</Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>
            Rule-based algorithmic strategies across multiple holding horizons.
          </Text>

          {/* Horizon Selection Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizonScroll}
            contentContainerStyle={styles.horizonScrollContent}
          >
            <HorizonChip
              label="All Horizons"
              active={horizonFilter === null}
              onPress={() => setHorizonFilter(null)}
            />
            {HOLDING_HORIZONS.map(h => (
              <HorizonChip
                key={h}
                label={HORIZON_LABEL[h]}
                active={horizonFilter === h}
                onPress={() => setHorizonFilter(h)}
              />
            ))}
          </ScrollView>

          {/* Top Key Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              label="Win Rate"
              value={formatPct(stats.winRatePct, 0)}
              deltaGood={(stats.winRatePct ?? 0) >= 50}
            />
            <StatCard
              label="Avg Return"
              value={formatPct(stats.avgReturnClosedPct)}
              deltaGood={(stats.avgReturnClosedPct ?? 0) >= 0}
            />
            <StatCard label="Open Picks" value={String(stats.open)} />
            <StatCard label="Total Logged" value={String(stats.total)} />
          </View>

          {/* ⭐ Most Recommended Stock of Day */}
          {topPicks.length > 0 && <TopPicksSection picks={topPicks} />}

          {reviewSoonPicks.length > 0 && (
            <View
              style={[
                styles.reviewSection,
                {
                  borderColor: colors.warning,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <View style={styles.reviewHeaderRow}>
                <Text style={[styles.reviewTitle, { color: colors.warning }]}>
                  ⚠️ Review Soon ({reviewSoonPicks.length})
                </Text>
                <Text
                  style={[styles.reviewSubtitle, { color: colors.textMuted }]}
                >
                  Nearing holding horizon
                </Text>
              </View>
              {reviewSoonPicks.map(item => (
                <PickCard key={`review-${item.id}`} entry={item} />
              ))}
            </View>
          )}

          <Text
            style={[styles.sectionTitle, { marginTop: 4, marginBottom: 8 }]}
          >
            Currently Open ({openPicks.length})
          </Text>
        </>
      }
      renderItem={({ item }) => <PickCard entry={item} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <EmptyState message="No open picks for this horizon." />
      }
    />
  );
}

function TopPicksSection({
  picks,
}: {
  picks: Array<
    Parameters<typeof import('@/lib/data').getTopRecommendedPicks>[0][0] & {
      recommendationScore: number;
    }
  >;
}) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.topPicksSection,
        { borderColor: '#f5a623', backgroundColor: colors.surface },
      ]}
    >
      {/* Header */}
      <View style={styles.topPicksHeader}>
        <Text style={styles.topPicksTitle}>⭐ Most Recommended Today</Text>
        <Text style={[styles.topPicksSubtitle, { color: colors.textMuted }]}>
          Best setup based on price, freshness & score
        </Text>
      </View>

      {/* Criteria legend */}
      <View
        style={[
          styles.criteriaRow,
          { borderColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <View style={styles.criteriaItem}>
          <Text style={[styles.criteriaIcon]}>📍</Text>
          <Text style={[styles.criteriaLabel, { color: colors.textMuted }]}>
            Near entry
          </Text>
        </View>
        <View style={styles.criteriaItem}>
          <Text style={styles.criteriaIcon}>🆕</Text>
          <Text style={[styles.criteriaLabel, { color: colors.textMuted }]}>
            Fresh pick
          </Text>
        </View>
        <View style={styles.criteriaItem}>
          <Text style={styles.criteriaIcon}>📊</Text>
          <Text style={[styles.criteriaLabel, { color: colors.textMuted }]}>
            High score
          </Text>
        </View>
        <View style={styles.criteriaItem}>
          <Text style={styles.criteriaIcon}>⚖️</Text>
          <Text style={[styles.criteriaLabel, { color: colors.textMuted }]}>
            Good R:R
          </Text>
        </View>
      </View>

      {/* Pick cards with score badge */}
      {picks.map((pick, idx) => (
        <View key={pick.id} style={styles.topPickWrap}>
          {idx === 0 && (
            <View style={[styles.rankBadge, { backgroundColor: '#f5a623' }]}>
              <Text style={styles.rankBadgeText}>🥇 Best Pick</Text>
            </View>
          )}
          {idx === 1 && (
            <View style={[styles.rankBadge, { backgroundColor: colors.tint }]}>
              <Text style={styles.rankBadgeText}>🥈 Runner Up</Text>
            </View>
          )}
          <View style={[styles.scorePillRow]}>
            <Text
              style={[
                styles.scorePill,
                { color: '#f5a623', borderColor: '#f5a623' },
              ]}
            >
              Match score: {pick.recommendationScore}/100
            </Text>
          </View>
          <PickCard entry={pick} />
        </View>
      ))}
    </View>
  );
}

function HorizonChip({
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
    <Pressable onPress={onPress}>
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
            { color: active ? '#ffffff' : colors.textSecondary },
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
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subheading: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  horizonScroll: {
    marginBottom: 16,
  },
  horizonScrollContent: {
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  section: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  topPicksSection: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    gap: 12,
  },
  topPicksHeader: {
    backgroundColor: 'transparent',
    gap: 2,
  },
  topPicksTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#f5a623',
  },
  topPicksSubtitle: {
    fontSize: 12,
  },
  criteriaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  criteriaItem: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    gap: 2,
  },
  criteriaIcon: {
    fontSize: 14,
  },
  criteriaLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  topPickWrap: {
    backgroundColor: 'transparent',
    gap: 6,
  },
  rankBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rankBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  scorePillRow: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
  },
  scorePill: {
    fontSize: 11,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  reviewSection: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    gap: 10,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  reviewSubtitle: {
    fontSize: 11,
  },
  separator: {
    height: 12,
    backgroundColor: 'transparent',
  },
});
