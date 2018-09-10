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
module.exports = Layer;