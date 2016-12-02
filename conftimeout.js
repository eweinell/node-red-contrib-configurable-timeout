/**
 
Copyright (c) 2016, Erhard Weinell <sdev@weinell.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

module.exports = function(RED) {
  'use strict';
  var _ = require('lodash');
  RED.nodes.registerType('configurable-timeout', function(config) {
    
    RED.nodes.createNode(this, config);
    
    var node = this;
    var watchedTopics = {};
    
    node.on('close', cancelAll);
    
    node.on('input', function(msg) {
      var topic = msg.topic || '';
      if (msg.payload === config.cancelMessage.value || msg.canceltimeout === config.cancelMessage.value) {
        debug('received cancel message to send downstream');
        cancel(topic);
        node.send(msg);
      } else {
        debug('received message');
        var timeoutval = (config.timeoutQualifier.value && msg.timeout && msg.timeout[config.timeoutQualifier.value]) || msg.timeout || config.defaultTimeout.value;
        debug('received message for topic ' + topic + ' with timeout ' + timeoutval);
        register(topic, parseInt(timeoutval) * 1000);
      }
    });
    
    function register(topic, timeoutMillis) {
      var watch = watchedTopics[topic || ''];
      if (typeof watch === 'undefined') {
        var to = setTimeout(handleTimeout, timeoutMillis);
        var newwatch = {
          topic: topic,
          timeout: to
        };
        watchedTopics[topic || ''] = newwatch;
        debug('set new timeout for topic ' + topic);
        
        function handleTimeout() {
          debug('sent timeout message for topic ' + topic);
          node.send({topic: newwatch.topic, payload: config.timeoutMessage.value});
        }
      }
    }
    
    function cancel(topic) {
      var watch = watchedTopics[topic || ''];
      if (typeof watch !== 'undefined') {
        clearTimeout(watch.timeout);
        watchedTopics = _omit(watchedTopics, watch.topic);
        debug('cancelled timeout for topic ' + topic);
      }
    }
    
    function cancelAll() {
      _.each(watchedTopics, function(k, v) {
        clearTimeout(v.timeout);
      });
      watchedTopics = {};
      node.status({});
    }
    
    function debug(msg) {
      if (config.debug.value) {
       node.send({debug: msg}) 
      }
    }
  });
}