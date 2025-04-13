import { ViewStyle, TextStyle } from "react-native";
import { colors } from "./colors";
import { spacing } from "./spacing";

type ButtonStyles = {
  container: ViewStyle;
  text: TextStyle;
};

export const buttons: Record<string, ButtonStyles> = {
  primary: {
    container: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: spacing.lg,
      borderRadius: 12,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    text: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
  },
  secondary: {
    container: {
      backgroundColor: "transparent",
      paddingVertical: 16,
      paddingHorizontal: spacing.lg,
      borderRadius: 12,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.primary,
    },
    text: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "600",
    },
  },
  action: {
    container: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    text: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
  },
  reset: {
    container: {
      backgroundColor: "transparent",
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 4,
    },
    text: {
      color: colors.textSecondary,
      fontSize: 16,
      fontWeight: "500",
    },
  },
};
