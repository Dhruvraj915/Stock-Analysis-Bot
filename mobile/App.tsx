import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from '@/navigation/RootNavigator';

export default function App() {
  const isDark = useColorScheme() === 'dark';
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
