var Holsen = function () {
    'use strict';

    //make these easier to type/read
    var cos = Math.cos;
    var sin = Math.sin;
    var tan = Math.tan;
    var pow = Math.pow;
    var sqrt = Math.sqrt;


    var settings = {
        ellipsoid: undefined,
        coordsystem: undefined
    };

    var ellipsoids = {
        bessel: {
            a: 6377492.018,
            b: 6356173.509
        },
        international: {
            a: 6378388.000,
            b: 6356911.946
        },
        wgs84: {
            a: 6378137.000,
            b: 6356752.314
        }
    };

    function isString(obj) {
        return Object.prototype.toString.call(obj) === '[object String]';
    }

    function setEllipsoid(ellipsoid) {
        if (isString(ellipsoid)) {
            if (ellipsoids[ellipsoid] !== undefined) {
                settings.ellipsoid = ellipsoids[ellipsoid];

            } else {
                throw new Error('Non-existing ellipsoid: ' + ellipsoid);
            }
        } else if (ellipsoid === Object(ellipsoid)) {
            var hasA = ellipsoid.a && !isNaN(ellipsoid.a);
            var hasB = ellipsoid.b && !isNaN(ellipsoid.b);
            if (hasA && hasB) {
                settings.ellipsoid = ellipsoid;
            } else {
                throw new Error(
                    'The entered ellipsoid is either missing or ' +
                        'have non-numbers as a or b.'
                );
            }
        } else {
            throw new Error('Malformed ellipsoid.');
        }
    }

    function checkEllipsoid() {
        if (settings.ellipsoid === undefined) {
            throw new Error('Ellipsoid not set (call holsen.setEllipsoid()!).');
        }
    }

    var coordsystems = {
        UTM: {
            factor: 0.9996,
            y_add: 500000
        },
        NGO: {
            factor: 1,
            y_add: 0
        }
    };

    function setCoordsystem(coordsystem) {
        if (isString(coordsystem)) {
            if (coordsystems[coordsystem] !== undefined) {
                settings.coordsystem = coordsystems[coordsystem];
            } else {
                throw new Error('Non-existing coordsystem: ' + coordsystem);
            }
        } else if (coordsystem === Object(coordsystem)) {
            var hasFactor = coordsystem.factor && !isNaN(coordsystem.factor);
            var hasCoordsys = coordsystem.y_add && !isNaN(coordsystem.y_add);
            if (hasFactor && hasCoordsys) {
                settings.coordsystem = coordsystem;
            } else {
                throw new Error(
                    'The entered coordsystem is either ' +
                        'missing or have non-numbers as a or b.'
                );
            }
        } else {
            throw new Error('Malformed coordsystem.');
        }
    }

    function checkCoordsystem() {
        if (settings.coordsystem === undefined) {
            throw new Error(
                'Coordsystem not set (call holsen.setCoordsystem()!).'
            );
        }
    }

    var r0 = (Math.PI / 180);
    function toRad(deg) {
        return deg / (180 / Math.PI);
    }

    function toDeg(rad) {
        return rad / r0;
    }

    function round(number, numDecimals) {
        var power = pow(10, numDecimals);
        return Math.round(number * power) / power;
    }

    function ellipsoidParams() {

        var a = settings.ellipsoid.a;
        var b = settings.ellipsoid.b;

        var n = (a - b) / (a + b);
        var k = a / (n + 1);
        var k1 = 1 + n * (n / 4) + pow(n, 4) / 64;
        var k2 = (n - n * n * n / 8) * 3;
        var k3 = (n * n - pow(n, 4) / 4) * 15 / 8;
        return {
            n: n,
            k: k,
            k1: k1,
            k2: k2,
            k3: k3
        };
    }

    function meridbueLoop(params) {
        if (!params.find_arc) {
            params.db = params.db + (params.arc - params.g1) / (params.ef.k * params.ef.k1);
            params.bm = params.lon2 + params.db / 2;
        }
        params.g1 = params.ef.k * (params.ef.k1 * params.db - params.ef.k2 * cos(2 * params.bm) * sin(params.db) +
            params.ef.k3 * cos(4 * params.bm) * sin(2 * params.db)) -
            params.ef.k * (pow(params.ef.n, 3) * cos(6 * params.bm) * sin(3 * params.db) * 35 / 24) +
            params.ef.k * (pow(params.ef.n, 4) * cos(8 * params.bm) * sin(4 * params.db) * 315) / 256;
        return params;
    }

    function meridbueInternal(lon1, lon2, arc, ellipsoid, findArc) {
        var g1 = 0, db = 0, bm = 0;

        if (findArc) {
            db = lon1 - lon2;
            bm = lon1 - db / 2;
        }

        var params = {
            bm: bm,
            db: db,
            arc: arc,
            g1: g1,
            lon2: lon2,
            ef: ellipsoid,
            find_arc: findArc
        };

        if (findArc) {
            params = meridbueLoop(params);
            return params.g1;
        }

        while (Math.abs(params.arc - params.g1) > pow(10, -4)) {
            params = meridbueLoop(params);
        }
        return params.lon2 + params.db;
    }

    function convertXyCoords(x, y) {
        x = x / settings.coordsystem.factor;
        y = (y - settings.coordsystem.y_add) / settings.coordsystem.factor;

        return {x: x, y: y};
    }

    function convertXyCoordsBack(x, y) {
        x = x * settings.coordsystem.factor;
        y = y * settings.coordsystem.factor + settings.coordsystem.y_add;
        return {x: x, y: y};
    }

    //PUBLIC
    var meridbue = function (lat1, lat2) {
        checkEllipsoid();
        var arc = meridbueInternal(
            toRad(lat2),
            toRad(lat1),
            null,
            ellipsoidParams(),
            true
        );
        return round(arc, 3);
    };

    //PUBLIC
    var meridbue_inv = function (lat, arc) {
        checkEllipsoid();
        var lat2 = meridbueInternal(
            null,
            toRad(lat),
            arc,
            ellipsoidParams(),
            false
        );
        return round(toDeg(lat2), 9);
    };

    //PUBLIC
    var krrad = function (lat, azimuth) {
        checkEllipsoid();
        lat = toRad(lat);
        azimuth = toRad(azimuth);
        var e = (pow(settings.ellipsoid.a, 2) - pow(settings.ellipsoid.b, 2)) / pow(settings.ellipsoid.a, 2);
        var m = pow(sin(lat), 2);
        m = sqrt(1 - e * m);
        var n = settings.ellipsoid.a / m;
        m = (1 - e) * settings.ellipsoid.a / pow(m, 3);
        var mr = sqrt(m * n);
        var ra = n * m / (n * pow(cos(azimuth), 2) + m * pow(sin(azimuth), 2));
        return {
            M: round(m, 3),
            N: round(n, 3),
            MR: round(mr, 3),
            AR: round(ra, 3)
        };
    };

    function vinkeltr(a, b, v) {
        return Math.atan(a * Math.tan(v) / b);
    }

    function getAngle(t, n) {
        if (Math.abs(t) < 5 * pow(10, -9)) {
            if (n > 0) {
                return 0;
            }
            if (n < 0) {
                return Math.PI;
            }
        } else if (Math.abs(n) < 5 * pow(10, -9)) {
            if (t > 0) {
                return Math.PI / 2;
            }
            if (t < 0) {
                return 1.5 * Math.PI;
            }
        }

        var a1 = Math.atan(t / n);
        if (t > 0 && n > 0) {
            return a1;
        }
        if (n < 0 && (t < 0 || t > 0)) {
            return a1 + Math.PI;
        }
        return a1 + Math.PI * 2;
    }

    function getDistance(c, d1, d2, d3, si) {
        return c * (si + d1 * sin(2 * si) - d2 * sin(4 * si) + d3 * sin(6 * si));
    }

    //PUBLIC
    var lgeo1 = function (lon, lat, length, azimuth) {

        checkEllipsoid();
        lat = toRad(lat);
        lon = toRad(lon);
        azimuth = toRad(azimuth);

        var a = settings.ellipsoid.a;
        var b = settings.ellipsoid.b;

        var rb1 = vinkeltr(b, a, lat);
        var si1 = getAngle(-cos(azimuth), Math.tan(rb1));

        var rb0 = getAngle(1, -sin(si1) * Math.tan(azimuth));
        if (azimuth > Math.PI) {
            rb0 = Math.PI - rb0;
        }

        var la1 = getAngle(Math.tan(si1), cos(rb0));
        var b0 = vinkeltr(a, b, rb0);


        var e = (a - b) * (a + b) / pow(a, 2);
        var w0 = sqrt(1 - e * (pow(sin(b0), 2)));
        var k1 = (1 - w0) / (1 + w0);
        var c = b * (1 + pow(k1, 2) / 4) / (1 - k1);

        var d1 = (k1 / 2 - (3 * pow(k1, 3)) / 16);
        var d2 = pow(k1, 2) / 16;
        var d3 = pow(k1, 3) / 48;

        var s1 = getDistance(c, d1, d2, d3, si1);
        var s2 = s1 + length;

        var si2 = 0, s3 = 0, f = 0, ds0 = 0;
        while (f < 5) {
            ds0 = s2 - s3;
            si2 = si2 + ds0 / c;
            f = f + 1;
            s3 = getDistance(c, d1, d2, d3, si2);
        }

        var la2 = getAngle(Math.tan(si2), cos(rb0));
        var a2 = getAngle(1, sin(si2) * Math.tan(rb0));
        var rb2 = getAngle(cos(a2), Math.tan(si2));

        var b2 = vinkeltr(a, b, rb2);

        if (b2 < 0) {
            la2 = la2 - Math.PI;
        } else if (lat < 0) {
            la2 = la2 + Math.PI;
        }

        if (la2 < la1) {
            la2 = la2 + 2 * Math.PI;
        }

        var dla = la2 - la1;
        var dsi = si2 - si1;
        var n1 = (a - b) / (a + b);

        var r = e * cos(rb0) / 2;
        var r1 = (1 + n1 - k1 / 2 - pow(k1, 2) / 4);
        var r2 = k1 / 4;
        var r3 = pow(k1, 2) / 16;

        var dl = dla - r * (r1 * dsi - r2 * (sin(2 * s1) - sin(2 * si1))) -
            r * r3 * (sin(4 * si2) - sin(4 * si1));
        if (dl > Math.PI * 2) {
            dl = dl - Math.PI * 2;
        }

        var l2;
        if (azimuth > Math.PI) {
            l2 = lon - dl;
        } else {
            l2 = lon + dl;
        }

        if (l2 > 2 * Math.PI) {
            l2 = l2 - 2 * Math.PI;
        }

        if (azimuth < Math.PI) {
            a2 = 2 * Math.PI - a2;
        }

        if (lat < 0 && b2 < 0 && azimuth < Math.PI) {
            l2 = l2 - Math.PI;
        }

        if (lat < 0 && b2 < 0 && azimuth > Math.PI) {
            l2 = l2 + Math.PI;
        }

        if (l2 > Math.PI) {
            l2 = l2 - 2 * Math.PI + Math.PI;
        } else if (l2 < -Math.PI) {
            l2 = l2 + 2 + Math.PI + Math.PI;
        }

        return {
            B2: round(toDeg(b2), 9),
            L2: round(toDeg(l2), 9),
            A2: round(toDeg(a2), 9),
            rb0: toDeg(rb0),
            si1: toDeg(si1),
            si2: toDeg(si2),
            la1: toDeg(la1),
            la2: toDeg(la2)
        };
    };

    //PUBLIC
    var lgeo2 = function (lon1, lat1, lon2, lat2) {
        checkEllipsoid();

        var a = settings.ellipsoid.a;
        var b = settings.ellipsoid.b;

        lon1 = toRad(lon1);
        lat1 = toRad(lat1);
        lon2 = toRad(lon2);
        lat2 = toRad(lat2);

        var rb1 = vinkeltr(b, a, lat1);
        var rb2 = vinkeltr(b, a, lat2);
        var rb3 = (rb1 + rb2) / 2;

        var e = (a - b) * (a + b) / pow(a, 2);
        var dl = lon2 - lon1;

        if (Math.abs(dl) < 2 * pow(10, -8)) {
            throw new Error('Unable to compute. Use a meridian arc program!');
        }

        if (dl < -Math.PI) {
            dl = dl + 2 * Math.PI;
        } else if (dl > Math.PI) {
            dl = dl - 2 * Math.PI;
        }
        var dla = dl / sqrt(1 - e * pow(cos(rb3), 2));
        var k1, rb0, si1, si2, la1, la2, i, dsi;
        for (i = 0; i < 5; i = i + 1) {
            la1 = getAngle(Math.tan(rb1) * cos(dla) - Math.tan(rb2), Math.tan(rb1) * sin(dla));
            la2 = getAngle(-Math.tan(rb2) * cos(dla) + Math.tan(rb1), Math.tan(rb2) * sin(dla));
            rb0 = getAngle(Math.tan(rb1), cos(la1));
            si1 = getAngle(cos(rb0) * Math.tan(la1), 1);
            si2 = getAngle(cos(rb0) * Math.tan(la2), 1);
            if (si2 < si1) {
                si2 = si2 + 2 * Math.PI;
            }
            if (lat2 < 0) {
                si2 = si2 - Math.PI;
            }
            if (lat1 < 0) {
                si2 = si2 - Math.PI;
            }
            dsi = si2 - si1;
            dla = la2 - la1;
            if (i < 4) {
                //BEREGNING AV DLA,FRA 1 TIL 2
                var b0 = vinkeltr(a, b, rb0);
                var w0 = sqrt(1 - e * pow(sin(b0), 2));
                k1 = (1 - w0) / (1 + w0);
                var n1 = (a - b) / (a + b);
                var r = e * cos(rb0) / 2;
                var r1 = (1 + n1 - k1 / 2 - (pow(k1, 2) / 4));
                var r2 = k1 / 4;
                var r3 = pow(k1, 2) / 16;
                dla = dl + r * (r1 * dsi - r2 * (sin(2 * si2) - sin(2 * si1))) +
                    r * r3 * (sin(4 * si2) - sin(4 * si1));
            }
        }
        //BEREGNING AV S1,S2 OG DS
        var c = b * (1 + pow(k1, 2) / 4) / (1 - k1);
        var d1 = (k1 / 2 - (3 * pow(k1, 3) / 16.0));
        var d2 = (pow(k1, 2) / 16);
        var d3 = pow(k1, 3) / 48;
        var s1 = getDistance(c, d1, d2, d3, si1);
        var s2 = getDistance(c, d1, d2, d3, si2);
        var ds = s2 - s1;
        var a1 = getAngle(1, -sin(si1) * Math.tan(rb0));
        var a2 = getAngle(1, -sin(si2) * Math.tan(rb0));
        if (ds < 0) {
            ds = -ds;
        }
        var result = {
            RB0: toDeg(rb0),
            LA1: toDeg(la1),
            LA2: toDeg(la2),
            SI1: toDeg(si1),
            SI2: toDeg(si2),
            a1: toDeg(a1),
            a2: toDeg(a2)
        };
        if (dl > 0) {
            a2 = a2 + Math.PI;
        } else if (dl < 0) {
            a1 = a1 + Math.PI;
        }
        result.A1 = round(toDeg(a1), 9);
        result.A2 = round(toDeg(a2), 9);
        result.S = round(ds, 3);
        return result;
    };

    //PUBLIC
    var konverg = function (lon, lat, lat_0) {
        checkEllipsoid();
        var dl = toRad(lat - lat_0);
        lon = toRad(lon);
        var e = pow(cos(lon), 2) * (pow(settings.ellipsoid.a, 2) - pow(settings.ellipsoid.b, 2)) / pow(settings.ellipsoid.b, 2);
        var t = Math.tan(lon);
        var si = sin(lon);
        var co = cos(lon);
        var c = dl * si + pow(dl, 3) * pow(co, 2) * (1 + 3 * e + 2 * pow(e, 2)) * (si / 3) +
            pow(dl, 5) * pow(co, 4) * (2 - pow(t, 2)) * (si / 15);
        return round(toDeg(c * 1.11111111111), 7);
    };

    //PUBLIC
    var konverg_xy = function (x, y, lon_0, lat_0) {
        checkEllipsoid();
        checkCoordsystem();
        var conv = convertXyCoords(x, y);
        x = conv.x;
        y = conv.y;

        var bf = meridbueInternal(
            null,
            toRad(lat_0),
            x,
            ellipsoidParams(),
            false
        );
        var a = settings.ellipsoid.a;
        var b = settings.ellipsoid.b;

        var e = ((a - b) * (a + b) / pow(b, 2)) * (pow(cos(bf), 2));
        var nf = pow(a, 2) / (b * sqrt(1 + e));
        var t = Math.tan(bf);
        var c = y * t / nf - (1  + pow(t, 2) - e - 2 * pow(e, 2)) * t * pow(y, 3) / (3 * pow(nf, 3)) +
            (2 + 5 * pow(t, 2) + 3 * pow(t, 4)) * t * pow(y, 5) / (15 * pow(nf, 5));
        return round(c / (r0 * 0.9), 7);
    };

    //public
    var bl_to_xy = function (lon, lat, lon_0, lat_0) {
        checkEllipsoid();
        checkCoordsystem();
        var l1 = toRad(lon_0);
        var b0 = toRad(lat_0);
        var l = toRad(lon);
        var br = toRad(lat);
        l = l - l1;

        var a = settings.ellipsoid.a;
        var b = settings.ellipsoid.b;

        var et = (pow(a, 2) - pow(b, 2)) / pow(b, 2) * pow(cos(br), 2);
        var n1 = pow(a, 2) / (sqrt(1 + et) * b);
        var t = Math.tan(br);
        var a1 = n1 * cos(br);
        var a2 = -(n1 * t * pow(cos(br), 2)) / 2.0;
        var a3 = -(n1 * pow(cos(br), 3)) * (1 - pow(t, 2) + et) / 6;
        var a4 = n1 * t * pow(cos(br), 4) * (5 - pow(t, 2) + 9 * et + 4 * pow(et, 2)) / 24;
        var a5 = n1 * pow(cos(br), 5) * (5 - 18 * pow(t, 2) + pow(t, 4) + 14 * et - 58 * et * pow(t, 2)) / 120;
        var a6 = n1 * t * pow(cos(br), 6) * (61 - 58 * pow(t, 2) + pow(t, 4) + 270 * et - 330 * et * pow(t, 2)) / 270;

        var x = -a2 * pow(l, 2) + a4 * pow(l, 4) + a6 * pow(l, 6);
        var y = a1 * l - a3 * pow(l, 3) + a5 * pow(l, 5);

        x = x + meridbueInternal(br, b0, null, ellipsoidParams(), true);

        var conv = convertXyCoordsBack(x, y);
        x = conv.x;
        y = conv.y;

        return {
            x: round(x, 4),
            y: round(y, 4)
        };
    };

    //PUBLIC
    var xy_to_bl = function (x, y, lon_0, lat_0) {
        checkEllipsoid();
        checkCoordsystem();
        var l1 = toRad(lon_0);
        var b0 = toRad(lat_0);

        var conv = convertXyCoords(x, y);
        x = conv.x;
        y = conv.y;

        var bf = meridbueInternal(null, b0, x, ellipsoidParams(), false);

        var a = settings.ellipsoid.a;
        var b = settings.ellipsoid.b;

        var etf = (a - b) * (a + b) / pow(b, 2) * pow(cos(bf), 2);
        var nf = pow(a, 2) / (sqrt(1 + etf) * b);
        var tf = tan(bf);

        var b1 = 1 / (nf * cos(bf));
        var b2 = tf * (1 + etf) / (2 * pow(nf, 2));
        var b3 = (1 + 2 * pow(tf, 2) * etf) / (6 * pow(nf, 3) * cos(bf));
        var b4 = (tf * (5 + 3 * pow(tf, 2) + 6 * etf * pow(tf, 2))) / (24 * pow(nf, 4));
        var b5 = (5 + 28 * pow(tf, 2) + 24 * pow(tf, 4)) / (120 * pow(nf, 5) * cos(bf));

        var br = bf + (-b2 * pow(y, 2) + b4 * pow(y, 4));
        var l = (b1 * y - b3 * pow(y, 3) + b5 * pow(y, 5));

        l = toDeg(l + l1);
        br = toDeg(br);
        return {
            lon: round(br, 9),
            lat: round(l, 9)
        };
    };

    return {
        lgeo1: lgeo1,
        lgeo2: lgeo2,
        krrad: krrad,
        meridbue: meridbue,
        meridbue_inv: meridbue_inv,
        konverg: konverg,
        konverg_xy: konverg_xy,
        bl_to_xy: bl_to_xy,
        xy_to_bl: xy_to_bl,
        getEllipsoids: function () {return ellipsoids; },
        setEllipsoid: setEllipsoid,
        getCoordsystems: function () {return coordsystems; },
        setCoordsystem: setCoordsystem
    };
};