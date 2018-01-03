# Stream(流)
#### 什么是流？
在nodejs中流是用来处理流数据的抽象接口。
#### 流的类型有哪些？
- Readable - 可读流
- Writable - 可写流
- Duplex - 可读写的流
- Transform - 在读写过程中可以修改和变换数据的Duplex流
## Readable(可读流)
#### 为什么要使用流？
当我们通过fs.readFile来读取一个比较大的文件时，我们需要等文件中的所有内容都缓冲到内存中时，才可以访问这些数据，这会占用大量的内存，同时，处理的开始时间被推迟了。

我们这里来读取一个差不多28M的文件，首先通过fs.readFile方式来读取：
```
console.time();
console.log('读取数据之前：' + process.memoryUsage().rss);
fs.readFile('jquery.js' , (err , data) => {
	console.timeEnd();
	console.log('读取数据之后：' + process.memoryUsage().rss);
});
// 打印结果：
// 读取数据之前分配的内存：22269952
// 总共花费的时间: 20.325ms
// 读取数据之后分配的内存：51761152
```
我们再通过可读流的方式来读取文件里的内容：
```
console.time();
console.log('读取数据之前分配的内存：' + process.memoryUsage().rss);
const readable = fs.createReadStream('jquery.js');
let m = 0;
readable.on('data' , data => {
    // 这里会触发很多次，为了方便，这里就只显示一次
	if (m == 1) {
		return;
	};
	m++;
	console.timeEnd();
});
readable.on('end' , () => {
	console.log('读取数据之后分配的内存：' + process.memoryUsage().rss);
});
// 打印结果：
// 读取数据之前分配的内存：22269952
// 开始读取到数据时所需的时间是: 4.886ms
// 读取数据之后分配的内存：32849920
```
**我们可以比较一下，通过fs.readFile方式读取文件时，所占用的内存是比通过流来读取文件时要大，并且，通过流的方式来读取文件时，访问到数据的时间要比通过fs.readFile早很多。尤其是在读取大文件时效果明显。**