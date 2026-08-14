import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Overview: undefined;
  Ledger: undefined;
  Backtest: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  StockDetail: { ticker: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
