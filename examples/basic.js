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
  options.close = true;
  let conveyed = conveyor(options);
  conveyed.on('error',   function(err)  { console.log('There was an error!', err) })
  conveyed.on('ready',   function()     { console.log('We are ready!') })
  conveyed.on('message', function(data) { console.log('New message: ', data) })
  conveyed.on('acknowledge', function(data) { console.log('Acknowledged: ', data) })
  setInterval(function() { conveyed.publish(Math.random()) }, 5);
});

