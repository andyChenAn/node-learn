## fs(文件系统)
对于Unix/Linux系统来说，一切皆是文件。nodejs封装了POSIX文件IO操作。
### 读取配置文件
一般我们使用fs.readFile方法来读取文件里的内容，但是该方法有同步的也有异步的，什么时候该用同步的什么时候该用异步的？一般同步方法的调用是在应用一开始初始化的时候。
```
const fs = require('fs');
try {
    const config = fs.readFileSync('./config.json');
} catch (err) {
    console.log(err.message);
}
```
当然我们也可以使用异步的方式来读取配置文件

```
const fs = require('fs');
fs.readFile('./config.json' , (err , data) => {
    if (err) {
        throw err;
    }
    let config = JSON.parse(data.toString());
})
```
但是最简单的方式还是直接通过require方法

```
const config = require('./config.json');
```
这里我们需要注意一点，如果使用require方法来读取配置文件，那么我们应该把config对象看做是一个只读的，如果我们去修改它的话，那么如果其他文件也有引用这个配置文件，那么其他文件就会受到影响，这是由于require方法在加载一个文件的时候，会缓存这个文件。
index.js文件
```
const fs = require('fs');
const config = require('./config.json');
config.job = 'doctor';  //修改数据
const other = require('./other.js');
console.log(other)
```
other.js文件
```
const config = require('./config.json');
module.exports = config;
```
config.json文件
```
{
	"name" : "age",
	"age" : 12,
	"job" : "teacher"
}
```
当我们执行index.js文件时，打印的结果是：
```
{ name: 'age', age: 12, job: 'doctor' }
```
other.js文件引用的config.json文件，结果并不是config.json里面的数据。
### 递归文件操作
有的时候我们需要从多层文件目录中查找某一个文件，这个时候我们会用到递归文件操作，比如：

findSync.js文件
```
// 这里实现的是同步版本
const fs = require('fs');
const join = require('path').join;
exports.findSync = function (nameRe , startPath) {
	let results = [];
	function finder (path) {
		let files = fs.readdirSync(path);
		for (let i = 0 ; i < files.length ; i++) {
			let fpath = join(path , files[i]);
			let stat = fs.statSync(fpath);
			if (stat.isDirectory()) {
				finder(fpath);
			};
			if (stat.isFile() && nameRe.test(files[i])) {
				results.push(files[i]);
			}
		}
	};
	finder(startPath);
	return results;
}
```
index.js文件
```
const fs = require('fs');
const check = require('./findSync.js');
let result = check.findSync(/andy/ , '../../nodejs/');
console.log(result);
```
当我们执行index.js文件时，就会查找目录下所有的带有andy文件名的文件。需要注意的是，这里我们实现的是同步版本。我们再来看一下异步版本的具体实现：
```
const fs = require('fs');
const join = require('path').join;
exports.find = function (nameRe , startPath , callback) {
	let results = [];
	let count = 0;
	function finder (path) {
		count++;
		fs.readdir(path , (err , files) => {
			if (err) {
				throw err;
			}
			for (let i = 0 ; i < files.length ; i++) {
				count++;
				let fpath = join(path , files[i]);
				fs.stat(fpath , (err , stats) => {
					if (stats.isDirectory()) {
						finder(fpath);
					} else if (stats.isFile() && nameRe.test(files[i])) {
						results.push(fpath);
					};
					count--;
					if (count == 0) {
						callback(null , results);
					}
				})
			};
			count--;
			if (count == 0) {
				callback(null , results);
			}
		})
	};
	finder(startPath);
};
```
### 操作文件数据库
操作文件数据库，其实主要就是对文件里的内容进行增删改查。我们事先定义好数据库的格式为一行一个json数据，然后我们可以每次读取一行数据对数据进行修改：
```
{"key" : "foo" , "value" : "andy"}
{"key" : "bar" , "value" : "12"}
{"key" : "baz" , "value" : "teacher"}
```
再定义一个操作文件数据库的类以及实例方法：database.js
```
class Database extends EventEmitter {
	constructor (path) {
		super();
		this.path = path;
		this._records = Object.create(null);  //定义一个空对象
		this._writeStream = fs.createWriteStream(path , {
			encoding : 'utf8',
			flags : 'a'
		});
		this._load();
	}
	_load () {
		const readable = fs.createReadStream(this.path);
		let data = '';
		readable.on('data' , chunk => {
			data += chunk.toString();
			let records = data.split('\n');
			data = records.pop();
			for (let i = 0 ; i < records.length ; i++) {
				try {
					let record = JSON.parse(records[i]);
					if (record.value == null) {
						delete this._records[record.key];
					} else {
						this._records[record.key] = record.value;
					}
				} catch (e) {
					this.emit('error' , 'found invalid record : ' + records[i]);
				}
			}
		});
		readable.on('end' , () => {
			this.emit('load');
		})
	}
	get (key) {
		return this._records[key] || null;
	}
	set (key , value , callback) {
		let toWrite = JSON.stringify({key : key , value : value}) + '\n';
		if (value == null) {
			delete this._records[key];
		} else {
			this._records[key] = value;
		};
		this._writeStream.write(toWrite , callback);
	}
	delete (key , callback) {
		return this.set(key , null , callback);
	}
}
module.exports = Database;
```
index.js文件：
```
const fs = require('fs');
const Database = require('./database.js');
const client = new Database('./test.db');
client.on('load' , function () {
	let foo = client.get('foo');
	client.set('bar' , 'fdasfas' , function (err) {
		if (err) {
			throw err;
		}
		console.log('write successful');
	});
});
client.on('error' , function (msg) {
	console.log(msg)
})
```
结果：我们可以查看test.db文件的数据变化：
```
{"key" : "foo" , "value" : "andy"}
{"key" : "bar" , "value" : "12"}
{"key" : "baz" , "value" : "teacher"}
{"key":"bar","value":"fdasfas"}
{"key":"baz","value":null}
```
### 监视文件及文件夹
调用fs.watch()和fs.watchFile()方法来实现。