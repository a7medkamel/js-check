define([], function(a, b) {
    
    try {
      var x = 1;
    } catch (ex) {
      var y = ex;
    }

    a = b;

    function abc(x, y, z) {
      x = y;
      z = x;
    }

    abc();
  });