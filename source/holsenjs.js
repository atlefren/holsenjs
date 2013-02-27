var Holsen = function () {
    "use strict";

    var settings = {
        "ellipsoid": undefined,
        "coordsystem": undefined
    };

    var ellipsoids = {
        "bessel": {
            "a": 6377492.018,
            "b": 6356173.509
        },
        "international": {
            "a": 6378388.000,
            "b": 6356911.946
        },
        "wgs84": {
            "a": 6378137.000,
            "b": 6356752.314
        }
    };

    var isString = function (obj) {
        return Object.prototype.toString.call(obj) === "[object String]";
    };

    var setEllipsoid = function (ellipsoid) {
        if (isString(ellipsoid)) {
            if (ellipsoids[ellipsoid] !== undefined) {
                settings.ellipsoid = ellipsoids[ellipsoid];

            } else {
                throw new Error("Non-existing ellipsoid: " + ellipsoid);
            }
        } else if (ellipsoid === Object(ellipsoid)) {
            if (ellipsoid.a && !isNaN(ellipsoid.a) && ellipsoid.b && !isNaN(ellipsoid.b)) {
                settings.ellipsoid = ellipsoid;
            } else {
                throw new Error("The entered ellipsoid is either missing or have non-numbers as a or b.");
            }
        } else {
            throw new Error("Malformed ellipsoid.");
        }
    };

    var checkEllipsoid = function () {
        if (settings.ellipsoid === undefined) {
            throw new Error("Ellipsoid not set (call holsen.setEllipsoid()!).");
        }
    };

    var coordsystems = {
        "UTM": {
            "factor": 0.9996,
            "y_add": 500000
        },
        "NGO": {
            "factor": 1,
            "y_add": 0
        }
    };

    var setCoordsystem = function (coordsystem) {
        if (isString(coordsystem)) {
            if (coordsystems[coordsystem] !== undefined) {
                settings.coordsystem = coordsystems[coordsystem];
            } else {
                throw new Error("Non-existing coordsystem: " + coordsystem);
            }
        } else if (coordsystem === Object(coordsystem)) {
            if (coordsystem.factor && typeof coordsystem.factor === 'function' && coordsystem.y_add && typeof coordsystem.y_add === 'function') {
                settings.coordsystem = coordsystem;
            } else {
                throw new Error("The entered coordsystem is either missing or have non-functions as factor or y_add.");
            }
        } else {
            throw new Error("Malformed coordsystem.");
        }
    };

    var checkCoordsystem = function () {
        if (settings.coordsystem === undefined) {
            throw new Error("Coordsystem not set (call holsen.setCoordsystem()!).");
        }
    };

    var toRad = function (deg) {
        return deg / (180 / Math.PI);
    };

    var toDeg = function (rad) {
        return rad / (Math.PI / 180);
    };

    var round = function (number, numDecimals) {
        var pow = Math.pow(10, numDecimals);
        return Math.round(number * pow) / pow;
    };

    var ellipsoidParams = function (ellipsoid) {
        var n = (ellipsoid.a - ellipsoid.b) / (ellipsoid.a + ellipsoid.b);
        var k = ellipsoid.a / (n + 1);
        var k1 = 1 + n * (n / 4) + Math.pow(n, 4) / 64;
        var k2 = (n - n * n * n / 8) * 3;
        var k3 = (n * n - Math.pow(n, 4) / 4) * 15 / 8;
        return {
            "n": n,
            "k": k,
            "k1": k1,
            "k2": k2,
            "k3": k3
        };
    };

    var meridbue_loop = function (params) {
        if (!params.find_arc) {
            params.db = params.db + (params.arc - params.g1) / (params.ef.k * params.ef.k1);
            params.bm = params.lon2 + params.db / 2;
        }
        params.g1 = params.ef.k * (params.ef.k1 * params.db - params.ef.k2 * Math.cos(2 * params.bm) * Math.sin(params.db) +
            params.ef.k3 * Math.cos(4 * params.bm) * Math.sin(2 * params.db)) -
            params.ef.k * (Math.pow(params.ef.n, 3) * Math.cos(6 * params.bm) * Math.sin(3 * params.db) * 35 / 24) +
            params.ef.k * (Math.pow(params.ef.n, 4) * Math.cos(8 * params.bm) * Math.sin(4 * params.db) * 315) / 256;
        return params;
    };

    var meridbue2 = function (lon1, lon2, arc, ellipsoid_params, find_arc) {
        var g1 = 0, db = 0, bm = 0;

        if (find_arc) {
            db = lon1 - lon2;
            bm = lon1 - db / 2;
        }

        var params = {
            "bm": bm,
            "db": db,
            "arc": arc,
            "g1": g1,
            "lon2": lon2,
            "ef": ellipsoid_params,
            "find_arc": find_arc
        };

        if (find_arc) {
            params = meridbue_loop(params);
            return params.g1;
        }

        while (Math.abs(params.arc - params.g1) > Math.pow(10, -4)) {
            params = meridbue_loop(params);
        }
        return params.lon2 + params.db;
    };


    //PUBLIC
    var meridbue = function (lat1, lat2) {
        checkEllipsoid();
        var bue = meridbue2(toRad(lat2), toRad(lat1), null, ellipsoidParams(settings.ellipsoid), true);
        return round(bue, 3);
    };

    //PUBLIC
    var meridbue_inv = function (lat, arc) {
        checkEllipsoid();
        var lat2 = meridbue2(null, toRad(lat), arc, ellipsoidParams(settings.ellipsoid), false);
        return round(toDeg(lat2), 9);
    };

    //PUBLIC
    var krrad = function (br, azimuth) {
        checkEllipsoid();
        br = toRad(br);
        azimuth = toRad(azimuth);
        var e = (Math.pow(settings.ellipsoid.a, 2) - Math.pow(settings.ellipsoid.b, 2)) / Math.pow(settings.ellipsoid.a, 2);
        var m = Math.pow(Math.sin(br), 2);
        m = Math.sqrt(1 - e * m);
        var n = settings.ellipsoid.a / m;
        m = (1 - e) * settings.ellipsoid.a / Math.pow(m, 3);
        var mr = Math.sqrt(m * n);
        var ra = n * m / (n * Math.pow(Math.cos(azimuth), 2) + m * Math.pow(Math.sin(azimuth), 2));
        return {
            "M": round(m, 3),
            "N": round(n, 3),
            "MR": round(mr, 3),
            "AR": round(ra, 3)
        };
    };

    var vinkeltr = function (a, b, v) {
        return Math.atan(a * Math.tan(v) / b);
    };

    var vinkel = function (t, n) {
        if (Math.abs(t) < 5 * Math.pow(10, -9)) {
            if (n > 0) {
                return 0;
            } else if (n < 0) {
                return Math.PI;
            }
        } else if (Math.abs(n) < 5 * Math.pow(10, -9)) {
            if (t > 0) {
                return Math.PI / 2;
            } else if (t < 0) {
                return 1.5 * Math.PI;
            }
        }

        var a1 = Math.atan(t / n);
        if (t > 0 && n > 0) {
            return a1;
        } else if (t > 0 && n !== 0) {
            return a1 + Math.PI;
        } else {
            return a1 + Math.PI * 2;
        }
    };

    var avstand = function (c, d1, d2, d3, si) {
        return c * (si + d1 * Math.sin(2 * si) - d2 * Math.sin(4 * si) + d3 * Math.sin(6 * si));
    };

    //PUBLIC
    var lgeo1 = function (lat, lon, length, azimuth) {
        checkEllipsoid();
        lat = toRad(lat);
        lon = toRad(lon);
        azimuth = toRad(azimuth);

        var rb1 = vinkeltr(settings.ellipsoid.b, settings.ellipsoid.a, lat);
        var si1 = vinkel(-Math.cos(azimuth), Math.tan(rb1));

        var rb0 = vinkel(1, -Math.sin(si1) * Math.tan(azimuth));
        if (azimuth > Math.PI) {
            rb0 = Math.PI - rb0;
        }

        var la1 = vinkel(Math.tan(si1), Math.cos(rb0));
        var b0 = vinkeltr(settings.ellipsoid.a, settings.ellipsoid.b, rb0);

        var e = (settings.ellipsoid.a - settings.ellipsoid.b) * (settings.ellipsoid.a + settings.ellipsoid.b) / Math.pow(settings.ellipsoid.a, 2);
        var w0 = Math.sqrt(1 - e * (Math.pow(Math.sin(b0), 2)));
        var k1 = (1 - w0) / (1 + w0);
        var c = settings.ellipsoid.b * (1 + Math.pow(k1, 2) / 4) / (1 - k1);

        var d1 = (k1 / 2 - (3 * Math.pow(k1, 3)) / 16);
        var d2 = Math.pow(k1, 2) / 16;
        var d3 = Math.pow(k1, 3) / 48;

        var s1 = avstand(c, d1, d2, d3, si1);
        var s2 = s1 + length;

        var si2 = 0, s3 = 0, f = 0, ds0 = 0;
        while (f < 5) {
            ds0 = s2 - s3;
            si2 = si2 + ds0 / c;
            f = f + 1;
            s3 = avstand(c, d1, d2, d3, si2);
        }

        var la2 = vinkel(Math.tan(si2), Math.cos(rb0));
        var a2 = vinkel(1, Math.sin(si2) * Math.tan(rb0));
        var rb2 = vinkel(Math.cos(a2), Math.tan(si2));

        var b2 = vinkeltr(settings.ellipsoid.a, settings.ellipsoid.b, rb2);

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
        var n1 = (settings.ellipsoid.a - settings.ellipsoid.b) / (settings.ellipsoid.a + settings.ellipsoid.b);

        var r = e * Math.cos(rb0) / 2;
        var r1 = (1 + n1 - k1 / 2 - Math.pow(k1, 2) / 4);
        var r2 = k1 / 4;
        var r3 = Math.pow(k1, 2) / 16;

        var dl = dla - r * (r1 * dsi - r2 * (Math.sin(2 * s1) - Math.sin(2 * si1))) -
            r * r3 * (Math.sin(4 * si2) - Math.sin(4 * si1));
        if (dl > Math.PI * 2) {
            dl = dl - Math.PI * 2;
        }

        var l2;
        if (azimuth > Math.PI) {
            l2 = lat - dl;
        } else {
            l2 = lat + dl;
        }

        if (l2 > 2 * Math.PI) {
            l2 = l2 - 2 * Math.PI;
        }

        if (azimuth < Math.PI) {
            a2 = 2 * Math.PI - a2;
        }

        if (lon < 0 && b2 < 0 && azimuth < Math.PI) {
            l2 = l2 - Math.PI;
        }

        if (lon < 0 && b2 < 0 && azimuth > Math.PI) {
            l2 = l2 + Math.PI;
        }

        if (l2 > Math.PI) {
            l2 = l2 - 2 * Math.PI;
        } else if (l2 < Math.PI) {
            l2 = l2 + 2 * Math.PI;
        }

        return {
            "B2": round(toDeg(b2), 9),
            "L2": round(toDeg(l2), 9),
            "A2": round(toDeg(a2), 9),
            "rb0": toDeg(rb0),
            "si1": toDeg(si1),
            "si2": toDeg(si2),
            "la1": toDeg(la1),
            "la2": toDeg(la2)
        };
    };

    //TODO: implement case with coords in plane are known
    //PUBLIC
    var konverg = function (lon, lat, lat_0) {
        checkEllipsoid();
        var dl = toRad(lat - lat_0);
        lon = toRad(lon);
        var e = Math.pow(Math.cos(lon), 2) * (Math.pow(settings.ellipsoid.a, 2) - Math.pow(settings.ellipsoid.b, 2)) / Math.pow(settings.ellipsoid.b, 2);
        var t = Math.tan(lon);
        var si = Math.sin(lon);
        var co = Math.cos(lon);
        var c = dl * si + Math.pow(dl, 3) * Math.pow(co, 2) * (1 + 3 * e + 2 * Math.pow(e, 2)) * (si / 3) +
            Math.pow(dl, 5) * Math.pow(co, 4) * (2 - Math.pow(t, 2)) * (si / 15);
        return round(toDeg(c * 1.11111111111), 7);
    };

    //public
    var bl_to_xy = function (lat, lon, lat_0, lon_0) {
        checkEllipsoid();
        checkCoordsystem();
        var l1 = toRad(lon_0);
        var b0 = toRad(lat_0);
        var l = toRad(lon);
        var br = toRad(lat);
        l = l - l1;
        var et = (Math.pow(settings.ellipsoid.a, 2) - Math.pow(settings.ellipsoid.b, 2)) / Math.pow(settings.ellipsoid.b, 2) * Math.pow(Math.cos(br), 2);
        var n1 = Math.pow(settings.ellipsoid.a, 2) / (Math.sqrt(1 + et) * settings.ellipsoid.b);
        var t = Math.tan(br);
        var a1 = n1 * Math.cos(br);
        var a2 = -(n1 * t * Math.pow(Math.cos(br), 2)) / 2.0;
        var a3 = -(n1 * Math.pow(Math.cos(br), 3)) * (1 - Math.pow(t, 2) + et) / 6;
        var a4 = n1 * t * Math.pow(Math.cos(br), 4) * (5 - Math.pow(t, 2) + 9 * Math.pow(et, 2)) / 24;
        var a5 = n1 * Math.pow(Math.cos(br), 5) * (5 - 18 * Math.pow(t, 2) + Math.pow(t, 4) + 14 * et - 58 * et * Math.pow(t, 2)) / 120;
        var a6 = n1 * t * Math.pow(Math.cos(br), 6) * (61 - 58 * Math.pow(t, 4) + 270 * et - 330 * et * Math.pow(t, 2)) / 270;
        var x = -a2 * Math.pow(l, 2) + a4 * Math.pow(l, 4) + a6 * Math.pow(l, 6);
        var y = a1 * l - a3 * Math.pow(l, 3) * a5 * Math.pow(l, 5);

        x = x + meridbue2(br, b0, null, ellipsoidParams(settings.ellipsoid), true);

        x = x * settings.coordsystem.factor;
        y = y * settings.coordsystem.factor + settings.coordsystem.y_add;

        return {
            "x": round(x, 4),
            "y": round(y, 4)
        };
    };

    //PUBLIC
    var xy_to_bl = function (x, y, lat_0, lon_0) {
        checkEllipsoid();
        checkCoordsystem();
        var l1 = toRad(lon_0);
        var b0 = toRad(lat_0);

        x = x / settings.coordsystem.factor;
        y = (y - settings.coordsystem.y_add) / settings.coordsystem.factor;

        var bf = meridbue2(null, b0, x, ellipsoidParams(settings.ellipsoid), false);

        var etf = (settings.ellipsoid.a - settings.ellipsoid.b) * (settings.ellipsoid.a + settings.ellipsoid.b) / Math.pow(settings.ellipsoid.b, 2) * Math.pow(Math.cos(bf), 2);
        var nf = Math.pow(settings.ellipsoid.a, 2) / (Math.sqrt(1 + etf) * settings.ellipsoid.b);
        var tf = Math.tan(bf);

        var b1 = 1 / (nf * Math.cos(bf));
        var b2 = tf * (1 + etf) / (2 * Math.pow(nf, 2));
        var b3 = (1 + 2 * Math.pow(tf, 2) * etf) / (6 * Math.pow(nf, 3) * Math.cos(bf));
        var b4 = (tf * (5 + 3 * Math.pow(tf, 2) + 6 * etf * Math.pow(tf, 2))) / (24 * Math.pow(nf, 4));
        var b5 = (5 + 28 * Math.pow(tf, 2) + 24 * Math.pow(tf, 4)) / (120 * Math.pow(nf, 5) * Math.cos(bf));

        var br = bf + (-b2 * Math.pow(y, 2) + b4 * Math.pow(y, 4));
        var l = (b1 * y - b3 * Math.pow(y, 3) + b5 * Math.pow(y, 5));

        l = toDeg(l + l1);
        br = toDeg(br);
        return {
            "lon": round(l, 9),
            "lat": round(br, 9)
        };
    };

    return {
        "meridbue": meridbue,
        "meridbue_inv": meridbue_inv,
        "krrad": krrad,
        "lgeo1": lgeo1,
        "konverg": konverg,
        "bl_to_xy": bl_to_xy,
        "xy_to_bl": xy_to_bl,
        "getEllipsoids": function () {return ellipsoids; },
        "setEllipsoid": setEllipsoid,
        "getCoordsystems": function () {return coordsystems; },
        "setCoordsystem": setCoordsystem
    };
};