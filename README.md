# Read p-limit

源码阅读计划 第一期:

源码地址：[p-limit](https://github.com/sindresorhus/p-limit)
笔记地址：[read-p-limit](https://github.com/fortress-fight/read-p-limit)

## 前言

### p-limit 介绍

> Run multiple promise-returning & async functions with limited concurrency  
> p-limit 是用于在规定的并发数下，执行异步方法

### 学习目标

-   [x] 根据 p-limit 的测试文件，实现 p-limit 的功能
-   [x] 对比并分析 p-limit 的实现方式
-   [x] 调整由自己实现的 p-limit

## 项目初始化

> node 16.14.2  
> yarn 1.22.18

```bash
mkdir read-p-limit
cd read-p-limit
yarn init -y
npx gitignore node
```

1.  安装依赖

    ```shell
    yarn add ava delay inRange timeSpan random-int xo tsd -D
    yarn add yocto-queue
    ```

2.  添加测试文件 test.js

    ```javascript
    import test from "ava";
    import delay from "delay";
    import inRange from "in-range";
    import timeSpan from "time-span";
    import pLimit from "./index.js";
    ```

3.  修改 package.json

    ```javascript
    {
        ...
        "scripts": {
            "fixed": "xo --fix",
            "test": "xo && ava"
        },
        ...
    }
    ```

    **Note:** 如果对格式没有要求，移除 `xo` 相关内容

## Tasks

按照需求分步骤的完成以下任务，可以尝试自己能否完成测试。

测试代码可查看 [test.js](https://github.com/sindresorhus/p-limit/blob/main/test.js)

-   [x] Task1 通过测试 `concurrency: 1` `concurrency: 4` 以及 `non-promise returning function`
-   [x] Task2 通过测试 `continues after sync throw`
-   [x] Task3 通过测试 `accepts additional arguments`
-   [x] Task4 通过测试 `activeCount and pendingCount properties` 与 `does not ignore errors`
-   [x] Task5 通过测试 `throws on invalid concurrency argument`
-   [x] Task6 添加清空队列的方法 `clearQueue`
-   [x] Task7 添加类型定义文件 `index.d.ts & index.test-d.ts`

我的实现步骤可查看 [代码实现记录](https://github.com/fortress-fight/read-p-limit/blob/master/doc/%E4%BB%A3%E7%A0%81%E5%AE%9E%E7%8E%B0%E8%AE%B0%E5%BD%95.md)

## 源码阅读

源码地址：[p-limit](https://github.com/sindresorhus/p-limit)  
阅读笔记：[read-p-limit](https://github.com/fortress-fight/read-p-limit/blob/master/doc/read-p-limit.md);

## 其它

[补充笔记](https://github.com/fortress-fight/read-p-limit/blob/master/doc/%E8%A1%A5%E5%85%85%E7%AC%94%E8%AE%B0.md)  
[依赖包介绍](https://github.com/fortress-fight/read-p-limit/blob/master/doc/%E4%BE%9D%E8%B5%96%E5%8C%85%E4%BB%8B%E7%BB%8D.md)
