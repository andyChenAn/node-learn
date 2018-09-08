const Layer = require('./layer.js');
function Route (path) {
    this.path = path;
    this.stack = [];
    this.methods = {};
};
Route.prototype.has_method = function (method) {
    let methodName = method.toLowerCase();
    return Boolean(this.methods[methodName]);
};
Route.prototype.get = function (handle) {
    // 这个'/'只是因为Layer结构就是这样，所以就直接用'/'，这并不是真正的路径，真正的路径保存在Router对象的Layer对象上
    // 而Route对象的Layer对象主要保存的是method和handle
    // Router对象的Layer对象主要保存的是path和route属性
    let layer = new Layer('/' , handle);
    layer.method = 'get';
    this.methods['get'] = true;
    this.stack.push(layer);
    return this;
};
Route.prototype.dispatch = function (req , res) {
    let method = req.method;
    for (let i = 0 , len = this.stack.length ; i < len ; i++) {
        if (this.has_method(method)) {
            return this.stack[i].handle_request(req , res);
        }
    }
};

module.exports = Route;