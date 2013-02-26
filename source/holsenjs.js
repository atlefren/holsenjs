var Holsen = {};
(function(ns){

    ns.ellipsoids = {
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

    var r0 = (180 / Math.PI);

    var toRad = function(deg) {
        return deg / r0;
    };

    var toDeg = function(rad) {
        return  rad / (Math.PI / 180);
    };

    var round = function(number, numDecimals) {
        var pow = Math.pow(10, numDecimals);
        return Math.round(number * pow) / pow;
    };

    var meridbue_constants = function(ellipsoid) {
        var n = (ellipsoid.a - ellipsoid.b) / (ellipsoid.a + ellipsoid.b);
        var k = ellipsoid.a / (n + 1);

        var a1 = n;
        var a2 = Math.pow(n, 2);
        var a3 = Math.pow(n, 3);
        var a4 = Math.pow(n, 4);

        var k1 = 1 + (a2 / 4) + (a4 / 64);
        var k2 = (a1 - a3 * (1 / 8)) * 3;
        var k3 = (a2 - a4/4) * 15 / 8;

        return {
            "n": n,
            "k": k,
            "k1": k1,
            "k2": k2,
            "k3": k3
        };
    };

    var arc = function(b1, b2, constants) {
        var db = b2 - b1;
        var bm = b2 - db / 2;
        return constants.k * (constants.k1 * db - constants.k2 * Math.cos(2 * bm) * Math.sin(db) + constants.k3 * Math.cos(4 * bm) * Math.sin(2 * db))
         - constants.k * (Math.pow(constants.n, 3) * Math.cos(6 * bm) * Math.sin(3 * db) * 35/24)
         + constants.k * (Math.pow(constants.n, 4) * Math.cos(8 * bm) * Math.sin(4 * db) * 315) / 256;
    };

    ns.meridbue = function(ellipsoid, b1, b2) {
        //TODO: implement case for b1 and g given
        return round(arc(toRad(b1), toRad(b2), meridbue_constants(ellipsoid)), 3);
    };

    ns.krrad = function(ellipsoid, br, azimuth) {
        br = toRad(br);
        azimuth = azimuth / r0;
        var e = (Math.pow(ellipsoid.a, 2) - Math.pow(ellipsoid.b, 2)) / Math.pow(ellipsoid.a, 2);
        var m = Math.pow(Math.sin(br), 2);
        m = Math.sqrt(1 - e * m);
        var n = ellipsoid.a / m;
        m = (1 - e) * ellipsoid.a / Math.pow(m, 3);
        var mr = Math.sqrt(m * n);
        var ra = n * m / (n * Math.pow(Math.cos(azimuth), 2) + m * Math.pow(Math.sin(azimuth), 2));
        return {
            "M": round(m, 3),
            "N": round(n, 3),
            "MR": round(mr, 3),
            "AR": round(ra, 3)
        };
    };

    var vinkeltr = function(a, b, v) {
        return Math.atan(a * Math.tan(v) / b);
    };

    var vinkel = function(t, n) {

        if(Math.abs(t) < 5 * Math.pow(10, -9)) {
            if(n > 0) {
                return 0;
            } else if (n < 0) {
                return Math.PI;
            }
        } else if (Math.abs(n) < 5 * Math.pow(10, -9)) {
            if(t > 0) {
                return Math.PI / 2;
            } else if(t < 0 ) {
                return 1.5 * Math.PI;
            }
        }

        var a1 = Math.atan(t / n);
        if(t > 0 && n > 0) {
            return a1;
        } else if(t > 0 && n !== 0) {
            return a1 + Math.PI;
        } else {
            return a1 + Math.PI * 2;
        }
    };

    var avstand = function(c, d1, d2, d3, si) {
        return c * (si + d1 * Math.sin(2 * si) - d2 * Math.sin(4 * si) + d3 * Math.sin(6 * si));
    };

    ns.lgeo1 = function(ellipsoid, lat, lon, length, azimuth) {
        lat = toRad(lat);
        lon = toRad(lon);
        azimuth = toRad(azimuth);

        var rb1 = vinkeltr(ellipsoid.b, ellipsoid.a, lat);
        var si1 = vinkel(-Math.cos(azimuth), Math.tan(rb1));

        var rb0 = vinkel(1, -Math.sin(si1) * Math.tan(azimuth));
        if(azimuth > Math.PI) {
            rb0 = Math.PI - rb0;
        }

        var la1 = vinkel(Math.tan(si1), Math.cos(rb0));
        var b0 = vinkeltr(ellipsoid.a, ellipsoid.b, rb0);
        var e = (ellipsoid.a - ellipsoid.b) * (ellipsoid.a + ellipsoid.b) / Math.pow(ellipsoid.a, 2);
        var w0 = Math.sqrt(1 - e * (Math.pow(Math.sin(b0), 2)));
        var k1 = (1 - w0) / (1 + w0);
        var c = ellipsoid.b * (1 + Math.pow(k1, 2) / 4) / (1 - k1);
        var d1 = (k1 / 2 - (3 * Math.pow(k1, 3))/ 16);
        var d2 = Math.pow(k1, 2) / 16;
        var d3 = Math.pow(k1, 3) / 48;
        var s1 = avstand(c, d1, d2, d3, si1);
        var s2 = s1 + length;
        var si2 = 0;
        var s3 = 0;

        var f = 0;
        var ds0;
        while (f < 5) {
            ds0 = s2 - s3;
            si2 = si2 + ds0 / c;
            f = f + 1;
            s3 = avstand(c, d1, d2, d3, si2);
        }

        var la2 = vinkel(Math.tan(si2), Math.cos(rb0));
        var a2 = vinkel(1, Math.sin(si2) * Math.tan(rb0));
        var rb2 = vinkel(Math.cos(a2), Math.tan(si2));

        var b2 = vinkeltr(ellipsoid.a, ellipsoid.b, rb2);

        if(b2 < 0) {
            la2 = la2 - Math.PI;
        } else if(lat < 0) {
            la2 = la2 + Math.PI;
        }
        if(la2 < la1) {
            la2 = la2 + 2 * Math.PI;
        }
        var dla = la2 - la1;
        var dsi = si2 - si1;
        var n1 = (ellipsoid.a - ellipsoid.b) / (ellipsoid.a + ellipsoid.b);
        var r = e * Math.cos(rb0) / 2;
        var r1 = (1 + n1 - k1 / 2 - Math.pow(k1, 2) / 4);
        var r2 = k1 / 4;
        var r3 = Math.pow(k1, 2) / 16;
        var dl = dla - r *(r1 * dsi - r2 *(Math.sin(2 * s1) - Math.sin(2 * si1)));
        dl = dl - r * r3 * (Math.sin(4 * si2) - Math.sin(4 * si1));
        if(dl > Math.PI * 2) {
            dl = dl - Math.PI * 2;
        }

        var l2;
        if(azimuth > Math.PI) {
            l2 = lat - dl;
        } else {
            l2 = lat + dl;
        }

        if(l2 > 2 * Math.PI) {
            l2 = l2 - 2 * Math.PI;
        }

        if(azimuth < Math.PI) {
            a2 = 2 * Math.PI - a2;
        }

        if(lon < 0 && b2 < 0 && azimuth < Math.PI){
            l2 = l2 - Math.PI;
        }

        if(lon < 0 && b2 < 0 && azimuth > Math.PI) {
            l2 = l2 + Math.PI;
        }

        if(l2 > Math.PI) {
            l2 = l2 - 2 * Math.PI;
        } else if(l2 < Math.PI) {
            l2 = l2 + 2 * Math.PI;
        }

        rb0 = toDeg(rb0);
        si1 = toDeg(si1);
        si2 = toDeg(si2);
        la1 = toDeg(la1);
        la2 = toDeg(la2);

        console.log(rb0);
        console.log(si1, si2);
        console.log(la1, la2);

        b2 = toDeg(b2);
        l2 = toDeg(l2);
        a2 = toDeg(a2);
        return {
            "B2": round(b2, 9),
            "L2": round(l2, 9),
            "A2": round(a2, 9)
        };
    };

    ns.coordsystems = {
        "UTM": {
            "factor": 0.9996,
            "y_add": 500000
        },
        "NGO": {
            "factor": 1,
            "y_add": 0
        }
    };

    //TODO: implement case with coords in plane are known
    ns.konverg = function(ellipsoid, lon, lat, lat_0) {
        var dl = toRad(lat - lat_0);
        lon = toRad(lon);
        var e = Math.pow(Math.cos(lon), 2) * (Math.pow(ellipsoid.a, 2) - Math.pow(ellipsoid.b, 2)) / Math.pow(ellipsoid.b, 2);
        var t = Math.tan(lon);
        var si = Math.sin(lon);
        var co = Math.cos(lon);
        var c = dl * si + Math.pow(dl, 3) * Math.pow(co, 2) * (1 + 3 * e + 2 * Math.pow(e, 2)) * (si / 3)
        + Math.pow(dl, 5) * Math.pow(co, 4) * (2 - Math.pow(t, 2)) * (si / 15);
        return round(toDeg(c * 1.11111111111), 7);
    };

    var ellipsoidFactors = function(ellipsoid) {
        var n = (ellipsoid.a - ellipsoid.b) / (ellipsoid.a + ellipsoid.b);
        var k = ellipsoid.a / (n + 1);
        var k1 = 1 + n * (n / 4) + Math.pow(n, 4) / 64;
        var k2 = (n - n*n*n / 8) * 3;
        var k3 = (n * n - Math.pow(n, 4) * 1 / 4 ) * 15 / 8;
        return {
            "n": n,
            "k": k,
            "k1": k1,
            "k2": k2,
            "k3": k3
        }
    };

    ns.bl_to_xy = function(ellipsoid, coordsys, lat, lon, lat_0, lon_0) {
        var ef = ellipsoidFactors(ellipsoid);
        var l1 = toRad(lon_0);
        var b0 = toRad(lat_0);
        var l = toRad(lon);
        var br = toRad(lat);
        l = l-l1;
        var et = (Math.pow(ellipsoid.a, 2) - Math.pow(ellipsoid.b, 2)) / Math.pow(ellipsoid.b, 2);
        et = et * Math.pow(Math.cos(br), 2);
        var n1 = Math.pow(ellipsoid.a, 2) / (Math.sqrt(1 + et) * ellipsoid.b);
        var t = Math.tan(br);
        var a1 = n1 * Math.cos(br);
        var a2 = -(n1 * t * Math.pow(Math.cos(br), 2)) / 2.0;
        var a3 = -(n1 * Math.pow(Math.cos(br), 3)) * (1 - Math.pow(t, 2) + et) / 6;
        var a4 = n1 * t * Math.pow(Math.cos(br), 4) * (5 - Math.pow(t, 2) + 9 * Math.pow(et, 2)) / 24;
        var a6 = n1 * t * Math.pow(Math.cos(br), 6) * (61 - 58 * Math.pow(t, 4) + 270 * et - 330 * et * Math.pow(t, 2)) / 270;
        var a5 = n1 * Math.pow(Math.cos(br), 5) * (5 - 18 * Math.pow(t, 2) + Math.pow(t, 4) + 14*et - 58 * et *Math.pow(t, 2))/ 120;
        var x = -a2 * Math.pow(l, 2) + a4 * Math.pow(l, 4) + a6 * Math.pow(l, 6);
        var y = a1 * l - a3 * Math.pow(l, 3) * a5 * Math.pow(l, 5);
        var g = meridbue2(br, b0, ef, null, true);

        x = x + g;

        x = x * coordsys.factor;
        y = y * coordsys.factor + coordsys.y_add;

        return {
            "x": round(x, 4),
            "y": round(y, 4)
        }
    };

    ns.xy_to_bl = function(ellipsoid, coordsys, x, y, lat_0, lon_0) {
        var l1 = toRad(lon_0);
        var b0 = toRad(lat_0);

        x = x/coordsys.factor;
        y = (y-coordsys.y_add) / coordsys.factor;

        var ef = ellipsoidFactors(ellipsoid);

        var params = meridbue2(null, b0, ef, x, false);
        var g = params.g;
        var bf = params.bf;

        var etf = (ellipsoid.a - ellipsoid.b) * (ellipsoid.a + ellipsoid.b) / Math.pow(ellipsoid.b, 2);
        etf = etf * Math.pow(Math.cos(bf), 2);

        var nf = Math.pow(ellipsoid.a, 2) / (Math.sqrt(1 + etf) * ellipsoid.b);

        var tf = Math.tan(bf);

        var b1 = 1 / (nf * Math.cos(bf));

        var b2 = tf * (1 + etf) / (2 * Math.pow(nf, 2));

        var b3 = (1 + 2 * Math.pow(tf, 2) * etf) / (6 * Math.pow(nf, 3) * Math.cos(bf));

        var b4 = tf * (5 + 3 * Math.pow(tf, 2) + 6 * etf * Math.pow(tf, 2));
        b4 = b4 / (24 * Math.pow(nf, 4));

        var b5 = (5 + 28 *Math.pow(tf, 2) + 24 * Math.pow(tf, 4));
        b5 = b5 / (120 * Math.pow(nf, 5) * Math.cos(bf));

        var br = bf + (-b2 * Math.pow(y, 2) + b4 * Math.pow(y, 4));
        var l = (b1 * y -b3 * Math.pow(y, 3) + b5 * Math.pow(y, 5));

        l = toDeg(l + l1);
        br = toDeg(br);
        return {
            "lon": round(l, 9),
            "lat": round(br, 9)
        }
    };


    var loop = function(params) {
        if(!params.to_xy) {
            params.db = params.db + (params.g - params.g1) / (params.ef.k * params.ef.k1);
            params.bm = params.b0 + params.db / 2;
        }
        params.g1 = params.ef.k * (params.ef.k1 * params.db - params.ef.k2 * Math.cos(2 * params.bm) * Math.sin(params.db) + params.ef.k3 * Math.cos(4 * params.bm) * Math.sin(2 * params.db));
        params.g1 = params.g1 - params.ef.k * (Math.pow(params.ef.n, 3) * Math.cos(6 * params.bm) * Math.sin(3 * params.db) * 35 / 24);
        params.g1 = params.g1 + params.ef.k * (Math.pow(params.ef.n, 4) * Math.cos(8 * params.bm) * Math.sin(4 * params.db) * 315) / 256;
        return params;
    };

    var meridbue2 = function(br, b0, ef, g, to_xy) {
        var g1 = 0;
        var db = 0;
        var bm = 0;

        if(to_xy){
            db = br - b0;
            bm = br - db / 2;
        }

        var params = {
            "bm": bm,
            "db": db,
            "g": g,
            "g1": g1,
            "b0": b0,
            "ef": ef,
            "to_xy": to_xy
        };

        if(to_xy) {
            params = loop(params);
            return params.g1;
        }

        while(Math.abs(params.g - params.g1) > Math.pow(10,-4)){
            params = loop(params);
        }
        params.bf = params.b0 + params.db;
        return params;
    }

}(Holsen));