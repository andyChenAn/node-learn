## 可读流
#### 如何创建可读流？
创建可读流还是很简单的，通过下面的方式就可以得到一个可读流对象。可读流对象是stream.Readable类的实例。
```
const stream = require('stream');
const readable = stream.Readable();
```
在需要数据时，流内部会自动调用_read方法向缓存中添加数据。
```
const stream = require('stream');
const readable = stream.Readable();
let arr = ['andy' , 'alex' , 'jack'];
// 定义一个_read方法
readable._read = function () {
	this.push(arr.shift());
};
readable.on('data' , chunk => {
	console.log(chunk.toString());
})
```
或者
```
const stream = require('stream');
let arr = ['andy' , 'alex' , 'jack'];
const readable = stream.Readable({
	read : function () {
		this.push(arr.shift());
	}
});
readable.on('data' , chunk => {
	console.log(chunk.toString());
})
```
以上两种方式都是可以创建一个可读流，然后向可读流对象的缓存中添加数据。
#### 如何读取可读流中的数据？
```
const stream = require('stream');
const readable = stream.Readable();
let arr = ['andy' , 'alex' , 'jack'];
readable._read = function () {
	this.push(arr.shift());
};
// 第一种方式：通过监听data事件
readable.on('data' , chunk => {
	console.log(chunk.toString());
});

// 第二种方式：通过调用read方法
let data;
while (data = readable.read()) {
	console.log(data.toString());
}
readable.pipe(process.stdout);

// 第三种方式：通过调用resume方法，不过前面是调用了pause方法暂停了读取流中的数据，调用resume方法
// 恢复读取流中的数据
readable.pause();
readable.resume();
readable.on('data' , data => {
	console.log(data.toString());
})
```
##### 上面的代码中，当我们监听了data事件，就会获取到可读流中的数据，这是怎么做到的呢？
这个时候我们需要来看一下源码：

```
第一步：
Readable.prototype.on = function(ev, fn) {
  const res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data') {
    //一开始的时候flowing的值为null(可以说一开始的可读流对象既不是流动模式也不是暂停模式)，所以该条件成立，会调用this.resume()方法
    if (this._readableState.flowing !== false)
      this.resume();
  } else if (ev === 'readable') {
    const state = this._readableState;
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      if (!state.reading) {
        process.nextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this);
      }
    }
  }

  return res;
};
第二步：
Readable.prototype.resume = function() {
  var state = this._readableState;
  //因为可读流对象的初始化flowing为null，所以会设置可读流为流动模式，并且调用resume函数
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};
第三步：
function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    //这里会调用resume_函数
    process.nextTick(resume_, stream, state);
  }
}
第四步：
function resume_(stream, state) {
  //一开始并没有在读取数据，所以会调用read方法读取数据
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  state.awaitDrain = 0;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading)
    stream.read(0);
}
第五步：
Readable.prototype.read = function(n) {
    //其余代码不写了
    //调用_read方法，该方法是我们自己要实现的方法，然后再该方法里面调用push方法，添加数据到缓存中
    this._read(state.highWaterMark);
};
第六步：
在push方法中，最终执行的是maybeReadMore_函数循环调用read(0)方法，在read(0)函数中再次判断可读流是否可以结束，如果不结束，那么再进行一次_read(size)读取。
```
### 可读流实现原理：
1. 刚创建的可读流对象可以说是一个空壳，里面是没有数据的，只是保存了一些初始化的状态。
2. 当我们监听可读流对象的data事件，那么内部会自动调用可读流对象的resume方法，将流切换到流动状态。
3. 在resume方法内部中，其实是调用resume_方法，而resume_方法中调用了一次read(0)方法。
4. 在read方法中，首先检查流是否满足结束条件，如果满足，则结束，否则，会调用实例的_read方法，这个方法是我们自己实现，读取一段waterMark长度的数据。
5. 在_read方法中，我们需要调用push方法，在push方法内部，最终会调用maybeReadMore_函数循环调用read(0)方法，在read(0)函数中再次判断可读流是否可以结束，如果不结束，那么再进行一次_read(size)读取。
### end事件：
流中没有数据可供消费时触发该事件
```
const stream = require('stream');
const readable = stream.Readable();
let arr = ['andy' , 'alex' , 'jack'];
readable._read = function () {
  this.push(arr.shift() || null);
}
readable.on('data' , chunk => {
  console.log('push' , chunk.toString())
});
readable.on('end' , () => {
  console.log('流中的数据已经被消费完了')
});
```
### 可读流的两种模式
- flowing模式：
  
  可读流自动从系统底层读取数据，并通过事件接口尽快的将数据提供给应用。
- paused模式
  
  必须显式调用read方法来从流中读取数据片段

可以将paused的可读流，通过以下几种方式切换为flowing模式的流：
1. 监听"data"事件
2. 调用resume方法
3. 调用pipe方法将数据发送到可写流。

将flowing的可读流切换为paused模式的流：
1. 可以通过调用pause方法
2. 取消data事件监听，并调用unpipe方法。

注意：如果可读流切换到flowing模式，且没有消费者处理流中的数据，这些数据将会丢失，比如，调用了readable.resume()方法却没有监听'data'事件，或是取消了'data'事件监听，就有可能出现这种情况
```
const stream = require('stream');
const readable = stream.Readable();
let arr = ['andy' , 'alex' , 'jack'];
readable._read = function () {
  this.push(arr.shift() || null);
};
readable.pause();
//调用了resume方法，将可读流切换为flowing模式，但是没有监听data事件
readable.resume();
//这里依然会触发
readable.on('end' , () => {
  console.log('流中的数据已经被消费完了')
});
//我们可以看到，当流中所有的数据已经读取完毕了，会触发end事件，也就是说这些数据都被丢失了
```
### 流的三种状态
- readable._readableState.flowing = null
- readable._readableState.flowing = false
- readale._readableState.flowing = true

