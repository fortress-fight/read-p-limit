/**
    Run multiple promise-returning & async functions with limited concurrency.

    @param limitCount - 并发数，最小为 1.
    @returns `limit` 处理器.
*/
export default function pLimit(limitCount: number): LimitFunction;

export interface LimitFunction {
    /**
	正在执行的 promises 数量.
	*/
    readonly activeCount: number;

    /**
    等待执行的 promises 数量.
	*/
    readonly pendingCount: number;

    /**
    清空等待执行的 promises 队列.
	*/
    clearQueue: () => void;

    /**
	@param fn - Promise-returning/async function.
	@param arguments - Any arguments to pass through to `fn`. Support for passing arguments on to the `fn` is provided in order to be able to avoid creating unnecessary closures. You probably don't need this optimization unless you're pushing a lot of functions.
	@returns The promise returned by calling `fn(...arguments)`.
	*/
    <Arguments extends unknown[], ReturnType>(
        fn: (...arguments: Arguments) => PromiseLike<ReturnType> | ReturnType,
        ...arguments: Arguments
    ): Promise<ReturnType>;
}
