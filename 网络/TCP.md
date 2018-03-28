## TCP
其实我没学过网络方面的知识，也只是在网上或者书上看过一些，不太懂，感觉很复杂，只记录一些简单的，自己能够理解的东西。
### 什么是TCP？
TCP：传输控制协议，是一种面向连接的，可靠的，基于字节流的传输层通信协议。在OSI模型中，它完成第四层传输层所指定的功能。
### TCP头格式
![tcp-header](https://github.com/andyChenAn/node-learn/raw/master/网络/image/tcp-header.jpg)

有几个点需要注意的：
- TCP的包是没有IP地址的，那是IP层上的事。但是有源端口和目标端口。
- 一个TCP连接需要四个元组来表示是同一个连接（src_ip, src_port, dst_ip, dst_port）准确说是五元组，还有一个是协议。但因为这里只是说TCP协议，所以，这里我只说四元组。
- Sequence Number是包的序号，用来解决网络包乱序（reordering）问题。
- Acknowledgement Number就是ACK——用于确认收到，用来解决不丢包的问题。
- Window又叫Advertised-Window，也就是著名的滑动窗口（Sliding Window），用于解决流控的。
- TCP Flag ，也就是包的类型，主要是用于操控TCP的状态机的。

### TCP的状态机
**TCP状态机：**

![TCP状态机](https://github.com/andyChenAn/node-learn/raw/master/网络/image/status.png)

![TCP连接](https://github.com/andyChenAn/node-learn/raw/master/网络/image/tcp_open_close.jpg)