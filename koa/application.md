# application
Koa应用程序是一个包含一组中间件函数的对象。

```javascript
const Koa = require('koa');
const app = new Koa();

app.use(async ctx => {
    ctx.body = 'hello andy';
})

app.listen(3000 , () => {
    console.log('listening port on 3000');
});
```
我们知道application是一个对象，这个对象里面包含一组中间件，而中间件主要是通过use方法添加到application对象中的。接下来我们通过源码来了解下application具体都做了哪些事情。其实上面的代码包括了application对象做的大部分工作。

#### applicatin对象的listen方法

```javascript
listen(...args) {
    debug('listen');
    const server = http.createServer(this.callback());
    return server.listen(...args);
}

callback() {
    const fn = compose(this.middleware);
    
    if (!this.listenerCount('error')) this.on('error', this.onerror);
    
    const handleRequest = (req, res) => {
        const ctx = this.createContext(req, res);
        return this.handleRequest(ctx, fn);
    };
    return handleRequest;
}
```
上面代码中，listen方法内部其实就是调用原生的http模块的createServer方法来创建一个服务器，并调用服务器对象的listen方法来监听指定的端口，而调用application的callback方法主要是返回一个处理http请求的回调函数，当接收到一个请求时，就会调用这个回调函数。

#### application对象的callback方法

```javascript
callback() {
    const fn = compose(this.middleware);
    
    if (!this.listenerCount('error')) this.on('error', this.onerror);
    
    const handleRequest = (req, res) => {
        // 创建一个context对象
        const ctx = this.createContext(req, res);
        return this.handleRequest(ctx, fn);
    };
    return handleRequest;
}

handleRequest(ctx, fnMiddleware) {
    const res = ctx.res;
    res.statusCode = 404;
    const onerror = err => ctx.onerror(err);
    const handleResponse = () => respond(ctx);
    onFinished(res, onerror);
    return fnMiddleware(ctx).then(handleResponse).catch(onerror);
}
```
callback方法主要做了以下几件事情：
- 返回一个接收请求的回调函数
- 调用compose函数将所有的中间件连接起来

#### 中间件是怎么执行的？
##### 1、首先通过application的use方法将中间件添加到middleware中（middleware是一个数组，用来保存中间件）

```javascript
use(fn) {
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
        if (isGeneratorFunction(fn)) {
            deprecate('Support for generators will be removed in v3. ' +
                    'See the documentation for examples of how to convert old middleware ' +
                    'https://github.com/koajs/koa/blob/master/docs/migration.md');
            fn = convert(fn);
        }
    debug('use %s', fn._name || fn.name || '-');
    this.middleware.push(fn);
    return this;
}
```
当调用use方法时，会先对参数进行判断，然后将中间件添加到this.middleware数组中。
##### 2、调用compose函数将数组中的中间件函数进行连接

```javascript
function compose (middleware) {
    // 检查中间件
    if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
    for (const fn of middleware) {
        if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
    }

  /**
   * @param {Object} context
   * @return {Promise}
   * @api public
   */
    // 返回一个函数
    return function (context, next) {
        // last called middleware #
        let index = -1
        return dispatch(0)
        function dispatch (i) {
            if (i <= index) return Promise.reject(new Error('next() called multiple times'))
            index = i
            let fn = middleware[i]
            if (i === middleware.length) fn = next
            if (!fn) return Promise.resolve()
            try {
                return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
            } catch (err) {
                return Promise.reject(err)
            }
        }
    }
}
```
我们通过这段代码来看一下中间件具体的执行过程，当接收到一个请求时，就会执行compose函数返回的这个函数：

- 1、首先会调用dispatch(0)，这个调用主要是从this.middleware数组中，取出第一个中间件函数，并执行。
- 2、当调用fn(context, dispatch.bind(null, i + 1))时，也就是调用第一个中间件函数，如果这个中间件函数内部存在await next()语句，那么就会调用dispatch.bind(null, i + 1)返回的函数，那么又会执行dispatch，从而取出第二个中间件函数执行，如果第二个中间件函数内部存在await next()语句，那么就又会调用dispatch.bind(null, i + 1)返回的函数，又执行dispatch，从而取出第三个中间件函数执行，以此类推，直到所有的中间件都执行完。
- 3、当最后一个中间件函数执行完之后，又会将执行权交给上游的函数，上游的函数会继续执行await next()语句后面的代码，直到代码执行完，再将执行权交给它的上游函数，依次类推，直到最上游的中间件函数的代码执行完为止。
