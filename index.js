'use strict'

const EventEmitter = require('events');
const MongoDB = require('mongodb');
const async = require('async');
const crypto = require('crypto');

module.exports = function conveyor(options, callback) {
  let collection, startPoint, cursor;
  let database       = options.database;
  let collectionName = options.collection || 'conveyor';
  let idHandler      = options.idHandler;
  let collectionOptions = {
    capped: true,
    size:   options.size || Math.pow(2,24),
    max:    options.max  || Math.pow(2,4)
  }
  
  let emitter = new EventEmitter();
  let closed = true;
  let id = options.id || crypto.randomBytes(8).toString('hex');
  
  let setStartPoint = function(callback) {
    var d = { by: id };
    if (idHandler) d._id = idHandler();
    collection.insert(d, function(err, doc) {
      if (err || !doc.result.ok) return callback(err || 'error');
      startPoint = doc._id;
      return callback(null, null);
    })
  }

  let findStartPoint = function(collection, callback) {
    if (options.forceStartPoint) return setStartPoint(callback);
    collection.findOne({}, { sort: { $natural: -1 }}, function(err, result) {
      if (err) return callback(err);
      if (!result) return setStartPoint(callback);
      startPoint = result._id;
      callback(null, result);
    });
  }

  let createCollection = function(callback) {
    if (collection) return callback(null, collection);
    database.createCollection(collectionName, collectionOptions, function(err, coll) {
      if (err) return callback(err);
      collection = coll;
      callback(null, coll);
    })
  }

  let close = function(cursor) {
    cursor.close();
    closed = true;
    emitter.emit('closed');
  }
  
  async.waterfall([createCollection, findStartPoint], function(err, previous) {
    if (err) {
      emitter.emit('error', err);
      return callback && callback(err);
    }
    if (previous && previous.message && !options.omitPrevious) emitter.emit('message', previous.message);
    let opts = { tailable: true, awaitdata: true, numberOfRetries: -1 }
    collection.find({ _id: { $gt: startPoint } }, opts, function(err, cursor) {
      cursor.forEach(function(doc, callback) {
        if (err) {
          if (callback) callback(err);
          emitter.emit('error', err);
        } else if (!doc || !doc.message) return;
        emitter.emit((doc.by == id)? 'acknowledge' : 'message', doc.message);
      })
      if (options.close) close(cursor);
      else closed = false;
      emitter.emit('ready');
      return callback && callback(null, previous);
    });
  })
  
  let exports = {};
  exports.on = emitter.on.bind(emitter);
  
  exports.publish = function(message, callback) {
    if (closed) {
      let msg = 'Cannot publish, conveyor is closed';
      emitter.emit('closed', msg)
      return callback && callback(msg);
    }
    let doc = {};
    if (idHandler) doc._id = idHandler();
    doc.message = message;
    doc.by = id;
    collection.insert(doc, callback);
  }
  return exports;
}
