var Promise           = require('bluebird')
  , stringify         = require('safe-json-stringify')
  , _                 = require('underscore')
  , acorn             = require('acorn')
  , chai              = require('chai')
  , glob              = require('glob')
  , path              = require('path')
  , chalk             = require('chalk')
  , csv               = require('fast-csv')
  , require_absolute  = require( 'require-absolute' )
  , walk              = require('./node_modules/acorn/dist/walk')
  , Table             = require('cli-table')
  , ansiStrip         = require('cli-color/strip')
  , ProgressBar       = require('progress')
  , config            = require('config')
  //  
  , fs                = Promise.promisifyAll(require('fs'))
  , beautify          = require('js-beautify').js_beautify
  , should            = require('chai').should()
  ;

Promise.longStackTraces();

function get_rules() {
  return Promise
          .promisify(glob)('rules/**/*.js')
          .then(function(files){
            return Promise
                    .resolve(files)
                    .map(function(file){
                      var p = path.join(__dirname, file);
                      return require_absolute(p);
                    });
          });
}

var file_lookup = {

};

function glob_arr(arr, options, cb) {
  Promise
    .resolve(arr)
    .map(function(i){
      return Promise.promisify(glob)(i, options);
    })
    .then(function(results){
      _.each(results, function(glob_res, glob_idx){
        _.each(glob_res, function(file){
          if (!_.has(file_lookup, file)) {
            file_lookup[file] = [];
          }

          file_lookup[file].push(arr[glob_idx]);
        });
      });

      return _.keys(file_lookup);
    })
    .nodeify(cb)
    ;
}

var results = {
  error : [],
  warning : [],
  other : [] 
};

function parse(rules, options) {
  var time = process.hrtime();

  // check \u2713
  // xmark \u2717
  Promise
    .promisify(glob_arr)(options.glob, {
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
      function file_human_name(file, cwd) {
        var max = 60;

        var filename = path.isAbsolute(file)? path.normalize(file) : path.join(options.cwd, file);

        var segs = filename.split(path.sep);
        
        if (_.size(segs) <= 6) {
          return path.join.apply(this, segs);
        }

        var l         = path.join.apply(this, _.first(segs, 3))
          , r         = path.join.apply(this, _.last(segs, 3))
          , rem_char  = max - l.length - r.length
          , rem_seg   = segs.length - 6
          ;

        while (rem_char > 0 && rem_seg > 0) {
          var seg = segs[3 + rem_seg - 1];
          r = path.join(seg, r);
          rem_char -= seg.length;
          rem_seg--;
        }

        if (rem_seg > 0) {
          return path.join(l, '...', r);
        }

        return path.join(l, r);
      }

      var table = new Table({
          head: ['#', 'Area', 'Rule', 'Fix', 'Loc', 'File']
        , colWidths: [3, 15, 30, 60, 10, 90]
        , style: { compact : false, border: ['grey'] }
      });

      // render all errors
      _.each(results.error, function(obj){
        var fix = _.map(_.compact([
          obj.rule.fix, 
          obj.message, 
          // obj.at? obj.at.start : (obj.node? obj.node.loc.start : undefined)
        ]), function(i){ return _.isString(i)? i : JSON.stringify(i); });

        var at = '';
        if (obj.at) {
          at = '@ ' + obj.at.start.line + ':' + obj.at.start.column;
        } else if (obj.node) {
          at = '~ ' + obj.node.loc.start.line + ':' + obj.node.loc.start.column;
        }

        table.push([
            obj.level === 'warning' ? chalk.yellow('W') : chalk.bgRed('E')
          , obj.rule.area
          , obj.rule.name
          , fix.join('\n')
          , at
          , file_human_name(obj.file, obj.cwd)
        ]);
      });

      console.log(table.toString());
      
      var arr = [].concat([['#', 'Area', 'Rule', 'Fix', 'Loc', 'File']], _.map(table, function(i){ return i; }));
      csv.writeToPath('./output.csv', arr, { 
          headers : true
        , transform : function(row) { return _.map(row, function(i){ return  ansiStrip(i).replace(/(.*)\n/gm, '$1 '); }); }
      });

      // render summary
      var grouped = _.groupBy(results.error, 'level');

      console.log(chalk.bgRed(' [ERROR] '), _.size(grouped['error']));
      console.log(chalk.yellow(' [WARNING] '), _.size(grouped['warning']));
      console.log(chalk.bgMagenta(' [OTHER] '), _.size(results.other));
      console.log(chalk.bgGreen(' [FILES SCANNED] '), _.size(results.files));

      var diff = process.hrtime(time);
      console.log(diff);
    });
}

get_rules()
  .then(function(rules){
    parse(rules, config);
  })
  ;