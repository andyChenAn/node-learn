## fs(文件系统)
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





