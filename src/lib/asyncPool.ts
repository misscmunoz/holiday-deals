export async function asyncPool<T, R>(
  poolLimit: number,
  items: T[],
  iteratorFn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const ret: Promise<R>[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const p = Promise.resolve().then(() => iteratorFn(item, i));
    ret.push(p);

    if (poolLimit <= items.length) {
      const e: Promise<void> = p.then(() => undefined).catch(() => undefined);
      executing.push(e);

      if (executing.length >= poolLimit) {
        await Promise.race(executing);
        // remove settled
        for (let j = executing.length - 1; j >= 0; j--) {
          // best-effort cleanup
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          executing[j].then(() => executing.splice(j, 1)).catch(() => executing.splice(j, 1));
        }
      }
    }
  }

  return Promise.allSettled(ret).then(results =>
    results
      .filter(r => r.status === "fulfilled")
      .map(r => (r as PromiseFulfilledResult<R>).value)
  );
}
