/* Copyright 2014, Blaise Tine. */

var buffer = [];

onmessage = function (e) {
    //--
    var data = e.data;
    switch (data.cmd) {
    case 'put':
        buffer.push(data.msg);
        break;
    case 'get':
        postMessage(buffer);
        break;
    }
};
