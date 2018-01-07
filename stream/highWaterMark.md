## highWaterMark
我们先来看一下缓存。
### readable中的缓存
```
const Readable = require('stream').Readable;
const readable = new Readable();
//可读流中的缓存
console.log(readable._readableState.buffer)
```
当我们创建readable对象时，内部会调用_readableState构造函数，来初始化readable对象需要用到的一些状态以及缓存，并且挂载在readable对象的_readableState属性上。
```
this._readableState = new ReadableState(options, this);
```
在_readableState对象上挂载了很多readable可读流执行过程中需要的状态(对象的属性)。其实可以说我们操作可读流对象，其实内部就是操作这些状态来实现的。

我们来看一下，在这些属性中，我们来看一下buffer属性，该属性表示的就是可读流的缓存(读取的数据存放地)
```
this.buffer = new BufferList();
```
还有一个属性，length属性表示整个缓存的长度(所有缓存的数据的长度)，初始化的值为0
```
this.length = 0;
//如果是非对象模式，length表示的缓存的总长度
state.length += state.objectMode ? 1 : chunk.length;
```
当我们在读取大文件内容时，要求不能一次性将所有内容都读进内存，所有fs.createReadStream创建的readable对象，底层会调用fs.read方法去多次从文件中将数据读出，缓存中储存的便是一次读取的量(而这里一次读取的量就是设置的highWaterMark字节数)。所以，每次读取的数据需要存放在缓冲中，等待被消费。
```
const fs = require('fs');
const readable = fs.createReadStream('andy.txt');
readable.on('readable' , () => {
	//缓存的数据字节数
	console.log(readable._readableState.length);  
	//缓存的数据
	console.log(readable._readableState.buffer.head.data.toString())
})
```
上面的代码，我们可以看到，文件里的内容被缓存在了buffer属性中，等待被消费。
```
const Readable = require('stream').Readable;
const arr = ['alex' , 'andy' , 'jack'];
const readable = new Readable({
	read : function (size) {
		this.push(arr.shift() || null);
	}
});
console.log(readable._readableState.buffer);
readable.on('data' , (chunk) => {
	console.log(readable._readableState.buffer);
	console.log(chunk.toString());
});
```
结果:
```
BufferList { head: null, tail: null, length: 0 }
BufferList {
  head: { data: <Buffer 61 6e 64 79>, next: null },
  tail: { data: <Buffer 61 6e 64 79>, next: null },
  length: 1 }
alex
BufferList {
  head: { data: <Buffer 6a 61 63 6b>, next: null },
  tail: { data: <Buffer 6a 61 63 6b>, next: null },
  length: 1 }
andy
BufferList { head: null, tail: null, length: 0 }
jack
```
我们可以看到在绑定data事件之前，读取的数据还没有被缓存在可读流对象的缓存在，而绑定data事件之后，才被缓存，这说明，在绑定data事件，将可读流从paused模式变为flowing模式，并调用read方法。

在监听data事件时，发生了以下事情:
- 调用read(0)，进而调用_read()，实际上就相当于调用state.buffer.push('alex')。
- 调用flow()，将缓存数据全部读取，相当于while(stream.read())。
- 调用read(0)，结束可读流。

这里的flow，就是源源不断产生数据的地方。每次调用read方法时，先检查是否要从底层读点数据到缓存中来，如果需要，就调用_read(hihtWaterMark)。然后再从state.buffer中取出一定的数据chunk，触发data事件，于是事件的监听器被执行，数据被消耗。
### 异步调用push方法，添加数据
我们先来看一个例子:
```
const Readable = require('stream').Readable;
const arr = ['alex' , 'andy' , 'jack'];
const readable = new Readable({
	read : function () {
		let state = this._readableState;
		process.nextTick(function () {
			let data = arr.shift() || null;
			console.log('buffer before push' , state.buffer);
			console.log('push' , data);
			readable.push(data);
			console.log('buffer after push' , state.buffer);
			console.log('-----------');
		})
	}
});
readable.on('data' , data => {
	console.log('consume' , data.toString());
})
```
结果为:
```
buffer before push BufferList { head: null, tail: null, length: 0 }
push alex
consume alex
buffer after push BufferList { head: null, tail: null, length: 0 }
-----------
buffer before push BufferList { head: null, tail: null, length: 0 }
push andy
consume andy
buffer after push BufferList { head: null, tail: null, length: 0 }
-----------
buffer before push BufferList { head: null, tail: null, length: 0 }
push jack
consume jack
buffer after push BufferList { head: null, tail: null, length: 0 }
-----------
buffer before push BufferList { head: null, tail: null, length: 0 }
push null
buffer after push BufferList { head: null, tail: null, length: 0 }
-----------
```
从结果中，我们看到在push数据前后，可读流中的缓存都是空的，数据并没有被添加到缓存中，这是怎么回事呢?

我们来看一下源码:

```
function addChunk(stream, state, chunk, addToFront) {
  //这里表示，如果异步调用push方法，只要push前缓存为空
  //就可以确定当前的数据就是下一次要求的数据
  //所以直接触发data事件，因此不会将数据添加到缓存中。
  //然后再调用read方法，触发下一次的_read调用，从而源源不断的产生数据，知道调用push(null)为止
  if (state.flowing && state.length === 0 && !state.sync) {
    stream.emit('data', chunk);
    stream.read(0);
  } else {
    // update the buffer info.
    // 将数据添加到缓冲队列中
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront)
      state.buffer.unshift(chunk);
    else
      state.buffer.push(chunk);

    if (state.needReadable)
      emitReadable(stream);
  }
  maybeReadMore(stream, state);
}
```
通过源码，我们发现，这里表示，如果异步调用push方法，只要push前缓存为空，就可以确定当前的数据就是下一次要求的数据，所以直接触发data事件，因此不会将数据添加到缓存中。然后再调用read方法，触发下一次的_read调用，从而源源不断的产生数据，知道调用push(null)为止。

如果我们同步调用push，那么数据会被写入到缓存中，而数据也是从缓存中读取。将上面的process.nextTick方法去掉就可以了。
### writable中的缓存
writable中的highWaterMark是用来控制底层数据写入速度的，当写入的数据的字节数大于highWaterMark时，writable.write(data)时会返回false，停止写入数据，触发drain事件。
```
const Writable = require('stream').Writable;
const writable = new Writable({
	highWaterMark : 1,
	write : function (chunk , encoding , callback) {
		console.log(chunk.toString());
		callback();
	}
});
writable.on('drain' , () => {
	console.log('触发drain');
})
writable.write('andy');
writable.end();
```