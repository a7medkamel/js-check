define(
    [
        'lib/underscore',
        'jquery',
        'lib/backbone',
        '$/i18n!global',
        'PageContext',
        'template/auctionInsights/auctionInsightsGrid',
        'module/view/auctionInsights/gridBuilder',
        'module/service/instrumentation/index'
    ], function (_, $, backbone, i18nAuctionInsights, pageContext, auctionInsightsTmpl, gridBuilder, index) {
        var view = backbone.View.extend({
            auctionInsightsLevel: null,
            entities: null,
            auctionInsightsGridId: "AuctionInsightsGrid",

            initialize: function (params) {
                registerEvents();

                this.auctionInsightsLevel = params.auctionInsightsLevel;
                this.entities = params.entities;
                var $elAuctionInsights = this.$('.auctioninsights-grid-container');
                $elAuctionInsights.html(auctionInsightsTmpl({ i18n: i18nAuctionInsights, aiGridId: this.auctionInsightsGridId }));
            },

            render: function () {
                var auctionInsightsGrid = new microsoft.advertising.grid();
                gridBuilder.setAuctionInsightsGrid(auctionInsightsGrid, this.auctionInsightsLevel, this.entities, this.auctionInsightsGridId);

                var dateFilterChangeHandler = function (e, filter) {
                    gridBuilder.setDateRange({
                        //account related timezone, not convert to UTC
                        StartDate: $.datepicker.formatDate("yymmdd", $.datepicker.parseDate($.datepicker.regional[pageContext.Culture].dateFormat, filter.RangeStartDate)),
                        EndDate: $.datepicker.formatDate("yymmdd", $.datepicker.parseDate($.datepicker.regional[pageContext.Culture].dateFormat, filter.RangeEndDate))
                    });
                    gridBuilder.initializeAuctionInsightsGrid(auctionInsightsGrid, auctionInsightsGrid.stateId, [auctionInsightsGrid.stateId, auctionInsightsGrid.uniqueId]);
                };
                window.onDateFilterChanged = dateFilterChangeHandler;

                return this;
            }
        });

        function registerEvents() {
            $("a.auctioninsights-help").click(function () {
                $.advertising.root.launchHelp(pageContext.HelpServer, pageContext.HelpProject, pageContext.HelpMarket, "", "keyword", "app51008", true, "b1", "", "", "");
                return false;
            });
        }

        return view;
    });