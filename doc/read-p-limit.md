# p-limit 阅读笔记

## pLimit 的实现拆分

> 此处没有按照 pLimit 的原因代码进行拆分，而是通过我的理解，拆分出将能够完成当前目的的最少代码

### 1 创建 pLimit 的函数主题

由 pLimit 的使用方式可以得出，调佣 pLimit 将会得到一个执行函数，并且该执行函数将会返回个 新的 Promise 以供后续调用

```javascript
export default function pLimit(concurrency) {
    return (fn, ...args) => {
        return new Promise((resolve) => {
            //
        });
    };
}
```

### 2 创建执行队列

pLimit 主要执行目的

**NOTE:** 在阅读改代码前建议先了解 `Microtask` 可以搜索 `Promise的执行顺序` 了解更多

```javascript
export default function pLimit(concurrency) {
    const queue = [];
    let activeCount = 0;

    const next = () => {
        activeCount--;

        if (queue.length > 0) {
            queue.shift()();
        }
    };

    const run = async (fn, resolve, args) => {
        activeCount++;

        const result = (async () => fn(...args))();

        resolve(result);

        try {
            await result;
        } catch {}

        next();
    };
    const enqueue = (fn, resolve, args) => {
        queue.push(run.bind(undefined, fn, resolve, args));

        (async () => {
            // 这个函数需要等待一个 Microtask 才能比较 `activeCount` 和 `concurrency`，因为 `activeCount` 是异步更新的，
            // 当 run 函数被取出并调用时，它的比较需要异步才能得到一个最新的值。
            // 在 if-语句中的比较需要异步才能得到一个最新的值。
            await Promise.resolve();

            if (activeCount < concurrency && queue.length > 0) {
                queue.shift()();
            }
        })();
    };

    return (fn, ...args) => {
        return new Promise((resolve) => {
            enqueue(fn, resolve, ...args);
        });
    };
}
```

1.  确保执行的顺序以及保证正确的返回函数的调用结果

    我的处理方法是组成一个新的 `Promise` 进入队列，执行时通过 `Promise.all` 来保证执行顺序, 同时主动返回结果 `return result`。

    这样做存在需要问题：

    -   只有上一组完成后才能执行下一组，不能高效利用。目标行为：一组中先执行完的先出队列，同时添加新的任务进入队列

        可以通过下面的方式进行测试

        ```javascript
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
        ```

    这里，作者通过将包含当前 `Promise` 的 `resolve` 方法传递执行函数 `run` 并储存进队列，这样不仅可以让队列通过先进先出的方式控制执行的顺序

    ```javascript
    // 控制执行顺序的部分
    try {
        await result;
    } catch {}

    next();
    ```

    还能通过执行 `resolve(result)` 的方式保证输出的正确。这种实现方式更好理解。

    每一个 `Promise task` 完成后，更新 `activeCount` 然后查看队列中是否还存在 `task`,如果还存在就弹出新的 `task` 补充进当前`Microtask` 中

2.  关于 `await Promise.resolve();`

    起初我是不能理解 `activeCount` 具体代表着什么，通过代码注释，可以理解这里的 `activeCount` 是表示处于 `Microtask` 中，但还未执行的任务数量。并且由于进入 `Microtask` 的任务要等待同步代码执行结束后才能处理，所以这里使用 `await Promise.resolve();` 来等待上一次运行 `Microtask` 任务的对 `activeCount` 的更新

    此处，我的处理方法是通过 `Promise.resolve().then()` 进行处理。 如果使用 `async` 的方式会更加简介也方便理解

3.  关于 `run.bind(undefined, fn, resolve, args)`

    这里要说明的是，如果函数的调用不依赖 `this` 在绑定的时候使用 `undefined` 会是个不错的选择，之前我会选择使用当前执行环境中的 `this`，这样会带来很多不确定性

4.  `async` 函数将会返回一个 `Promise`

5.  关于错误捕获与处理非异步 task 的操作

    关于错误捕获这里，对应的测试：

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

    这里我的理解出现了问题。此处的错误，不是在 limit 内部捕获后不处理，而应该将错误传递出来，让外部能够捕获到。

    作者的处理方式

    ```javascript
    const run = async (fn, resolve, args) => {
        activeCount++;

        const result = (async () => fn(...args))();

        resolve(result);

        try {
            await result;
        } catch {}

        next();
    };
    ```

    首先通过 `(async () => fn(...args))();` 保证返回值为 `Promise`，然后将处理结果通过 `resolve(result);` 同时使用

    ```javascript
    try {
        await result;
    } catch {}
    ```

    将内部错误处理掉

