/*
 * @Description:
 * @Author: F-Stone
 * @LastEditTime: 2022-04-25 13:28:14
 */
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
                    return Promise.resolve(task(argument)).then((response) => {
                        limit.activeCount--;
                        if (limit.pendingCount === 0) {
                            frontTasks = [];
                        }

                        return response;
                    });
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
                    return Promise.resolve(task(argument)).then((response) => {
                        limit.activeCount--;
                        if (limit.pendingCount === 0) {
                            frontTasks = [];
                        }

                        return response;
                    });
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
