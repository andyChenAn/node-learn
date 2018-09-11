// 这里需要注意的是：
// Router对象中的stack属性保存的layer对象主要保存path和route
// Route对象中的stack属性保存的layer对象主要保存的是method和handle
function Layer (path , handle) {
    this.path = path;
    this.handle = handle;
    this.name = handle.name || '<anonymous>';
};
Layer.prototype.match = function (path) {
    if (this.path == path) {
        return true;
    }
    return false;
};
Layer.prototype.handle_request = function (req , res , next) {
    let handle = this.handle;
    if (handle) {
        try {
            handle(req , res , next);
        } catch (err) {
            next(err);
        }
    };
};
Layer.prototype.handle_error = function (err , req , res , next) {
    let handle = this.handle;
    // 如果是报错，那么就会有四个参数，第一个是error参数
    // 一般情况下，并不会报错，所以如果中间件函数小于4个参数，那么就直接执行下一个中间件函数
    // 这里有可能是因为路径不匹配到这里来进行处理的，所以只需要调用next方法，执行下一个中间件即可
    if (handle.length != 4) {
        return next(err);
    }
    try {
        handle(err , req , res , next);
    } catch (err) {
        next(err);
    }
};
module.exports = Layer;