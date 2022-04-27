# Read p-limit

源码阅读计划 第一期: [p-limit](https://github.com/sindresorhus/p-limit)

## 前言

### p-limit 介绍

> Run multiple promise-returning & async functions with limited concurrency  
> p-limit 是用于在规定的并发数下，执行异步方法

### 学习目标

:white_check_mark: 根据 p-limit 的测试文件，实现 p-limit 的功能  
:white_check_mark: 对比并分析 p-limit 的实现方式  
:white_check_mark: 调整由自己实现的 p-limit

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
            "fixed": "xo --fix",
            "test": "xo && ava"
        },
        ...
    }
    ```

    **Note:** 如果对格式没有要求，移除 `xo` 相关内容

## 代码主体实现

按照需求分步骤的完成以下任务

测试代码可查看 [test.js](https://github.com/sindresorhus/p-limit/blob/main/test.js)

:white_check_mark: Task1 通过测试 `concurrency: 1` `concurrency: 4` 以及 `non-promise returning function`  
:white_check_mark: Task2 通过测试 `continues after sync throw`  
:white_check_mark: Task3 通过测试 `accepts additional arguments`  
:white_check_mark: Task4 通过测试 `activeCount and pendingCount properties` 与 `does not ignore errors`  
:white_check_mark: Task5 通过测试 `throws on invalid concurrency argument`  
:white_check_mark: Task6 添加清空队列的方法 `clearQueue`  
:white_check_mark: Task7 添加类型定义文件 `index.d.ts & index.test-d.ts`

我的实现步骤可查看 [代码实现记录](doc/代码实现记录.md)

## 源码阅读

源码地址：[p-limit](https://github.com/sindresorhus/p-limit)  
阅读笔记：[read-p-limit](/doc/read-p-limit.md);

## 其它

[补充笔记](doc/补充笔记.md)  
[依赖包介绍](doc/依赖包介绍.md)
