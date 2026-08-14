import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

/** Full palette for the active theme — for chart/mark colors that don't map
 * onto Themed's single text/background props. */
export function useThemeColors() {
  const scheme = useColorScheme();
  return Colors[scheme];
}
