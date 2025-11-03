export function formatDollar(
  num: number,
  threshold: number,
  decimals: number = 2,
): string {
  const suffixes = [
    "",
    "k",
    "M",
    "B",
    "T",
    "Q",
    "Qi",
    "Sx",
    "Sp",
    "Oc",
    "No",
    "Dc",
  ];
  if (num < threshold) {
    return `$${num.toFixed(2)}`;
  }
  let suffixIndex = 0;
  const sign = Math.sign(num);
  num = Math.abs(num);
  while (num >= 1000 && suffixIndex < suffixes.length - 1) {
    num /= 1000;
    suffixIndex++;
  }
  return `$${sign < 0 ? "-" : ""}${
    num.toFixed(Math.min(Math.max(suffixIndex, 2), decimals)).replace(
      /\.0$/,
      "",
    )
  }${suffixes[suffixIndex]}`;
}
