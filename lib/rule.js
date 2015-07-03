var glob              = require('glob')
  , Promise           = require('bluebird')
  , path              = require('path')
  , _                 = require('underscore')
  , proxyquire        = require('proxyquire')
  , chai              = require('chai')
  ;

function all(options) {
  return Promise
          .resolve(options.path)
          .map(function(i){
            return Promise.promisify(glob)(i);
          })
          .then(function(files){
            return Promise
                    .resolve(_.flatten(files))
                    .map(function(file){
                      var p = path.join(process.cwd(), file);
                      return proxyquire(p, { chai : chai });
                    });
          });
}

module.exports = {
	all : all
};