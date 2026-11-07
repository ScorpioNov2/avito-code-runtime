/**
 * Throttle bằng requestAnimationFrame: dù được gọi hàng trăm lần trong 1 frame
 * (ví dụ mousemove), callback chỉ chạy tối đa 1 lần/frame (~60 FPS) với tham số của lần gọi cuối.
 */
export function throttleWithAnimationFrame<Args extends unknown[]>(callback: (...args: Args) => void) {
  let latestArgs: Args | null = null;
  let frameId = 0;

  const throttled = (...args: Args): void => {
    latestArgs = args;
    if (frameId !== 0) return;

    frameId = requestAnimationFrame(() => {
      frameId = 0;
      const argsToUse = latestArgs;
      latestArgs = null;
      if (argsToUse) callback(...argsToUse);
    });
  };

  const cancel = (): void => {
    cancelAnimationFrame(frameId);
    frameId = 0;
    latestArgs = null;
  };

  return Object.assign(throttled, { cancel });
}
