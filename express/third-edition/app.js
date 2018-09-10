const express = require('./express.js');
const app = express();
app.get('/' , function (req , res) {
    res.end('hello world');
});
app.get('/user' , function (req , res) {
    res.end('hello user');
});
app.get('/' , function (req , res) {
    console.log(132);
})
console.log(app._router);
app.listen(3000 , function () {
    console.log('listening port 3000');
});