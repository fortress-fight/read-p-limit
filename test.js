/*
 * @Description: 测试文件
 * @Author: F-Stone
 * @LastEditTime: 2022-04-26 12:16:06
 */
import test from "ava";
import delay from "delay";
import inRange from "in-range";
import timeSpan from "time-span";
import randomInt from "random-int";
import pLimit from "./index.js";

test("concurrency: 1", async (t) => {
    const input = [
        [10, 300],
        [20, 200],
        [30, 100],
    ];

    const end = timeSpan();
    const limit = pLimit(1);

    const mapper = ([value, ms]) =>
        limit(async () => {
            await delay(ms);
            return value;
        });

    t.deepEqual(await Promise.all(input.map((x) => mapper(x))), [10, 20, 30]);
    t.true(inRange(end(), { start: 590, end: 650 }));
});

test("concurrency: 2", async (t) => {
    const input = [
        [10, 300],
        [20, 10],
        [30, 100],
        [20, 200],
    ];

    const end = timeSpan();
    const limit = pLimit(2);

    const mapper = ([value, ms]) =>
        limit(async () => {
            await delay(ms);
            return value;
        });

    t.deepEqual(
        await Promise.all(input.map((x) => mapper(x))),
        [10, 20, 30, 20]
    );
    t.true(inRange(end(), { start: 300, end: 360 }));
});

test("concurrency: 4", async (t) => {
    const concurrency = 5;
    let running = 0;

    const limit = pLimit(concurrency);

    const input = Array.from({ length: 100 }, () =>
        limit(async () => {
            running++;
            t.true(running <= concurrency);
            await delay(randomInt(30, 200));
            running--;
        })
    );

    await Promise.all(input);
});

test("non-promise returning function", async (t) => {
    await t.notThrowsAsync(async () => {
        const limit = pLimit(1);
        await limit(() => null);
    });
});

test("continues after sync throw", async (t) => {
    const limit = pLimit(1);
    let ran = false;

    const promises = [
        limit(() => {
            throw new Error("err");
        }),
        limit(() => {
            ran = true;
        }),
    ];

    await Promise.all(promises).catch(() => {});

    t.is(ran, true);
});

test("accepts additional arguments", async (t) => {
    const limit = pLimit(1);
    const symbol = Symbol("test");

    await limit((a) => t.is(a, symbol), symbol);
});

test("does not ignore errors", async (t) => {
    const limit = pLimit(1);
    const error = new Error("🦄");

    const promises = [
        limit(async () => {
            await delay(30);
        }),
        limit(async () => {
            await delay(80);
            throw error;
        }),
        limit(async () => {
            await delay(50);
        }),
    ];

    await t.throwsAsync(Promise.all(promises), { is: error });
});

test("activeCount and pendingCount properties", async (t) => {
    const limit = pLimit(5);
    t.is(limit.activeCount, 0);
    t.is(limit.pendingCount, 0);

    const runningPromise1 = limit(() => delay(1000));
    t.is(limit.activeCount, 0);
    t.is(limit.pendingCount, 1);

    await Promise.resolve();
    t.is(limit.activeCount, 1);
    t.is(limit.pendingCount, 0);

    await runningPromise1;
    t.is(limit.activeCount, 0);
    t.is(limit.pendingCount, 0);

    const immediatePromises = Array.from({ length: 5 }, () =>
        limit(() => delay(1000))
    );
    const delayedPromises = Array.from({ length: 3 }, () =>
        limit(() => delay(1000))
    );

    await Promise.resolve();
    t.is(limit.activeCount, 5);
    t.is(limit.pendingCount, 3);

    await Promise.all(immediatePromises);
    t.is(limit.activeCount, 3);
    t.is(limit.pendingCount, 0);

    await Promise.all(delayedPromises);

    t.is(limit.activeCount, 0);
    t.is(limit.pendingCount, 0);
});

test("throws on invalid concurrency argument", (t) => {
    t.throws(() => {
        pLimit(0);
    });

    t.throws(() => {
        pLimit(-1);
    });

    t.throws(() => {
        pLimit(1.2);
    });

    t.throws(() => {
        pLimit(undefined);
    });

    t.throws(() => {
        pLimit(true);
    });
});

test("清空队列", async (t) => {
    const limit = pLimit(5);
    const immediatePromises = Array.from({ length: 5 }, () =>
        limit(() => delay(1000))
    );
    Array.from({ length: 3 }, () => limit(() => delay(1000)));

    await Promise.resolve();
    limit.clearQueue();
    t.is(limit.activeCount, 5);
    t.is(limit.pendingCount, 0);

    await Promise.all(immediatePromises);
    t.is(limit.activeCount, 0);
    t.is(limit.pendingCount, 0);
});
