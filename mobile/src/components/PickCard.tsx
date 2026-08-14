import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet } from 'react-native';

import { CategoryDot } from '@/components/CategoryDot';
import { StatusBadge } from '@/components/StatusBadge';
import { Text, View } from '@/components/Themed';
import { formatDate, formatPct, formatPrice } from '@/lib/format';
import { LedgerEntry } from '@/lib/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

export function PickCard({ entry }: { entry: LedgerEntry }) {
  const colors = useThemeColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const latestReturn = entry.returnPct;

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
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.ticker}>{entry.name}</Text>
              <Text style={[styles.symbol, { color: colors.textMuted }]}>
                {entry.ticker}
              </Text>
            </View>
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

          <View style={styles.metaRow}>
            <CategoryDot category={entry.category} />
            <StatusBadge status={entry.status} />
          </View>

          <View style={styles.levelsRow}>
            <LevelStat
              label="Entry"
              value={formatPrice(entry.entryReference)}
            />
            <LevelStat
              label="Target"
              value={formatPrice(entry.target)}
              color={colors.good}
            />
            <LevelStat
              label="Stop"
              value={formatPrice(entry.stopLoss)}
              color={colors.critical}
            />
          </View>

          <Text style={[styles.dateLine, { color: colors.textMuted }]}>
            Picked {formatDate(entry.date)} · score{' '}
            {entry.compositeScore.toFixed(1)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function LevelStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.levelStat}>
      <Text style={[styles.levelLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.levelValue, { color: color ?? colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
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
    flexShrink: 1,
  },
  ticker: {
    fontSize: 15,
    fontWeight: '600',
  },
  symbol: {
    fontSize: 12,
  },
  returnValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  levelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  levelStat: {
    backgroundColor: 'transparent',
    gap: 2,
  },
  levelLabel: {
    fontSize: 11,
  },
  levelValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateLine: {
    fontSize: 11,
  },
});
