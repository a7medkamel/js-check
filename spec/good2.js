define([
    'lib/underscore',
    'lib/backbone',
    'lib/knockout',
    '$/i18n!bulkUpload',
    'template/bulkUpload/taskProgress',
    'module/viewmodel/bulkUpload/taskProgress'
  ],
  function(_, backbone, ko, i18n, taskProgressTemplate, TaskProgressViewModel) {
    'use strict';

    var defaults = {
      statusText: '',
      showProgress: false,
      completed: 0,
      total: 100
    };

    var view = backbone.View.extend({
      initialize: function(options) {
        this.options = options || {};
        this.options.model = _.defaults({}, options.model, defaults);
        this.ko_model = new TaskProgressViewModel(this.options.model);

        this.options.task.on('update', function(completed, total){
          this.ko_model.showProgress(true).completed(completed).total(total);
        }.bind(this));

        this.options.task.on('error', function(){
          this.ko_model.showProgress(false).statusText(this.options.model.errorText);
        }.bind(this));

        this.options.task.on('done', function(){
          this.ko_model.showProgress(false).statusText(this.options.model.completeText);
        }.bind(this));
      },

      render: function() {
        this.$el.html(taskProgressTemplate({
          i18n: i18n
        }));

        ko.applyBindings(this.ko_model, this.el);
        return this;
      }
    });

    return view;
  });