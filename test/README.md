## 测试
### 为什么要写测试代码？
说实话，代码测试的重要性真的很大，大家应该都有遇到过以下几种情况：
1. 在做完需求的时候，叫产品测试，测出很多问题，有一些逻辑是没有想到的，再测试中根本就没有效果，所以我们就只能再往代码中添加代码，这样会出现一种情况就是，代码写的越来越难看。
2. 产品需求需要更新的时候，我们需要重新修改之前的代码，可能之前的代码又依赖其他代码，或者之前的代码不是你写的，你也不知道这些代码是否会对其他代码造成影响，所以等你改完代码之后，可能会影响到其他代码的运行，最终就会导致"昨天都还好好的，怎么今天就不行了呢？"等这种问题。

这就是我们为什么需要写测试代码的原因。当然有很多公司其实也不需要写，因为公司比较的小，业务逻辑相对比较简单，所以觉得不需要，同时还有一个原因就是写测试代码确实是需要花时间的。这对于很多公司来说，是无法接受的。当然我公司也是没有写测试代码的，但是这是非常有必要学习的。
### 用什么测试框架？
我这里学习过程中使用的是Mocha和should两个，当然也可以使用其他的框架。Mocha测试框架可以在nodejs和浏览器上都运行。
```
const should = require('should');
describe('Array' , function () {
	describe('#indexOf()' , function () {
		it('should return -1 when the value is not present' , function () {
			[1,2,3].indexOf(4).should.equal(-1);
		})
	})
});
```
输入命令：mocha index.test.js即可，结果为：
```
  Array
    #indexOf()
      √ should return -1 when the value is not present


  1 passing (7ms)

```
上面的例子，我们测试的是同步的代码，那么异步的代码怎么测试呢？

对于mocha来说，测试异步代码也是比较简单的，只要当你的异步测试完成后，调用回调函数就可以了，通过在it方法中添加一个回调函数，通常名字为done就可以了，这样mocha自己就会知道该回调函数会等到测试完成之后再调用。done回调可以接受一个错误实例或者一个错误值。

index.js代码：
```
exports.timeout = function (callback) {
	setTimeout(function () {
		callback();
	} , 1000)
}
```
index.test.js代码：
```
const should = require('should');
const {timeout} = require('./index');
describe('setTimeout' , function () {
	describe('timeout 1000ms' , function () {
		it('timeout 1000ms,test successfully' , function (done) {
			timeout(function () {
				done();
			})
		})
	})
})
```
结果：
```
  setTimeout
    timeout 1000ms
      √ timeout 1000ms,test successfully (1003ms)


  1 passing (1s)
```
### 测试promise代码：
我们可以使用promise来代替done回调函数，比如：index.test.js代码：
```
const should = require('should');
const fs = require('fs');
const path = require('path');
function readFile (path) {
	return new Promise(function (resolve , reject) {
		fs.readFile(path , function (err , data) {
			if (err) {
				reject(err);
			} else {
				resolve(data.toString());
			}
		});
	})
};

describe('读取andy.txt文件的内容' , function () {
	it('读取文件成功' , function () {
		let p = path.join(__dirname + '/andy.txt');
		readFile(p)
		.then(function (result) {
			result.should.be.equal('andychenan');
		});
	});
});
```
结果为：
```
  读取andy.txt文件的内容
    √ 读取文件成功


  1 passing (6ms)
```
### 测试async/await代码：
如果我们需要测试async/await代码，那么我们只需要将it方法中的第二个参数（本来就是一个回调函数）改为asycn function () {}形式就可以了。比如：

index.test.js代码：
```
const should = require('should');
const fs = require('fs');
const path = require('path');
function readFile (path) {
	return new Promise(function (resolve , reject) {
		fs.readFile(path , function (err , data) {
			if (err) {
				reject(err);
			} else {
				resolve(data.toString());
			}
		});
	})
};

describe('读取andy.txt文件的内容' , function () {
	it('读取文件成功' , async function () {
		let p = path.join(__dirname + '/andy.txt');
		const content = await readFile(p);
		content.should.be.equal('andychenan');
	});
});
```
### 测试同步代码
```
const should = require('should');
describe('Array' , function () {
	describe('#indexOf()' , function () {
		it('should return -1 when the value is not present' , function () {
			[1,2,3].indexOf(4).should.equal(-1);
			[1,2,3].indexOf(0).should.equal(-1);
		})
	})
})
```
### mocha中的hooks，before，after，beforeEach，afterEach
这四个hook的执行顺序是before-->beforeEach-->test-->afterEach-->after。
```
const should = require('should');
describe('Array' , function () {
	let arr = [1,2];
	//测试之前先会执行这里，arr添加了一个3.
	beforeEach(function () {
		arr.push(3);
	});
	describe('#indexOf()' , function () {
		it('should return -1 when the value is not present' , function () {
		    // 因为arr存在3，所以大于-1
			arr.indexOf(3).should.be.above(-1)
		})
	})
})
```
### 延迟测试

