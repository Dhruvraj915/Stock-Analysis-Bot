import { ScrollView, StyleSheet } from 'react-native';

import { ExternalLink } from '@/components/ExternalLink';
import { Text } from '@/components/Themed';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function AboutScreen() {
  const colors = useThemeColors();
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={styles.title}>NSE Positional Research</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        A zero-cost research tool for medium-term (2–3+ month) positional investing in NSE
        stocks. Every weekday the underlying system scores a curated universe of large/mid/small
        cap names on a 58% fundamental / 42% technical composite, picks the top 5 per category,
        and tracks every pick against the market until it hits target, stop-loss, or expires.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>How this app works</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        This app has no backend of its own — it reads the pick ledger and backtest results
        straight from the public GitHub repo the daily job already commits to, so the data here
        is exactly what the automation produced, refreshed once a day for free.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.critical }]}>Disclaimer</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Heuristic research tool, NOT financial advice. Scores are generated mechanically from
        public data that may be delayed or inaccurate. Do your own research and manage your own
        risk.
      </Text>

      <ExternalLink href="https://github.com/Dhruvraj915/Stock-Analysis-Bot" style={styles.link}>
        <Text style={[styles.linkText, { color: colors.tint }]}>View source on GitHub →</Text>
      </ExternalLink>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  link: {
    marginTop: 12,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