可读流初始化状态的flowing的值为null，当我们调用resume方法，pipe方法，监听data事件时，会将readable._readableState.flowing的值变为true，这时，随着数据的生成，就可以开始频繁触发事件，读取数据了。

调用pause()方法和调用unpipe()方法，会将readable._readableState.flowing的值变为false，这将暂停事件流，但不会暂停数据生成，生成的数据会堆积在缓存中，这时候，监听data事件，不会导致readable._readableState.flowing的值变为true。

```
const stream = require('stream');
const readable = stream.Readable();
let arr = ['andy' , 'alex' , 'jack'];
readable._read = function () {
  this.push(arr.shift() || null);
};
readable.on('data' , chunk => {
   //监听data事件，flowing为true
  console.log(readable._readableState.flowing);   //true
});
readable.on('end' , () => {
  console.log(readable._readableState.flowing);    //true
  readable.pause();
  //调用pause方法，flowing变为false
  console.log(readable._readableState.flowing);    //false
  console.log('流中的数据已经被消费完了')
});
```
### 可读流内部的pause模式的将资源缓存到缓冲区的具体实现
当我们监听可读流的readable事件时，通过内部循环多次调用可读流的read(0)方法，将资源推送到缓冲区中，如果缓存的资源小于highWaterMark则继续调用，如果缓存的资源已经大于highWaterMark，那么就不会将资源推送到缓冲区中。
```
const {Readable} = require('stream');
const arr = ['jack' , 'alex'];
const reader = new Readable({
    read : function () {
        const data = arr.shift() || null;
        this.push(data);
    }
});
reader.on('readable' , () => {
    console.log('可读');
})
```
从上面代码中，我们定义了一个可读流对象，并且监听readable事件，我们通过源码可以看到，当我们监听了readable事件后，内部会这样处理：
```
Readable.prototype.on = function(ev, fn) {
  const res = Stream.prototype.on.call(this, ev, fn);
   // 如果监听了可读流的data事件，那么会将可读流模式转换成flow模式
   // 如果监听了可读流的readable事件，那么可读流将开始读取数据并将读取的数据保存到缓存中
  if (ev === 'data') {
    // Start flowing on next tick if stream isn't explicitly paused
    if (this._readableState.flowing !== false)
      this.resume();
  } else if (ev === 'readable') {
    const state = this._readableState;
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      if (!state.reading) {
        process.nextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this);
      }
    }
  }

  return res;
};
```
nReadingNextTick函数代码：
```
function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  // 调用read方法读取数据保存到缓存中
  self.read(0);
}
```
调用可读流对象的read方法，内部会调用_read方法，然后在_read方法内部会调用push方法，将数据保存到缓存中，其实就是保存在可读流对象的buffer属性上，当数据保存后，会调用maybeReadMore方法继续读取数据保存到缓存中，其实内部通过while()循环调用stream.read(0)来读取数据并保存到缓存中。
### 可读流在paused模式下读取数据的内部实现
我们先来看一段代码:
```
const {Readable} = require('stream');
const arr = new Array(100000).fill(1);
const readable = new Readable({
    read () {
        const data = arr.splice(arr.length - 5000).reduce((a , b) => a + '' + b);
        console.log(data.length)
        this.push(data);
    }
})
readable.on('readable' , () => {
    const data = readable.read(5000);
    console.log('length : ' , data.length)
});
```
如果我们在readable事件回调函数中，调用可读流对象的read()方法，传入一个指定读取数据大小的参数，来读取数据，内部是如何实现的呢？

- 当调用read(5000)方法时，其实内部会执行Readable.stream.read方法，该方法内部会先执行_read(highWaterMark)方法，来将资源推送到缓冲区中
- 然后调用howMuchToRead()方法，看需要读取多少数据，再调用fromList()方法从缓冲区中读取，然后将数据返回。

#### 什么时候会触发可读流的readable事件？
我们可以看一下源码：

源码1：
```
function addChunk(stream, state, chunk, addToFront) {
  //这里表示，如果异步调用push方法，只要push前缓存为空
  //就可以确定当前的数据就是下一次要求的数据
  //所以直接触发data事件，因此不会将数据添加到缓存中。
  //然后再调用read方法，触发下一次的_read调用，从而源源不断的产生数据，知道调用push(null)为止
  //如果不是异步调用push方法，那么会将数据写入到可读就中的缓存中
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
    // 这里我们可以看出，每次有新的数据缓存到缓冲区中时，就会触发readable事件
    if (state.needReadable)
      emitReadable(stream);
  }
  maybeReadMore(stream, state);
}
```
源码2：
```
function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  var state = stream._readableState;
  // 如果chunk为null，也就是说读取的数据是null，那么表示读取数据已经完成
  // 即：到达流数据尾部，这时候也会触发readable事件
  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
        //源码...
    } else if (!addToFront) {
      state.reading = false;
    }
  }
  return needMoreData(state);
}

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  // 触发可读流的readable事件
  emitReadable(stream);
}

```
通过这两段代码，我们可以知道，如果有新的数据缓存到缓冲区的时候，就会触发可读流的readable事件，如果资源读到了尾部的时候，也会触发可读流的readable事件。