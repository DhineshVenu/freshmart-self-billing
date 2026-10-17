import React from "react";
import { NavigationContainer, LinkingOptions } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuthStore } from "../store/authStore";
import { RootStackParamList } from "../types";

import SplashScreen from "../screens/SplashScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import QRScanScreen from "../screens/QRScanScreen";
import JoinSessionScreen from "../screens/JoinSessionScreen";
import ShoppingScreen from "../screens/ShoppingScreen";
import CartReviewScreen from "../screens/CartReviewScreen";
import PaymentPendingScreen from "../screens/PaymentPendingScreen";
import ReceiptScreen from "../screens/ReceiptScreen";
import HistoryScreen from "../screens/HistoryScreen";

const Stack = createStackNavigator<RootStackParamList>();

// Deep link config: freshmart://join/:code → JoinSession screen
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["freshmart://", "https://freshmart.local"],
  config: {
    screens: {
      JoinSession: "join/:code",
    },
  },
};

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#0f172a" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "700" },
          cardStyle: { backgroundColor: "#0f172a" },
        }}
      >
        {isLoading ? (
          <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        ) : !isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Sign In" }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Create Account" }} />
          </>
        ) : (
          <>
            <Stack.Screen name="QRScan" component={QRScanScreen} options={{ title: "Scan QR Code", headerShown: false }} />
            <Stack.Screen name="JoinSession" component={JoinSessionScreen} options={{ title: "Join Session" }} />
            <Stack.Screen name="Shopping" component={ShoppingScreen} options={{ title: "Shopping Cart" }} />
            <Stack.Screen name="CartReview" component={CartReviewScreen} options={{ title: "Review Cart" }} />
            <Stack.Screen name="PaymentPending" component={PaymentPendingScreen} options={{ title: "Payment", headerLeft: () => null }} />
            <Stack.Screen name="Receipt" component={ReceiptScreen} options={{ title: "Your Receipt" }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ title: "Purchase History" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
