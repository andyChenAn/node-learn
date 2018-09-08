# 仿express的心路历程（1）
express是一个web开发框架，既然是一个web开发框架，那么我们就要熟悉它是怎么搭建web服务器的，以及是怎么处理请求的。

通过express官方给的案例：
```
const express = require('./express.js');
const app = express();
app.get('/' , function (req , res) {
    res.end('hello world');
});
app.listen(3000 , function () {
    console.log('listening port 3000');
});
```
在这个案例中，express框架做了两件事情：1、搭建web服务器，2、处理get请求。我们如何自己来实现这两个功能呢？

### 搭建web服务器
我们都知道通过nodejs的http模块，可以快速的搭建一个本地web服务器：

```
const http = require('http');
let server = http.createServer(function (req , res) {
   res.end('hello andy'); 
});
server.listen(3000 , function () {
    console.log('listening port 3000');
})
```
通过nodejs来创建本地服务器是不是很简单呢？那么我们从express框架的案例中可以看出，express是一个函数，当调用这个函数时，返回的是一个app对象，app对象上有两个方法，一个是get方法，一个是listen方法。get方法和listen方法有什么用呢？get方法的作用就是用来添加路由的，listen方法的作用就是用来创建web服务器的。

什么是路由呢？路由就是根据url来匹配相应的处理程序。那么具体是怎么匹配的呢？根据请求路径和请求方法，我们就能匹配到对应的处理程序。所以我们需要有一个路由容器，用来存放路由。如果匹配不到呢？那就所以没有这个页面，返回404给浏览器。

知道了大概意思，我们就来实现以下相应的功能：

```
const http = require('http');
// 创建一个路由容器，用来存放路由
let router = [{
    path : '*',
    method : '*',
    handle : function (req , res) {
        res.writeHead(404 , 'Not Found' , {
            'Content-Type' : 'text/plain'
        });
        res.end('the page is not found');
    }
}];

let app = exports = module.exports = {};

// listen方法
app.listen = function () {
    let server = http.createServer(function (req , res) {
        // 当一个请求进来时，遍历整个路由容器，找到匹配的应用程序，并执行
        // 如果没有匹配到，那么就响应404
        for (let i = 0 , len = router.length ; i < len ; i++) {
            if (req.url == router[i].path && req.method.toLocaleLowerCase() == router[i].method) {
                return router[i].handle && router[i].handle(req , res);
            }
        };
        return router[0].handle && router[0].handle(req , res);
    });
    server.listen.apply(server , arguments);
};

// get方法，用来添加get请求路由
app.get = function (path , handle) {
    router.push({
        path : path,
        handle : handle,
        method : 'get'
    });
};
```