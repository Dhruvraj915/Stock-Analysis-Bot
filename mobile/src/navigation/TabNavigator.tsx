import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable } from 'react-native';

import BacktestScreen from '@/screens/BacktestScreen';
import LedgerScreen from '@/screens/LedgerScreen';
import OverviewScreen from '@/screens/OverviewScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList, TabParamList } from '@/navigation/types';

const Tab = createBottomTabNavigator<TabParamList>();

function AboutButton() {
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <Pressable onPress={() => navigation.navigate('About')} style={{ marginRight: 15 }}>
      {({ pressed }) => (
        <MaterialDesignIcons
          name="information-outline"
          size={24}
          color={colors.text}
          style={{ opacity: pressed ? 0.5 : 1 }}
        />
      )}
    </Pressable>
  );
}

export default function TabNavigator() {
  const colors = useThemeColors();

  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colors.tint }}>
      <Tab.Screen
        name="Overview"
        component={OverviewScreen}
        options={{
          tabBarIcon: ({ color }) => <MaterialDesignIcons name="trending-up" size={26} color={color} />,
          headerRight: () => <AboutButton />,
        }}
      />
      <Tab.Screen
        name="Ledger"
        component={LedgerScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialDesignIcons name="receipt-text-outline" size={26} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Backtest"
        component={BacktestScreen}
        options={{
          tabBarIcon: ({ color }) => <MaterialDesignIcons name="chart-bar" size={26} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
