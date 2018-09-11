const express = require('./express.js');
const app = express();
app.get('/user' , function d (req , res , next) {
    res.end('hello user');
});
app.get('/' , function a (req , res , next) {
    console.log(1);
    sdfas
    next();
} , function c (req , res , next) {
    console.log(2);
    next();
});
app.get('/' , function (req , res) {
    res.end('hello andy')
});
app.listen(3000 , function () {
    console.log('listening port 3000');
});