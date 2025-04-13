// theme.ts
import { colors } from "./colors";
import { typography } from "./typography";
import { spacing, layout } from "./spacing";
import { buttons } from "./buttons";
import { cards } from "./cards";
import { layouts } from "./layouts";

export const createTheme = () => ({
  colors,
  typography,
  spacing,
  layout,
  buttons,
  cards,
  layouts,
});

export const theme = createTheme();
