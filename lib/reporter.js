var Promise           = require('bluebird')
  , path              = require('path')
  , _                 = require('underscore')
  , csv               = require('fast-csv')
  , Table             = require('cli-table')
  , ansiStrip         = require('cli-color/strip')
  , chalk             = require('chalk')
  , fs                = require('fs-extended')
  ;

function print(options) {
  var time    = options.time
    , results = options.results
    ;

    
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
      head: ['#', 'Type', 'Area', 'Rule', 'Fix', 'Loc', 'File']
    , colWidths: [3, 6, 15, 30, 60, 10, 90]
    , style: { compact : false, border: ['grey'] }
  });

  // render all errors
  _.each(results.error, function(obj){
    var fix = _.map(_.compact([
      obj.message, 
      obj.rule.fix, 
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
      , obj.rule.type
      , obj.rule.area
      , obj.rule.name
      , fix.join('\n')
      , at
      , file_human_name(obj.file, obj.cwd)
    ]);
  });

  console.log(table.toString());
  
  var arr       = [].concat([['#', 'Area', 'Rule', 'Fix', 'Loc', 'File']], _.map(table, function(i){ return i; }))
    , date      = new Date()
    , name      = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '_' + date.getHours() + '_' + date.getMinutes() + '_' + date.getSeconds() + '.csv'
    , fullname  = './log/' + name
    ;

  fs.ensureFileSync(fullname);
  
  csv.writeToPath(fullname, arr, { 
      headers : true
    , transform : function(row) {
        return _.map(row, function(i){ 
          return  ansiStrip(i).replace(/(.*)\n/gm, '$1 ');
        });
      }
  });

  // render summary
  var grouped = _.groupBy(results.error, 'level');

  console.log(chalk.bgRed(' [ERROR] '), _.size(grouped['error']));
  console.log(chalk.yellow(' [WARNING] '), _.size(grouped['warning']));
  console.log(chalk.bgMagenta(' [OTHER] '), _.size(results.other));
  console.log(chalk.bgGreen(' [FILES SCANNED] '), _.size(results.files));

  var diff = process.hrtime(time);
  console.log(diff);
}

module.exports = {
	print : print
};