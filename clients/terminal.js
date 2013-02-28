var HTerm = function () {

    "use strict";


    var ellipsoids = {"1": "bessel", "2": "international", "3": "wgs84"};
    var ell_txt = "VALG AV ELLIPSOIDE.P SETTES LIK 1 FOR:\nNORSK BESSELS,LIK 2 FOR INTERNASJONAL:\nOG LIK 3 FOR WGS-84-ELLIPSOIDEN:\nLEGG INN P:";

    var Lgeo1 = function () {

        var doCompute = function (values) {
            var holsen = new Holsen();
            holsen.setEllipsoid(ellipsoids[values.p]);

            console.log(values.L1, values.B1, values.S12, values.A12);
            var data = holsen.lgeo1(parseFloat(values.L1), parseFloat(values.B1), parseFloat(values.S12), parseFloat(values.A12));
            console.log(data);

            return "GEOGRAFISKE KOORDINATER:\n" +
                "B2:" + data.B2 + "\n" +
                "NEGATIV B2 BETYR SYDLIG BREDDE:\n\n" +
                "L2:" + data.L2 + "\n\n" +
                "ASIMUT FRA PUNKT 2 TIL PUNKT 1:" +
                "A2: " + data.A2 + "\n" +
                "PROGRAMMET REGNER A2 I FORHOLD TIL NORD,OGSå På " +
                "PÅ DEN SYDLIGE HALVELLIPSOIDE ";
        };

        var args = [
            {"name": "p", "text": ell_txt},
            {"name": "B1", "text": "LEGG INN B1 :"},
            {"name": "L1", "text": "LEGG INN L1 :"},
            {"name": "S12", "text": "LEGG INN SI2 :"},
            {"name": "A12", "text": "LEGG INN AI2 :"}
        ];


        var values = {};
        var askFor;
        var cmd = function (command, term) {
            if (args.length === 0 && !askFor) {
                term.echo(doCompute(values));
                term.set_prompt("holsenJS> ");
                this.running = false;
            } else {
                if (!askFor) {
                    askFor = args.shift();
                    term.echo(askFor.text);
                } else {
                    values[askFor.name] = command;
                    askFor = null;
                    this.cmd("", term);
                }
            }
        };

        return {
            "cmd": cmd,
            "getRunning": function () {return this.running; },
            "setRunning": function (running) {this.running = running; }
        };
    };

    var Krrad = function () {

        var doCompute = function (values) {
            var holsen = new Holsen();
            holsen.setEllipsoid(ellipsoids[values.p]);
            var data = holsen.krrad(values.br, values.a);
            return " Meridiankrumningsradius M  = " + data.M + "\n" +
                "Normalkrumningsradius   N  = " + data.N  + "\n" +
                "Midlere krumningsradius MR = " + data.MR  + "\n" +
                "Krumningsradius i retning asimut AR = " + data.AR + "\n";
        };

        var args = [
            {"name": "p", "text": ell_txt},
            {"name": "br", "text": "Legg inn bredde for punkt :"},
            {"name": "a", "text": "Legg inn asimut for punkt :"}
        ];


        var values = {};
        var askFor;
        var cmd = function (command, term) {
            if (args.length === 0 && !askFor) {
                term.echo(doCompute(values));
                term.set_prompt("holsenJS> ");
                this.running = false;
            } else {
                if (!askFor) {
                    askFor = args.shift();
                    term.echo(askFor.text);
                } else {
                    values[askFor.name] = command;
                    askFor = null;
                    this.cmd("", term);
                }
            }
        };

        return {
            "cmd": cmd,
            "getRunning": function () {return this.running; },
            "setRunning": function (running) {this.running = running; }
        };
    };

    var Meridbue = function () {

        var doCompute = function (values) {
            var holsen = new Holsen();
            holsen.setEllipsoid(ellipsoids[values.p]);

            var operation = values.r;
            if (operation == 0) {
                return "MERIDIANBUE =  " + holsen.meridbue(values.b1, values.b2);
            } else if (operation == 1) {
                return "BREDDE B2 =  " + holsen.meridbue_inv(values.b1, values.g);
            }
        };

        var args = [
            {"name": "r", "text": 'R SETTES LIK 0 NåR (B1,B2) ER GITT .I MOTSATT FALL \n SETTES R LIK 1 NåR B1 0G G ER GITT'}
        ];

        var updateArgs = function (r) {
            if (r == 0) {
                args = [
                    {"name": "p", "text": ell_txt},
                    {"name": "b1", "text": "LEGG INN BREDDE B1"},
                    {"name": "b2", "text": "LEGG INN BREDDE B2"}
                ];
            } else if (r == 1) {
                args = [
                    {"name": "p", "text": ell_txt},
                    {"name": "b1", "text": "LEGG INN BREDDE B1"},
                    {"name": "g", "text": "LEGG INN MERIDIANBUE G"}
                ];
            }
        };

        var values = {};
        var askFor;
        var cmd = function (command, term) {
            if (args.length === 0 && !askFor) {
                term.echo(doCompute(values));
                term.set_prompt("holsenJS> ");
                this.running = false;
            } else {
                if (!askFor) {
                    askFor = args.shift();
                    term.echo(askFor.text);
                } else {
                    values[askFor.name] = command;
                    if(askFor.name == "r") {
                        updateArgs(command);
                    }
                    askFor = null;
                    this.cmd("", term);
                }
            }
        };

        return {
            "cmd": cmd,
            "getRunning": function () {return this.running; },
            "setRunning": function (running) {this.running = running; }
        };
    };


    var Terminal = function () {

        var programs = {
            "meridbue": {
                "program": Meridbue,
                "help": "BEREGNING AV MERIDIANBUEN MELLOM BREDDE B1 OG B2\n ELLER B2 NåR B1 OG MERIDIANBUEN G ER GITT"
            },
            "krrad": {
                "program": Krrad,
                "help": "BEREGNING AV KRUMNINGSRADIER"
            },
            "l-geo1": {
                "program": Lgeo1,
                "help": "BEREGNING AV GEOGRAFISKE KOORDINATER FOR PUNKT 2 OG ASIMUT FOR LINJEN I PUNKT 2"
            }
        };

        var program;

        var cmd = function (command, term) {

            if (program && program.getRunning()) {
                program.cmd(command, term, this);
            } else {
                term.set_prompt("holsenJS> ");
                if (command === "help") {
                    term.echo("Available commands are:");
                    for (var key in programs) {
                        term.echo("\t" + key + ": " + programs[key].help);
                    }
                }
                else if(programs[command]) {
                    program = new programs[command].program();
                    program.setRunning(true);
                    term.set_prompt( command + "> ");
                    this.cmd(command, term);
                } else {
                    term.echo("Invalid command: " + command);
                }
            }
        };
        return {
            "cmd": cmd
        }
    };

    var createTerminal = function (element) {
        jQuery(function($, undefined) {
            var terminal = new Terminal();
            element.terminal(function(command, term) {
                    terminal.cmd(command, term);
                },
                {
                    greetings: 'Holsens smaaprog in JavaScript',
                    name: 'js_demo',
                    height: 600,
                    width: 600,
                    prompt: 'holsenJS> '
                }
            );
        });
    };

    return {
        "createTerminal": createTerminal
    };
};