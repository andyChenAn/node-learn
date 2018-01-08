## pipe(管道)
可读流有一个方法pipe，用来连接另一个可写流，我们可以理解为，pipe方法就像一个桥梁，用来连接数据的上游和下游，使上游的数据能够留到指定的下游，上游必须是可读流，下游必须是可写流。

我们一般可以通过触发事件来将上游的数据写入到下游中。比如:
```
const {Readable , Writable} = require('stream');
const arr = ['alex' , 'andy' , 'jack'];
const readable = new Readable({
	read : function () {
		this.push(arr.shift() || null);
	}
});
const writable = new Writable({
	write : function (chunk , encoding , callback) {
		console.log(chunk.toString());
		callback();
	}
});
readable.on('data' , chunk => {
	writable.write(chunk);
});
readable.on('end' , () => {
	console.log('数据已经读取完成');
	writable.end();
});
writable.on('finish' , () => {
	console.log('写入完成');
});
```
结果为:
```
alex
andy
jack
数据已经读取完成
写入完成
```
我们也可以使用pipe方法，更加的简单和直观
```
const {Readable , Writable} = require('stream');
const arr = ['alex' , 'andy' , 'jack'];
const readable = new Readable({
	read : function () {
		this.push(arr.shift() || null);
	}
});
const writable = new Writable({
	write : function (chunk , encoding , callback) {
		console.log(chunk.toString());
		callback();
	}
});
writable.on('finish' , () => {
	console.log('写入完成');
})
readable.pipe(writable);
```
结果为：
```
alex
andy
jack
写入完成
```
所以，pipe方法内部是已经处理了data,end,write等这些方法，我们直接调用就可以了。

#### pipe方法有什么好处呢?
使用pipe方法可以很好的控制内存，如果我们使用事件的方式来将可读流中的数据写入到目标可写流中，那么可读流中的数据会持续写入到可写流的缓存中，而并不关心可写流的缓存状态如何。而pipe方法，内部有对可写流状态的管理：
```
  // 调用pipe方法，内部会触发data事件监听
  var increasedAwaitDrain = false;
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    increasedAwaitDrain = false;
    // 如果写入的数据字节数大于可写流对象的警戒线
    // 那么会调用可读流的pause方法，来暂停读取数据，将可读流切换为paused模式
    var ret = dest.write(chunk);
    if (false === ret && !increasedAwaitDrain) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if (((state.pipesCount === 1 && state.pipes === dest) ||
           (state.pipesCount > 1 && state.pipes.indexOf(dest) !== -1)) &&
          !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
        increasedAwaitDrain = true;
      }
      src.pause();
    }
  }
```
```
// 触发drain事件监听器函数，目标可写流可能会存在多次写入，需要进行缓冲的情况
// 需要确保所有需要缓冲的写入都完成后，再次将可读流切换到flowing模式
function pipeOnDrain(src) {
  return function() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    // 判断是否存在写入的数据字节数大于可写流的highWaterMark，如果存在，则减去一次
    // 判断需要写入的数据有多少次字节数是大于可写流的highWaterMark
    // 确保所有数据都写入完成后，再次将可读流切换为flowing模式
    if (state.awaitDrain)
      state.awaitDrain--;
    // 判断awaitDrain为0，表示所有数据都已经写入完成
    // 判断可读流是否有监听data事件，如果判断这两个条件，那么将可读流切换为flowing模式
    // 调用flow方法，再次读取数据
    if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}
```
当writable.write(data)返回false时，表示可写流中缓存队列的长度已经到达了临界值（highWaterMark），此时，需要暂停readable的数据输出，等待writable清空其缓存。

#### pipe实现原理
- pipe方法内部监听可读流的data事件，在该事件监听器中向目标可写流写入数据
- 如果目标可写流表示该写入操作需要进行缓冲，则立刻将可读流切换到paused模式。
- 监听目标可写流的drain事件，当目标可写流中所有需要缓冲的数据都已经写入完成后，将可读流重新切换到flowing模式。
- 监听可读流的end事件，内部监听器会调用目标可写流的end方法，来结束目标可写流的写入。
#### pipeline
当我们将多个流通过调用pipe方法连接起来就形成了一个pipeline。
```
const {Readable , Writable , Transform} = require('stream');
const arr = ['alex' , 'andy' , 'jack'];
const readable = new Readable({
	read : function () {
		this.push(arr.shift() || null);
	}
});
const transform = new Transform({
	transform : function (chunk , encoding , callback) {
		this.push(chunk.toString().toUpperCase() + '\n');
		callback();
	}
});
readable.pipe(transform).pipe(process.stdout);
```
这里需要注意，中间的流必须是即可读又可写的流。(duplex和transform)。