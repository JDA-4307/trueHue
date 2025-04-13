import { ViewStyle } from "react-native";
import { colors } from "./colors";
import { layout } from "./spacing";

export const layouts: Record<string, ViewStyle> = {
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: layout.containerPadding,
    backgroundColor: colors.background,
  },
  startContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    gap: 16,
  },
  analysisContainer: {
    alignItems: "center",
    width: "100%",
  },
  actionButtonsContainer: {
    flexDirection: "column",
    width: "100%",
    marginVertical: 16,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
};
