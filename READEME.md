# Read p-limit

源码阅读计划 第一期: [p-limit](https://github.com/sindresorhus/p-limit)

## 前言

### p-limit 介绍

> Run multiple promise-returning & async functions with limited concurrency
> p-limit 是用于在规定的并发数下，执行异步方法

### 学习目标

:white_large_square: 根据 p-limit 的测试文件，实现 p-limit 的功能
:white_large_square: 对比并分析 p-limit 的实现方式

## 环境

> NODE 16.14.2
> yarn 1.22.18

### 项目初始化

```shell
mkdir read-p-limit
cd read-p-limit
yarn init -y
npx gitignore node
```

### 添加测试文件

1.  安装依赖

    ```shell
    yarn add ava delay inRange timeSpan random-int xo tsd -D
    yarn add yocto-queue
    ```

2.  test.js

    ```javascript
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

        t.deepEqual(
            await Promise.all(input.map((x) => mapper(x))),
            [10, 20, 30]
        );
        t.true(inRange(end(), { start: 590, end: 650 }));
    });
    ```

3.  package.json

    ```javascript
    {
        ...
        "scripts": {
            "test": "xo && ava"
        },
        ...
    }
    ```

    > 如果对格式没有要求，移除 xo

## 代码主题实现

### Task 1 通过测试 `concurrency: 1`

1.  index.js

    ```javascript
    export default function pLimit(limit) {
        // 存放前置执行任务
        let frontTasks = [];
        // 临时存放任务
        let tempTasks = [];
        return (task) => {
            // 返回值预期：
            // 一个包含前置执行任务的 promise，保证执行顺序 （前置任务 => 当前任务）
            let result;

            if (frontTasks.length < limit) {
                // task 直接作为返回主体，并存储为下一组的前置任务
                result = task();
                frontTasks.push(result);
            } else if (frontTasks.length >= limit) {
                // task 与之前的执行任务组成新的 Promise 作为返回主体
                result = Promise.all(frontTasks).then(() => {
                    return task();
                });
                // 将 task 与之前的执行任务组成新的 Promise 作为新的前置任务
                // 储存在临时组中
                tempTasks.push(result);
                // 如果临时组达到了限制数，更新执行任务组，并清空临时组
                while (tempTasks.length === limit) {
                    frontTasks = tempTasks;
                    tempTasks = [];
                }
            }

            return result;
        };
    }
    ```

经测试除了 `concurrency: 1` 还通过了 `concurrency: 4` 以及 `non-promise returning function`

### Task2 通过测试 `continues after sync throw`

1.  test.js

    ```javascript
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
    ```

2.  index.js

    ```javascript
            if (frontTasks.length < limit) {
                    // 将 task 直接作为返回主体，并存储为下一组的前置任务
        -            result = task();
        +            try {
        +                result = task();
        +            } catch {
        +                result = Promise.resolve(undefined);
        +            }
        +
                    frontTasks.push(result);
                } else if (frontTasks.length >= limit) {
                    // 将 task 与之前的执行任务组成新的 Promise 作为返回主体
                    result = Promise.all(frontTasks).then(() => {
        -                return task();
        +                try {
        +                    return task();
        +                } catch {
        +                    return undefined;
        +                }
                    });
                }
    ```

### Task3 通过测试 `accepts additional arguments`

1.  test.js

    ```javascript
    test("accepts additional arguments", async (t) => {
        const limit = pLimit(1);
        const symbol = Symbol("test");

        await limit((a) => t.is(a, symbol), symbol);
    });
    ```

2.  index.js

    ```shell
    export default function pLimit(limit) {
    @@ -10,7 +10,7 @@ export default function pLimit(limit) {
        // 临时存放任务
        let temporaryTasks = [];

    -    return (task) => {
    +    return (task, argument) => {
            // 返回值预期：
            // 一个包含前置执行任务的 promise，保证执行顺序 （前置任务 => 当前任务）
            let result;
    @@ -18,7 +18,7 @@ export default function pLimit(limit) {
            if (frontTasks.length < limit) {
                // 将 task 直接作为返回主体，并存储为下一组的前置任务
                try {
    -                result = task();
    +                result = task.call(this, argument);
                } catch {
                    result = Promise.resolve(undefined);
                }
    @@ -28,7 +28,7 @@ export default function pLimit(limit) {
                // 将 task 与之前的执行任务组成新的 Promise 作为返回主体
                result = Promise.all(frontTasks).then(() => {
                    try {
    -                    return task();
    +                    return task.call(this, argument);
                    } catch {
                        return undefined;
                    }

    ```

### Task4 通过测试 `activeCount and pendingCount properties` 与 `does not ignore errors`

1.  test.js

    ```javascript
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
    ```

2.  index.js

    ```javascript
    export default function pLimit(limitCount) {
        // 存放前置执行任务
        let frontTasks = [];
        // 临时存放任务
        let temporaryTasks = [];

        function limit(task, argument) {
            // 返回值预期：
            // 一个包含前置执行任务的 promise，保证执行顺序 （前置任务 => 当前任务）
            let result;
            limit.pendingCount++;
            if (frontTasks.length < limitCount) {
                // 将 task 直接作为返回主体，并存储为下一组的前置任务
                result = Promise.resolve().then(() => {
                    limit.pendingCount--;
                    limit.activeCount++;
                    try {
                        return Promise.resolve(task(argument)).then(
                            (response) => {
                                limit.activeCount--;
                                if (limit.pendingCount === 0) {
                                    frontTasks = [];
                                }

                                return response;
                            }
                        );
                    } catch {
                        result = undefined;
                    }
                });

                frontTasks.push(result);
            } else if (frontTasks.length >= limitCount) {
                // 将 task 与之前的执行任务组成新的 Promise 作为返回主体
                result = Promise.all(frontTasks).then(() => {
                    limit.pendingCount--;
                    limit.activeCount++;
                    try {
                        return Promise.resolve(task(argument)).then(
                            (response) => {
                                limit.activeCount--;
                                if (limit.pendingCount === 0) {
                                    frontTasks = [];
                                }

                                return response;
                            }
                        );
                    } catch {
                        return undefined;
                    }
                });
                // 将 task 与之前的执行任务组成新的 Promise 作为新的前置任务
                // 储存在临时组中
                temporaryTasks.push(result);
                // 如果临时组达到了限制数，更新执行任务组，并清空临时组
                if (temporaryTasks.length === limitCount) {
                    frontTasks = temporaryTasks;
                    temporaryTasks = [];
                }
            }

            return result;
        }

        limit.activeCount = 0;
        limit.pendingCount = 0;
        return limit;
    }
    ```

### Task5 通过测试 `throws on invalid concurrency argument`

1.  test.js

    ```javascript
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
    ```

2.  index.js

    ```bash
    @@ -1,9 +1,15 @@
    /*
    * @Description:
    * @Author: F-Stone
    - * @LastEditTime: 2022-04-25 13:28:14
    + * @LastEditTime: 2022-04-25 13:44:57
    */
    export default function pLimit(limitCount) {
    +    if (!/^[1-9]\d*$/.test(limitCount.toString())) {
    +        throw new TypeError(
    +            "Expected `limitCount` to be a number from 1 and up"
    +        );
    +    }
    +
        // 存放前置执行任务
        let frontTasks = [];
        // 临时存放任务
    ```

### Task6 通过测试 `清空队列`

1.  test.js

    ```javascript
    test("清空队列", async (t) => {
        const limit = pLimit(5);
        const immediatePromises = Array.from({ length: 5 }, () =>
            limit(() => delay(1000))
        );
        const delayedPromises = Array.from({ length: 3 }, () =>
            limit(() => delay(1000))
        );

        await Promise.resolve();
        limit.clearQueue();
        t.is(limit.activeCount, 5);
        t.is(limit.pendingCount, 0);

        await Promise.all(immediatePromises);
        t.is(limit.activeCount, 0);
        t.is(limit.pendingCount, 0);

        await Promise.all(delayedPromises);

        t.is(limit.activeCount, 0);
        t.is(limit.pendingCount, 0);
    });
    ```

2.  index.js

    ```bash
     export default function pLimit(limitCount) {
        if (!/^[1-9]\d*$/.test(limitCount.toString())) {
    @@ -23,6 +23,10 @@ export default function pLimit(limitCount) {
            if (frontTasks.length < limitCount) {
                // 将 task 直接作为返回主体，并存储为下一组的前置任务
                result = Promise.resolve().then(() => {
    +                if (limit.pendingCount === 0) {
    +                    return undefined;
    +                }
    +
                    limit.pendingCount--;
                    limit.activeCount++;
                    try {
    @@ -43,6 +47,10 @@ export default function pLimit(limitCount) {
            } else if (frontTasks.length >= limitCount) {
                // 将 task 与之前的执行任务组成新的 Promise 作为返回主体
                result = Promise.all(frontTasks).then(() => {
    +                if (limit.pendingCount === 0) {
    +                    return undefined;
    +                }
    +
                    limit.pendingCount--;
                    limit.activeCount++;
                    try {
    @@ -73,5 +81,10 @@ export default function pLimit(limitCount) {

        limit.activeCount = 0;
        limit.pendingCount = 0;
    +    limit.clearQueue = function () {
    +        temporaryTasks = [];
    +        limit.pendingCount = 0;
    +    };
    +
        return limit;
    }
    ```

## 问题汇总

### prettier 与 ox

`ox` 包含了一些默认的 `eslint` 配置，但是与我自用的 `prettier` 有些许冲突，需要做一些简单的配置

-   `./.prettier`

    ```json
    {
        "useTabs": false,
        "tabWidth": 4,
        "singleQuote": false,
        "endOfLine": "auto",
        "trailingComma": "es5",
        "semi": true,
        "bracketSpacing": true
    }
    ```

-   `./xo.config.cjs`

    ```javascript
    module.exports = {
        prettier: true,
    };
    ```

### package.json 中 type 属性

一直没有注意到 `package.json` 中的 `type` 属性，该属性主要提供 Node 使用，具体可以查看[Node Type](https://nodejs.org/api/packages.html#type)

简单的来说该 `type` 字段定义了 Node.js 如何定义该 `package.json` 所在目录下的 `js` 模块的类型。

`type` 字段

-   `commonjs` (默认值)，无扩展名的文件和 `.js` 结尾文件将被视为 `CommonJS`。
-   `module` 无扩展名的文件和 `.js` 结尾文件将被视为 `ES`。

注：不管 `type` 字段的值是多少，`.mjs` 文件总是被当作 `ES` 模块，而 `.cjs` 文件总是被当作 `CommonJS`。

````

```

```
````
