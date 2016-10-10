__tailed-mongo__ is un uncoupled module for MongoDB capped collections.
Capped collections guarantee preservation of the insertion order. As a result, queries do not need an index to return documents in insertion order.

__tailed-mongo__ subscribes itself to a tailable cursor, avoiding the overhead of polling.

Installation
============

`npm install tailed-mongo`


Usage
=====

Create a new tail, passing options and an optional callback as arguments:

```javascript
let t = require('tailed-mongo');
let options = {
  database: db //connected database!
};
let conveyor = t(options);
conveyor.publish('hello');
```

Available methods
-----------------
* `publish(message, callback)`: Publishes a message
* `on(eventName, eventHandler)`: Registers an event handler
* `close()`: Closes the tailed cursor

Available events
----------------

| Event Name    | Description                                                      |
|---------------|------------------------------------------------------------------|
| `ready`       | Emitted when connection is ready and cursor is created.          |
| `error`       | Emitted when an error occurs.                                    |
| `acknowledge` | Emitted when a publication has been effectively made.            |
| `message`     | Emitted when a new message (from other party) has been published |

Options
=======

__Please NOTE that `options.database` is always required, keeping tailed-mongo uncoupled to the MongoDB connections.__

| Parameter    | Default                   | Description                                                               |
|--------------|---------------------------|---------------------------------------------------------------------------|
| `database`   | No default. __Mandatory__ | Connected database                                                        |
| `collection` | `conveyor`                | Collection name (it will be automatically created for you)                |
| `idHandler`  | `ObjectID()`              | Function to generate _id (should be unique!)                              |
| `size`       | `16777216` (16Mb)         | The maximum size of the collection in bytes                               |
| `max`        | `16`                      | The maximum number of documents                                           |

Example
=======

```javascript
'use strict'

let conveyor = require('./index');
let connectionURI = 'mongodb://localhost/test';
let connectionOptions = { 
  db: { native_parser: true },
  server: { poolSize: 5, auto_reconnect: true } 
}

require('mongodb').connect(connectionURI, connectionOptions, function(err, db) {
  if (err) return console.err('There was an error connecting to MongoDB');
  let options = {};
  options.database = db;
  options.collection = 'conveyor_test';
  let conveyed = conveyor(options);
  conveyed.on('error',   function(err)  { console.log('There was an error!', err) })
  conveyed.on('ready',   function()     { console.log('We are ready!') })
  conveyed.on('message', function(data) { console.log('New message: ', data) })
  conveyed.on('acknowledge', function(data) { console.log('Acknowledged: ', data) })
  setInterval(function() { conveyed.publish(Math.random()) }, 5);
  setTimeout(function() { conveyed.close() }, 1000);
});
```

License
=======

The MIT License (MIT)
Copyright (c) 2016 Manuel de la Higuera

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

