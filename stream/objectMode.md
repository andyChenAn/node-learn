## objectMode(对象模式)
在nodejs中，所有的流都只能操作String和Buffer对象。对于其他JavaScript类型的数据是不能直接操作的，我们需要设置流的objectMode来操作。
### Readable中的objectMode
在可读流中，默认可读流对象只能操作string或buffer，如果我们读取的数据是对象，那么会报"Invalid non-string/buffer chunk"，表示读取的数据并不是string或buffer。所以我们只能是读取string或buffer。

如果我们需要读取其他JavaScript类型的数据，那么就需要设置obejctMode为true。
```
const Readable = require('stream').Readable;
const arr = [
	{name : 'andy' , age : 23},
	{name : 'jack' , age : 12}
]
const readable = new Readable({
	objectMode : true,
	read : function (size) {
		this.push(arr.shift() || null);
	}
});
readable.on('data' , data => {
	console.log(data);
});
readable.on('end' , () => {
	console.log('数据已经读取完成');
});
```
结果为：
```
{ name: 'andy', age: 23 }
{ name: 'jack', age: 12 }
数据已经读取完成
```
当我们调用push方法的时候，其内部会判断objectMode，如果为false，表示非对象模式，则会将读取的数据转化为Buffer类型。如果为true，则表示对象模式，数据不做任何处理，并将数据添加到缓冲中(缓存，其实就是一个数组，通过push方法将数据放在数组中)。
```
state.buffer.push(chunk);
```
每次调用push方法时，如果是对象模式，那么会直接调用state.buffer.push(chunk)，其实这里缓存的也只是一个对象的引用。如果是非对象模式，那么会将string转为buffer，然后再调用state.buffer.push(chunk)。

当在消费对象模式的可读流时，不管是flowing模式还是paused模式，内部都是调用state.buffer.shift()方法来获取数据，保证通过push方法产生的数据都会被一一消费。
```
if (state.objectMode) {
    ret = state.buffer.shift();
    //其他代码...
}
```
而在消费非对象模式的可读流时，是通过拼接字节数的方式来获取数据，并且字节数是readable.read(n)中的n，如果n不传入，则将所有的字节数拼接在一起。(n <= highWaterMark)。
```
// 只提取足够的缓冲数据以满足请求的数量。
function fromListPartial(n, list, hasStrings) {
  var ret;
  if (n < list.head.data.length) {
    // slice is the same for buffers and strings
    //取出n个字节数的数据
    ret = list.head.data.slice(0, n);
    //更新list.head.data数据，截取n字节数之后的数据，保证所有的数据都可以被一一消费
    list.head.data = list.head.data.slice(n);
  } else if (n === list.head.data.length) {
    // first chunk is a perfect match
    ret = list.shift();
  } else {
    // result spans more than one buffer
    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
  }
  return ret;
}
```
### Writable中的objectMode
在非对象模式下的可写流，写入的的数据只能是string或buffer。
```
const Writable = require('stream').Writable;
const writable = new Writable({
	objectMode : false,
	write : function (chunk , encoding , callback) {
	    //这里的chunk一定是Buffer类型
		console.log(chunk);
	}
});
writable.write('andy');
writable.end();
```
在对象模式下，写入的数据可以是任何JavaScript类型。
```
const Writable = require('stream').Writable;
const writable = new Writable({
	objectMode : true,
	write : function (chunk , encoding , callback) {
		console.log(chunk);
		callback();
	}
});
writable.write(undefined);
writable.write({name : 'andy'});
writable.write([1,2,3]);
writable.write([{name : 'andy'} , 2 , 'jack' , function () {} , undefined , null])
writable.end();
```
### 什么时候使用objectMode
具体某个流是否应当设置objectMode，需要看其所处的上下游。

如果上游是objectMode，且输出的是非String或Buffer，那就必须用objectMode。 如果下游不是objectMode，就必须注意，不要输出非String或Buffer的数据。