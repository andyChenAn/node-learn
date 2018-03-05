# 缓冲区(Buffer)
[参考朴灵的深入浅出nodejs](https://github.com/JacksonTian)
在nodejs中，Buffer是一个全局对象，主要用来处理二进制数据流。Buffer类的实例类似于整数数组，但是Buffer的大小是固定不变的，Buffer的大小在被创建的时候就已经确定了，无法修改。Buffer是基于Uint8Array来实现的，所以Buffer实例也是Uint8Array实例。

```
const buf = Buffer.alloc(5);
console.log(buf instanceof Uint8Array);   // true
```
### Buffer , TypedArray , ArrayBuffer
- Buffer：Nodejs提供的用来操作二进制数据的接口
- TypedArray：表示描述一个底层的二进制数据缓冲区的一个类似数组视图。实际上是没有一个名为TypedArray的全局对象或名为TypedArray的构造函数。比如，int8Array,Uint8Array,int16Array,Uint16Array等这些都是类型数组
- ArrayBuffer：表示固定大小的原始的二进制数据缓冲区

### 创建Buffer实例
- Buffer.alloc()
- Buffer.from()
- Buffer.allocUnsafe()

之前可以使用new Buffer()来创建Buffer实例，但是通过这种方式创建时，会根据传入的第一个参数的数据类型创建不同的Buffer实例，这会导致代码不安全，不可靠。
```
const buffer1 = new Buffer(1);
const buffer2 = new Buffer('1');
// 传入的第一个参数是数字1，所以会创建一个长度为1的Buffer实例
console.log(buffer1);
// 传入的第一个参数是字符串的1，所以会创建一个填充了字符串1的Buffer实例
console.log(buffer2);
```
结果：
```
<Buffer 00>
<Buffer 31>
```
上面的代码可以看到，通过构造函数来创建Buffer实例，并没有对传入的第一个参数的数据类型做判断，如果我们自己在写代码的时候，没有正确的去判断数据类型，那么很有可能得到一个不是我们自己想要的Buffer实例。所以nodejs已经放弃了这种方式。当我们想要给Buffer实例指定一个长度时，我们可以使用Buffer.alloc()方法，如果我们传入的第一个参数不是数字，那么会报错。
```
const buffer = Buffer.alloc('12');
```
结果：
```
TypeError: "size" argument must be a number

```
所以通过这样的方式创建Buffer实例会更加的可靠和安全。

除了Buffer.alloc()方法之外，我们还可以使用Buffer.from()方法来创建Buffer实例。第一个参数可以传入数组，字符串，buffer。这里需要注意的是，如果第一个参数传入的是一个ArrayBuffer，那么会返回一个与给定的ArrayBuffer共享分配内存的Buffer。
```
const arr = new Uint16Array(2);
arr[0] = 5000;
arr[1] = 4000;

const buf1 = Buffer.from(arr); // 拷贝了该 buffer
const buf2 = Buffer.from(arr.buffer); // 与该数组共享了内存

console.log(buf1);
// 输出: <Buffer 88 a0>, 拷贝的 buffer 只有两个元素
console.log(buf2);
// 输出: <Buffer 88 13 a0 0f>

arr[1] = 6000;
console.log(buf1);
// 输出: <Buffer 88 a0>
console.log(buf2);
```
### 将Buffer实例中的数据转为其他格式
举个例子，当我们读取完成一个文件时，返回的数据是一个buffer，这个其实我们也看不懂，那么怎么将它转为我们看得懂的数据呢？通过buffer.toString()方法可以实现：
```
const fs = require('fs');
fs.readFile('./andy.txt' , (err , chunk) => {
	if (err) {
		throw new Error(err.code , err.message);
	}
	// 这里的toString()方法的第一个参数可以传入一个编码类型，比如：'utf8','base64','ascii'，'hex'等
	console.log(chunk.toString())
})
```
### 使用Buffer来修改字符串编码
当我们在注册时，需要将用户名和密码保存，那么我们可能需要做加密，这个时候，我们可以通过Buffer.toString()方法，将buffer数据修改为指定的字符串编码类型。
```
const user = 'andy';
const pass = '900304';
const str = user + ':' + pass;
const buffer = Buffer.from(str);
//这里我们将buffer数据转为base64编码的字符串
const encoded = buffer.toString('base64');
console.log(encoded);
```
结果：
```
YW5keTo5MDAzMDQ=
```
### 处理data URIs
首先什么是data URIs？

data URIs有四个部分组成：前缀(data:)，mimeType(MIME类型)，字符编码(非文本的话就是base64)，数据本身。
```
data:[<mediatype>][;base64],<data>
```
对于浏览器来说，我们经常会将一些很小的图片转为base64格式的data URIs，以减少图片的请求数量。那么通过nodejs的Buffer.toString()方法可以实现。
```
const fs = require('fs');
const http = require('http');
const mime = 'image/png';
const encoding = 'base64';
// 读取图片的数据，并将数据转为base64编码类型的字符串
const data = fs.readFileSync('./big.png').toString(encoding);
// 拼接字符串
const uri = 'data:' + mime + ';' + encoding + ',' + data;
// 当我们访问localhost:3000时，浏览器上就会显示这张图片。
const server = http.createServer((req , res) => {
	res.setHeader('content-type' , 'text/html');
	res.writeHead(200);
	res.end('<img src ='+ uri +'>');
});

server.listen(3000 , () => {
	console.log('listening port 3000');
})
```
当然这种方式是可逆的，我们也可以将base64格式的数据，重新写入一个文件，还原成原来的图片。
```
const fs = require('fs');
const http = require('http');
const mime = 'image/png';
const encoding = 'base64';
const data = fs.readFileSync('./big.png').toString(encoding);
const uri = 'data:' + mime + ';' + encoding + ',' + data;
// 通过split方法获取图片数据部分内容。
const one = uri.split(',')[1];
// 创建一个buffer
const oneBuffer = Buffer.from(one , 'base64');
// 将数据写入到one.png文件中
fs.writeFileSync('./one.png' , oneBuffer);
```
### Buffer.alloc()和Buffer.allocUnsafe()方法的区别
对这个预分配的内部内存池的使用，是调用 Buffer.alloc(size, fill) 和 Buffer.allocUnsafe(size).fill(fill) 的关键区别。 具体地说，Buffer.alloc(size, fill) 永远不会使用这个内部的 Buffer 池，但如果 size 小于或等于 Buffer.poolSize 的一半， Buffer.allocUnsafe(size).fill(fill) 会使用这个内部的 Buffer 池。 当应用程序需要 Buffer.allocUnsafe() 提供额外的性能时，这个细微的区别是非常重要的。
### 通过Buffer来进行数据拼接
```
const fs = require('fs');
let bufs = [];
const arr = ['andy.txt' , 'alex.txt'];
function readFile (path) {
    return new Promise((resolve , reject) => {
        fs.readFile(path , (err , data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    })
};
Promise.all([readFile(arr[0]) , readFile(arr[1])]).then(data => {
    bufs = Buffer.concat(data);
    console.log(bufs.toString('utf8'))
});
// 结果为：hello andy!我叫陈安
```
### 缓冲区的应用场景
- 一般我自己想到的也就是Buffer对象与字符串的相互转换
  - 可以调用Buffer实例的toString()，将Buffer数据转为指定编码的字符串
  - 可以调用Buffer类的from()方法，将字符串数据转为二进制数据
- 通过Buffer来拼接二进制数据，然后通过"iconv-lite"库来解码二进制数据
  - 可以通过调用Buffer.concat()方法来拼接二进制数据

```
const fs = require('fs');
const iconv = require('iconv-lite');
const reader = fs.createReadStream('./test.md' , {
    highWaterMark : 11
});
let chunks = [];
let size = 0;
reader.on('data' , function (chunk) {
    chunks.push(chunk);
    size += chunk.length;
});
reader.on('end' , function () {
    console.log(chunks)
    let buf = Buffer.concat(chunks , size);
    let str = iconv.decode(buf , 'utf8');
    console.log(str)
})
```
test.md文件内容为：
```
床前明月光，疑是地上霜，举头望明月，低头思故乡。
```
结果：
```
床前明月光，疑是地上霜，举头望明月，低头思故乡。
```

### 转码过程中乱码问题
如果我们在读取一个文件的内容时，我们设置了每次读取的字节数，字节数设置的不好的话，那么就有可能出现乱码的情况，比如说这个例子：
```
const fs = require('fs');
const reader = fs.createReadStream('./test.md' , {
    highWaterMark : 11
});
let data = '';
reader.on('data' , function (chunk) {
    data += chunk;
});
reader.on('end' , function () {
    console.log(data);
})
```
test.md文件内容：
```
床前明月光，疑是地上霜，举头望明月，低头思故乡。
```
通过上面的例子中，我们看到，我们规定了每次读取文件的字节数为11，由于我们每次在读取的时候都是直接通过'+'来拼接数据的，这里需要注意的是
```
data  += chunk;
//其实等同于
data = data.toString() + chunk.toString();
```
所以我们可以看到这个将二进制数据转换为字符串的过程使用的编码方式是'utf8'，而我们知道utf8编码方式中，一个中文字所占的字节数为3个，所以每次读取11个字节中，前九个字节表示三个中文字，而最后那两个则会以乱码的方式显示。

结果：

```
床前明��光，疑���地上霜，举头��明月，���头思故乡。
```
怎么解决这个问题呢？我们可以在读取数据之前设置编码方式，比如：

```
const fs = require('fs');
const reader = fs.createReadStream('./test.md' , {
    highWaterMark : 11
});
let data = '';
// 设置编码方式
reader.setEncoding('utf8');
reader.on('data' , function (chunk) {
    data += chunk;
});
reader.on('end' , function () {
    console.log(data);
})
```
结果：
```
床前明月光，疑是地上霜，举头望明月，低头思故乡。
```
其实调用setEncoding('utf8')，内部是通过string_decoder这个模块来完成解码的。具体我们可以去看nodejs官方文档，这是nodejs内部的一个解码器模块。

```
const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('utf8');
const buf1 = Buffer.from([0xE5, 0xBA, 0x8A, 0xE5, 0x89, 0x8D, 0xE6, 0x98, 0x8E, 0xE6, 0x9C]);
const buf2 = Buffer.from([0x88, 0xE5, 0x85, 0x89, 0xEF, 0xBC, 0x8C, 0xE7, 0x96, 0x91, 0xE6]);
console.log(decoder.write(buf1));
console.log(decoder.write(buf2));
```
结果：
```
床前明
月光，疑
```
这样的话也不会导致乱码情况。
### Buffer与性能
我们可以通过ab性能测试工具来测试，比如：
```
const http = require('http');
let str = '';
for (let i = 0 ; i < 1024 * 10 ; i++) {
    str += 'a';
}
const server = http.createServer(function (req , res) {
    res.writeHead(200 , 'ok');
    res.end(str);
});
server.listen(3000 , function () {
    console.log('listening port 3000');
})
```
首先当我们访问这个地址时，服务端通过纯字符串的方式返回数据到客户端，那么我们通过ab性能测试工具来测试一下，首先我们要执行ab.exe这个文件，ab性能测试工具是apache的，因为我电脑上安装了XAMPP软件，里面集成了apache，所以我们要找到安装目录下的apache/bin/ab.exe，自己在安装的目录下找一下就可以了
```
cmd ab.exe
```
然后输入
```
ab -c 200 -t 100 http://127.0.0.1:3000/
```
我们就可以得到测试的结果：
```
Total transferred:      515750000 bytes
HTML transferred:       512000000 bytes
Requests per second:    4144.04 [#/sec] (mean)
Time per request:       48.262 [ms] (mean)
Time per request:       0.241 [ms] (mean, across all concurrent requests)
Transfer rate:          41743.88 [Kbytes/sec] received
```
然后我们在将返回给客户端的数据改为二进制数据。

```
const http = require('http');
let str = '';
for (let i = 0 ; i < 1024 * 10 ; i++) {
    str += 'a';
}
// 将字符串转为二进制数据
str = Buffer.from(str);
const server = http.createServer(function (req , res) {
    res.writeHead(200 , 'ok');
    res.end(str);
});
server.listen(3000 , function () {
    console.log('listening port 3000');
})
```
通过同样的方式进行测试，结果：
```
Total transferred:      515750000 bytes
HTML transferred:       512000000 bytes
Requests per second:    4889.83 [#/sec] (mean)
Time per request:       40.901 [ms] (mean)
Time per request:       0.205 [ms] (mean, across all concurrent requests)
Transfer rate:          49256.47 [Kbytes/sec] received
```
我们可以发现，传输率确实要高一点
