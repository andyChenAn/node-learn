# Event Loop
当Nodejs启动时会初始化event loop，每一个event loop都会包含按照如下顺序的六个循环阶段。

```
timers --> I/O callbacks --> idle,prepare --> 
poll --> check --> close callbacks
```
1. timers阶段：这个阶段执行setTimeout和setInterval预定的callback。
2. I/O callback阶段：执行除了close事件的callbacks，timers设定的定时器，setImmediate设定的callback之外的callbacks。
3. idle，prepare阶段：仅node内部使用。
4. poll阶段：获取新的I/O事件，适当的条件下node将阻塞在这里。
5. check阶段：执行setImmediate设定的callbacks。
6. close callbacks阶段：执行关闭事件的callbacks，比如socket.on('close' , callback)的callback就会在这里执行。

**注意：上面的六个阶段都不包括process.next()。**

---

### timers阶段
定时器指定的回调函数会在指定的阈值之后执行，而不是人们希望的在准确的时间执行回调函数，它都是要比指定的时间要慢一点，因为操作系统调度或者其他回调函数的执行都会导致定时器回调函数延迟执行。

**注意：从技术上来讲，poll阶段控制定时器什么时候会被执行。**
```
const fs = require('fs');
//如果这个读取文件花了95ms
function readFile (callback) {
	fs.readFile('../global/index.js' , 'utf8' , callback);
};
const startTime = Date.now();
setTimeout(() => {
	const delay = Date.now() - startTime;
	console.log(`${delay}ms have passed since i was scheduled`);
} , 100);
readFile(function () {
	const start = Date.now();
	//这里又花了10ms
	while (Date.now() -start < 10) {

	}
})
```
上面这个例子，我们可以这样来解释：
timers阶段，无callback执行，因为定时器指定了100ms之后才执行。

I/O阶段，无异步I/O完成，readFile此时还没有读取完成，所以不会调用callback。

idle，prepare阶段，可以忽略，属于node内部使用。

poll阶段，当event loop进入poll阶段，这个时候poll是一个空队列，因为fs.readFile()还没有读取完成，所以它会等待剩余的毫秒，直到到达定时器指定的值。但是当等待95ms后，fs.readFile()读取完成，那么会把这个回调函数添加到poll中，并且执行，这个函数执行花费了10ms，当回调函数结束时，在队列中没有更多的回调函数，因此event loop会看到定时器已经到达指定的阈值，然后回调定时器阶段执行定时器的回调函数。

在上面这个例子中我们可以看到，当执行定时器回调函数时，打印出来的结果会是105ms。

### I/O callbacks
这个阶段执行除了timers阶段设定的定时器回调函数，setImmediate设置的回调函数，以及close callbacks阶段的回调函数之外的回调函数。
### poll
poll阶段有两个主要的功能：
1. 处理poll队列中的事件（callback）
2. 执行timers的callback，当到达timers指定的时间时。

当event loop进入到poll阶段时，并且代码没有设定timers，将会发生下面情况：
1. 如果poll队列不为空，event loop将同步执行队列中的回调函数，直到队列为空为止，或者执行的回调函数到达系统上线。
2. 如果poll队列为空，将会发生下面的情况：第一：如果代码已经设定了setImmediate回调函数，那么event loop会结束poll阶段进入check阶段，执行check阶段的回调函数。第二：如果代码没有设定setImmediate回调函数，event loop会等待被添加到队列的回调函数，然后立刻执行回调函数。

**一旦poll队列为空时，event loop会检查设定的timers指定的阈值，如果一个或多个timers到达了指定时间，那么event loop会返回到timers阶段执行timers回调函数。**
### check
这个阶段允许在poll阶段结束后立即执行回调函数。如果poll阶段空闲并且setImmediate回调函数已经加入到队列，event loop可以继续执行check阶段而不是等待。

setImmediate实际上是一个特殊的定时器，它在event loop中的一个独立阶段(check阶段)执行。会在poll阶段结束之后执行setImmediate设置的回调函数。

通常，随着代码的执行，event loop将最终进入到poll阶段，在poll阶段，它等待一个连接，请求等，但是，如果setImmediate指定了回调函数并且poll阶段处于空闲状态，继续执行check阶段，而不是等待轮询事件。

### close callbacks
如果一个socket或者句柄被突然关闭(比如：socket.destroy())，那么在这个阶段'close'事件将会被触发。

### setImmediate() VS setTimeout()
setImmediate和setTimeout非常相似，但是两者的区别取决于它们什么时候被调用。

setImmediate()：一旦poll阶段结束就会立即执行setImmediate的回调函数。在check阶段执行。

setTimeout()：当poll阶段处于空闲，且设定的时间已经到达后会执行，在timers阶段执行。

定时器的调用取决于调用的上下文。如果两者都是从主模块内部调用，那么时序将受到进程性能的限制。

