import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { CATEGORY_LABEL } from '@/lib/format';
import { CapCategory, CAP_CATEGORIES } from '@/lib/types';
import { useThemeColors } from '@/hooks/useThemeColors';

/** Fixed categorical order — large/mid/small always map to slots 0/1/2, never
 * re-assigned per screen (color follows the entity, not its rank). */
export function categoryColor(colors: ReturnType<typeof useThemeColors>, category: CapCategory) {
  return colors.categorical[CAP_CATEGORIES.indexOf(category)];
}

export function CategoryDot({ category }: { category: CapCategory }) {
  const colors = useThemeColors();
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: categoryColor(colors, category) }]} />
      <Text style={[styles.label, { color: colors.textSecondary }]}>{CATEGORY_LABEL[category]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});
