/*
 * @Description: 测试文件
 * @Author: F-Stone
 * @LastEditTime: 2022-04-24 18:53:26
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
