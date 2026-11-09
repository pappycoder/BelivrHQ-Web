/** Labels identify read/open actions; editing and mutations require an explicit opt-in. */
export function isRecordOpenLabel(label: string): boolean {
  return /^(open|view|inspect|review|details)(?:\b|\s)/i.test(label.trim());
}

export function isRecordDetailHref(href: string, current: string): boolean {
  if (!href || href.startsWith("#")) return false;
  try {
    const url = new URL(href, current);
    const location = new URL(current);
    return (
      url.origin === location.origin &&
      /^https?:$/.test(url.protocol) &&
      !/(?:^|\/)(?:new|create|edit|delete|archive|export|download)(?:\/|$)/i.test(
        url.pathname,
      ) &&
      (url.pathname !== location.pathname || url.search !== location.search)
    );
  } catch {
    return false;
  }
}
