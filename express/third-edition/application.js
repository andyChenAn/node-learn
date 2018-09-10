const http = require('http');
const Router = require('./route/index.js');
let slice = Array.prototype.slice;
let app = exports = module.exports = {};
app.listen = function () {
    let server = http.createServer(function (req , res) {
        app._router.handle(req , res);
    });
    server.listen.apply(server , arguments);
};

app.lazyRouter = function () {
    if (!this._router) {
        this._router = new Router();
    };
    return this;
};
http.METHODS.forEach(function (method) {
    method = method.toLowerCase();
    app[method] = function (path , handle) {
        // 创建唯一的Router对象
        this.lazyRouter();
        let route = this._router.route(path);
        route[method].apply(route , slice.call(arguments , 1));
    }
});