比如，如果我们接下来的代码不在一个异步I/O循环内执行，那么setTimeout(fn , 0)和setImmediate(fn)的执行顺序是不确定的，因为会受到进程性能的限制：
```
setTimeout(() => {
	console.log(1);
} , 0)
setImmediate(() => {
	console.log(2);
})
//有可能打印的顺序是1，2；也有可能是2，1
在node中，setTimeout(cb, 0) === setTimeout(cb, 1);而setImmediately属于uv_run_check的部分确实每次loop进来，都是先检查uv_run_timer的，但是由于cpu工作耗费时间，比如第一次获取的hrtime为0那么setTimeout(cb,1)，超时时间就是loop->time = 1(ms，node定时器精确到1ms，但是hrtime是精确到纳秒级别的)所以第一次loop进来的时候就有两种情况：
1.由于第一次loop前的准备耗时超过1ms，当前的loop->time >=1 ，则uv_run_timer生效，timeout先执行
2.由于第一次loop前的准备耗时小于1ms，当前的loop->time = 0，则本次loop中的第一次uv_run_timer不生效，那么io_poll后先执行uv_run_check，即immediate先执行，然后等close cb执行完后，继续执行uv_run_timer
```
但是，如果setTimeout(fn , 0)和setImmediate(fn)在一个异步I/O循环内执行，那么总是setImmediate回调函数先执行：
```
const fs = require('fs');
fs.readFile('../module/index.js' , 'utf8' , (err , data) => {
	setTimeout(() => {
		console.log('timeout');
	} , 0);
	setImmediate(() => {
		console.log('immediate');
	})
});
//其实这也比较好解释，因为根据事件循环的六个阶段，当I/O阶段，执行完所有的回调函数后，就会进入到idle阶段，这个阶段是供nodejs内部使用的，可以忽略，然后进入poll阶段，结果在poll阶段没有可执行的队列，就会进入check阶段，那么这个时候因为代码已经设置了setImmediate回调函数，所以会被立即执行，执行完后，会到close阶段，没有需要执行的，就会去检查是否有timers已经到达了指定的时间，如果有的话，就会回到timers阶段执行timers设置的回调函数。
```

使用setImmediate()比使用setTimeout的优势在于，如果是在异步I/O循环内调用时，setImmediate总是在任何timers之前先调用，这与timers的数量没有关系。
### process.nextTick()
你可以已经注意到了，process.nextTick()并不属于event loop中的六个阶段的其中一个，尽管他是一个异步的API。这是因为process.nextTick()方法在技术上并不是event loop中的一部分。相反，nextTickQueue将在当前操作完成后就会被执行，而不管当前是处于event loop的哪个阶段，其实也就是说，只要event loop当前阶段的回调函数全部都执行完了或者达到系统上限，那么就会执行nextTickQueu中的回调函数。

**process.nextTick()不在event loop的任何阶段执行，而是在各个阶段切换的中间执行,即从一个阶段切换到下个阶段前执行。**

回过头来看event loop的六个阶段，只要你在给定的阶段任何时间执行process.nextTick()，传递给process.nextTick()的所有回调函数都会在evetn loop继续之前被执行。这可能会造成一些不好的情况，因为它允许你通过递归调用process.nextTick()来"饿死"你的异步I/O，从而防止事件循环到达poll阶段。

#####  递归调用 process.nextTick 会怎么样?
递归调用process.nextTick()，将会导致事件循环永远到不了poll阶段（轮询阶段）。

##### 为什么会允许出现process.nextTick()这样的API呢？
```
function apiCall(arg, callback) {
  if (typeof arg !== 'string')
    return process.nextTick(callback,
                            new TypeError('argument should be string'));
}
```
上面的代码，我们可以看到，当我们执行apiCall函数后，如果参数不是字符串，那么会将错误传递给用户。但是我们这里通过process.nextTick()方法将错误作为参数传入，并且process.nextTick()是在其余代码执行完之后才会调用。我们保证apiCall()总是在用户代码的其余部分之后并且在事件循环被允许继续之前运行它的回调。

我们再来看一个例子：
```
let bar;

// this has an asynchronous signature, but calls callback synchronously
function someAsyncApiCall(callback) { callback(); }

// the callback is called before `someAsyncApiCall` completes.
someAsyncApiCall(() => {

  // since someAsyncApiCall has completed, bar hasn't been assigned any value
  console.log('bar', bar); // undefined

});

bar = 1;
```
上面这段代码调用someAsyncApiCall函数时，其实该函数是一个同步函数，所以当执行该函数的回调函数是，变量bar还没有被赋值，所以打印是undefined。

如果我们将代码改成这样，得到的结果就是不一样的：
```
let bar;

// this has an asynchronous signature, but calls callback synchronously
function someAsyncApiCall(callback) { 
	process.nextTick(callback);
}

// the callback is called before `someAsyncApiCall` completes.
someAsyncApiCall(() => {

  // since someAsyncApiCall has completed, bar hasn't been assigned any value
  console.log('bar', bar); // 1

});

bar = 1;
```
上面代码可以看出，因为process.nextTick()属于异步，所以会在同步代码执行完之后才执行，所以当执行函数的回调函数时，bar已经被赋值为1，所以打印为1.

### 为什么需要使用process.nextTick()?
这里有两个主要的原因：
1. 允许用户处理错误，清除不必要的资源，或者在event loop继续之前试着再发送请求。
2. 有时候需要在循环阶段回调函数调用完但event loop继续之前允许执行回调。

我们来看一个例子：
```
const EventEmitter = require('events');
const util = require('util');

function MyEmitter() {
  EventEmitter.call(this);
  this.emit('event');
}
util.inherits(MyEmitter, EventEmitter);

const myEmitter = new MyEmitter();
myEmitter.on('event', function() {
  console.log('an event occurred!');
});
```
上面代码，不能再构造函数中触发事件，因为代码还没有执行到绑定该事件，但是我们可以在构造函数中，使用process.nextTick()来设置触发事件的回调函数，在构造函数执行完之后:
```
const EventEmitter = require('events');
const util = require('util');

function MyEmitter() {
  EventEmitter.call(this);
  process.nextTick(function () {
  	this.emit('event');
  }.bind(this));
}
util.inherits(MyEmitter, EventEmitter);

const myEmitter = new MyEmitter();
myEmitter.on('event', function() {
  console.log('an event occurred!');
});
```
[cnode社区的这边文章讲的比较清楚](https://cnodejs.org/topic/57d68794cb6f605d360105bf)