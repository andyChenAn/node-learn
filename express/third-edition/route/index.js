const Layer = require('./layer.js');
const Route = require('./route.js');
let slice = Array.prototype.slice;
function Router () {
    this.stack = [new Layer('*' , function (req , res) {
        res.writeHead(404 , 'Not Found' , {
            'Content-Type' : 'text/plain'
        });
        res.end('the page is not found');
    })];
};
Router.prototype.handle = function (req , res) {
    for (let i = 0 , len = this.stack.length ; i < len ; i++) {
        // 如果router对象中的path属性和请求路径相同，那么就可以调用router对象中的layer对象的handle_request方法来调用相应的handle
        // 又因为router对象的layer对象保存的应用程序是绑定route.dispatch方法，所以其实最终执行的是route.dispath方法，在这个方法中去遍历route对象中的layer，
        // 然后判断请求方法是否匹配，如果匹配就执行该处理函数
        if (this.stack[i].match(req.url)) {
            this.stack[i].handle_request(req , res);
        }
    };
    return this.stack[0].handle_request(req , res);
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
