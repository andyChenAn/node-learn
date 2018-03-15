## http对象池
在nodejs中，http请求的解析是通过http_parser模块来实现的，这是一个用c语言写的，而暴露到nodejs上就是一个HTTPParser对象。
```
// _http_server.js文件
const HTTPParser = process.binding('http_parser').HTTPParser;
```
我们来看一个简单的例子：
```
const http = require('http');
const server = http.createServer((req , res) => {
    res.writeHead(200 , 'success' , {
        'Content-Type' : 'text/plain'
    })
    res.write('hello andy');
    res.end();
});
server.listen(3000 , () => {
    console.log('listening port 3000');
})
```
当调用http.createServer()方法时，其实就是创建服务器
```
function createServer(requestListener) {
  return new Server(requestListener);
}

function Server(requestListener) {
  if (!(this instanceof Server)) return new Server(requestListener);
  net.Server.call(this, { allowHalfOpen: true });

  if (requestListener) {
    this.on('request', requestListener);
  }

  // Similar option to this. Too lazy to write my own docs.
  // http://www.squid-cache.org/Doc/config/half_closed_clients/
  // http://wiki.squid-cache.org/SquidFaq/InnerWorkings#What_is_a_half-closed_filedescriptor.3F
  this.httpAllowHalfOpen = false;

  this.on('connection', connectionListener);

  this.timeout = 2 * 60 * 1000;
  this.keepAliveTimeout = 5000;
  this._pendingResponseData = 0;
  this.maxHeadersCount = null;
}
```
创建服务器，并监听request事件和connection事件，当客户端发起请求时，首先会进行TCP连接，连接成功会触发服务器端的connection事件。在connection事件的监听函数里会从parsers中取出一个空闲的http_parser对象，使用这个http_parser对象解析当前的http请求，http_parser对象提供了解析数据的每个阶段的回调函数。

nodejs的http服务器每收到一个请求就会用一个http_parser对象来解析这个请求，如果每接受一个请求就需要实例化出一个http_parser对象来处理，如果并发数很高的话，那么就需要很多个http_parser对象来解析请求，这样频繁的创建http_parser对象，会带来性能消耗的，所以nodejs便产生了对象池，专门用来管理http_parser对象的，而这个对象池也就是nodejs源码中的freelist。
```
'use strict';
// 该对象池构造函数接受三个参数，第一个参数是对象池的名字，第二个参数是对象池最大容量，第三个参数是创建对象池中的对象的构造函数
class FreeList {
  constructor(name, max, ctor) {
    this.name = name;
    this.ctor = ctor;
    this.max = max;
    this.list = [];
  }
  // 看对象池中是否存在空闲的对象，如果有，就直接拿过来用，如果没有，则创建一个对象
  alloc() {
    return this.list.length ?
      this.list.pop() :
      this.ctor.apply(this, arguments);
  }
  // 将对象放入对象池中
  free(obj) {
    if (this.list.length < this.max) {
      this.list.push(obj);
      return true;
    }
    return false;
  }
}
module.exports = FreeList;
```
下面的代码中，创建了一个名为'parsers'的对象池。
```
var parsers = new FreeList('parsers', 1000, function() {
  // 创建http_parser对象
  var parser = new HTTPParser(HTTPParser.REQUEST);

  parser._headers = [];
  parser._url = '';
  parser._consumed = false;

  parser.socket = null;
  parser.incoming = null;
  parser.outgoing = null;

  // Only called in the slow case where slow means
  // that the request headers were either fragmented
  // across multiple TCP packets or too large to be
  // processed in a single run. This method is also
  // called to process trailing HTTP headers.
  // 用http_parser对象解析请求的各个阶段的回调函数，解析请求头阶段，请求头解析完成阶段，解析请求体阶段，请求体解析完成阶段
  parser[kOnHeaders] = parserOnHeaders;
  parser[kOnHeadersComplete] = parserOnHeadersComplete;
  parser[kOnBody] = parserOnBody;
  parser[kOnMessageComplete] = parserOnMessageComplete;
  parser[kOnExecute] = null;

  return parser;
});
```
Node.js中用这段代码创建了一个叫parsers,大小为1000的对象池，当Node.js服务器接收到一个request时便向这个对象池索取一个HTTPParser对象即调用对象池parsers的alloc方法，此时便拿到了一个parser对象，parser对象解析完http报文后node并没有立即释放它，而是将它重新放入对象池parsers中，即调用parsers.free(parser),当然了只有当池子还没满的时候才可以重新被放进去。如此便实现了parser对象的重复利用，当并发数很高时极大的提升性能。

[参考这里](https://github.com/hustxiaoc/node.js/issues/1)