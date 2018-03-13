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
### 可读流在paused模式下具体的读取数据的执行过程
[例子是参考这里](https://github.com/Aaaaaaaty/blog/issues/28)

我们通过几个例子来分别展示：

例子1：
```
const Readable = require('stream').Readable;
// 实现一个可读流
class SubReadable extends Readable {
  constructor(dataSource, options) {
    super(options);
    this.dataSource = dataSource;
  }
  // 文档提出必须通过_read方法调用push来实现对底层数据的读取
  _read() {
    console.log('阈值规定大小：', arguments['0'] + ' bytes')
    const data = this.dataSource.makeData()
    let result = this.push(data)
    if(data) console.log('添加数据大小：', data.toString().length + ' bytes')
    console.log('已缓存数据大小: ', subReadable._readableState.length + ' bytes')
    console.log('超过阈值限制或数据推送完毕：', !result)
    console.log('====================================')
  }
}

// 模拟资源池
const dataSource = {
  data: new Array(1000000).fill('1'),
  // 每次读取时推送一定量数据
  makeData() {
    if (!dataSource.data.length) return null;
    return dataSource.data.splice(dataSource.data.length - 5000).reduce((a,b) => a + '' + b)
  }
  //每次向缓存推5000字节数据
};

const subReadable = new SubReadable(dataSource);

subReadable.on('readable', () => {
    console.log('缓存剩余数据大小: ', subReadable._readableState.length + ' byte')
    console.log('------------------------------------')
})
```
结果为：
```
阈值规定大小： 16384 bytes
添加数据大小： 5000 bytes
已缓存数据大小:  5000 bytes
超过阈值限制或数据推送完毕： false
====================================
缓存剩余数据大小:  5000 byte
------------------------------------
阈值规定大小： 16384 bytes
添加数据大小： 5000 bytes
已缓存数据大小:  10000 bytes
超过阈值限制或数据推送完毕： false
====================================
阈值规定大小： 16384 bytes
添加数据大小： 5000 bytes
已缓存数据大小:  15000 bytes
超过阈值限制或数据推送完毕： false
====================================
阈值规定大小： 16384 bytes
添加数据大小： 5000 bytes
已缓存数据大小:  20000 bytes
超过阈值限制或数据推送完毕： true
=====================================
```
我们可以很清楚的看到，可读流的readable事件只触发了一次，而内部具体是怎么执行的呢？

```
// set up data events if they are asked for
// Ensure readable listeners eventually get something
// 注册data事件和readable事件
// 如果注册了data事件，那么可读流会转换为flow模式
// 如果注册了readable事件，那么会推送数据到缓存中，即可读流对象的buffer属性中。
Readable.prototype.on = function(ev, fn) {
  if (ev === 'data') {
    // 代码省略...
  } else if (ev === 'readable') {
    const state = this._readableState;
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      // 推送数据到缓存中
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
从上面的源码中可以看出，当我们监听readable事件时，一开始就会设置一些与readable事件相关的变量
```
state.readableListening：表示是否正在监听readable事件
state.needReadable：表示是否需要触发readable事件
state.emittedReadable：表示是否已经触发了readable事件
```
并调用
```
process.nextTick(nReadingNextTick, this);
```
nReadingNextTick方法内部会调用read(0)方法，向可读流的缓冲区中缓存数据。

接下来就会依次调用以下函数：

```
调用read(0)-->调用_read(highWaterMark)-->调用push()-->调用readableAddChunk()-->调用addChunk()
```
这里需要注意的是在addChunk函数中会处理以下几件事情：
- state.buffer.push(chunk)将数据缓存到可读流的缓冲区中
- 调用emitReadable(stream)，触发readable事件
- 调用maybeReadMore(stream , state)，蓄满可读流的缓冲区
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
    // 这里是异步的，因为内部调用了process.nextTick，所以会继续执行maybeReadMore
    if (state.needReadable)
      emitReadable(stream);
  }
  maybeReadMore(stream, state);
}
```
重点就是在emitReadable和maybeReadMore这两个函数中，我们先来看一下emitReadable函数：
```
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  // 因为还没有触发过readable事件，所以一开始state.emittedReadable为false
  // 当触发了readable事件，state.emittedReadable会被设置为true，表示已经触发了readable事件
  // readable事件在同步模式下并不会立即触发，因为调用了process.nextTick，默认是同步的
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync)
      process.nextTick(emitReadable_, stream);
    else
      emitReadable_(stream);
  }
}

// 触发readable事件
function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}
```
maybeReadMore函数：
```
// 这里也是异步调用maybeReadMore_函数，并且会判断state.readingMore，因为这里也是异步执行，所以会先触发上面的异步操作，故会先触发readable事件，而触发完readable事件后，就执行maybeReadMore_函数
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}
```
调用maybeReadMore_函数，其实内部就是通过while循环调用read(0)方法来蓄满可读流的缓冲区。所以我们才会看到先执行了read方法，然后触发了readable事件，然后再执行了多次read方法(其实就是在蓄满缓冲区)。

例子2：
```
const Readable = require('stream').Readable;
// 实现一个可读流
class SubReadable extends Readable {
  constructor(dataSource, options) {
    super(options);
    this.dataSource = dataSource;
  }
  // 文档提出必须通过_read方法调用push来实现对底层数据的读取
  _read() {
    console.log('阈值规定大小：', arguments['0'] + ' bytes')
    const data = this.dataSource.makeData()
    let result = this.push(data)
    if(data) console.log('添加数据大小：', data.toString().length + ' bytes')
    console.log('已缓存数据大小: ', subReadable._readableState.length + ' bytes')
    console.log('超过阈值限制或数据推送完毕：', !result)
    console.log('====================================')
  }
}

// 模拟资源池
const dataSource = {
  data: new Array(1000000).fill('1'),
  // 每次读取时推送一定量数据
  makeData() {
    if (!dataSource.data.length) return null;
    return dataSource.data.splice(dataSource.data.length - 5000).reduce((a,b) => a + '' + b)
  }
  //每次向缓存推5000字节数据
};

const subReadable = new SubReadable(dataSource);

subReadable.on('readable', () => {
    let chunk = subReadable.read(1000)
    if(chunk) 
      console.log(`读取 ${chunk.length} bytes数据`);
    console.log('缓存剩余数据大小: ', subReadable._readableState.length + ' byte')
    console.log('------------------------------------')
})
```
结果：
```
阈值规定大小： 16384 bytes
添加数据大小： 5000 bytes
已缓存数据大小:  5000 bytes
超过阈值限制或数据推送完毕： false
====================================
阈值规定大小： 16384 bytes
添加数据大小： 5000 bytes
已缓存数据大小:  10000 bytes
超过阈值限制或数据推送完毕： false
====================================
读取 1000 bytes数据
缓存剩余数据大小:  9000 byte
------------------------------------
阈值规定大小： 16384 bytes
添加数据大小： 5000 bytes
已缓存数据大小:  14000 bytes
超过阈值限制或数据推送完毕： false
====================================
阈值规定大小： 16384 bytes
添加数据大小： 5000 bytes
已缓存数据大小:  19000 bytes
超过阈值限制或数据推送完毕： true
====================================
阈值规定大小： 16384 bytes
添加数据大小： 5000 bytes
已缓存数据大小:  24000 bytes
超过阈值限制或数据推送完毕： true
====================================
读取 1000 bytes数据
缓存剩余数据大小:  23000 byte
------------------------------------
读取 1000 bytes数据
缓存剩余数据大小:  22000 byte
------------------------------------
```
其实执行过程与上面分析的差不多，这里就主要提一下，当触发readable事件时是异步的，执行maybeReadable_也是异步的，所以会先触发readable事件，所以会执行回调函数里的read(1000)，当执行read(1000)的时候，之后又会异步触发readable事件，和异步执行maybeReadable，由此形成一个环。这个时候会调用:
```
调用read(1000)-->调用_read(highWaterMark)-->调用push()-->调用readableAddChunk()-->调用addChunk()
```
所以我们看到打印了两次read方法里面的内容，一次readable事件回调函数里面的内容，当触发完readable事件，就会执行第二个异步操作maybeReadable_，这个函数里面就是循环调用read(0)来蓄满缓冲区，所以到缓存的数据达到19000bytes的时候，就没有再继续调用read(0)了，因为已经达到了highWaterMark的上限。但是由于之前在readable事件回调函数中执行了readable.read(1000)，所以又会回到异步触发readable事件和异步执行maybeReadable_函数，所以会触发readable事件，并继续执行read(1000)，然后又会调用:
```
调用read(1000)-->调用_read(highWaterMark)-->调用push()-->调用readableAddChunk()-->调用addChunk()
```
所以再达到19000bytes后，又往可读流的缓冲区里缓存了5000bytes的资源。而由于缓冲区的资源已经达到了highWaterMark的上限，所以没有继续往缓冲区中添加资源。