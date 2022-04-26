import Queue from "yocto-queue";

export default function pLimit(concurrency) {
    if (!/^[1-9]\d*$/.test(concurrency.toString())) {
        throw new Error(
            `Expected "concurrency" to be a number from 1 and up, got ${concurrency}`
        );
    }

    let activeCount = 0;
    const queue = new Queue();

    function next() {
        activeCount--;
        if (queue.size > 0) {
            queue.dequeue().run();
        }
    }

    async function run(fn, resolve, arg) {
        activeCount++;
        const result = (async () => fn(...arg))();
        resolve(result);

        try {
            await result;
        } catch {}

        next();
    }

    async function abort(fn, resolve, reject) {
        reject(new Error("Aborted"));
    }

    function enqueue(fn, resolve, reject, arg) {
        queue.enqueue({
            run: run.bind(undefined, fn, resolve, arg),
            abort: abort.bind(undefined, fn, resolve, reject),
        });
    }

    function generator(fn, ...arg) {
        return new Promise((resolve, reject) => {
            enqueue(fn, resolve, reject, arg);
            (async () => {
                await Promise.resolve();

                if (activeCount < concurrency && queue.size > 0) {
                    queue.dequeue().run();
                }
            })();
        }).then(
            (response) => {
                return response;
            },
            (error) => {
                if (error.message === "Aborted") {
                    return error;
                }

                throw error;
            }
        );
    }

    Object.defineProperties(generator, {
        activeCount: {
            get: () => activeCount,
        },
        pendingCount: {
            get: () => queue.size,
        },
        clearQueue: {
            value() {
                for (const task of queue) task.abort();
                queue.clear();
            },
        },
    });

    return generator;
}
