import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import BacktestScreen from '@/screens/BacktestScreen';
import LedgerScreen from '@/screens/LedgerScreen';
import OverviewScreen from '@/screens/OverviewScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { TabParamList } from '@/navigation/types';

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  const colors = useThemeColors();

  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colors.tint }}>
      <Tab.Screen
        name="Overview"
        component={OverviewScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialDesignIcons name="trending-up" size={26} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Ledger"
        component={LedgerScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialDesignIcons
              name="receipt-text-outline"
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Backtest"
        component={BacktestScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialDesignIcons name="chart-bar" size={26} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
