# CommonJS规范
说起这个，估计大部分的人都有所了解，具体CommonJS规范是什么？估计就比较少有人能把它说清楚了（自己猜的）。最先接触到这个是在网上看到CommonJS，AMD，CMD的比较，所以本能的认为CommonJS规指的就是如何加载模块。直到最近受高人指点去看了CommonJS规范的具体内容才发现，模块加载只是CommonJS规范中的一部分而已，其中还包括定义了，二进制数据，解码和字符集，IO操作，文件系统，断言测试，操作系统，套接字socket，TCP/IP，事件队列，工作线程和进程，包管理等，具体内容可以查看[CommonJS规范](http://wiki.commonjs.org/wiki/CommonJS)。而nodejs也是基于CommonJS规范实现的。
- [modules](http://wiki.commonjs.org/wiki/Modules)
- [binary](http://wiki.commonjs.org/wiki/Binary)
- [encodings](http://wiki.commonjs.org/wiki/Encodings)
- [i/o](http://wiki.commonjs.org/wiki/IO)
- [file-system](http://wiki.commonjs.org/wiki/Filesystem)
- [assert](http://wiki.commonjs.org/wiki/Unit_Testing)
- [system](http://wiki.commonjs.org/wiki/System/1.0)
- [sockets](http://wiki.commonjs.org/wiki/Sockets)
- [events-queue](http://wiki.commonjs.org/wiki/Reactor)
- [worker](http://wiki.commonjs.org/wiki/Worker)

全部内容请查看官网[CommonJS](http://wiki.commonjs.org/wiki/CommonJS)

### Modules模块
在CommonJS规范中指出：

**require：**

- 必须要有一个require函数
- require函数接受一个参数，该参数是一个模块标识符，即需要加载的模块名称
- 如果遇到模块循环引用，那么会返回一个未完成的对象
- 如果请求的模块不能返回，则会抛出一个错误
- require函数可以有一个main属性
  - 这个属性是只读的，不会被删除
  - main属性的值要么是一个undefined要么表示的是加载这个模块的上下文的module对象
- require函数可以有一个paths属性，按照路径字符串的优先级排列，从高到低直到顶层模块目录

**Module Context**
- 在模块中，有一个require变量，表示上面定义的require函数
- 在模块中，有一个exports变量，这个是模块在执行的时候可以添加API的对象
  - 模块必须使用“exports”对象作为唯一的导出方式。
- 在模块中，有一个module变量，它是一个对象
  - module对象必须有一个id属性，表示顶层模块的id。“id”属性必须是这样的，即require（module.id）将返回module.id所源自的exports对象。
  - module对象也可以有一个uri属性

**Module Identifiers**

- 模块标识符是由正斜杠分隔的items的字符串
- 一个items必须是一个驼峰字符串，'.'或者'..''
- 模块标识符可以没有文件拓展名，比如.js
- 模块标识符可以是相对的也可以是绝对的。如果第一个item是'.'或者'..'，那么这个模块标识符就是相对的
- 相对的模块标识符被解析是按照相对于require函数调用的路径来解析