### 3 参数校验

```javascript
if (
    !(
        (Number.isInteger(concurrency) ||
            concurrency === Number.POSITIVE_INFINITY) &&
        concurrency > 0
    )
) {
    throw new TypeError("Expected `concurrency` to be a number from 1 and up");
}
```

```javascript
if (!/^[1-9]\d*$/.test(concurrency.toString())) {
    throw new TypeError("Expected `concurrency` to be a number from 1 and up");
}
```

对于 `concurrency` 校验倒是十分简单的事情了，这里也有些知识点可以了解一下

1.  `Number.isInteger` 用来判断给定的参数是否为整数。
2.  `Number.POSITIVE_INFINITY` 表示正无穷大。

### 4 activeCount & pendingCount & clearQueue

```javascript
Object.defineProperties(generator, {
    activeCount: {
        get: () => activeCount,
    },
    pendingCount: {
        get: () => queue.length,
    },
    clearQueue: {
        value: () => {
            queue = [];
        },
    },
});
```

这里对于函数的属性添加以及对 `get` 的应用，十分有参考意义。并且对 `activeCount` `pendingCount` 还有保护作用

我的处理方式就是常规的 `generator.activeCount` 方式，实在太简陋了。

### 5 yocto-queue

`yocto-queue` 是 JS 实现的队列，相较于 `Array` 具有更高的执行效率，用来更新上面的 `queue`，此处没有特殊的部分，不做额外说明

## 重新实现 pLimit

[index.js](https://github.com/fortress-fight/read-p-limit/blob/946e6853956263ecebf24c164c094deeb27f7ccf/index.js)

这部分与 `pLimit` 源码实现方式并无不同，不过有一点值得注意：

`pLimit` 源码中的 `clearQueue` 实现十分简单粗暴，但是未执行的 `Promise` 将始终处于 `pending` 状态。 例如：

```javascript
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

中 `await Promise.all(delayedPromises);` 将会阻塞程序的运行。 未处理的 `Promise` 还将会造成内存泄露，可以通过下面的方式进行验证

```javascript
let i = 0;
let arr = [];
while (i++ < 10000) {
    arr.push(
        new Promise((res) => {
            if (false) {
                res();
            }
        })
    );
}
arr = [];
queryObjects(Promise);
```

建议在执行`clearQueue` 时，将执行剩余的 `Promise` 的 `reject` 方法。下面添加一个测试方法，以及我设想的解决方法

```javascript
test("清空队列", async (t) => {
    const limit = pLimit(5);
    const error = new Error("Aborted");

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

    await Promise.all(delayedPromises)
        .then((response) => {
            t.is(response[0].message, error.message);
        })
        .catch(() => {});

    t.is(limit.activeCount, 0);
    t.is(limit.pendingCount, 0);
});
```

```bash
-    function generator(fn, ...arg) {
-        return new Promise((resolve) => {
-            queue.push(run.bind(undefined, fn, resolve, arg));
+    async function abort(fn, resolve, reject) {
+        reject(new Error("Aborted"));
+    }
+
+    function enqueue(fn, resolve, reject, arg) {
+        queue.enqueue({
+            run: run.bind(undefined, fn, resolve, arg),
+            abort: abort.bind(undefined, fn, resolve, reject),
+        });
+    }

+    function generator(fn, ...arg) {
+        return new Promise((resolve, reject) => {
+            enqueue(fn, resolve, reject, arg);
             (async () => {
                 await Promise.resolve();

-                if (activeCount < concurrency && queue.length > 0) {
-                    queue.shift()();
+                if (activeCount < concurrency && queue.size > 0) {
+                    queue.dequeue().run();
                 }
             })();
-        });
+        }).then(
+            (response) => {
+                return response;
+            },
+            (error) => {
+                if (error.message === "Aborted") {
+                    return error;
+                }
+
+                throw error;
+            }
+        );
     }
```

## 关于 TS

对于 pLimit 的类型定义文件 [index.d.ts](../index.d.ts) 中，对于函数定义添加类型定义的方式还是可以参考的。
