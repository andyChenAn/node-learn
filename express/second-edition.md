# 仿express框架心路历程(2)
接着上一篇，当我们实现了express官方案例的功能后，我们会发现一些问题，比如，1、如果请求页面很多，那么我们需要遍历的路由容器会越来越大，2、路由的添加和路由的处理都应该有一个路由对象来完成，而不应该放在app.listen方法中去处理，按照面向对象的方式，我们需要创建一个路由类，来处理路由。所以我们需要创建一个简单的路由系统。

### 创建路由系统
创建路由系统，其实就是将与路由相关的信息封装到路由对象中，由路由对象统一处理，在设计中，职责划分要清晰。

创建一个路由类：
```
function Router () {
    this.stack = [
        {
            path : '*',
            method : '*',
            handle : function (req , res) {
                res.writeHead(404 , 'Not Found' , {
                    'Content-Type' : 'text/plain'
                });
                res.end('the page is not found');
            }
        }
    ]
};
Router.prototype.get = function (path , handle) {
    this.stack.push({
        path : path,
        method : 'get',
        handle : handle
    });
};
Router.prototype.handle = function (req , res) {
    for (let i = 0 , len = this.stack.length ; i < len ; i++) {
        if (req.url == this.stack[i].path && req.method.toLowerCase() == this.stack[i].method) {
            return this.stack[i].handle && this.stack[i].handle(req , res);
        }
    };
    return this.stack[0].handle && this.stack[0].handle(req , res);
};
module.exports = Router;
```
将application.js里的代码修改下：
```
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
```
这样我们代码很清晰，所有的有关路由的操作都是通过Router对象来处理，与app对象分离。但是如果路由添加的越来越多，需要遍历stack去匹配相应的路由，这样的处理效率会比较低。而且路径和请求方法并不是一对一的，同一个路径，可以有不同的请求方法。所以我们需要再进行划分，将路径相同的所有路由都放在一起，这样效率会高一点，因此我们引入Layer类

```
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
Layer.prototype.handle_request = function (req , res) {
    let handle = this.handle;
    if (handle) {
        handle(req , res);
    }
};
module.exports = Layer;
```