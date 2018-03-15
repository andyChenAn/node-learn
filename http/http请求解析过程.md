## http之请求解析过程
当客户端发起请求时，首先会进行TCP连接，连接成功后会触发服务器端的connection事件，在这个事件监听函数里，会分配一个http_parser对象来解析请求，http_parser对象提供了解析数据的每个阶段的回调函数。
- parserOnHeaders：解析请求头的回调
- parserOnHeadersComplete：请求头解析完成的回调
- parserOnBody：解析请求体的回调
- parserOnMessageComplete：请求体解析完成的回调

parserOnHeadersComplete回调函数中，当请求头解析完成后，会调用parser.onIncoming()函数
```
skipBody = parser.onIncoming(parser.incoming, shouldKeepAlive);
parser.onIncoming = parserOnIncoming.bind(undefined, this, socket, state);
```
最终会调用parserOnIncoming函数，触发服务器端的request事件，那么整个请求阶段就结束了。

parserOnBody回调函数
```
function parserOnBody(b, start, len) {
  var parser = this;
  var stream = parser.incoming;

  // if the stream has already been removed, then drop it.
  if (!stream)
    return;

  var socket = stream.socket;

  // pretend this was the result of a stream._read call.
  // 将请求体的数据推送到可读流的缓冲区中，可以通过监听data事件来读取请求体数据
  if (len > 0 && !stream._dumped) {
    var slice = b.slice(start, start + len);
    var ret = stream.push(slice);
    if (!ret)
      readStop(socket);
  }
}
```
上面的代码中，可以看出，通过调用stream.push()方法将数据推送到可读流对象(请求对象)的缓存中。

parserOnMessageComplete回调函数：
```
function parserOnMessageComplete() {
  var parser = this;
  var stream = parser.incoming;

  if (stream) {
    stream.complete = true;
    // Emit any trailing headers.
    var headers = parser._headers;
    if (headers) {
      parser.incoming._addHeaderLines(headers, headers.length);
      parser._headers = [];
      parser._url = '';
    }

    // For emit end event
    // 调用可读流的push方法，传入null，会触发可读流的end事件，表示数据已经全部读完
    stream.push(null);
  }

  // force to read the next incoming message
  readStart(parser.socket);
}
```
我们来举个例子：
```
// server.js
const http = require('http');
const server = http.createServer((req , res) => {
    var data = '';
    req.on('data' , (chunk) => {
        data += chunk.toString();
    });
    req.on('end' , () => {
        console.log(data);
    });
    res.end();
});
server.listen(3000 , () => {
    console.log('listening port 3000');
});
```
```
// client.js
const http = require('http');
const req = http.request({
    hostname : 'localhost',
    port : 3000,
    method : 'POST'
} , (res) => {

});
req.write('hello andychen');
req.end();
```
当客户端发送请求时，在解析完请求头后会触发服务器端的request事件，从而调用该事件的监听函数，而通过请求对象绑定data事件来获取请求体的数据，当请求体被解析完成后，会触发请求对象的end事件。
### 总结
- 第一步，当客户端请求发送时，首先会进行TCP连接
- 第二步，连接成功后会触发服务器端的connection事件，并调用该监听函数。
- 第三步，在connection事件监听函数中，会分配一个http_parser对象来解析这次请求。
- 第四步，http_parser对象将解析请求分为以下几个阶段
  - 解析请求头阶段，该阶段会调用parserOnHeaders回调函数
  - 请求头解析完成阶段，该阶段会调用parserOnHeadersComplete回调函数
  - 解析请求体阶段，该阶段会调用parserOnBody回调函数
  - 请求体解析完成阶段，该阶段会调用parserOnMessageComplete回调函数。
- 第五步，解析完请求头，就会触发服务器端的request事件，至此解析请求的部分就已经完成了

**在解析请求体的过程中，请求体的数据一直都是在流中，我们可以在request事件回调函数中，通过监听请求对象的data事件来获取请求体中的数据**