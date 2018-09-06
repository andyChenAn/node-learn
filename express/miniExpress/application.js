const http = require('http');
const Router = require('./router/index.js');
let app = exports = module.exports = {};
let methods = ['get' , 'post'];
let slice = Array.prototype.slice;
// 创建服务器
app.listen = function () {
    let server = http.createServer(this);
    return server.listen.apply(server , arguments);
};
app.lazyRouter = function () {
    if (!this._router) {
        this._router = new Router();
    };
    return this;
};
app.handle = function (req , res) {
    let router = this._router;
    router.handle(req , res);
};

methods.forEach(function (method) {
    app[method] = function (path) {
        if (typeof path !== 'string') {
            throw new Error('路径必须是一个字符串');
        };
        this.lazyRouter();
        let route = this._router.route(path);
        route[method].apply(route , slice.call(arguments , 1));
    };
});