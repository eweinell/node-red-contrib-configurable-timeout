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
    var count = 0;
    
    node.on('close', cancelAll);
    
    node.on('input', function(msg) {
      var topic = msg.topic || '';
      if (msg.payload === config.cancelmsg || msg.canceltimeout === config.cancelmsg) {
        debug('received cancel message to send downstream');
        if (!cancel(topic)) {
          node.send(msg);
        }
      } else {
        var timeoutval = (config.timeoutQualifier && msg.timeout && (typeof msg.timeout[config.timeoutQualifier] === 'number')) ?
            msg.timeout[config.timeoutQualifier] : 
            (typeof msg.timeout === 'number' ? msg.timeout : 
              config.defaultTimeout);
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
        count++;
        update();
        debug('set new timeout for topic ' + topic);
        
        function handleTimeout() {
          debug('sent timeout message for topic ' + topic);
          node.send({topic: newwatch.topic, payload: config.timeoutMessage});
          cancel(topic);
        }
      }
    }
    
    function cancel(topic) {
      var watch = watchedTopics[topic || ''];
      if (typeof watch !== 'undefined') {
        clearTimeout(watch.timeout);
        watchedTopics = _.omit(watchedTopics, watch.topic);
        count--;
        update();
        debug('cancelled timeout for topic ' + topic);
        return true;
      }
      return false;
    }
    
    function cancelAll() {
      _.each(watchedTopics, function(k, v) {
        clearTimeout(v.timeout);
      });
      watchedTopics = {};
      count = 0;
      update();
      node.status({});
    }
    
    function update() {
      node.status({fill: count > 0 ? 'blue' : 'grey', shape:'dot', text:'tracking ' + count + ' topics'});
    }
    
    function debug(msg) {
      if (config.debug) {
       console.log(msg);
       node.send({debug: msg}); 
      }
    }
  });
}