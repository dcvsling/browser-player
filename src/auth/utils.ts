
export function toFormData(data: { [key: string]: string }): FormData {
  var result = new FormData();
  Object.keys(data).forEach(key => result.append(key, data[key]));
  return result;
}

export function toQueryParams(data: { [key: string]: string }): string {
  return '?' + Object.keys(data)
    .map(key => `${key}=${data[key]}`)
    .join('&');
}

export function fromQueryParams<T>(query: string): T {
  return query.split('?').at(-1)?.split('&').reduce((ctx, kvp) => {
    var kv = kvp.split('=');
    ctx[kv[0]] = kv[1];
    return ctx;
  }, {} as any) as T;
}
