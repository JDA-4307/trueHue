// typography.ts - avoid importing colors
export const typography = {
  appTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: "#35343D", // Direct value instead of colors.textPrimary
    textAlign: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  // other styles...

  sectionHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#35343D",
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 17,
    color: "#35343D",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  bodyText: {
    fontSize: 16,
    color: "#35343D",
    lineHeight: 24,
  },
  labelText: {
    fontSize: 14,
    color: "#35343D",
  },
};
