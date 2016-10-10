'use strict'

const EventEmitter = require('events');
const MongoDB = require('mongodb');
const async = require('async');
const crypto = require('crypto');

module.exports = function conveyor(options, callback) {
  let collection, startPoint, cursor;
  let database       = options.database;
  let collectionName = options.collection || 'conveyor';
  let idHandler      = options.idHandler  || function() { MongoDB.ObjectID() };
  let collectionOptions = {
    capped: true,
    size:   Math.pow(2,24) || options.size,
    max:    Math.pow(2,4)  || options.max
  }
  
  let emitter = new EventEmitter();
  let closed = true;
  let id = options.id ||crypto.randomBytes(8).toString('hex');
  
  let findStartPoint = function(collection, callback) {
    let options = { sort: { $natural: -1 }};
    collection.findOne({}, options, function(err, result) {
      if (err) return callback(err);
      else if (result) {
        startPoint = result._id;
        callback(null, result);
      } else {
        startPoint = idHandler();
        collection.insert({ _id: startPoint }, function(err, doc) {
          if (err || !doc.result.ok) return callback(err || 'error')
          return callback(null, null);
        })
      }
    })
  }

  let createCollection = function(callback) {
    if (collection) return callback(null, collection);
    database.createCollection(collectionName, collectionOptions, function(err, coll) {
      if (err) return callback(err);
      collection = coll;
      callback(null, coll);
    })
  }
  
  async.waterfall([createCollection, findStartPoint], function(err, previous) {
    if (err) {
      emitter.emit('error', err);
      return callback && callback(err);
    }
    if (previous && previous.message) emitter.emit('message', previous.message);
    let options = { tailable: true, awaitdata: true, numberOfRetries: -1 }
    cursor = collection.find({ _id: { $gt: startPoint } }, options);
    cursor.each(function(err, doc) {
      if (err) return emitter.emit('error', err);
      if (!doc || !doc.message) return;
      emitter.emit((doc.by == id)? 'acknowledge' : 'message', doc.message);
    })
    closed = false;
    emitter.emit('ready');
    return callback && callback(null, previous);
  })
  
  let exports = {};
  exports.on = emitter.on.bind(emitter);
  exports.close = function() {
    cursor.close();
    closed = true;
    emitter.emit('closed');
  }
  
  exports.publish = function(message, callback) {
    if (closed) {
      let msg = 'Cannot publish, conveyor is closed';
      emitter.emit('closed', msg)
      return callback && callback(msg);
    }
    let doc = {};
    doc._id = idHandler();
    doc.message = message;
    doc.by = id;
    collection.insert(doc, callback);
  }
  return exports;
}

