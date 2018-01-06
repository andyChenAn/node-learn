## 可写流
官方文档中说明，可写流是对数据写入"目的地"的一种抽象。说白了，就是消费可读流提供的数据的。
### 如何创建可写流？
创建可写流的方式和可读流是一样的：
```
const stream = require('stream');
const writable = new stream.Writable();
console.log(writable instanceof stream.Writable);
```
### 如何使用可写流？
当我们创建了一个可写流，我们需要为这个可写流实现一个_write方法，这样才能写入数据到可写流中。
```
const stream = require('stream');
const writable = new stream.Writable();
writable._write = function (chunk , encoding , callback) {
	console.log('写入的数据是：' + chunk.toString());
	callback();
};
writable.write('andychen');
writable.write('jack');
writable.write('alex');
writable.end();
```
从上面的例子中，writable调用write方法写入数据，内部其实会调用_write方法将数据写入到底层。必须调用end方法来告诉writable，所有数据都已经写入，这个时候回触发writable的finish事件。
```
const stream = require('stream');
const writable = new stream.Writable();
writable._write = function (chunk , encoding , callback) {
	console.log(chunk);
	callback();
};
writable.on('finish' , () => {
	console.log('数据已经全部写入到底层系统');
})
writable.write('andychen');
writable.write('jack');
writable.write('alex');
writable.end();
```
### 可写流实现原理:
1. 调用WritableState构造函数，初始化可写流对象的状态。
2. 我们调用writable的write方法将数据写入到可写流中。
3. 在write方法内部会判断写入数据的类型，并最终会调用_write方法，写入数据。
4. 在_write方法中，进行实际的数据写入，等写入完成后会调用回调函数state.onwrite。
5. 在回调函数中，判断该次的写入数据是否已经超过了highWaterMark，如果是，那么将会触发drain事件。
6. 重复上述的过程，直到调用writable的end方法来结束数据的写入。
```
const stream = require('stream');
const writable = new stream.Writable();
const fs = require('fs');
writable._write = function (chunk , encoding , callback) {
	fs.writeFile('./andy.txt' , chunk + '\n' , {flag : 'a+'} , (err) => {
		console.log('写入文件完成');
	});
	callback();
};
writable.on('finish' , () => {
	console.log('数据已经全部写入到底层系统');
});
writable.on('drain' , () => {
	console.log('写入的数据超过了警戒线');
});
writable.write('andychen');
writable.write('jack');
writable.write('alex');
writable.end();
```