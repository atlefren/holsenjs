(function () {
    "use strict";

    var holsen = new Holsen();

    var number_template = '<label class="control-label" for="<%= name %>"><%= display_name %></label>' +
        '<div class="controls">' +
        '   <input class="input-small" type="text" id="<%= name %>">' +
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
            {"name": "b1", "display_name": "B1", "help": "noe", "type": Number},
            {"name": "l1", "display_name": "L1", "help": "noe", "type": Number},
            {"name": "s12", "display_name": "S12", "help": "noe", "type": Number},
            {"name": "a12", "display_name": "A12", "help": "noe", "type": Number}
        ],

        compute: function(data) {
            holsen.setEllipsoid(data.ellipsoid);
            var res = holsen.lgeo1(data.l1, data.b1, data.s12, data.a12);

            var print = [
                {"name":  "B2", "value": res.B2, "help": "Negativ B2 betyr sydlig bredde"},
                {"name":  "L2", "value": res.L2},
                {"name":  "A2", "value": res.A2, "help": "A2 er i forhold til nord, også på sydlige halvellipsoide."}
            ];
            this.show_results(print);
        }
    });

    var programs = {
        "l-geo1": {
            "program": Lgeo1,
            "help": "BEREGNING AV GEOGRAFISKE KOORDINATER FOR PUNKT 2 OG ASIMUT FOR LINJEN I PUNKT 2"
        }/*,
        "l-geo2": {
            "program": Lgeo2,
                "help": "GEOGRAFISKE KOORDINATER ER GITT FOR TO PUNKTER 1 OG 2,(B1,L1) OG(B2,L2).\n\t\tBEREGN GEODETISK LINJE FRA 1 TIL 2 OG ASIMUT I PUNKT 1 OG I PUNKT 2."
        },
        "krrad": {
            "program": Krrad,
                "help": "BEREGNING AV KRUMNINGSRADIER"
        },
        "meridbue": {
            "program": Meridbue,
                "help": "BEREGNING AV MERIDIANBUEN MELLOM BREDDE B1 OG B2\n\t\tELLER B2 NåR B1 OG MERIDIANBUEN G ER GITT"
        },
        "konverg": {
            "program": Konverg,
                "help": "PROGRAMMET BEREGNER PLAN MERIDIANKONVERGENS I GAUSS KONFORME PROJEKSJON OG UTM.\n\t\t(B,L) ELLER (X,Y) MÅ VÆRE GITT I DET AKTUELLE PUNKT"
        },
        "blxy": {
            "program": Blxy,
                "help": "BEREGING AV PLANE KOORDINATER (X,Y) AV GEOGRAFISKE(B,l) OG OMVENDT."
        }*/
    };

    $(document).ready(function () {
        _.each(programs, function(program, key) {
            var view = new program.program().render();
            $("#" + key).find(".content").append(view.$el);
        });
    });

}());
