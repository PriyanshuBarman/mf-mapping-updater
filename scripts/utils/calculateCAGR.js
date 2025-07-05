export function calculateCAGR(initialNav, finalNav, years) {
  if (!initialNav || !finalNav || years <= 0) return null;
  return ((finalNav / initialNav) ** (1 / years) - 1) * 100;
}