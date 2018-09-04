# express的路由机制
搞懂了express的路由机制，基本上算是搞懂了express框架。

### 什么是路由？
在web开发中，路由是指根据url分配到对应的处理程序。

### express是怎么实现路由功能的呢？
对于这个问题，我们可以通过一段简单的代码来慢慢展开：
```
const express = require('express');
const app = express();

app.get('/' , function (req , res) {
    res.end('hello andy');
});

app.listen(3000 , function () {
    console.log('listening port 3000');
})
```
上面的代码应该是很简单的了，创建一个本地服务器，监听3000端口，通过浏览器访问localhost:3000时，服务器响应"hello andy"给浏览器。

那服务器是怎么知道我访问的是哪个页面，并且返回正确的数据呢？这个就是需要使用路由了，通过不同的url，调用不同的应用程序。

从表面上来看，当调用app.get方法时，好像是把请求的url的路径和响应的处理程序关联起来了，请求哪个路径，就调用相应的处理程序。具体express内部是怎么执行的呢？在application.js文件中找了半天都没看到app.get方法，后来发现，express中的请求方法都是动态添加的。

```
methods.forEach(function(method){
  app[method] = function(path){
    if (method === 'get' && arguments.length === 1) {
      // app.get(setting)
      return this.set(path);
    }

    this.lazyrouter();
    var route = this._router.route(path);
    route[method].apply(route, slice.call(arguments, 1));
    return this;
  };
});
```
从上面代码中，可以发现，methods是一个数组，里面存放了一系列http请求方法，通过遍历数组，给app对象添加一系列与http请求方法同名的方法，比如：app.get,app.post等，比如：

```
app.get = function (path) {
    // 相关逻辑...
}
```
当我们调用app.get方法时，首选该方法内部会创建一个Router对象，然后调用this._router.route方法创建一个Route对象，最后调用route[method]方法并传入对应的处理程序完成path与handler的关联。在这段代码中我们需要注意的是：

1、lazyrouter方法只会在首次调用的时候实例化Router对象，并将其保存在this._router上。

2、这段代码中，创建了一个Router对象，也创建了一个Route对象，这两者之间的区别，Router可以看作是一个中间件容器，不仅可以存放路由中间件(Route)，还可以存放其他中间件，而Route仅仅是路由中间件，封装了路由信息。Router对象和Route对象都各自维护了一个stack数组，该数组保存了layer对象，而中间件相关的信息都被保存在layer对象中，所以可以说stack数组就是用来保存中间件的。而我们怎么来区分是路由中间件还是非路由中间件呢？就是通过layer.route来判断，如果layer.route=route，则表示该中间件时路由中间件，如果layer.route=undefined，则表示该中间件是非路由中间件。

3、通过调用route[method]添加中间件，
