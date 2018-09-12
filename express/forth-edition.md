# 仿express框架心路历程(4)
接着上一篇，我们已经实现了添加路由中间件系统，接下来，我们就来完成非路由中间件的添加，在express中，通过app.use方法来添加非路由中间件。添加非路由中间件其实和添加路由中间件的方式是差不多的。

```
app.use = function (handle) {
    let path = '/';
    this.lazyRouter();
    if (typeof handle !== 'function') {
        path = handle;
        handle = arguments[1];
    };
    this._router.use(path , handle);
    return this;
};
```

```
// 添加非路由中间件
Router.prototype.use = function (path , handle) {
    path = path || '/';
    handle = handle;
    let layer = new Layer(path , handle);
    layer.route = undefined;
    this.stack.push(layer);
    return this;
};
```
从上面代码中，可以看出，有一个地方需要注意，如果是非路由中间件，那么layer.route的值为undefined，而如果是路由中间件layer.route的值是route。

除此之外，我们还需要修改的一个地方是，当请求过来是，我们要判断是路由中间件还是非路由中间件，并执行相应代码。

```
if (layer.match(req.url)) {
    // 不是路由中间件
    if (!layer.route) {
        layer.handle_request(req , res , next);
    } else if (layer.route.has_method(method)) {
        layer.handle_request(req , res , next);
    }
} else {
    layer.handle_error(layerError , req , res , next);
}
```