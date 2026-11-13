import { useCallback, useEffect, useRef, useState } from 'react';
import { EngineSearchResult, searchBestMove } from '../engine/chessEngine';
import { PersonalityId } from '../types/chess';
import type { WorkerInboundMessage, WorkerResultMessage, WorkerErrorMessage } from '../workers/uciWorker';

export interface UseChessEngineReturn {
  isReady: boolean;
  isThinking: boolean;
  engineError: string | null;
  isFallbackMode: boolean;
  search: (params: {
    fen: string;
    personalityId: PersonalityId;
    depth?: number;
    maxTimeMs?: number;
  }) => Promise<EngineSearchResult>;
  cancelSearch: () => void;
}

export function useChessEngine(): UseChessEngineReturn {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const pendingRef = useRef<
    Map<number, { resolve: (res: EngineSearchResult) => void; reject: (err: Error) => void }>
  >(new Map());

  const [isReady, setIsReady] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  useEffect(() => {
    try {
      const worker = new Worker(new URL('../workers/uciWorker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (e: MessageEvent<WorkerResultMessage | WorkerErrorMessage>) => {
        const data = e.data;
        const pending = pendingRef.current.get(data.requestId);
        if (!pending) return;
        pendingRef.current.delete(data.requestId);
        if (pendingRef.current.size === 0) setIsThinking(false);

        if (data.type === 'result') {
          pending.resolve(data.result);
        } else {
          setEngineError(data.message);
          pending.reject(new Error(data.message));
        }
      };
      worker.onerror = () => {
        setIsFallbackMode(true);
        setEngineError('Web Worker unavailable; switched to synchronous fallback engine.');
        setIsReady(true);
      };
      workerRef.current = worker;
      setIsReady(true);
    } catch {
      setIsFallbackMode(true);
      setIsReady(true);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      pendingRef.current.clear();
    };
  }, []);

  const cancelSearch = useCallback(() => {
    if (workerRef.current && requestIdRef.current > 0) {
      const msg: WorkerInboundMessage = {
        type: 'cancel',
        requestId: requestIdRef.current,
      };
      workerRef.current.postMessage(msg);
    }
    pendingRef.current.forEach((p) => p.reject(new Error('Search cancelled')));
    pendingRef.current.clear();
    setIsThinking(false);
  }, []);

  const search = useCallback(
    (params: {
      fen: string;
      personalityId: PersonalityId;
      depth?: number;
      maxTimeMs?: number;
    }): Promise<EngineSearchResult> => {
      setEngineError(null);
      const id = ++requestIdRef.current;

      if (!workerRef.current || isFallbackMode) {
        setIsThinking(true);
        return new Promise((resolve) => {
          setTimeout(() => {
            const res = searchBestMove(params.fen, {
              personalityId: params.personalityId,
              depth: params.depth,
              maxTimeMs: params.maxTimeMs,
            });
            setIsThinking(false);
            resolve(res);
          }, 20);
        });
      }

      setIsThinking(true);
      return new Promise((resolve, reject) => {
        pendingRef.current.set(id, { resolve, reject });
        const msg: WorkerInboundMessage = {
          type: 'search',
          requestId: id,
          fen: params.fen,
          personalityId: params.personalityId,
          depth: params.depth,
          maxTimeMs: params.maxTimeMs,
        };
        workerRef.current!.postMessage(msg);
      });
    },
    [isFallbackMode],
  );

  return {
    isReady,
    isThinking,
    engineError,
    isFallbackMode,
    search,
    cancelSearch,
  };
}
