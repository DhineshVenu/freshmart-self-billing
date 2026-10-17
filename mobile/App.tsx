import "react-native-gesture-handler"; // Must be the first import
import React from "react";
import { StatusBar } from "react-native";
import { isRunningInExpoGo } from "expo";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  React.useEffect(() => {
    if (isRunningInExpoGo()) {
      return;
    }

    void import("expo-notifications")
      .then((Notifications) => {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      })
      .catch((error: unknown) => {
        console.error("Failed to configure notification handling:", error);
      });
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <RootNavigator />
    </>
  );
}
