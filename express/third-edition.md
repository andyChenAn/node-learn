# 仿express框架心路历程(3)
接着上一篇，我们已经仿造出来了一个简单的路由系统，但是，我们发现目前只支持get请求，如果是其他http请求呢？就不支持了，所以我们这里需要将其他请求也添加进去。具体做法是遍历http.METHODS属性中的http方法，一个一个的添加。
```
http.METHODS.forEach(function (method) {
    app[method] = function (method , path , handle) {
        router.get(method , path , handle);
    }
});
```
看上面的代码貌似没有问题，但是我们发现，第一个参数不应该是method，而是path，比如：app.get('/' , fn)，所以我们要改变一下方式：

```
http.METHODS.forEach(function (method) {
    method = method.toLowerCase();
    app[method] = function (path , handle) {
        // 创建唯一的Router对象
        this.lazyRouter();
        let route = this._router.route(path);
        route[method].apply(route , slice.call(arguments , 1));
    }
});
```

```
Router.prototype.route = function (path) {
    let route = new Route(path);
    let layer = new Layer(path , route.dispatch.bind(route));
    layer.route = route;
    this.stack.push(layer);
    return route;
};
```

而所有关于路由的处理，都是通过Route对象来完成：
```
http.METHODS.forEach(function (method) {
    method = method.toLowerCase();
    Route.prototype[method] = function () {
        let handles = slice.call(arguments);
        for (let i = 0 , len = handles.length ; i < len ; i++) {
            let handle = handles[i];
            if (typeof handle !== 'function') {
                throw new Error(handle + 'must be a function');
            }
            let layer = new Layer('/' , handle);
            layer.method = method.toLowerCase();
            this.methods[method] = true;
            this.stack.push(layer);
            return this;
        };
    }
});
```
其实通过代码我们发现，app[method]最后都是通过route.prototype[method]来完成的。

当我们实现了其他http请求方法的处理逻辑之后，我们接下来要看一下express的路由系统的流程控制是怎样的？

当我们在写代码的时候，我们有时候会调用一个next方法，调用next之后，就会执行当前路径匹配的下一个处理函数，否则就只会执行第一个处理函数。这里主要是通过函数递归来实现。

1、我们首先需要在最后处理请求的地方加上一个next参数：
```
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
```