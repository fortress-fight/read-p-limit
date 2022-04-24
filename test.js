/*
 * @Description: 测试文件
 * @Author: F-Stone
 * @LastEditTime: 2022-04-24 18:30:33
 */
import test from "ava";
import delay from "delay";
import inRange from "in-range";
import timeSpan from "time-span";
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
