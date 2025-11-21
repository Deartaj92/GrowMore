import { ComponentType, lazy } from 'react';

/**
 * Retry lazy loading of a component with exponential backoff
 * This helps handle transient network issues or chunk loading failures
 */
export function lazyWithRetry<T extends ComponentType<any>>(
    componentImport: () => Promise<{ default: T }>,
    retries = 3,
    interval = 1000
): React.LazyExoticComponent<T> {
    return lazy(() => {
        return new Promise<{ default: T }>((resolve, reject) => {
            const attemptLoad = (attemptsLeft: number) => {
                componentImport()
                    .then(resolve)
                    .catch((error) => {
                        if (attemptsLeft === 0) {
                            console.error('Failed to load component after retries:', error);
                            reject(error);
                            return;
                        }

                        console.warn(
                            `Failed to load component, retrying... (${attemptsLeft} attempts left)`,
                            error
                        );

                        setTimeout(() => {
                            attemptLoad(attemptsLeft - 1);
                        }, interval);
                    });
            };

            attemptLoad(retries);
        });
    });
}

/**
 * Refresh the page if chunk loading fails
 * This is a last resort for production environments
 */
export function handleChunkError(error: Error): void {
    const isChunkError =
        error.message.includes('Loading chunk') ||
        error.message.includes('ChunkLoadError') ||
        error.message.includes('Failed to fetch dynamically imported module');

    if (isChunkError) {
        console.error('Chunk loading error detected, refreshing page...', error);
        window.location.reload();
    }
}
