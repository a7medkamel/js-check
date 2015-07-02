var glob              = require('glob')
  , Promise           = require('bluebird')
  , path              = require('path')
  , require_absolute  = require( 'require-absolute' )
  ;

// todo [akamel] support glob array
function all(options) {
  return Promise
          .promisify(glob)(options.path[0])
          .then(function(files){
            return Promise
                    .resolve(files)
                    .map(function(file){
                      var p = path.join(process.cwd(), file);
                      return require_absolute(p);
                    });
          });
}

module.exports = {
	all : all
};