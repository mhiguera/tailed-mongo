'use strict'

const MongoDB = require('mongodb');
const Koth = require('koth');
const mongoConveyor = require('../');

let connectionURI = 'mongodb://localhost/test';
let connectionOptions = { 
  db: { native_parser: true },
  server: { poolSize: 5, auto_reconnect: true } 
}


MongoDB.connect(connectionURI, connectionOptions,function(err, db) {
  if (err) return console.error(err);
  let game = Koth.play({
    encode: function(obj) { return Buffer.from(JSON.stringify(obj)) },
    decode: function(str) { return JSON.parse(str) }
  });
  let conveyed, bridged = false;

  function fromConveyor(value) {
    console.log('C:', value);
    game.broadcast(value);
  }

  function fromKoth(value) {
    console.log('K:', value);
    if (bridged) conveyed.publish(value);
  }

  function sendUpdate() {
    var value = Math.random();
    console.log('S:', value)
    if (bridged) conveyed.publish(value);
    game.broadcast(value);
  }

  game.on('listening', function() {
    bridged = true;
    let options = { database: db, collection: 'conveyor_test' }
    conveyed = mongoConveyor(options);
    conveyed.on('message', fromConveyor);
  });
  
  game.on('data', fromKoth);
  setInterval(sendUpdate, 1e3);
})