```
setTimeout(function () {
	describe('Array' , function () {
		let arr = [1,2];
		beforeEach(function () {
			arr.push(3);
		});
		describe('#indexOf()' , function () {
			it('should return -1 when the value is not present' , function () {
				arr.indexOf(3).should.be.above(-1)
			})
		})
	});
	run();
} , 4000)
```
### pending test
如果在it方法中没有传入回调函数，那么这个测试就会被pending。
```
const should = require('should');
describe('Array', function() {
  describe('#indexOf()', function() {
    // pending test below
    it('should return -1 when the value is not present');
  });
});
```
结果为：
```
  Array
    #indexOf()
      - should return -1 when the value is not present


  0 passing (4ms)
  1 pending
```
### exclusive test
我们可以通过添加only()方法来执行单独指定的一个测试用例或套件。比如：
```
const should = require('should');
describe('Array' , function () {
	describe.only('#indexOf()' , function () {
        describe('#indexOf()' , function () {
    		it('if the value no present , return -1' , function () {
    			[1,2,3].indexOf(4).should.be.equal(-1);
    		});
    		it('if the value is present , above -1' , function () {
    			[1,2,3].indexOf(2).should.be.above(-1);
    		});
        })
	})
})
```
上面的这个例子中，套件里面的两个测试用例都会被执行，我们在套件中添加only方法，但是所有嵌套的套件都会被执行，里面的测试用例都会被执行。

如果我们只需要里面其中一个测试用例执行，那么我们可以将only方法添加到it中，比如：
```
const should = require('should');
describe('Array' , function () {
	describe('#indexOf()' , function () {
		it('if the value no present , return -1' , function () {
			[1,2,3].indexOf(4).should.be.equal(-1);
		});
		it.only('if the value is present , above -1' , function () {
			[1,2,3].indexOf(2).should.be.above(-1);
		});
	})
})
```
上面的代码中，第一个测试用例是不会执行的，只有第二个测试用例执行。

除此之外，only方法可以在一个套件中，被多次使用，比如：

```
const should = require('should');
describe('Array' , function () {
	describe('#indexOf()' , function () {
		it('if the value no present , return -1' , function () {
			[1,2,3].indexOf(4).should.be.equal(-1);
		});
		//这个会执行
		it.only('if the value is present , above -1' , function () {
			[1,2,3].indexOf(2).should.be.above(-1);
		});
		//这个也会执行
		it.only('should return the index when present' , function () {
			[1,2,3].indexOf(2).should.be.equal(1);
		})
	})
})
```
### inclusive test
该特性和only刚好相反，我们可以通过添加skip()方法来告诉mocha哪些套件和测试用例可以被忽略，任何通过调用skip方法来测试的用例都会被标记为pedding状态。
```
const should = require('should');
describe('Array', function() {
	describe.skip('#indexOf()', function() {
		it('return -1' , function () {
			[1,2,3].indexOf(4).should.equal(-1)
		})
	});
});
```
结果：整个套件被标记为pending状态
```
  Array
    #indexOf()
      - return -1


  0 passing (4ms)
  1 pending
```
如果执行想其中一个测试用例被标记为pending，我们可以这样：
```
const should = require('should');
describe('Array', function() {
	describe('#indexOf()', function() {
		it.skip('return -1' , function () {
			[1,2,3].indexOf(4).should.equal(-1)
		});
		it('above -1' , function () {
			[1,2,3].indexOf(2).should.be.above(-1);
		})
	});
});
```
结果：
```
  Array
    #indexOf()
      - return -1
      √ above -1


  1 passing (5ms)
  1 pending
```
### 使用mocha来测试web应用
看个例子：这里使用mocha和should来测试web应用
```
const http = require('http');
const should = require('should');

function request (method , url , callback) {
	const request = http.request({
		hostname : 'localhost',
		port : 8000,
		path : url,
		method : method
	} , function (res) {
		res.body = '';
		res.on('data' , function (chunk) {
			res.body += chunk.toString();
		});
		res.on('end' , function () {
			callback(res);
		});
	});
	request.end();
};

const server = http.createServer(function (req , res) {
	if (req.url.match(/^\/square/)) {
		let params = req.url.split('/');
		let number;
		if (params.length > 1 && params[2]) {
			number = parseInt(params[2] , 10);
			res.writeHead(200);
			res.end((number * number).toString());
		} else {
			res.writeHead(500);
			res.end('Invalid input');
		}
	} else {
		res.writeHead(404);
		res.end('Not Found');
	}
});

server.listen(8000 , function () {
	console.log('listening port 8000');
});


describe('Example web app' , function () {
	it('should square numbers' , function (done) {
		request('GET' , '/square/4' , function (res) {
			res.statusCode.should.equal(200);
			res.body.should.equal('16');
			done();
		})
	});
	it('should return a 500 for invalid square requests' , function (done) {
		request('GET' , '/square' , function (res) {
			res.statusCode.should.equal(500);
			done();
		})
	});
});
```
### 通过创建类来模拟关系型数据库的测试数据
```
const crypto = require('crypto');
const should = require('should');
function User (fields) {
	this.fields = fields;
}

User.prototype.save = function (callback) {
	process.nextTick(callback);
}
User.prototype.signIn = function (password) {
	let shasum = crypto.createHash('sha1');
	shasum.update(password);
	return shasum.digest('hex') === this.fields.hashed_password;
}
describe('user model' , function () {
	describe('sign in' , function () {
		let user = new User({
			email : 'alex@example.com',
			hashed_password : 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3'
		});
		before(function (done) {
			user.save(done);
		});
		it('should accept the correct password' , function () {
			user.signIn('test').should.be.true;
		});
		it('should not accept the correct password' , function () {
			user.signIn('wrong').should.be.false;
		})
	})
})
```
其实上面的例子中，我们可以测试我们输入的密码是否正确。
