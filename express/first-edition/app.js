const express = require('./express.js');
const app = express();
app.get('/' , function (req , res) {
    res.end('hello world');
});
app.listen(3000 , function () {
    console.log('listening port 3000');
});