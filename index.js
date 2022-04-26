export default function pLimit(concurrency) {
    if (!/^[1-9]\d*$/.test(concurrency.toString())) {
        throw new Error(
            `Expected "concurrency" to be a number from 1 and up, got ${concurrency}`
        );
    }

    let activeCount = 0;
    let queue = [];

    function next() {
        activeCount--;
        if (queue.length > 0) {
            queue.shift()();
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

    function generator(fn, ...arg) {
        return new Promise((resolve) => {
            queue.push(run.bind(undefined, fn, resolve, arg));

            (async () => {
                await Promise.resolve();

                if (activeCount < concurrency && queue.length > 0) {
                    queue.shift()();
                }
            })();
        });
    }

    Object.defineProperties(generator, {
        activeCount: {
            get: () => activeCount,
        },
        pendingCount: {
            get: () => queue.length,
        },
        clearQueue: {
            value() {
                queue = [];
            },
        },
    });

    return generator;
}
