/** Tin nhắn Web Worker -> luồng chính. */
export type WorkerMessage =
  | { type: 'stdout' | 'stderr' | 'info'; text: string }
  | { type: 'finished' };

/** Tin nhắn luồng chính -> Web Worker. */
export interface WorkerRequest {
  code: string;
}
