var Promise           = require('bluebird')
  // , stringify         = require('safe-json-stringify')
  // , beautify          = require('js-beautify').js_beautify
  , _                 = require('underscore')
  , acorn             = require('acorn')
  , chai              = require('chai')
  , path              = require('path')
  , walk              = require('./node_modules/acorn/dist/walk')
  , config            = require('config')
  //  
  , fs                = Promise.promisifyAll(require('fs'))
  , should            = require('chai').should()
  , ProgressBar       = require('progress')
  //
  , rule              = require('./lib/rule')
  , target            = require('./lib/target')
  , reporter          = require('./lib/reporter')
  ;

Promise.longStackTraces();

var results = {
  error : [],
  warning : [],
  other : [] 
};

function parse(rules, options) {
  var time = process.hrtime();

  // check \u2713
  // xmark \u2717
  target
    .all(options.glob, {
        cwd       : options.cwd
      , ignore    : options.ignore
    })
    .then(function(files){
      results.files = files;

      var bar = new ProgressBar(' checking |:bar| :current of :total / :percent -- :etas / :elapseds', { complete: '=' , incomplete: ' ' , total: _.size(files), width: 40 });
      return Promise
              .resolve(files)
              .map(function(file){
                var filename = path.isAbsolute(file)? file : path.join(options.cwd, file);

                return fs
                        .readFileAsync(filename, 'utf8')
                        .then(function(code) {
                          return Promise
                                  .try(function() { return acorn.parse(code, { locations : true }); })
                                  .then(function(ast){
                                      // console.dir(ast, { depth : 20 });
                                      return Promise
                                              .resolve(rules)
                                              .each(function(rule){
                                                  return Promise
                                                      .try(function(){
                                                        var res = rule.find(ast, walk);
                                                        
                                                        if (_.isArray(res)) {
                                                          return res;
                                                        }

                                                        if (_.isEmpty(res)) {
                                                          return [];
                                                        }

                                                        return [res];
                                                      })
                                                      .catch(chai.AssertionError, function(err){
                                                        // √
                                                        results.error.push({
                                                          type  : typeof err,
                                                          err   : err,
                                                          file  : file,
                                                          cwd   : options.cwd,
                                                          rule  : rule,
                                                          phase : 'find'
                                                        });
                                                      })
                                                      .then(function(arr) {
                                                        // todo [akamel] handle undefined qualifier
                                                        var size = _.size(arr);
                                                        switch(rule.qualifier) {
                                                          case '?':
                                                            size.should.be.at.most(1, 'should have at most 1 node');
                                                            break;
                                                          case '{1}':
                                                            size.should.equal(1, 'should have at least 1 node');
                                                            break;
                                                        }
      
                                                        return Promise
                                                                .resolve(arr)
                                                                .each(function(i){
                                                                  return Promise
                                                                          .try(function(){
                                                                            return rule.check(i);
                                                                          })
                                                                          .then(function(err){
                                                                            if (_.isArray(err)) {
                                                                              _.each(err, function(e){
                                                                                results.error.push({
                                                                                    type    : typeof err,
                                                                                    err     : err,
                                                                                    message : e.message,
                                                                                    at      : e.at,
                                                                                    file    : file,
                                                                                    cwd     : options.cwd,
                                                                                    rule    : rule,
                                                                                    level   : e.level || 'error',
                                                                                    node    : i,
                                                                                    phase   : 'check'
                                                                                });
                                                                              });
                                                                            }

                                                                            // todo [akamel] handle single error not wrapped in array
                                                                          })
                                                                          .catch(chai.AssertionError, function(err){
                                                                            results.error.push({
                                                                              type    : typeof err,
                                                                              err     : err,
                                                                              message : err.message,
                                                                              at      : err.at,
                                                                              file    : file,
                                                                              cwd     : options.cwd,
                                                                              rule    : rule,
                                                                              level   : err.level || 'error',
                                                                              node    : i,
                                                                              phase   : 'check'
                                                                            });
                                                                          })
                                                                          ;
                                                                });
                                                      })
                                                      .catch(chai.AssertionError, function(err){
                                                        // √
                                                        results.error.push({
                                                          type    : typeof err,
                                                          err     : err,
                                                          message : err.message,
                                                          at      : err.at,
                                                          file    : file,
                                                          cwd     : options.cwd,
                                                          rule    : rule,
                                                          level   : err.level || 'error',
                                                          phase   : 'qualifier'
                                                        });
                                                      })
                                                      .catch(function(err){
                                                        console.log(err.stack)
                                                        console.log('[ERR] ', chalk.red(file));
                                                      })
                                                      ;
                                                  });
                                  });
                        })
                        .finally(function(){
                          bar.tick();
                        })
                        ;
              }, { concurrency : 5 });
    })
    .finally(function(){
      reporter.print({
          time    : time
        , cwd     : config.get('cwd')
        , results : results
      });
    });
}

rule.all({ path : config.get('rules') })
  .then(function(rules){
    parse(rules, config);
  })
  ;