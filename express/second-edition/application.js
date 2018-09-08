const http = require('http');
const Router = require('./route/index.js');
let app = exports = module.exports = {};
let router = new Router();
app.listen = function () {
    let server = http.createServer(function (req , res) {
        router.handle(req , res);
    });
    server.listen.apply(server , arguments);
};
app.get = function (path , handle) {
    router.get(path , handle);
};