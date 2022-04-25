# Read p-limit

源码阅读计划 第一期: [p-limit](https://github.com/sindresorhus/p-limit)

## 前言

### p-limit 介绍

> Run multiple promise-returning & async functions with limited concurrency  
> p-limit 是用于在规定的并发数下，执行异步方法

### 学习目标

:white_check_mark: 根据 p-limit 的测试文件，实现 p-limit 的功能  
:white_large_square: 对比并分析 p-limit 的实现方式

## 环境

> node 16.14.2  
> yarn 1.22.18

### 项目初始化

```bash
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

    **Note:** 如果对格式没有要求，移除 `xo`

## 代码主体实现

按照需求分步骤的完成以下任务，具体实现步骤可查看 [代码实现记录](doc/代码实现记录.md) 或查看相关提交记录。

测试代码可查看 [test.js](test.js)

:white_check_mark: Task1 通过测试 `concurrency: 1` `concurrency: 4` 以及 `non-promise returning function`  
:white_check_mark: Task2 通过测试 `continues after sync throw`  
:white_check_mark: Task3 通过测试 `accepts additional arguments`  
:white_check_mark: Task4 通过测试 `activeCount and pendingCount properties` 与 `does not ignore errors`  
:white_check_mark: Task5 通过测试 `throws on invalid concurrency argument`  
:white_check_mark: Task6 通过测试 `清空队列`

## 源码阅读

源码地址：[p-limit](https://github.com/sindresorhus/p-limit)
阅读笔记：[read-p-limit](/doc/read-p-limit.md);

## index.d.ts & index.test-d.ts

添加类型定义与类型定义检测

1.  index.test-d.ts

    ```javascript
    import { expectType } from "tsd";
    import pLimit from "./index.js";

    const limit = pLimit(1);

    const input = [
        limit(async () => "foo"),
        limit(async () => "bar"),
        limit(async () => undefined),
    ];

    expectType<Promise<Array<string | undefined>>>(Promise.all(input));

    expectType<Promise<string>>(limit((_a: string) => "", "test"));
    expectType<Promise<string>>(
        limit(async (_a: string, _b: number) => "", "test", 1)
    );

    expectType<number>(limit.activeCount);
    expectType<number>(limit.pendingCount);

    expectType<void>(limit.clearQueue());
    ```

2.  index.d.ts

    ```javascript
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

    ```

3.  package.json

    ```javascript
    {
        ...
        "scripts": {
            "test": "xo && ava && tsd"
        },
        ...
    }
    ```

## 其它

[补充笔记](doc/补充笔记.md)  
[依赖包介绍](doc/依赖包介绍.md)
