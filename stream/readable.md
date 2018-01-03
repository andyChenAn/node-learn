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
### 总结：
1. 刚创建的可读流对象可以说是一个空壳，里面是没有数据的，只是保存了一些初始化的状态。
2. 当我们监听可读流对象的data事件，那么内部会自动调用可读流对象的resume方法，将流切换到流动状态。
3. 在resume方法内部中，其实是调用resume_方法，而resume_方法中调用了一次read(0)方法。
4. 在read方法中，首先检查流是否满足结束条件，如果满足，则结束，否则，会调用实例的_read方法，这个方法是我们自己实现，读取一段waterMark长度的数据。
5. 在_read方法中，我们需要调用push方法，在push方法内部，最终会调用maybeReadMore_函数循环调用read(0)方法，在read(0)函数中再次判断可读流是否可以结束，如果不结束，那么再进行一次_read(size)读取。



