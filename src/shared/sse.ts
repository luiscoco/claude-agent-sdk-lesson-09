/** A fetch chunk can contain partial or multiple SSE messages. */
export function eventParser(onData: (value: unknown) => void) {
  let buffer = '';
  return (chunk: string) => {
    buffer += chunk;
    let end: number;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const data = frame
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart())
        .join('\n');
      if (data) onData(JSON.parse(data));
    }
  };
}
