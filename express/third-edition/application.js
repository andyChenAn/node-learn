const http = require('http');
const Router = require('./route/index.js');
let slice = Array.prototype.slice;
let app = exports = module.exports = {};
app.listen = function () {
    let server = http.createServer(function (req , res) {
        // 统一错误处理
        let done = function (err) {
            console.log(err);
            res.writeHead(404 , 'Not Found' , {
                'Content-Type' : 'text/plain'
            });
            res.end(err.stack);
        };
        app._router.handle(req , res , done);
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
        return this;
    }
});