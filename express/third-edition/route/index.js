const Layer = require('./layer.js');
const Route = require('./route.js');
let slice = Array.prototype.slice;
function Router () {
    this.stack = [];
};
Router.prototype.handle = function (req , res , done) {
    let index = 0;
    let stack = this.stack;
    let method = req.method.toLowerCase();
    function next (err) {
        let layerError = err == 'route' ? null : err;
        if (layerError === 'router') {
            return done(null);
        };
        if (layerError) {
            return done(layerError);
        };
        if (index >= stack.length) {
            return done(layerError);
        };
        let layer = stack[index++];
        // 如果router对象中的path属性和请求路径相同，那么就可以调用router对象中的layer对象的handle_request方法来调用相应的handle
        // 又因为router对象的layer对象保存的应用程序是绑定route.dispatch方法，所以其实最终执行的是route.dispath方法，在这个方法中去遍历route对象中的layer，
        // 然后判断请求方法是否匹配，如果匹配就执行该处理函数
        if (layer.match(req.url) && layer.route.has_method(method) && layer.route) {
            layer.handle_request(req , res , next);
        } else {
            layer.handle_error(layerError , req , res , next);
        };
    };
    next();
};
Router.prototype.route = function (path) {
    let route = new Route(path);
    // 这里其实就是path对应route对象中的handle
    // 因为handle是保存在route对象中的layer对象
    let layer = new Layer(path , route.dispatch.bind(route));
    layer.route = route;
    this.stack.push(layer);
    return route;
};
module.exports = Router;
