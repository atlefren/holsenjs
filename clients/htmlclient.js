(function () {
    "use strict";

    var holsen = new Holsen();

    var number_template = '<label class="control-label" for="<%= name %>"><%= display_name %></label>' +
        '<div class="controls">' +
        '   <input class="input-small" type="text" id="<%= name %>">' +
        '       <% if(help) { %>' +
        '           <span class="help-inline"><%= help %></span>' +
        '       <% }; %>' +
        '</div>';

    var ellipsoid_template = '<label class="control-label" for="<%= name %>"><%= display_name %></label>' +
        '<div class="controls">' +
        '   <select id="<%= name %>"> <% _.each(ellipsoids, function(ell) {%><option value="<%= ell.id %>"><%= ell.name %></option> <%}); %> </select>' +
        '</div>';

    var sumbit_template = '<div class="control-group"><div class="controls">' +
        '<button type="button" class="btn compute-btn">Compute</button>' +
        '</div></div>';

    var EllipsoidChooser = Backbone.View.extend({

        "className": "control-group",

        render: function () {
            var data = {"name": "ellipsoid", "display_name": "Ellipsoide", "ellipsoids": [{"id": "bessel", "name": "Norsk Bessel"}, {"id": "international", "name": "Internasjonal"}, {"id": "wgs84", "name": "WGS-84"}]};
            this.$el.append(_.template(ellipsoid_template, data));
            return this;
        },
        getData: function () {
            return this.$el.find("select").val();
        }
    });

    var CoordsysChooser = Backbone.View.extend({

        "className": "control-group",

        render: function () {
            var data = {"name": "coordsys", "display_name": "Koordinatsystem", "ellipsoids": [{"id": "NGO", "name": "NGO 1948"}, {"id": "UTM", "name": "UTM"}]};
            this.$el.append(_.template(ellipsoid_template, data));
            return this;
        },
        getData: function () {
            return this.$el.find("select").val();
        }
    });

    var Number = Backbone.View.extend({

        "className": "control-group",

        render: function () {
            this.$el.append(_.template(number_template, this.options));
            return this;
        },

        getData: function () {
            this.$el.removeClass("error");
            var val = parseFloat(this.$el.find("input").val());
            if(!_.isNumber(val) || isNaN(val)) {
                this.$el.addClass("error");
                return null;
            } else {
                return val;
            }
        }

    });

    var result_template = '<% _.each(results, function(result) { %>' +
        '<div class="control-group result">' +
        '   <label class="control-label" for="<%=result.name %>"><strong><%=result.name %></strong></label>' +
        '   <div class="controls">' +
        '       <input disabled class="input-small" type="text" id="<%=result.name %>" value="<%=result.value %>">' +
        '       <% if(result.help) { %>' +
        '           <span class="help-inline"><%= result.help %></span>' +
        '       <% }; %>' +
        '   </div>' +
        '</div>' +
        '<% }); %>';


    var HolsenView = Backbone.View.extend({

        tagName: "form",

        className: "form-horizontal",

        description: "",

        events: {
            "click .compute-btn": "validateData"
        },

        params: [],

        initialize: function () {
            _.bindAll(this, "validateData");
        },

        render: function () {

            this.inputs =_.map(this.params, function(param) {
                return new param.type(param).render();
            });

            this.$el.append('<p class="description">' + this.description + '<p>');
            this.$el.append(_.pluck(this.inputs, "$el"));
            this.$el.append(_.template(sumbit_template));

            return this;
        },

        getData: function () {
            return _.reduce(this.inputs, function (values, input) {
                values[input.options.name] = input.getData();
                return values;
            }, {}, this);
        },

        show_results: function (data) {
            this.$el.find(".result").remove();
            this.$el.append(_.template(result_template, {"results": data}));
        },

        validateData: function () {
            this.$el.find(".result").remove();
            var data = this.getData();

            if(_.filter(data, function(value) { return (value === null); }).length === 0) {
                this.compute(data);
            }
        },

        compute: function(data) {

        }
    });

    var Lgeo1 = HolsenView.extend({

        params: [
            {"name": "ellipsoid", "type": EllipsoidChooser},
            {"name": "b1", "display_name": "B1", "help": "Breddegrad (lat), punkt 1", "type": Number},
            {"name": "l1", "display_name": "L1", "help": "Lengdeegrad (lon), punkt 1", "type": Number},
            {"name": "s12", "display_name": "S12", "help": "Lengde geodetiske bue 1-2 (meter)", "type": Number},
            {"name": "a12", "display_name": "A12", "help": "Asimut fra 1 til 2", "type": Number}
        ],

        description: "Beregning av geodetiske koordinater for punkt 2  og asimut for linjen i punkt 2.",

        compute: function(data) {
            holsen.setEllipsoid(data.ellipsoid);
            var res = holsen.lgeo1(data.l1, data.b1, data.s12, data.a12);

            var print = [
                {"name":  "B2", "value": res.B2, "help": "Breddegrad (lat) for punkt 2 (negativ verdi betyr sydlig bredde)."},
                {"name":  "L2", "value": res.L2, "help": "Lengdegrad (lon) for punkt 2.)"},
                {"name":  "A2", "value": res.A2, "help": "Asimut fra 2 til 1 (i forhold til nord)."}
            ];
            this.show_results(print);
        }
    });

    var Lgeo2 = HolsenView.extend({

        params: [
            {"name": "ellipsoid", "type": EllipsoidChooser},
            {"name": "b1", "display_name": "B1", "help": "Breddegrad (lat), punkt 1", "type": Number},
            {"name": "l1", "display_name": "L1", "help": "Lengdegrad (lon), punkt 1", "type": Number},
            {"name": "b2", "display_name": "B2", "help": "Breddegrad (lat), punkt 2", "type": Number},
            {"name": "l2", "display_name": "L2", "help": "Lengdegrad (lon), punkt 2", "type": Number}
        ],

        description: "Geografiske koordinater er gitt for to punkter (B1, L1) og (B2, L2). Beregner geodetisk linje fra 1 til 2 og asimut i punkt 1 og 2.",

        compute: function(data) {
            holsen.setEllipsoid(data.ellipsoid);

            var res = holsen.lgeo2(data.l1, data.b1, data.l2, data.b2);


            var print = [
                {"name":  "A1", "value": res.A1, "help": "Asimut 1 til 2 (i forhold til nord)"},
                {"name":  "A2", "value": res.A2, "help": "Asimut 2 til 1 (i forhold til nord)"},
                {"name":  "S", "value": res.S, "help": "Geodetisk linje fra 1 til 2"}
            ];
            this.show_results(print);
        }
    });

    var Krrad = HolsenView.extend({

        params: [
            {"name": "ellipsoid", "type": EllipsoidChooser},
            {"name": "br", "display_name": "BR", "help": "Breddegrad (lat) for punkt", "type": Number},
            {"name": "a", "display_name": "A", "help": "Asimut", "type": Number}
        ],

        description: "Beregning av krummningsradier.",

        compute: function(data) {
            holsen.setEllipsoid(data.ellipsoid);

            var res = holsen.krrad(data.br, data.a);

            var print = [
                {"name":  "M", "value": res.M, "help": "Meridiankrummningsradius"},
                {"name":  "N", "value": res.N, "help": "Normalkrummningsradius"},
                {"name":  "MR", "value": res.MR, "help": "Midlere krummningsradius"},
                {"name":  "AR", "value": res.AR, "help": "Krumningsradius i retning asimut"}
            ];
            this.show_results(print);
        }
    });


    var tab_template = '<ul class="nav nav-tabs">' +
        '<% _.each(tabs, function(tab, key){ %> ' +
        '       <li <% if(key=== 0) {%> class="active" <% } %>>' +
        '           <a class="tab" id="<%= key %>"><%=tab.name %></a>' +
        '       </li>' +
        '<% }); %> ' +
        '</ul>';

    var ProgramWithSub = Backbone.View.extend({
        subPrograms: [],

        events: {
            "click .tab": "changeTab"
        },

        initialize: function () {
            _.bindAll(this, "changeTab");
        },

        render: function () {
            this.$el.append(_.template(tab_template, {"tabs": this.subPrograms}));
            this.$el.append($('<div id="program"></div>'));
            this.showTab(0);
            return this;
        },

        changeTab: function (e) {
            var target = $(e.currentTarget);
            _.each(this.$el.find(".tab"), function (tab) {
                tab = $(tab);
                if (tab.attr("id") === target.attr("id")) {
                    tab.parent().addClass("active");
                } else {
                    tab.parent().removeClass("active");
                }
            });
            this.showTab(target.attr("id"));
        },

        showTab: function (key) {
            var el = this.$el.find("#program");
            el.html("");
            var view = new this.subPrograms[key].program().render();
            el.append(view.$el);
        }
    });

    var MeridbueB1B2 = HolsenView.extend({
        params: [
            {"name": "ellipsoid", "type": EllipsoidChooser},
            {"name": "b1", "display_name": "B1", "help": "Breddegrad (lat) for punkt 1", "type": Number},
            {"name": "b2", "display_name": "B2", "help": "Breddegrad (lat) for punkt 2", "type": Number}
        ],

        description: "Beregning av meridianbuen mellom breddene B1 og B2.",

        compute: function(data) {
            holsen.setEllipsoid(data.ellipsoid);

            var res = holsen.meridbue(data.b1, data.b2);

            var print = [
                {"name":  "Meridianbue", "value": res}
            ];
            this.show_results(print);
        }
    });

    var MeridbueB1G = HolsenView.extend({
        params: [
            {"name": "ellipsoid", "type": EllipsoidChooser},
            {"name": "b1", "display_name": "B1", "help": "Breddegrad (lat) for punkt 1", "type": Number},
            {"name": "g", "display_name": "G", "help": "Meridianbue fra punkt 1 til 2", "type": Number}
        ],

        description: "Beregner bredden B2 gitt B1 og meridianbuen fra B1 til B2.",

        compute: function(data) {
            holsen.setEllipsoid(data.ellipsoid);

            var res = holsen.meridbue_inv(data.b1, data.g);

            var print = [
                {"name":  "B2", "value": res}
            ];
            this.show_results(print);
        }
    });

    var Meridbue = ProgramWithSub.extend({
        subPrograms: [
            {"program": MeridbueB1B2, "name": "B1, B2 gitt"},
            {"program": MeridbueB1G, "name": "B1, G gitt"}
        ]
    });

    var KonvergGeog = HolsenView.extend({
        params: [
            {"name": "ellipsoid", "type": EllipsoidChooser},
            {"name": "l0", "display_name": "L0", "help": "Lengdegrad (lon) for x-aksen", "type": Number},
            {"name": "b1", "display_name": "B1", "help": "Breddegrad (lat) for punktet", "type": Number},
            {"name": "l1", "display_name": "L1", "help": "Lengdegrad (lon) for punktet", "type": Number}
        ],

        description: "Beregner plan meridiankonvergens gitt punkt (B, L)",

        compute: function(data) {
            holsen.setEllipsoid(data.ellipsoid);

            var res = holsen.konverg(data.b1, data.l1, data.l0)

            var print = [
                {"name":  "C", "value": res, "help": "Meridankonvergens (gon)"}
            ];
            this.show_results(print);
        }
    });

    var KonvergPlan = HolsenView.extend({
        params: [
            {"name": "ellipsoid", "type": EllipsoidChooser},
            {"name": "coordsys", type: CoordsysChooser},
            {"name": "l0", "display_name": "L0", "help": "Lengdegrad (lon) for x-aksen", "type": Number},
            {"name": "b0", "display_name": "B0", "help": "Breddegrad (lat) for x-aksens nullpunkt", "type": Number},
            {"name": "x", "display_name": "X", "help": "X for punktet", "type": Number},
            {"name": "y", "display_name": "Y", "help": "Y for punktet", "type": Number}
        ],

        description: "Beregner plan meridiankonvergens gitt punkt (X, Y)",

        compute: function (data) {
            holsen.setEllipsoid(data.ellipsoid);
            holsen.setCoordsystem(data.coordsys);

            var res = holsen.konverg_xy(data.x, data.y, data.b0, data.l0);

            var print = [
                {"name":  "C", "value": res, "help": "Meridankonvergens (gon)"}
            ];
            this.show_results(print);
        }
    });

    var Konverg = ProgramWithSub.extend({
        subPrograms: [
            {"program": KonvergGeog, "name": "Geografiske koordinater"},
            {"program": KonvergPlan, "name": "Plane koordinater"}
        ]
    });

    var BlToXy = HolsenView.extend({
        params: [
            {"name": "ellipsoid", "type": EllipsoidChooser},
            {"name": "coordsys", type: CoordsysChooser},
            {"name": "b0", "display_name": "B0", "help": "Breddegrad (lat) for x-aksens nullpunkt", "type": Number},
            {"name": "l0", "display_name": "L0", "help": "Lengdegrad (lon) for x-aksen", "type": Number},
            {"name": "br", "display_name": "BR", "help": "Breddegrad (lat)", "type": Number},
            {"name": "l", "display_name": "L", "help": "Lengdegrad (lon)", "type": Number}
        ],

        description: "Beregner plane koordinater (X, Y), gitt geografiske (B, L).",

        compute: function (data) {
            holsen.setEllipsoid(data.ellipsoid);
            holsen.setCoordsystem(data.coordsys);

            console.log(data.l, data.br, data.l, data.b0);
            var res = holsen.bl_to_xy(data.l, data.br, data.l0, data.b0);
            console.log(res);
            var print = [
                {"name":  "X", "value": res.x},
                {"name":  "Y", "value": res.y}
            ];
            this.show_results(print);
        }
    });

    var XyToBl = HolsenView.extend({
        params: [
            {"name": "ellipsoid", "type": EllipsoidChooser},
            {"name": "coordsys", type: CoordsysChooser},
            {"name": "b0", "display_name": "B0", "help": "Breddegrad (lat) for x-aksens nullpunkt", "type": Number},
            {"name": "l0", "display_name": "L0", "help": "Lengdegrad (lon) for x-aksen", "type": Number},
            {"name": "x", "display_name": "X", "help": "X for punktet", "type": Number},
            {"name": "y", "display_name": "Y", "help": "Y for punktet", "type": Number}
        ],

        description: "Beregner geografiske koordinater (B, L), gitt plane (x, y).",

        compute: function (data) {
            holsen.setEllipsoid(data.ellipsoid);
            holsen.setCoordsystem(data.coordsys);

            var res = holsen.xy_to_bl(data.x, data.y, data.l0, data.b0);

            var print = [
                {"name": "BR", "value": res.lat, "help": "Breddegrad (lat)"},
                {"name": "L", "value": res.lon, "help": "Lengdegrad (lon)"}
            ];
            this.show_results(print);
        }
    });

    var Blxy = ProgramWithSub.extend({
        subPrograms: [
            {"program": BlToXy, "name": "Beregn plane koordinater"},
            {"program": XyToBl, "name": "Beregn geografiske koordinater"}
        ]
    });

    var programs = {
        "l-geo1": {
            "program": Lgeo1
        },
        "l-geo2": {
            "program": Lgeo2
        },
        "krrad": {
            "program": Krrad
        },
        "meridbue": {
            "program": Meridbue
        },
        "konverg": {
            "program": Konverg
        },
        "blxy": {
            "program": Blxy
        }
    };

    $(document).ready(function () {
        _.each(programs, function(program, key) {
            var view = new program.program().render();
            $("#" + key).find(".content").append(view.$el);
        });
    });

}());
