// this heavily comes from yeti/cli.js, but slightly altered to meet our needs

var 
  yeti = require('yeti')
, Q = require('q')
, EventEmitter = require('events').EventEmitter
, url = require('url')
, util = require('./util')
;


function Yeti(urlParts, options) {
    var 
      self = this
    , client
    , tests
    ;

    function _normalizeFarmId(farmId) {
        var map = {
              'Chrome': 'chrome'
            , 'Firefox': 'firefox'
            , 'Internet Explorer': 'ie'
        };
        return map[farmId] ? map[farmId] : farmId;
    }


    function _normalizeFarmOs(os) {
        var map = {
              'Windows': 'win'
            , 'Linux': 'linux'
            , 'Mac': 'mac'
        };
        return map[os] ? map[os] : os;
    }
    

    function _toUID(agentStr) {
        var m = agentStr.match(/([^\(]+)\s\((\d+)[^\/]+\/\s(\w+)/);
        if (m) {
            return [
                  _normalizeFarmId(m[1])    // id
                , +m[2]                     // version
                , _normalizeFarmOs(m[3])    // osId
            ].join(':');
        }
        return null;
    }

    if (typeof(urlParts) == 'string') {
        urlParts = url.parse(urlParts);
    }


    options = util.extend({
          verbose: true
        , loglevel: 'silent'
    }, options || {});


    util.extend(this, {

        start: function(tests) {
            client = yeti.createClient(url.format(urlParts)); 

            client.on('agentConnect', function (agent) {
                self.addJob(tests);
                self.emit('agentConnect', _toUID(agent), agent);
            });

            client.on('agentDisconnect', function (agent) {
                self.emit('agentDisconnect', _toUID(agent), agent);
            });

            var connect = Q.nbind(client.connect, client);
            connect()
                .fail(function() {
                    var hub = new yeti.createHub({
                        loglevel: options.loglevel
                    });

                    hub.listen(urlParts.port);
                    return connect();
                })
                .then(function() {
                    self.emit('ready');
                })
                .fail(function(err) {
                    self.emit('error', err);
                });
        }


        , addJob: function(tests) {
            var batch = client.createBatch({
                  basedir: process.cwd()
                , tests: tests
                , useProxy: true
            });

            batch.on('agentResult', function (agent, details) {
                /* details sample

                { Utils: { 
                    name: 'Utils',
                    passed: 58,
                    failed: 1,
                    total: 59,
                    test1: { result: true, message: 'Check array iteration', name: 'test1' },
                    test2: { result: true, message: 'Check array iteration', name: 'test2' },
                    ...
                    test9: { 
                        result: 'fail',
                        message: 'Looping over an array\nExpected: 7 (Number)\nActual: 6 (Number)',
                        name: 'test9' 
                    },
                    passed: 58,
                    failed: 1,
                    total: 59,
                    duration: 75,
                    name: '✖ Plupload Test Suite' 
                  }

                */
                self.emit('agentResult', _toUID(agent), agent, details);
            });

            batch.on('agentComplete', function(agent) {
                self.emit('agentComplete', _toUID(agent), agent);
            });

            batch.on('agentScriptError', function (agent, details) {
               self.emit('agentScriptError', _toUID(agent), agent, details);
            });

            batch.on('agentError', function (agent, details) {
                self.emit('agentError', _toUID(agent), agent, details);
            });

            batch.on('complete', function () {
                self.emit('complete');
            });
        }
    });
}


util.inherits(Yeti, EventEmitter);

module.exports = Yeti;
