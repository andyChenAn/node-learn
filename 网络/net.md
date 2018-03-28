## net网络
在使用nodejs时，如果我们想要创建一个本地服务器，一般都会这样：
```
const http = require('http');
const server = http.createServer((req , res) => {
    res.end('hello world');
});
server.listen(3000 , () => {
    console.log('listening port 3000')
})
```
从上面的代码中，我们可以看出，其实实现起来是非常简单的，那么nodejs内部具体是如何做到的呢？
- 首先我们需要知道http模块是对net模块的进一步封装，而http.createServer方法是继承自net.createServer方法的，所以最终会调用net.createServer()。
- 调用net.createServer()方法的目的就是创建TCP，我们都知道，TCP是面向连接，提供可靠的，基于字节流的服务。所以在传输数据之前，客户端和服务器双方需要先建立连接。
- TCP服务器会创建一个socket，同样发送请求的客户端也会创建一个socket，然后通过socket来操作网络通信。

所以上面代码最终都会通过nodejs的net模块来实现网络io。**而net模块主要做了两件事情，一个就是创建TCP，一个就是创建socket。**

TCP：提供面向连接的，可靠的，基于字节流的服务。客户端和服务器在传输数据之前，需要先建立连接。

Socket：支持TCP/IP网络通信的基本操作单元，是我们TCP/IP进行通信的接口。