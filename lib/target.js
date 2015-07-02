var glob              = require('glob')
  , Promise           = require('bluebird')
  , _                 = require('underscore')
  // , require_absolute  = require( 'require-absolute' )
  ;

var file_lookup = {

};

function all(arr, options) {
  return Promise
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
          ;
}

module.exports = {
	all : all
};