import { searchBestMove } from '../engine/chessEngine';
import { PersonalityId } from '../types/chess';

export interface WorkerSearchRequest {
  type: 'search';
  requestId: number;
  fen: string;
  personalityId: PersonalityId;
  depth?: number;
  maxTimeMs?: number;
}

export interface WorkerCancelRequest {
  type: 'cancel';
  requestId: number;
}

export type WorkerInboundMessage = WorkerSearchRequest | WorkerCancelRequest;

export interface WorkerResultMessage {
  type: 'result';
  requestId: number;
  result: ReturnType<typeof searchBestMove>;
}

export interface WorkerErrorMessage {
  type: 'error';
  requestId: number;
  message: string;
}

let cancelledIds = new Set<number>();

self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
  const data = event.data;
  if (data.type === 'cancel') {
    cancelledIds.add(data.requestId);
    return;
  }

  if (data.type === 'search') {
    const { requestId, fen, personalityId, depth, maxTimeMs } = data;
    try {
      const result = searchBestMove(fen, {
        personalityId,
        depth,
        maxTimeMs,
        shouldAbort: () => cancelledIds.has(requestId),
      });
      if (cancelledIds.has(requestId)) {
        cancelledIds.delete(requestId);
        return;
      }
      const response: WorkerResultMessage = {
        type: 'result',
        requestId,
        result,
      };
      self.postMessage(response);
    } catch (err) {
      const msg: WorkerErrorMessage = {
        type: 'error',
        requestId,
        message: err instanceof Error ? err.message : 'Engine evaluation error',
      };
      self.postMessage(msg);
    }
  }
};
