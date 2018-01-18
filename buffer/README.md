# 缓冲区(Buffer)
在nodejs中，Buffer是一个全局对象，主要用来处理二进制数据流。Buffer类的实例类似于整数数组，但是Buffer的大小是固定不变的，Buffer的大小在被创建的时候就已经确定了，无法修改。
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
当然Buffer的功能还有很多，可以参考官方文档。