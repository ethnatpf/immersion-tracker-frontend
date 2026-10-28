export function contentDetailPath(contentId: string) {
  return `/content/${encodeURIComponent(contentId)}`;
}
